// server/services/derivedService.js
const Game = require('../models/Game');
const Stat = require('../models/Stat');
const Standing = require('../models/Standing');
const AdvancedMetric = require('../models/AdvancedMetric');
const Matchup = require('../models/Matchup');
const Injury = require('../models/Injury');

const TeamSeasonStat = require('../models/TeamSeasonStat');
const Play = require('../models/Play');
const Odds = require('../models/Odds');
const PlayerProp = require('../models/PlayerProp');

const ballDontLieService = require('../services/ballDontLieService');

const BULK_BATCH_SIZE = Number(process.env.SYNC_BULK_BATCH_SIZE || 500);

/* Helper: generic flush for model */
async function flushBulkOpsForModel(bulkOps, model) {
  if (!bulkOps || bulkOps.length === 0) return { executed: 0 };
  const ops = bulkOps.splice(0, bulkOps.length);
  try {
    const res = await model.bulkWrite(ops, { ordered: false });
    return { executed: ops.length, result: res };
  } catch (err) {
    console.error(`❌ bulkWrite failed for ${model.modelName}:`, err && err.message ? err.message : err);
    return { executed: ops.length, result: err };
  }
}

/* -------------------- Standings sync (from API) -------------------- */
/**
 * Sync standings from BallDon'tLie (GET /nfl/v1/standings?season=...)
 * Accepts options: { season, per_page, cursor, maxPages }
 */
async function syncStandingsFromAPI(options = {}) {
  if (!options.season) throw new Error('season is required for standings sync');
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page, season: options.season };
    if (cursor) params.cursor = cursor;

    console.log(`📄 Fetching standings page ${pageCount} params:`, JSON.stringify(params));
    const res = await ballDontLieService.listStandings(params);
    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};

    fetched += items.length;
    const bulkOps = [];

    for (const rec of items) {
      if (!rec || !rec.team_id) continue;
      const teamId = rec.team_id;
      const update = {
        teamId,
        season: options.season,
        wins: rec.wins || 0,
        losses: rec.losses || 0,
        ties: rec.ties || 0,
        pointsFor: rec.points_for || 0,
        pointsAgainst: rec.points_against || 0,
        winPct: rec.win_pct || 0,
        raw: rec,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { teamId, season: options.season },
          update: { $set: update },
          upsert: true,
        }
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Standing);
        upsertCount += executed;
      }
    }

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Standing);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null'}`);
    if (!nextCursor || items.length === 0) {
      cursor = nextCursor;
      break;
    }
    cursor = nextCursor;
  }

  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------- Season stats sync (season_stats endpoint) -------------------- */
async function syncSeasonStats(options = {}) {
  if (!options.season) throw new Error('season is required for season_stats sync');
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page, season: options.season };
    if (cursor) params.cursor = cursor;
    if (options.player_ids) params.player_ids = options.player_ids;
    if (options.team_id) params.team_id = options.team_id;
    if ('postseason' in options) params.postseason = options.postseason;
    if (options.sort_by) params.sort_by = options.sort_by;
    if (options.sort_order) params.sort_order = options.sort_order;

    console.log(`📄 Fetching season_stats page ${pageCount} params:`, JSON.stringify(params));
    const res = await ballDontLieService.listSeasonStats(params);
    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};

    fetched += items.length;

    const bulkOps = [];
    for (const rec of items) {
      // these are season-level player stats
      const playerId = rec.player_id || (rec.player && rec.player.id) || null;
      if (!playerId) continue;
      const season = rec.season || options.season;
      const scope = 'season_stats';
      const update = {
        entityType: 'player',
        entityId: playerId,
        season,
        scope,
        gameCount: rec.games || 0,
        metrics: rec,
        raw: rec,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { entityType: 'player', entityId: playerId, season, scope },
          update: { $set: update },
          upsert: true,
        }
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, AdvancedMetric);
        upsertCount += executed;
      }
    }

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, AdvancedMetric);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null'}`);
    if (!nextCursor || items.length === 0) { cursor = nextCursor; break; }
    cursor = nextCursor;
  }

  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------- Advanced stats endpoints (rushing/passing/receiving) -------------------- */
