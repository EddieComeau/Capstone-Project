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
  const PlayerToUse = PlayerModel || Player;
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let synced = 0;
  let fetched = 0;
  const maxPages = Number(options.maxPages || 50);
  let pageCount = 0;
  let previousCursor = null;

  console.log('Starting syncPlayers...');

  while (pageCount < maxPages) {
    pageCount += 1;
    console.log(`📄 Fetching page ${pageCount}, cursor: ${cursor || 'null (first page)'}`);

    const params = { ...options, per_page };
    if (cursor) params.cursor = cursor;

    const payload = await ballDontLieService.listPlayers(params);

    const data = payload && payload.data ? payload.data : payload;
    const meta = payload && payload.meta ? payload.meta : {};

    const players = Array.isArray(data) ? data : [];
    fetched += players.length;

    console.log(`   Received ${players.length} players`);

    if (cursor && cursor === previousCursor) {
      console.warn(`⚠️ Cursor didn't change, breaking to prevent infinite loop`);
      break;
    }

    for (const p of players) {
      const doc = {
        PlayerID: p.id,             // legacy / compatibility field
        bdlId: p.id,                // canonical field in our schema
        first_name: p.first_name || "Unknown",
        last_name: p.last_name || "Unknown",
        full_name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        position: p.position || "",
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

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);
    if (!nextCursor || players.length === 0) {
      console.log(`✅ Reached end of pagination (${nextCursor ? 'no players' : 'no next_cursor'})`);
      break;
    }

    previousCursor = cursor;
    cursor = nextCursor;
  }

  console.log(`✅ Synced ${synced} players in ${pageCount} pages`);

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
 */
async function syncTeamPlayers(teamAbbrev) {
  console.log(`Starting sync for ALL players (team filter temporarily disabled)`);
  console.log(`Note: Team parameter '${teamAbbrev}' is currently ignored`);
  
  const { teamDoc, raw } = await ensureTeam(teamAbbrev);
  
  console.log(`Fetching all players from Ball Don't Lie API...`);
  
  let upsertCount = 0;
  let cursor = null;
  let pageCount = 0;
  const maxPages = 50;
  let previousCursor = null;

  while (pageCount < maxPages) {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}, cursor: ${cursor || 'null (first page)'}`);

    const params = {
      per_page: 100,
      // team_ids: [raw.id], // enable after pagination verified
    };

    if (cursor) {
      params.cursor = cursor;
    }

    const response = await bdlList("/nfl/v1/players", params);
    const players = response.data || [];
    const meta = response.meta || {};

    console.log(`   Received ${players.length} players`);

    if (cursor && cursor === previousCursor) {
      console.warn(`⚠️ Cursor didn't change, breaking to prevent infinite loop`);
      break;
    }

    for (const p of players) {
      if (!p.id) {
        console.warn(`⚠️ Skipping player with missing ID:`, p);
        continue;
      }

      const update = {
        PlayerID: p.id, // legacy compatibility — prevents duplicate-null unique index errors
        bdlId: p.id,
        first_name: p.first_name || "Unknown",
        last_name: p.last_name || "Unknown",
        full_name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        position: p.position || "",
        team: p.team || null,
        raw: p,
        updatedAt: new Date(),
      };

      const doc = await Player.findOneAndUpdate(
        { bdlId: p.id },
        { $set: update },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      if (doc) {
        upsertCount++;
      }
    }

    const nextCursor = meta.next_cursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);
    if (!nextCursor || players.length === 0) {
      console.log(`✅ Reached end of pagination (${nextCursor ? 'no players' : 'no next_cursor'})`);
      break;
    }

    previousCursor = cursor;
    cursor = nextCursor;
  }

  console.log(`✅ Synced ${upsertCount} total players in ${pageCount} pages`);
  console.log(`⚠️ Note: Synced ALL players, not just ${teamAbbrev} (team filter disabled)`);
  return upsertCount;
}

/* other helper functions unchanged (syncWeeklyForTeam, syncAllTeamsForWeek) */

async function syncWeeklyForTeam(season, week, teamAbbrev) {
  console.log(`Syncing weekly data for team: ${teamAbbrev}, season: ${season}, week: ${week}`);
  const count = await syncTeamPlayers(teamAbbrev);
  return { season, week, teamAbbrev, syncedPlayers: count };
}

async function syncAllTeamsForWeek(season, week, options = {}) {
  console.log(`Syncing all teams for season: ${season}, week: ${week}`);
  const concurrency = options.concurrency || 2;
  
  const teams = [
    "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE",
    "DAL","DEN","DET","GB","HOU","IND","JAX","KC",
    "LAC","LAR","LV","MIA","MIN","NE","NO","NYG",
    "NYJ","PHI","PIT","SEA","SF","TB","TEN","WAS"
  ];
  
  const results = [];
  for (let i = 0; i < teams.length; i += concurrency) {
    const batch = teams.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(teamAbbrev => 
        syncWeeklyForTeam(season, week, teamAbbrev)
          .catch(err => ({ season, week, teamAbbrev, error: err.message }))
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
