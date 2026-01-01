// server/services/syncService.js
// Centralized sync logic for players, teams, games, and per‑game stats
// using the Ball Don't Lie NFL API.  This module provides functions
// to sync players, games, stats, and weekly team player data.  It
// leverages cursor‑based pagination and Mongo bulkWrite for performance.

const ballDontLieService = require('./ballDontLieService');
const { ensureTeam } = require('../utils/teamUtils');
const { bdlList } = require('../utils/apiUtils');

const Player = require('../models/Player');
const Game = require('../models/Game');
const Stat = require('../models/Stat');

/**
 * Bulk batch size for Mongo bulkWrite; can be tuned via SYNC_BULK_BATCH_SIZE
 */
const BULK_BATCH_SIZE = Number(process.env.SYNC_BULK_BATCH_SIZE || 500);

/**
 * Flush bulk ops helper for a specific Mongoose model.  Executes the
 * accumulated operations and resets the array.
 */
async function flushBulkOpsForModel(bulkOpsArr, model) {
  if (!bulkOpsArr || bulkOpsArr.length === 0) return { executed: 0, result: null };
  const ops = bulkOpsArr.splice(0, bulkOpsArr.length);
  try {
    const res = await model.bulkWrite(ops, { ordered: false });
    return { executed: ops.length, result: res };
  } catch (err) {
    console.error(`❌ bulkWrite failed for model ${model.modelName}:`, err && err.message ? err.message : err);
    return { executed: ops.length, result: err };
  }
}

/* -------------------------------------------------------------------------- */
/*                             Player sync functions                          */
/* -------------------------------------------------------------------------- */

/**
 * Sync players across the whole BDL players endpoint (no team filter).
 * options: { per_page, cursor, maxPages }
 * Returns { ok, fetched, upsertCount, pages, next_cursor }
 */
async function syncPlayers(options = {}, { PlayerModel } = {}) {
  const PlayerToUse = PlayerModel || Player;
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let previousCursor = null;

  console.log('🔁 syncPlayers (ALL TEAMS) starting...');

  while (pageCount < maxPages) {
    pageCount += 1;
    const params = { per_page };
    if (cursor) params.cursor = cursor;

    console.log(`📄 Fetching player page ${pageCount} params:`, JSON.stringify(params));
    const payload = await ballDontLieService.listPlayers(params);
    const players = payload && payload.data ? payload.data : Array.isArray(payload) ? payload : [];
    const meta = payload && payload.meta ? payload.meta : {};

    fetched += players.length;
    console.log(`   Received ${players.length} players`);

    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting to avoid infinite loop');
      break;
    }

    const bulkOps = [];
    for (const p of players) {
      if (!p || !p.id) {
        console.warn('⚠️ Skipping invalid player record', p);
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
        },
      });
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, PlayerToUse);
        upsertCount += executed;
      }
    }
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, PlayerToUse);
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
  console.log(`✅ syncPlayers complete — fetched: ${fetched}, upserted (approx): ${upsertCount}, pages: ${pageCount}`);
  return { ok: true, fetched, upsertCount, pages: pageCount, next_cursor: cursor };
}

/**
 * Sync players for a single team (filters by team_ids).  Returns
 * { upsertCount, next_cursor }.
 */
async function syncTeamPlayers(teamAbbrev) {
  console.log(`🔁 syncTeamPlayers starting for ${teamAbbrev}...`);
  const { teamDoc, raw } = await ensureTeam(teamAbbrev);
  const teamId = raw && raw.id ? raw.id : null;
  if (!teamId) throw new Error(`Cannot determine BallDontLie team id for ${teamAbbrev}`);
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
    const payload = await ballDontLieService.listPlayers(params);
    const players = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    console.log(`   Received ${players.length} players for ${teamAbbrev}`);
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting.');
      break;
    }
    const bulkOps = [];
    for (const p of players) {
      if (!p || !p.id) continue;
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
        },
      });
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Player);
        upsertCount += executed;
      }
    }
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Player);
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

/**
 * Sync all NFL teams using the Ball Don't Lie NFL /teams endpoint.
 * This function fetches every team (optionally filtered by division or conference)
 * and upserts them into the Team collection.  The API currently does not
 * support pagination, so this call retrieves all teams in one request【622477558119146†L5603-L5620】.
 *
 * options: { division, conference }
 * Returns { upsertCount, fetched }
 */
