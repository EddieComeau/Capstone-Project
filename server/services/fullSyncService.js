// server/services/fullSyncService.js
//
// Comprehensive sync logic for Ball Don't Lie NFL endpoints covering
// team season stats, team game stats, player season stats, odds,
// player props, and play‑by‑play.  This module builds on top of
// existing syncService (players/games/stats) and desiredService
// (advanced stats/injuries) to provide a one‑stop function to sync
// all data for a set of seasons.  The goal is to keep your MongoDB
// collections current for both the current and prior seasons.

const ballDontLieService = require('./ballDontLieService');
const { syncPlayers, syncGames, syncStats } = require('./syncService');
const desiredService = require('./desiredService');

const TeamSeasonStat = require('../models/TeamSeasonStat');
const TeamStat = require('../models/TeamStat');
const SeasonStat = require('../models/SeasonStat');
const Play = require('../models/Play');
const Odds = require('../models/Odds');
const PlayerProp = require('../models/PlayerProp');
const Game = require('../models/Game');

// Maximum number of items to include in a single API call.  BDL caps
// per_page at 100 for most endpoints.  Adjust via environment if
// needed.
const PER_PAGE = Number(process.env.SYNC_BULK_BATCH_SIZE || 100);

/**
 * Retrieve all NFL team IDs from BallDon'tLie.  Uses cursor
 * pagination to iterate through the `/nfl/v1/teams` endpoint.
 *
 * Returns an array of numeric team IDs.
 */
async function getAllTeamIds() {
  let cursor = null;
  const ids = [];
  let page = 0;
  while (true) {
    page += 1;
    const params = { per_page: 100 };
    if (cursor) params.cursor = cursor;
    const res = await ballDontLieService.listTeams(params);
    const teams = res && res.data ? res.data : [];
    ids.push(...teams.map(t => t.id || t.team_id || t.TeamID));
    const meta = res && res.meta ? res.meta : {};
    cursor = meta.next_cursor || meta.nextCursor || null;
    if (!cursor || teams.length === 0 || page >= 100) break;
  }
  return Array.from(new Set(ids.filter(id => id != null)));
}

/**
 * Sync team season stats for an array of seasons.  For each season,
 * iterates over all teams and upserts one document per team/season
 * into the TeamSeasonStat collection.  See openapi spec for
 * required params: team_ids (array) and season (integer)
 *【622477558119146†L6383-L6405】.
 *
 * @param {Object} options
 * @param {number[]} options.seasons - seasons to sync (e.g., [2025, 2024])
 * @param {boolean} [options.postseason] - include postseason stats if true
 */
