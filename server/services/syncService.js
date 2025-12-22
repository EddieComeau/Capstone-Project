// server/services/syncService.js
// All syncing logic centralized here.

const ballDontLieService = require('./ballDontLieService');
const { ensureTeam } = require("../utils/teamUtils");
const { bdlList } = require("../utils/apiUtils");
const Player = require("../models/Player");

/**
 * Bulk batch size for Mongo bulkWrite; tune with env SYNC_BULK_BATCH_SIZE
 */
const BULK_BATCH_SIZE = Number(process.env.SYNC_BULK_BATCH_SIZE || 500);

/** Helper to flush bulk ops array via Player.bulkWrite */
async function flushBulkOps(bulkOpsArr) {
  if (!bulkOpsArr || bulkOpsArr.length === 0) return { executed: 0, result: null };
  const ops = bulkOpsArr.splice(0, bulkOpsArr.length);
  try {
    const res = await Player.bulkWrite(ops, { ordered: false });
    return { executed: ops.length, result: res };
  } catch (err) {
    console.error('❌ bulkWrite error:', err && err.message ? err.message : err);
    // return executed count as attempted length
    return { executed: ops.length, result: err };
  }
}

/**
 * Sync all players (no team filter). Uses /nfl/v1/players and cursor pagination.
 * Returns { ok, fetched, upsertCount, pages, next_cursor }.
 */
async function syncPlayers(options = {}, { PlayerModel } = {}) {
  const PlayerToUse = PlayerModel || Player;
  const per_page = Number(options.per_page || 100);

  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000); // keep high if you truly want whole league
  let pageCount = 0;
  let previousCursor = null;

  console.log('Starting syncPlayers (ALL TEAMS)...');

  while (pageCount < maxPages) {
    pageCount += 1;

    const params = { per_page };
    if (cursor) params.cursor = cursor;

    // Log what we are requesting (important for debugging)
    console.log(`📄 Fetching page ${pageCount} with params:`, JSON.stringify(params));

    // Use the canonical players endpoint (no team filter)
    const response = await bdlList('/nfl/v1/players', params);

    const players = (response && response.data) ? response.data : (Array.isArray(response) ? response : []);
    const meta = (response && response.meta) ? response.meta : {};

    fetched += players.length;
    console.log(`   Received ${players.length} players`);

    // Guard: break on stuck cursor
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; breaking to prevent infinite loop');
      break;
    }

    // Build bulk ops
    const bulkOps = [];
    for (const p of players) {
      if (!p || !p.id) {
        console.warn('⚠️ Skipping player with missing id:', p);
        continue;
      }

      const update = {
        PlayerID: p.id,
        bdlId: p.id,
        first_name: p.first_name || 'Unknown',
        last_name: p.last_name || 'Unknown',
        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        position: p.position || '',
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

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOps(bulkOps);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);

    if (!nextCursor || players.length === 0) {
      console.log('✅ Reached end of pagination');
      cursor = nextCursor;
      break;
    }

    previousCursor = cursor;
    cursor = nextCursor;
  }

  console.log(`✅ syncPlayers complete — fetched: ${fetched}, upserted (approx): ${upsertCount}, pages: ${pageCount}`);

  return { ok: true, fetched, upsertCount, pages: pageCount, next_cursor: cursor };
}

/**
 * Sync players for a specific team (keeps team filter).
 * Returns { upsertCount, next_cursor }
 */
async function syncTeamPlayers(teamAbbrev) {
  console.log(`Starting syncTeamPlayers for ${teamAbbrev}...`);

  const { teamDoc, raw } = await ensureTeam(teamAbbrev);
  const teamId = raw && raw.id ? raw.id : null;

  if (!teamId) {
    throw new Error(`Cannot determine BallDontLie team id for ${teamAbbrev}`);
  }

  console.log(`Using BDL team id ${teamId} for ${teamAbbrev}`);

  let upsertCount = 0;
  let cursor = null;
  let pageCount = 0;
  const maxPages = Number(process.env.SYNC_MAX_PAGES || 1000);
  let previousCursor = null;

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page: 100, team_ids: [teamId] };
    if (cursor) params.cursor = cursor;

    console.log(`📄 Fetching team ${teamAbbrev} page ${pageCount} params:`, JSON.stringify(params));

    const response = await bdlList('/nfl/v1/players', params);
    const players = (response && response.data) ? response.data : [];
    const meta = (response && response.meta) ? response.meta : {};

    console.log(`   Received ${players.length} players for team ${teamAbbrev}`);

    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; breaking to prevent infinite loop');
      break;
    }

    const bulkOps = [];
    for (const p of players) {
      if (!p || !p.id) {
        console.warn('⚠️ Skipping player with missing id:', p);
        continue;
      }

      const update = {
        PlayerID: p.id,
        bdlId: p.id,
        first_name: p.first_name || 'Unknown',
        last_name: p.last_name || 'Unknown',
        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        position: p.position || '',
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

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOps(bulkOps);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);

    if (!nextCursor || players.length === 0) {
      cursor = nextCursor;
      break;
    }

    previousCursor = cursor;
    cursor = nextCursor;
  }

  console.log(`✅ syncTeamPlayers complete for ${teamAbbrev} — upserted (approx): ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, next_cursor: cursor };
}

/* Weekly/team batch helpers (unchanged) */

async function syncWeeklyForTeam(season, week, teamAbbrev) {
  console.log(`Syncing weekly data for ${teamAbbrev} season ${season} week ${week}`);
  const res = await syncTeamPlayers(teamAbbrev);
  return { season, week, teamAbbrev, syncedPlayers: res.upsertCount, next_cursor: res.next_cursor };
}

/* Sync all teams sequentially in batches of concurrency */
async function syncAllTeamsForWeek(season, week, options = {}) {
  console.log(`Syncing all teams for season ${season} week ${week}`);
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