/**
 * Generic sync for /advanced_stats/{type}
 * type: 'rushing' | 'passing' | 'receiving'
 * options: { season, player_id, postseason, week, per_page, maxPages }
 */
async function syncAdvancedStatsEndpoint(type, options = {}) {
  if (!['rushing','passing','receiving'].includes(type)) throw new Error('invalid advanced stats type');
  if (!options.season) throw new Error('season is required for advanced stats sync');

  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000);

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page, season: options.season };
    if (cursor) params.cursor = cursor;
    if (options.player_id) params.player_id = options.player_id;
    if ('postseason' in options) params.postseason = options.postseason;
    if ('week' in options) params.week = options.week;

    console.log(`📄 Fetching advanced_stats/${type} page ${pageCount} params:`, JSON.stringify(params));
    let res;
    if (type === 'rushing') res = await ballDontLieService.listAdvancedRushing(params);
    if (type === 'passing') res = await ballDontLieService.listAdvancedPassing(params);
    if (type === 'receiving') res = await ballDontLieService.listAdvancedReceiving(params);

    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};

    fetched += items.length;
    const bulkOps = [];

    for (const rec of items) {
      // rec likely contains player and stats; store as AdvancedMetric for player
      const playerId = rec.player_id || (rec.player && rec.player.id) || options.player_id || null;
      if (!playerId) continue;
      const season = rec.season || options.season;
      const scope = `${type}_advanced`;

      const update = {
        entityType: 'player',
        entityId: playerId,
        season,
        scope,
        gameCount: rec.games || 0,
        metrics: rec,
        raw: rec,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { entityType: 'player', entityId: playerId, season, scope },
          update: { $set: update },
          upsert: true,
        }
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, AdvancedMetric);
        upsertCount += executed;
      }
    }

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, AdvancedMetric);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null'}`);
    if (!nextCursor || items.length === 0) { cursor = nextCursor; break; }
    cursor = nextCursor;
  }

  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------- Team season stats (team_season_stats) -------------------- */
async function syncTeamSeasonStats(options = {}) {
  if (!options.season) throw new Error('season is required for team_season_stats sync');
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page, season: options.season };
    if (cursor) params.cursor = cursor;
    if (options.team_ids) params.team_ids = options.team_ids;
    if ('postseason' in options) params.postseason = options.postseason;

    console.log(`📄 Fetching team_season_stats page ${pageCount} params:`, JSON.stringify(params));
    const res = await ballDontLieService.listTeamSeasonStats(params);
    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};

    fetched += items.length;
    const bulkOps = [];

    for (const rec of items) {
      const teamId = rec.team_id || (rec.team && rec.team.id) || null;
      if (!teamId) continue;
      const season = rec.season || options.season;
      const update = {
        teamId,
        season,
        metrics: rec,
        raw: rec,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { teamId, season },
          update: { $set: update },
          upsert: true,
        }
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, TeamSeasonStat);
        upsertCount += executed;
      }
    }

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, TeamSeasonStat);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null'}`);
    if (!nextCursor || items.length === 0) { cursor = nextCursor; break; }
    cursor = nextCursor;
  }

  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------- Team stats (game-level) -------------------- */
