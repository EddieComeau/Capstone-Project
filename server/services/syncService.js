// server/services/syncService.js
// All syncing logic centralized here.

const ballDontLieService = require('./ballDontLieService');
const { ensureTeam } = require("../utils/teamUtils");
const { bdlList } = require("../utils/apiUtils");
const Player = require("../models/Player");

/**
 * Sync players from Ball Don't Lie NFL API.
 * Standardized single endpoint on backend: POST /api/players/sync
 *
 * Options can include:
 * - per_page
 * - cursor (if supported)
 * - search, team_ids, etc.
 */
async function syncPlayers(options = {}, { PlayerModel } = {}) {
  // PlayerModel is injected for easier testing; if not provided we lazy-require.
  const PlayerToUse = PlayerModel || Player;

  // Fetch first page (cursor-based or page-based depending on API behavior).
  // We keep this conservative and support 'cursor' if API returns next_cursor.
  const per_page = Number(options.per_page || 100);

  let cursor = options.cursor || null;
  let synced = 0;
  let fetched = 0;

  // limit safety to avoid infinite loops
  const maxPages = Number(options.maxPages || 50);
  let pageCount = 0;

  while (pageCount < maxPages) {
    pageCount += 1;

    const params = { ...options, per_page };
    if (cursor) params.cursor = cursor;

    const payload = await ballDontLieService.listPlayers(params);

    const data = payload && payload.data ? payload.data : payload;
    const meta = payload && payload.meta ? payload.meta : {};

    const players = Array.isArray(data) ? data : [];
    fetched += players.length;

    for (const p of players) {
      // Normalize a minimal schema to what we likely store.
      // Keep additional fields if present.
      const doc = {
        bdlId: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        position: p.position,
        team: p.team || null,
        raw: p,
        updatedAt: new Date(),
      };

      await PlayerToUse.updateOne(
        { bdlId: doc.bdlId },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
      synced += 1;
    }

    // Cursor-based pagination in BDL often uses meta.next_cursor.
    const nextCursor = meta.next_cursor || meta.nextCursor || null;

    if (!nextCursor || players.length === 0) break;
    cursor = nextCursor;
  }

  return {
    ok: true,
    fetched,
    synced,
    pages: pageCount,
    next_cursor: cursor,
  };
}

/**
 * Sync players for a specific team
 * @param {string} teamAbbrev - Team abbreviation (e.g., "KC", "BUF")
 * @returns {Promise<number>} - Number of players synced
 */
async function syncTeamPlayers(teamAbbrev) {
  console.log(`Starting sync for team: ${teamAbbrev}`);
  
  // Ensure team exists in database (or create it)
  const { teamDoc, raw } = await ensureTeam(teamAbbrev);
  
  console.log(`Fetching players for team ${teamAbbrev} (ID: ${raw.id})...`);
  
  let upsertCount = 0;
  let cursor = null;
  let pageCount = 0;
  const maxPages = 100; // Safety limit to prevent infinite loops
  let previousCursor = null;

  // Use cursor-based pagination to fetch all players
  while (pageCount < maxPages) {
    pageCount++;
    
    // Log the cursor on each request for debugging
    console.log(`📄 Fetching page ${pageCount}, cursor: ${cursor || 'null (first page)'}`);
    
    // Use the correct Ball Don't Lie API endpoint: /v1/nfl/players
    // Temporarily remove team_ids filter to confirm pagination works
    const params = {
      per_page: 100,
    };
    
    // Add cursor if we have one (not on first request)
    if (cursor) {
      params.cursor = cursor;
    }
    
    const response = await bdlList("/v1/nfl/players", params);
    
    // Extract data and metadata
    const players = response.data || [];
    const meta = response.meta || {};
    
    console.log(`   Received ${players.length} players`);
    
    // Guard: Break if cursor didn't change (stuck in loop)
    if (cursor && cursor === previousCursor) {
      console.warn(`⚠️ Cursor didn't change, breaking to prevent infinite loop`);
      break;
    }
    
    // Process players for this page
    for (const p of players) {
      // Validate critical fields
      if (!p.id) {
        console.warn(`⚠️ Skipping player with missing ID:`, p);
        continue;
      }
      
      // Map Ball Don't Lie API response to Player model schema
      const update = {
        PlayerID: p.id,
        FullName: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        FirstName: p.first_name || "Unknown",
        LastName: p.last_name || "Unknown",
        Team: p.team?.abbreviation || teamAbbrev.toUpperCase(),
        Position: p.position || "Unknown",
        Status: p.status || "Active",
        Jersey: p.jersey_number,
        Height: p.height,
        Weight: p.weight,
        BirthDate: p.birth_date,
        College: p.college,
        Experience: p.experience,
        PhotoUrl: p.photo_url,
        raw: p, // Store raw data for reference
      };

      const doc = await Player.findOneAndUpdate(
        { PlayerID: p.id },
        { $set: update },
        {
          new: true,
          upsert: true,
        }
      );

      if (doc) {
        upsertCount++;
      }
    }
    
    // Get next cursor from metadata
    const nextCursor = meta.next_cursor || null;
    
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);
    
    // Guard: Break if no more pages (cursor is null or no players returned)
    if (!nextCursor || players.length === 0) {
      console.log(`✅ Reached end of pagination (${nextCursor ? 'no players' : 'no next_cursor'})`);
      break;
    }
    
    // Store previous cursor and update to next
    previousCursor = cursor;
    cursor = nextCursor;
  }

  console.log(`✅ Synced ${upsertCount} players for team ${teamAbbrev} in ${pageCount} pages`);
  
  // Return the shape the controller expects
  return upsertCount;
}

/**
 * Function to sync weekly data for a specific team
 */
async function syncWeeklyForTeam(season, week, teamAbbrev) {
  console.log(`Syncing weekly data for team: ${teamAbbrev}, season: ${season}, week: ${week}`);
  // For now, just sync the team players
  const count = await syncTeamPlayers(teamAbbrev);
  return { season, week, teamAbbrev, syncedPlayers: count };
}

/**
 * Function to sync all teams for a specific week
 */
async function syncAllTeamsForWeek(season, week, options = {}) {
  console.log(`Syncing all teams for season: ${season}, week: ${week}`);
  const concurrency = options.concurrency || 2;
  
  // List of all NFL team abbreviations
  const teams = [
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"
  ];
  
  const results = [];
  
  // Process teams with concurrency limit
  for (let i = 0; i < teams.length; i += concurrency) {
    const batch = teams.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(teamAbbrev => 
        syncWeeklyForTeam(season, week, teamAbbrev)
          .catch(err => {
            console.error(`Error syncing team ${teamAbbrev}:`, err.message);
            return { season, week, teamAbbrev, error: err.message };
          })
      )
    );
    results.push(...batchResults);
  }

  const successCount = results.filter(r => !r.error).length;
  const errorCount = results.filter(r => r.error).length;
  
  console.log(`✅ Sync complete: ${successCount} teams synced, ${errorCount} errors`);

  return { season, week, results, successCount, errorCount };
}

module.exports = {
  syncPlayers,
  syncTeamPlayers,
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
};