async function syncTeams(options = {}, { TeamModel } = {}) {
  const TeamToUse = TeamModel || require('../models/Team');
  const params = {};
  if (options.division) params.division = options.division;
  if (options.conference) params.conference = options.conference;
  console.log('🔁 syncTeams starting...');
  const response = await ballDontLieService.listTeams(params);
  // The /nfl/v1/teams endpoint returns an array under data without pagination
  const teams = response && response.data ? response.data : Array.isArray(response) ? response : [];
  console.log(`   Received ${teams.length} teams`);
  let upsertCount = 0;
  const bulkOps = [];
  for (const t of teams) {
    if (!t || typeof t.id === 'undefined') continue;
    // Map Ball Don't Lie fields to our Team model fields
    const update = {
      ballDontLieTeamId: t.id,
      name: t.name || '',
      abbreviation: t.abbreviation || '',
      conference: t.conference || null,
      division: t.division || null,
      city: t.city || t.location || null,
      fullName: t.full_name || null,
      updatedAt: new Date(),
    };
    bulkOps.push({
      updateOne: {
        filter: { ballDontLieTeamId: t.id },
        update: { $set: update, $setOnInsert: { createdAt: new Date() } },
        upsert: true,
      },
    });
    // Flush in batches if needed
    if (bulkOps.length >= BULK_BATCH_SIZE) {
      const { executed } = await flushBulkOpsForModel(bulkOps, TeamToUse);
      upsertCount += executed;
    }
  }
  if (bulkOps.length > 0) {
    const { executed } = await flushBulkOpsForModel(bulkOps, TeamToUse);
    upsertCount += executed;
  }
  console.log(`✅ syncTeams complete — upserted (approx): ${upsertCount}`);
  return { upsertCount, fetched: teams.length };
}

/* -------------------------------------------------------------------------- */
/*                               Games & Stats sync                            */
/* -------------------------------------------------------------------------- */

/**
 * Sync games (GET /nfl/v1/games).  Returns
 * { upsertCount, fetched, pages, next_cursor }
 */
async function syncGames(options = {}) {
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let previousCursor = null;
  console.log('🔁 syncGames starting...');
  while (pageCount < maxPages) {
    pageCount++;
    // Build query params for the games endpoint.  Support filtering by a
    // single season (options.season) or multiple seasons (options.seasons)
    // according to the Ball Don't Lie API (which expects seasons[]=YYYY).  If
    // no season is provided, the API returns games across all seasons.  See
    // docs: https://nfl.balldontlie.io/#get-all-games for details【469995465038675†L739-L749】.
    const params = { per_page };
    if (options.seasons && Array.isArray(options.seasons) && options.seasons.length) {
      params.seasons = options.seasons;
    } else if (options.season) {
      // Accept season as a single year number or string
      params.seasons = [options.season];
    }
    if (cursor) params.cursor = cursor;
    console.log(`📄 Fetching games page ${pageCount} params:`, JSON.stringify(params));
    const response = await ballDontLieService.listGames(params);
    const games = response && response.data ? response.data : [];
    const meta = response && response.meta ? response.meta : {};
    fetched += games.length;
    console.log(`   Received ${games.length} games`);
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting.');
      break;
    }
    const bulkOps = [];
    for (const g of games) {
      if (!g || !g.id) continue;
      const update = {
        gameId: g.id,
        date: g.date ? new Date(g.date) : null,
        season: g.season || null,
        week: g.week || null,
        status: g.status || null,
        home_team: g.home_team || null,
        visitor_team: g.visitor_team || null,
        score: g.score || null,
        raw: g,
        updatedAt: new Date(),
      };
      bulkOps.push({
        updateOne: {
          filter: { gameId: g.id },
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      });
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Game);
        upsertCount += executed;
      }
    }
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Game);
      upsertCount += executed;
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);
    if (!nextCursor || games.length === 0) {
      cursor = nextCursor;
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`✅ syncGames complete — fetched: ${fetched}, upserted (approx): ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/**
 * Sync stats (GET /nfl/v1/stats).  Upserts stat records keyed by
 * statId if present, otherwise by composite (gameId + playerId).
 * Returns { upsertCount, fetched, pages, next_cursor }
 */
async function syncStats(options = {}) {
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let previousCursor = null;
  console.log('🔁 syncStats starting...');
  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    // If a season filter is provided, include it in the API query. This
    // limits the stats to that season (e.g., 2025 or 2024) and avoids
    // fetching older data. Without this, the stats endpoint will return
    // records across all seasons. See syncAllButStats.js for how the
    // season parameter is passed.
    if (options.season) params.season = options.season;
    if (cursor) params.cursor = cursor;
    console.log(`📄 Fetching stats page ${pageCount} params:`, JSON.stringify(params));
    const response = await ballDontLieService.listStats(params);
    const stats = response && response.data ? response.data : [];
    const meta = response && response.meta ? response.meta : {};
    fetched += stats.length;
    console.log(`   Received ${stats.length} stat records`);
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting.');
      break;
    }
    const bulkOps = [];
    for (const s of stats) {
      if (!s) continue;
      const statId = s.id || null;
      const gameId = s.game_id || (s.game && s.game.id) || null;
      const playerId = s.player_id || (s.player && s.player.id) || null;
      const teamId = s.team_id || (s.team && s.team.id) || null;
      const update = {
        statId,
        gameId,
        playerId,
        teamId,
        season: s.season || null,
        week: s.week || null,
        stats: s.stats || s || {},
        raw: s,
        updatedAt: new Date(),
      };
      let filter;
      if (statId) filter = { statId };
      else if (gameId && playerId) filter = { gameId, playerId };
      else {
        console.warn('⚠️ Skipping stat record without statId or (gameId+playerId):', s);
        continue;
      }
      bulkOps.push({
        updateOne: {
          filter,
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      });
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Stat);
        upsertCount += executed;
      }
    }
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Stat);
      upsertCount += executed;
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);
    if (!nextCursor || stats.length === 0) {
      cursor = nextCursor;
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`✅ syncStats complete — fetched: ${fetched}, upserted (approx): ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------------------------------------------------------------- */
/*                        Weekly / multi-team helpers                         */
/* -------------------------------------------------------------------------- */

/**
 * Sync weekly data for a single team.  Currently delegates to syncTeamPlayers.
 */
async function syncWeeklyForTeam(season, week, teamAbbrev) {
  console.log(`🔁 syncWeeklyForTeam: ${teamAbbrev} season ${season} week ${week}`);
  const res = await syncTeamPlayers(teamAbbrev);
  return { season, week, teamAbbrev, syncedPlayers: res.upsertCount, next_cursor: res.next_cursor };
}

/**
 * Sync multiple teams for a week with optional concurrency (sequential by default).
 */
async function syncAllTeamsForWeek(season, week, options = {}) {
  console.log(`🔁 syncAllTeamsForWeek: season ${season} week ${week}`);
  const concurrency = options.concurrency || 2;
  const teams = [
    'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
    'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
    'LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
    'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
  ];
  const results = [];
  for (let i = 0; i < teams.length; i += concurrency) {
    const batch = teams.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(teamAbbrev =>
        syncWeeklyForTeam(season, week, teamAbbrev).catch(err => {
          console.error(`❌ Error syncing team ${teamAbbrev}:`, err && err.message ? err.message : err);
          return { season, week, teamAbbrev, error: err && err.message ? err.message : String(err) };
        })
      )
    );
    results.push(...batchResults);
  }
  const successCount = results.filter(r => !r.error).length;
  const errorCount = results.filter(r => r.error).length;
  console.log(`✅ syncAllTeamsForWeek complete: ${successCount} success, ${errorCount} errors`);
  return { season, week, results, successCount, errorCount };
}