async function syncTeamStats(options = {}) {
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    if (options.team_ids) params.team_ids = options.team_ids;
    if (options.seasons) params.seasons = options.seasons;
    if (options.game_ids) params.game_ids = options.game_ids;

    console.log(`📄 Fetching team_stats page ${pageCount} params:`, JSON.stringify(params));
    const res = await ballDontLieService.listTeamStats(params);
    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};

    fetched += items.length;
    const bulkOps = [];
    for (const rec of items) {
      const teamId = rec.team_id || (rec.team && rec.team.id) || null;
      const gameId = rec.game_id || (rec.game && rec.game.id) || null;
      if (!teamId || !gameId) continue;

      const update = {
        teamId,
        gameId,
        season: rec.season || null,
        week: rec.week || null,
        metrics: rec,
        raw: rec,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { teamId, gameId },
          update: { $set: update },
          upsert: true,
        }
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, TeamSeasonStat); // reuse TeamSeasonStat or create TeamGameStat model
        upsertCount += executed;
      }
    }

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, TeamSeasonStat);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null'}`);
    if (!nextCursor || items.length === 0) { cursor = nextCursor; break; }
    cursor = nextCursor;
  }

  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------- Plays (play-by-play) -------------------- */
async function syncPlays(options = {}) {
  // requires game_id parameter ideally; but can page through plays for games when provided
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    if (options.game_id) params.game_id = options.game_id;

    console.log(`📄 Fetching plays page ${pageCount} params:`, JSON.stringify(params));
    const res = await ballDontLieService.listPlays(params);
    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};

    fetched += items.length;
    const bulkOps = [];

    for (const p of items) {
      if (!p || !p.id) continue;
      const update = {
        playId: p.id,
        gameId: p.game_id || (p.game && p.game.id) || null,
        sequence: p.sequence || null,
        clock: p.clock || null,
        description: p.description || null,
        raw: p,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { playId: p.id },
          update: { $set: update },
          upsert: true,
        }
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Play);
        upsertCount += executed;
      }
    }

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Play);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null'}`);
    if (!nextCursor || items.length === 0) { cursor = nextCursor; break; }
    cursor = nextCursor;
  }

  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------- Odds (game-level) -------------------- */
async function syncOdds(options = {}) {
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    if (options.season) params.season = options.season;
    if (options.week) params.week = options.week;
    if (options.game_ids) params.game_ids = options.game_ids;

    console.log(`📄 Fetching odds page ${pageCount} params:`, JSON.stringify(params));
    const res = await ballDontLieService.listOdds(params);
    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};

    fetched += items.length;
    const bulkOps = [];

    for (const o of items) {
      if (!o || !o.id) {
        // Some odd feeds may not provide id per-odds object; use game+vendor as key if possible
      }
      // We'll use a composite key: gameId + provider + market type if provided
      const gameId = o.game_id || null;
      const provider = o.provider || o.vendor || null;
      const keyFilter = (o.id) ? { oddsId: o.id } : { gameId, provider };

      const update = {
        oddsId: o.id || null,
        gameId,
        provider,
        market: o.market || null,
        lines: o.lines || o.prices || null,
        raw: o,
        updatedAt: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: keyFilter,
          update: { $set: update },
          upsert: true,
        }
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Odds);
        upsertCount += executed;
      }
    }

    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Odds);
      upsertCount += executed;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null'}`);
    if (!nextCursor || items.length === 0) { cursor = nextCursor; break; }
    cursor = nextCursor;
  }

  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------- Player props (single-game) -------------------- */
/**
 * This endpoint returns all player props for a given game (no pagination).
 * We'll upsert each prop keyed by gameId+playerId+prop_type+vendor
 */