async function syncTeamSeasonStats({ seasons, postseason }) {
  if (!Array.isArray(seasons) || seasons.length === 0) {
    throw new Error('syncTeamSeasonStats: seasons array is required');
  }
  const teamIds = await getAllTeamIds();
  for (const season of seasons) {
    console.log(`🔁 syncTeamSeasonStats: season ${season} — ${teamIds.length} teams`);
    // The API requires team_ids; call per team to avoid URL length issues.
    for (const teamId of teamIds) {
      let cursor = null;
      let pageCount = 0;
      while (true) {
        pageCount += 1;
        const params = { per_page: 100, team_ids: [teamId], season };
        if (postseason !== undefined) params.postseason = postseason;
        if (cursor) params.cursor = cursor;
        const res = await ballDontLieService.listTeamSeasonStats(params);
        const items = res && res.data ? res.data : [];
        const meta = res && res.meta ? res.meta : {};
        // Upsert documents
        const ops = [];
        for (const rec of items) {
          const tId = rec.team_id || (rec.team && rec.team.id) || teamId;
          const s = rec.season || season;
          ops.push({
            updateOne: {
              filter: { teamId: tId, season: s },
              update: {
                $set: {
                  teamId: tId,
                  season: s,
                  stats: rec.stats || rec,
                  raw: rec,
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
              upsert: true,
            },
          });
        }
        if (ops.length) {
          await TeamSeasonStat.bulkWrite(ops, { ordered: false });
        }
        cursor = meta.next_cursor || meta.nextCursor || null;
        if (!cursor || items.length === 0) break;
      }
    }
  }
  console.log('✅ syncTeamSeasonStats complete');
}

/**
 * Sync team game stats for the given seasons.  The `/nfl/v1/team_stats`
 * endpoint allows filtering by seasons (array) and returns one record
 * per team/game【622477558119146†L6438-L6476】.  This function iterates over
 * the provided seasons, paginates through the endpoint, and upserts
 * documents into the TeamStat collection.
 *
 * @param {Object} options
 * @param {number[]} options.seasons - seasons to sync
 */
async function syncTeamStats({ seasons }) {
  if (!Array.isArray(seasons) || seasons.length === 0) {
    throw new Error('syncTeamStats: seasons array is required');
  }
  for (const season of seasons) {
    console.log(`🔁 syncTeamStats: season ${season}`);
    let cursor = null;
    let page = 0;
    while (true) {
      page += 1;
      const params = { per_page: 100, seasons: [season] };
      if (cursor) params.cursor = cursor;
      const res = await ballDontLieService.listTeamStats(params);
      const items = res && res.data ? res.data : [];
      const meta = res && res.meta ? res.meta : {};
      const ops = [];
      for (const rec of items) {
        const teamId = rec.team_id || (rec.team && rec.team.id);
        const gameId = rec.game_id || (rec.game && rec.game.id);
        if (!teamId || !gameId) continue;
        const week = rec.week || (rec.game && rec.game.week) || null;
        const s = rec.season || season;
        const stats = rec.stats || rec;
        ops.push({
          updateOne: {
            filter: { teamId, gameId },
            update: {
              $set: {
                teamId,
                gameId,
                season: s,
                week,
                stats,
                raw: rec,
                updatedAt: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
          },
        });
      }
      if (ops.length) await TeamStat.bulkWrite(ops, { ordered: false });
      cursor = meta.next_cursor || meta.nextCursor || null;
      if (!cursor || items.length === 0) break;
    }
  }
  console.log('✅ syncTeamStats complete');
}

/**
 * Sync player season stats for the given seasons.  The
 * `/nfl/v1/season_stats` endpoint returns aggregated season totals for
 * each player.  This function upserts into the SeasonStat collection.
 *
 * @param {Object} options
 * @param {number[]} options.seasons - seasons to sync
 */
async function syncSeasonStats({ seasons }) {
  if (!Array.isArray(seasons) || seasons.length === 0) {
    throw new Error('syncSeasonStats: seasons array is required');
  }
  for (const season of seasons) {
    console.log(`🔁 syncSeasonStats: season ${season}`);
    let cursor = null;
    let page = 0;
    while (true) {
      page += 1;
      const params = { per_page: 100, season };
      if (cursor) params.cursor = cursor;
      const res = await ballDontLieService.listSeasonStats(params);
      const items = res && res.data ? res.data : [];
      const meta = res && res.meta ? res.meta : {};
      const ops = [];
      for (const rec of items) {
        const playerId = rec.player_id || (rec.player && rec.player.id);
        if (!playerId) continue;
        const s = rec.season || season;
        ops.push({
          updateOne: {
            filter: { playerId, season: s },
            update: {
              $set: {
                playerId,
                season: s,
                stats: rec.stats || rec,
                raw: rec,
                updatedAt: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
          },
        });
      }
      if (ops.length) await SeasonStat.bulkWrite(ops, { ordered: false });
      cursor = meta.next_cursor || meta.nextCursor || null;
      if (!cursor || items.length === 0) break;
    }
  }
  console.log('✅ syncSeasonStats complete');
}

/**
 * Sync play‑by‑play data for the given array of game IDs.  The
 * `/nfl/v1/plays` endpoint requires a game_id and returns plays
 * ordered chronologically【622477558119146†L6499-L6535】.  Upserts into the Play collection.
 *
 * @param {Object} options
 * @param {number[]} options.gameIds - list of game IDs to sync
 */
async function syncPlaysForGames({ gameIds }) {
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    throw new Error('syncPlaysForGames: gameIds array is required');
  }

  for (const gameId of gameIds) {
    console.log(`🔁 syncPlays: game ${gameId}`);
    try {
      let cursor = null;

      while (true) {
        const params = { per_page: 100, game_id: gameId };
        if (cursor) params.cursor = cursor;

        const res = await ballDontLieService.listPlays(params);
        const items = res && res.data ? res.data : [];
        const meta = res && res.meta ? res.meta : {};

        const ops = [];
        for (const rec of items) {
          const playId = rec.id || rec.play_id || rec.playId;
          if (!playId) continue;

          ops.push({
            updateOne: {
              filter: { playId },
              update: {
                $set: {
                  playId,
                  gameId,
                  sequence: rec.sequence || rec.seq || null,
                  clock: rec.clock || null,
                  description: rec.description || rec.desc || '',
                  raw: rec,
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
              upsert: true,
            },
          });
        }

        if (ops.length) await Play.bulkWrite(ops, { ordered: false });

        cursor = meta.next_cursor || meta.nextCursor || null;
        if (!cursor || items.length === 0) break;
      }
    } catch (err) {
      console.warn(
        `⚠️ syncPlays failed for game ${gameId}:`,
        err?.response?.status || '',
        err?.message || err
      );
      continue;
    }
  }

  console.log('✅ syncPlaysForGames complete');
}

/**
 * Sync betting odds for a list of game IDs.  Because the `/nfl/v1/odds`
 * endpoint requires either (season & week) or game_ids【622477558119146†L6201-L6233】,
 * we supply game_ids one at a time.  Upserts into the Odds collection.
 *
 * @param {Object} options
 * @param {number[]} options.gameIds - list of game IDs
 */
async function syncOddsForGames({ gameIds }) {
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    throw new Error('syncOddsForGames: gameIds array is required');
  }

  for (const gameId of gameIds) {
    console.log(`🔁 syncOdds: game ${gameId}`);
    try {
      let cursor = null;

      while (true) {
        const params = { per_page: 100, game_ids: [gameId] };
        if (cursor) params.cursor = cursor;

        const res = await ballDontLieService.listOdds(params);
        const items = res && res.data ? res.data : [];
        const meta = res && res.meta ? res.meta : {};

        const ops = [];
        for (const rec of items) {
          const gId = rec.game_id || gameId;
          const vendor = rec.vendor || (rec.market && rec.market.vendor) || 'unknown';

          ops.push({
            updateOne: {
              filter: { gameId: gId, vendor },
              update: {
                $set: {
                  gameId: gId,
                  vendor,
                  payload: rec,
                  raw: rec,
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
              upsert: true,
            },
          });
        }

        if (ops.length) await Odds.bulkWrite(ops, { ordered: false });

        cursor = meta.next_cursor || meta.nextCursor || null;
        if (!cursor || items.length === 0) break;
      }
    } catch (err) {
      console.warn(
        `⚠️ syncOdds failed for game ${gameId}:`,
        err?.response?.status || '',
        err?.response?.data || '',
        err?.message || err
      );
      continue;
    }
  }

  console.log('✅ syncOddsForGames complete');
}

/**
 * Sync player prop betting odds for a list of game IDs.  The
 * `/nfl/v1/odds/player_props` endpoint requires a game_id【622477558119146†L6256-L6333】.
 * Upserts into the PlayerProp collection keyed by (gameId, playerId,
 * prop_type, vendor).
 *
 * @param {Object} options
 * @param {number[]} options.gameIds - list of game IDs
 */
async function syncPlayerPropsForGames({ gameIds }) {
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    throw new Error('syncPlayerPropsForGames: gameIds array is required');
  }

  for (const gameId of gameIds) {
    console.log(`🔁 syncPlayerProps: game ${gameId}`);
    try {
      let cursor = null;

      while (true) {
        const params = { per_page: 100, game_id: gameId };
        if (cursor) params.cursor = cursor;

        const res = await ballDontLieService.listOddsPlayerProps(params);
        const items = res && res.data ? res.data : [];
        const meta = res && res.meta ? res.meta : {};

        const ops = [];
        for (const rec of items) {
          const gId = rec.game_id || gameId;
          const playerId = rec.player_id || (rec.player && rec.player.id);
          if (!playerId) continue;

          const vendor = rec.vendor || 'unknown';
          const propType = rec.prop_type || rec.propType || 'unknown';

          ops.push({
            updateOne: {
              filter: { gameId: gId, playerId, vendor, prop_type: propType },
              update: {
                $set: {
                  gameId: gId,
                  playerId,
                  vendor,
                  prop_type: propType,
                  value: rec.line_value || rec.value || null,
                  payload: rec,
                  raw: rec,
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
              upsert: true,
            },
          });
        }

        if (ops.length) await PlayerProp.bulkWrite(ops, { ordered: false });

        cursor = meta.next_cursor || meta.nextCursor || null;
        if (!cursor || items.length === 0) break;
      }
    } catch (err) {
      console.warn(
        `⚠️ syncPlayerProps failed for game ${gameId}:`,
        err?.response?.status || '',
        err?.message || err
      );
      continue;
    }
  }

  console.log('✅ syncPlayerPropsForGames complete');
}

/**
 * Top‑level function to sync all relevant BallDon'tLie data for the
 * provided seasons.  This orchestrates the sync of players, games,
 * per‑game stats, season stats, team season stats, team game stats,
 * advanced player metrics (rushing, passing, receiving), odds,
 * player props, play‑by‑play data, injuries, standings, and matchups.
 *
 * Pass `{ seasons: [2025, 2024] }` to sync both the current and
 * previous seasons.  Each step logs progress to the console.
 *
 * @param {Object} options
 * @param {number[]} options.seasons
 */
async function fullSync({ seasons }) {
  if (!Array.isArray(seasons) || seasons.length === 0) {
    throw new Error('fullSync: seasons array is required');
  }
  console.log('🚀 Starting full data sync for seasons:', seasons.join(', '));
  // Step 1: core entities (players, games, per‑game stats)
  await syncPlayers({ per_page: PER_PAGE });
  await syncGames({ per_page: PER_PAGE });
  await syncStats({ per_page: PER_PAGE });
  // Step 2: season aggregates
  await syncSeasonStats({ seasons });
  await syncTeamSeasonStats({ seasons });
  await syncTeamStats({ seasons });
  // Step 3: advanced metrics via desiredService
  for (const season of seasons) {
    for (const type of ['rushing','passing','receiving']) {
      await desiredService.syncAdvancedStatsEndpoint(type, { season, per_page: PER_PAGE });
    }
  }
  // Compute and merge advanced metrics
  await desiredService.computeAdvancedStats();
  // Standings & matchups for all seasons
  await desiredService.computeStandings();
  await desiredService.computeMatchups();
  // Step 4: play‑by‑play, odds, player props and injuries
  // Gather all game IDs for the seasons
  const gameDocs = await Game.find({ season: { $in: seasons } }).lean();
  const gameIds = gameDocs.map(g => g.gameId || g.id).filter(id => id != null);
  await syncPlaysForGames({ gameIds });
  await syncOddsForGames({ gameIds });
  await syncPlayerPropsForGames({ gameIds });
  // Step 5: injuries
  await desiredService.syncInjuriesFromAPI({ per_page: PER_PAGE });
  console.log('🎉 Full data sync complete');
}

module.exports = {
  getAllTeamIds,
  syncTeamSeasonStats,
  syncTeamStats,
  syncSeasonStats,
  syncPlaysForGames,
  syncOddsForGames,
  syncPlayerPropsForGames,
  fullSync,
};