/* -------------------------------------------------------------------------- */
/*                            Injuries sync function                          */
/* -------------------------------------------------------------------------- */

/**
 * Sync player injuries from the Ball Don't Lie API.
 *
 * This function fetches pages of injury data from the upstream API and
 * upserts each record into the Injury collection.  The unique key is
 * determined by the player id and injury date.  Duplicate entries for
 * the same player on the same date will be updated rather than inserted.
 *
 * @param {Object} options Optional settings: per_page (default 100), cursor, maxPages
 * @returns {Promise<Object>} Summary of records fetched and upserted, plus next_cursor
 */
async function syncInjuries(options = {}) {
  const Injury = require('../models/Injury');
  const sportsdata = require('./sportsdataService');
  let fetched = 0;
  let upsertCount = 0;
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let previousCursor = null;
  console.log('🔁 syncInjuries starting...');
  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    console.log(`📄 Fetching injuries page ${pageCount} params:`, JSON.stringify(params));
    const response = await sportsdata.getPlayerInjuries(params);
    const injuries = response && response.data ? response.data : [];
    const meta = response && response.meta ? response.meta : {};
    fetched += injuries.length;
    console.log(`   Received ${injuries.length} injuries`);
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting.');
      break;
    }
    const bulkOps = [];
    for (const inj of injuries) {
      if (!inj || !inj.player || !inj.player.id) continue;
      const playerId = inj.player.id;
      const date = inj.date ? new Date(inj.date) : null;
      const filter = { 'player.id': playerId, date };
      const update = {
        player: inj.player,
        status: inj.status || null,
        comment: inj.comment || null,
        date,
        bdlId: playerId,
        updatedAt: new Date(),
      };
      bulkOps.push({
        updateOne: {
          filter,
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      });
    }
    if (bulkOps.length > 0) {
      try {
        const result = await Injury.bulkWrite(bulkOps, { ordered: false });
        // nUpserted is undefined in Mongoose 5; we estimate upserts by counting ops
        upsertCount += (result.nUpserted || result.nInserted || bulkOps.length);
      } catch (err) {
        console.error('❌ bulkWrite failed for Injury:', err && err.message ? err.message : err);
      }
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null (last page)'}`);
    if (!nextCursor || injuries.length === 0) {
      cursor = nextCursor;
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`✅ syncInjuries complete — fetched: ${fetched}, upserted (approx): ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------------------------------------------------------------- */
/*                                    Exports                                  */
/* -------------------------------------------------------------------------- */

module.exports = {
  syncPlayers,
  syncTeamPlayers,
  syncGames,
  syncStats,
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
  syncTeams,
  syncInjuries,
};