async function syncPlayerProps(options = {}) {
  if (!options.game_id) throw new Error('game_id is required for player props sync');
  const params = { game_id: options.game_id };
  if (options.player_id) params.player_id = options.player_id;
  if (options.prop_type) params.prop_type = options.prop_type;
  if (options.vendors) params.vendors = options.vendors;

  console.log(`📄 Fetching player props for game ${options.game_id} params:`, JSON.stringify(params));
  const res = await ballDontLieService.listOddsPlayerProps(params);
  const items = res && res.data ? res.data : [];

  let upsertCount = 0;
  const bulkOps = [];
  for (const p of items) {
    const gameId = p.game_id || options.game_id;
    const playerId = p.player_id || (p.player && p.player.id) || null;
    const propType = p.prop_type || null;
    const vendor = p.vendor || null;

    const keyFilter = { gameId, playerId, prop_type: propType, vendor };
    const update = {
      gameId,
      playerId,
      prop_type: propType,
      vendor,
      details: p,
      raw: p,
      updatedAt: new Date(),
    };

    bulkOps.push({
      updateOne: {
        filter: keyFilter,
        update: { $set: update },
        upsert: true,
      }
    });

    if (bulkOps.length >= BULK_BATCH_SIZE) {
      const { executed } = await flushBulkOpsForModel(bulkOps, PlayerProp);
      upsertCount += executed;
    }
  }

  if (bulkOps.length > 0) {
    const { executed } = await flushBulkOpsForModel(bulkOps, PlayerProp);
    upsertCount += executed;
  }

  return { upsertCount, fetched: items.length, pages: 1 };
}

/* -------------------- Injuries (already implemented earlier) -------------------- */
async function syncInjuriesFromAPI(options = {}) {
  // same implementation as we provided previously in our earlier derivedService; reuse or copy here
  // We'll call the dedicated function we already have earlier if present.
  // For safety, we call ballDontLieService.listPlayerInjuries in a cursor loop similar to others.
  const per_page = Number(options.per_page || 100);
  const maxPages = Number(options.maxPages || 1000);
  let cursor = options.cursor || null;
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;
  let previousCursor = null;

  console.log('🔁 syncInjuriesFromAPI: starting...');

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    if (options.team_ids) params.team_ids = options.team_ids;
    if (options.player_ids) params.player_ids = options.player_ids;

    console.log(`📄 Fetching injuries page ${pageCount} params:`, JSON.stringify(params));
    const response = await ballDontLieService.listPlayerInjuries(params);
    const items = response && response.data ? response.data : [];
    const meta = response && response.meta ? response.meta : {};

    fetched += items.length;

    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; stopping.');
      break;
    }

    for (const rec of items) {
      if (!rec || !rec.player) continue;

      const player = rec.player;
      const team = player.team || {};
      const playerId = player.id || null;
      const teamId = team.id || null;
      const status = rec.status || 'Unknown';
      const description = rec.comment || '';
      const reportedAt = rec.date ? new Date(rec.date) : new Date();

      const filter = {};
      if (playerId != null) filter.playerId = playerId;
      if (teamId != null) filter.teamId = teamId;
      if (reportedAt) filter.reportedAt = reportedAt;

      const upsertFilter = (filter.reportedAt) ? filter : { playerId: filter.playerId, teamId: filter.teamId, status };

      const updateDoc = {
        playerId,
        teamId,
        status,
        description,
        source: 'balldontlie',
        reportedAt,
        raw: rec,
        updatedAt: new Date(),
      };

      try {
        await Injury.updateOne(upsertFilter, { $set: updateDoc }, { upsert: true });
        upsertCount++;
      } catch (err) {
        console.warn(`⚠️ Failed to upsert injury for player ${playerId}:`, err && err.message ? err.message : err);
      }
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    console.log(`   Next cursor: ${nextCursor || 'null'}`);
    if (!nextCursor || items.length === 0) { cursor = nextCursor; break; }
    previousCursor = cursor; cursor = nextCursor;
  }

  console.log(`🔁 syncInjuriesFromAPI: done — fetched ${fetched}, upserted ${upsertCount}, pages ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------- Exports -------------------- */
module.exports = {
  syncStandingsFromAPI,
  syncSeasonStats,
  syncAdvancedStatsEndpoint,
  syncTeamSeasonStats,
  syncTeamStats,
  syncPlays,
  syncOdds,
  syncPlayerProps,
  syncInjuriesFromAPI,

  computeStandings,          // existing compute helpers
  computeAdvancedStats,
  computeMatchups,
  syncInjuriesFromArray,
};
