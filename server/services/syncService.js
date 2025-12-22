// server/services/syncService.js
// All syncing logic centralized here.

const ballDontLieService = require('./ballDontLieService');
const { ensureTeam } = require("../utils/teamUtils");
const { bdlList } = require("../utils/apiUtils");
const Player = require("../models/Player");

/**
 * A comfortable bulk batch size for Mongo bulkWrite; tune if needed.
 * Can be overridden with env var SYNC_BULK_BATCH_SIZE
 */
const BULK_BATCH_SIZE = Number(process.env.SYNC_BULK_BATCH_SIZE || 500);

/**
 * Helper: flush bulk operations to MongoDB
 */
async function flushBulkOps(bulkOps) {
  if (!bulkOps || bulkOps.length === 0) return { executed: 0, result: null };
  const opsToExec = bulkOps.splice(0, bulkOps.length);
  try {
    const res = await Player.bulkWrite(opsToExec, { ordered: false });
    return { executed: opsToExec.length, result: res };
  } catch (err) {
    console.error("❌ bulkWrite failed:", err.message || err);
    // Still return executed as ops length since attempt was made
    return { executed: opsToExec.length, result: err };
  }
}

/**
 * Sync players from Ball Don't Lie NFL API (generic/all players sync).
 *
 * Returns an object:
 * { ok: true, fetched, upsertCount, pages, next_cursor }
 */
async function syncPlayers(options = {}, { PlayerModel } = {}) {
  const PlayerToUse = PlayerModel || Player;
  const per_page = Number(options.per_page || 100);

  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;

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

    // Build bulk ops
    const bulkOps = [];
    for (const p of players) {
      if (!p || !p.id) {
        console.warn(`⚠️ Skipping player with missing ID:`, p);
        continue;
      }

      const update = {
        PlayerID: p.id,
        bdlId: p.id,
        first_name: p.first_name || "Unknown",
        last_name: p.last_name || "Unknown",
        full_name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        position: p.position || "",
        team: p.team || null,
        raw: p,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { bdlId: p.id },
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        }
      });

      // Flush in batches
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOps(bulkOps);
        upsertCount += executed;
      }
    }

    // Flush remaining
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOps(bulkOps);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);

    if (!nextCursor || players.length === 0) {
      console.log(`✅ Reached end of pagination (${nextCursor ? 'no players' : 'no next_cursor'})`);
      cursor = nextCursor;
      break;
    }

    previousCursor = cursor;
    cursor = nextCursor;
  }

  console.log(`✅ Synced ${upsertCount} players in ${pageCount} pages`);

  return {
    ok: true,
    fetched,
    upsertCount,
    pages: pageCount,
    next_cursor: cursor,
  };
}

/**
 * Sync players for a specific team using the Ball Don't Lie team's id.
 *
 * Re-enabled team filter to only sync players for given team.
 * Uses bulkWrite for faster upserts.
 *
 * Returns { upsertCount, next_cursor }
 */
async function syncTeamPlayers(teamAbbrev) {
  console.log(`Starting sync for ALL players (team filter temporarily disabled)`);
  console.log(`Note: Team parameter '${teamAbbrev}' is currently ignored for pagination verification, but we'll use it to filter results.`);

  // Ensure team exists in database (or create it)
  const { teamDoc, raw } = await ensureTeam(teamAbbrev);

  console.log(`Fetching all players from Ball Don't Lie API for team ${teamAbbrev} (team id=${raw?.id})...`);

  let upsertCount = 0;
  let cursor = null;
  let pageCount = 0;
  const maxPages = 50;
  let previousCursor = null;

  while (pageCount < maxPages) {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}, cursor: ${cursor || 'null (first page)'}`);

    // Re-enabled team_ids filter using BDL team id (raw.id)
    const params = {
      per_page: 100,
      team_ids: raw && raw.id ? [ raw.id ] : undefined,
    };

    if (cursor) params.cursor = cursor;

    const response = await bdlList("/nfl/v1/players", params);

    const players = response && response.data ? response.data : [];
    const meta = response && response.meta ? response.meta : {};

    console.log(`   Received ${players.length} players`);

    if (cursor && cursor === previousCursor) {
      console.warn(`⚠️ Cursor didn't change, breaking to prevent infinite loop`);
      break;
    }

    // Prepare bulk ops
    const bulkOps = [];

    for (const p of players) {
      if (!p || !p.id) {
        console.warn(`⚠️ Skipping player with missing ID:`, p);
        continue;
      }

      const update = {
        PlayerID: p.id,
        bdlId: p.id,
        first_name: p.first_name || "Unknown",
        last_name: p.last_name || "Unknown",
        full_name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        position: p.position || "",
        team: p.team || null,
        raw: p,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { bdlId: p.id },
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        }
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOps(bulkOps);
        upsertCount += executed;
      }
    }

    // Flush any remaining bulk ops
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOps(bulkOps);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);

    if (!nextCursor || players.length === 0) {
      console.log(`✅ Reached end of pagination (${nextCursor ? 'no players' : 'no next_cursor'})`);
      cursor = nextCursor;
      break;
    }

    previousCursor = cursor;
    cursor = nextCursor;
  }

  console.log(`✅ Synced ${upsertCount} total players in ${pageCount} pages`);
  console.log(`⚠️ Note: Synced players for team ${teamAbbrev} (team filter enabled)`);

  // Return an object that can be used to resume if desired
  return { upsertCount, next_cursor: cursor };
}

/**
 * Function to sync weekly data for a specific team
 */
async function syncWeeklyForTeam(season, week, teamAbbrev) {
  console.log(`Syncing weekly data for team: ${teamAbbrev}, season: ${season}, week: ${week}`);
  const result = await syncTeamPlayers(teamAbbrev);
  return { season, week, teamAbbrev, syncedPlayers: result.upsertCount, next_cursor: result.next_cursor };
}

/**
 * Function to sync all teams for a specific week
 */
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
