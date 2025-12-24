/**
 * derivedService - robust derived endpoints sync.
 *
 * Defaults to syncing only the last two seasons (current year and previous year)
 * when season(s) are not provided. Functions accept:
 *  - per_page
 *  - dryRun
 *  - maxPages
 *  - seasons (array or number) where appropriate
 *
 * Each function calls ensureDbConnected() and uses safe bulk writes via
 * chunkedBulkUpsert.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bdl = require('./ballDontLieService');

const TeamSeasonStat = require('../models/TeamSeasonStat');
const TeamStat = require('../models/TeamStat');
const AdvancedMetric = require('../models/AdvancedMetric');
const Play = require('../models/Play');
const Odds = require('../models/Odds');
const PlayerProp = require('../models/PlayerProp');
const Injury = require('../models/Injury');

const BULK_BATCH_SIZE = Number(process.env.SYNC_BULK_BATCH_SIZE || 500);
const BULKWRITE_MAX_RETRIES = Number(process.env.BULKWRITE_MAX_RETRIES || 3);
const BULKWRITE_RETRY_BASE_MS = Number(process.env.BULKWRITE_RETRY_BASE_MS || 1000);
const SYNC_PAGE_DELAY_MS = Number(process.env.SYNC_PAGE_DELAY_MS || 200);
const MONGOOSE_BUFFER_TIMEOUT_MS = Number(process.env.MONGOOSE_BUFFER_TIMEOUT_MS || 30000);
const SERVER_SELECTION_TIMEOUT_MS = Number(process.env.SERVER_SELECTION_TIMEOUT_MS || 30000);
const SOCKET_TIMEOUT_MS = Number(process.env.SOCKET_TIMEOUT_MS || 45000);
const MONGO_MAX_POOL_SIZE = Number(process.env.MONGO_MAX_POOL_SIZE || 20);
const SYNC_MAX_PAGES = Number(process.env.SYNC_MAX_PAGES || 1000);

mongoose.set('strictQuery', false);

/* ---------- DB helpers ---------- */
async function ensureDbConnected() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI environment variable is required');
  mongoose.set('bufferTimeoutMS', MONGOOSE_BUFFER_TIMEOUT_MS);
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await waitForConnection(20000);
    if (mongoose.connection.readyState !== 1) throw new Error('Mongoose did not connect in time');
    return;
  }
  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: SOCKET_TIMEOUT_MS,
    maxPoolSize: MONGO_MAX_POOL_SIZE
  };
  await mongoose.connect(uri, opts);
  console.log('🔌 Mongoose connected (derivedService)');
}

function waitForConnection(timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (mongoose.connection.readyState === 1) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('Timed out waiting for mongoose connection'));
      setTimeout(check, 200);
    })();
  });
}

/* ---------- Utility helpers ---------- */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function safeBulkWrite(model, ops, options = { ordered: false, w: 1, wtimeout: 30000 }) {
  if (!ops || ops.length === 0) return;
  let lastErr = null;
  for (let attempt = 1; attempt <= BULKWRITE_MAX_RETRIES; attempt++) {
    try {
      if (mongoose.connection.readyState !== 1) await ensureDbConnected();
      await model.bulkWrite(ops, options);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`bulkWrite attempt ${attempt} failed for ${model.modelName}:`, err && err.message ? err.message : err);
      if (attempt < BULKWRITE_MAX_RETRIES) {
        const delay = BULKWRITE_RETRY_BASE_MS * attempt;
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

async function chunkedBulkUpsert(model, ops) {
  while (ops.length > 0) {
    const slice = ops.splice(0, BULK_BATCH_SIZE);
    await safeBulkWrite(model, slice, { ordered: false, w: 1, wtimeout: 30000 });
    await sleep(SYNC_PAGE_DELAY_MS);
  }
}

function guardCursorProgress(prevCursor, nextCursor) {
  if (!nextCursor && nextCursor !== 0) return { shouldContinue: false };
  if (String(nextCursor) === String(prevCursor)) return { shouldContinue: false, reason: 'cursor did not advance' };
  return { shouldContinue: true };
}

function seasonsDefaultIfEmpty(seasons) {
  if (seasons && Array.isArray(seasons) && seasons.length) return seasons;
  if (seasons && !Array.isArray(seasons)) return [seasons];
  const cur = (new Date()).getFullYear();
  return [cur, cur - 1];
}

/**
 * Helper to fetch all team IDs from the BallDontLie API.
 * This is used when team_ids are not provided for team season stats.
 */
async function getAllTeamIds() {
  await ensureDbConnected();
  const ids = [];
  let cursor = null;
  while (true) {
    const params = { per_page: 100 };
    if (cursor) params.cursor = cursor;
    const payload = await bdl.listTeams(params);
    const data = (payload && payload.data) ? payload.data : payload || [];
    const meta = (payload && payload.meta) ? payload.meta : {};
    for (const team of data) {
      const tid = team && (team.id || team.team_id);
      if (tid !== undefined && tid !== null) ids.push(tid);
    }
    const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
    if (!nextCursor || !Array.isArray(data) || data.length === 0) break;
    cursor = nextCursor;
  }
  return ids;
}

/**
 * syncSeasonStats - lightweight aggregated player season stats sync
 * Params:
 *   - season (number or array). If omitted, defaults to current year.
 *   - per_page, player_ids, team_id, postseason, dryRun, maxPages
 *
 * Stores season stats as AdvancedMetric documents with key 'season_stats:season:player:<id>'
 */
async function syncSeasonStats({ season = null, per_page = 100, player_ids = [], team_id = null, postseason = false, dryRun = false, maxPages = SYNC_MAX_PAGES } = {}) {
  await ensureDbConnected();

  // Normalize seasons: single number -> [n], array -> sanitized array, null -> current year
  let seasonsArr;
  if (season === null || season === undefined) {
    seasonsArr = [ (new Date()).getFullYear() ];
  } else if (Array.isArray(season)) {
    seasonsArr = season.map(s => Number(s)).filter(s => Number.isFinite(s) && !Number.isNaN(s));
  } else {
    const sN = Number(season);
    if (!Number.isFinite(sN) || Number.isNaN(sN)) {
      throw new Error('Invalid season parameter');
    }
    seasonsArr = [ sN ];
  }

  if (!seasonsArr.length) throw new Error('No valid seasons to sync');

  console.log(`🔁 syncSeasonStats seasons=${JSON.stringify(seasonsArr)} per_page=${per_page} player_ids=${player_ids.length} team_id=${team_id} postseason=${postseason}`);

  const results = { ok: true, seasons: [] };

  for (const s of seasonsArr) {
    let cursor = null;
    let page = 0;
    let total = 0;

    console.log(`🔁 syncSeasonStats season=${s} per_page=${per_page}`);
    while (true) {
      if (page >= maxPages) {
        console.log(`Reached maxPages (${maxPages}), stopping syncSeasonStats for season ${s}.`);
        break;
      }

      const params = { season: s, per_page };
      if (player_ids && player_ids.length) params.player_ids = player_ids;
      if (team_id) params.team_id = team_id;
      if (postseason) params.postseason = true;
      if (cursor) params.cursor = cursor;

      const payload = await bdl.listSeasonStats(params);
      const data = (payload && payload.data) ? payload.data : payload || [];
      const meta = (payload && payload.meta) ? payload.meta : {};

      if (!Array.isArray(data) || data.length === 0) break;

      console.log(`   Received ${data.length} season_stats rows for season ${s}`);

      if (!dryRun) {
        const ops = data.map(d => {
          const entityType = d.player ? 'player' : (d.team ? 'team' : 'unknown');
          const entityId = d.player ? d.player.id : (d.team && d.team.id);
          const key = `season_stats:season:${s}:${entityType}:${entityId}`;
          const filter = { key };
          const update = { key, entityType, entityId, season: s, postseason: !!postseason, stats: d, raw: d };
          return { updateOne: { filter, update: { $set: update }, upsert: true } };
        });
        await chunkedBulkUpsert(AdvancedMetric, ops);
      } else {
        console.log('   dryRun: not writing season_stats');
      }

      total += data.length;
      const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
      console.log(`   Next cursor: ${nextCursor}`);
      const guard = guardCursorProgress(cursor, nextCursor);
      if (!guard.shouldContinue) break;
      cursor = nextCursor;
      page++;
    }

    results.seasons.push({ season: s, pages: page, total });
  }

  console.log(`✅ syncSeasonStats finished`, results);
  return results;
}

/**
 * syncStandingsFromAPI: loops last-two-seasons if season not provided
 */
async function syncStandingsFromAPI({ season = null, per_page = 100, dryRun = false, maxPages = SYNC_MAX_PAGES } = {}) {
  await ensureDbConnected();
  const seasons = season ? (Array.isArray(season) ? season : [season]) : seasonsDefaultIfEmpty(null);
  const results = { ok: true, pages: 0, total: 0, seasons: [] };
  for (const s of seasons) {
    console.log(`🔁 syncStandingsFromAPI season=${s}`);
    let cursor = null, page = 0, total = 0;
    while (true) {
      if (page >= maxPages) { console.log(`Reached maxPages (${maxPages}) for standings season ${s}`); break; }
      const params = { season: s, per_page };
      if (cursor) params.cursor = cursor;
      console.log(`📄 Fetching standings page ${page+1} params:${JSON.stringify(params)}`);
      const payload = await bdl.listStandings(params);
      const data = (payload && payload.data) ? payload.data : payload || [];
      const meta = (payload && payload.meta) ? payload.meta : {};
      if (!Array.isArray(data) || data.length === 0) break;
      if (!dryRun) {
        const ops = data.map(d => {
          const teamId = d.team?.id || d.team_id;
          const filter = { teamId, season: s, postseason: false };
          const update = { teamId, season: s, postseason: false, stats: d, raw: d };
          return { updateOne: { filter, update: { $set: update }, upsert: true } };
        });
        await chunkedBulkUpsert(TeamSeasonStat, ops);
      } else {
        console.log('   dryRun: not writing standings');
      }
      total += data.length;
      const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
      console.log(`   Next cursor: ${nextCursor}`);
      const guard = guardCursorProgress(cursor, nextCursor);
      if (!guard.shouldContinue) break;
      cursor = nextCursor; page++;
    }
    results.pages += page;
    results.total += total;
    results.seasons.push({ season: s, pages: page, total });
  }
  console.log(`✅ syncStandingsFromAPI finished`, results);
  return results;
}

/**
 * syncTeamSeasonStats
 *
 * This function was updated to ensure that team_ids are always supplied when calling
 * the BallDontLie team season stats endpoint. The API requires a team_ids array;
 * when none are provided by the caller, we fetch all team IDs via getAllTeamIds().
 */
async function syncTeamSeasonStats({ season = null, team_ids = [], per_page = 100, dryRun = false, maxPages = SYNC_MAX_PAGES } = {}) {
  await ensureDbConnected();
  const seasons = season ? (Array.isArray(season) ? season : [season]) : seasonsDefaultIfEmpty(null);
  // Determine which team IDs to use. If none provided, fetch all teams.
  const idsToUse = (team_ids && team_ids.length) ? team_ids : await getAllTeamIds();
  const results = { ok: true, seasons: [] };
  for (const s of seasons) {
    console.log(`🔁 syncTeamSeasonStats season=${s}`);
    let cursor = null; let page = 0; let total = 0;
    while (true) {
      if (page >= maxPages) { console.log(`Reached maxPages (${maxPages}) for team season ${s}`); break; }
      const params = { season: s, per_page };
      // Always supply team_ids to satisfy API requirement
      params.team_ids = idsToUse;
      if (cursor) params.cursor = cursor;
      const payload = await bdl.listTeamSeasonStats(params);
      const data = (payload && payload.data) ? payload.data : payload || [];
      const meta = (payload && payload.meta) ? payload.meta : {};
      if (!Array.isArray(data) || data.length === 0) break;
      if (!dryRun) {
        const ops = data.map(d => {
          const teamId = d.team_id || (d.team && d.team.id);
          const filter = { teamId, season: d.season || s, postseason: !!d.postseason };
          const update = { teamId, season: d.season || s, postseason: !!d.postseason, stats: d, raw: d };
          return { updateOne: { filter, update: { $set: update }, upsert: true } };
        });
        await chunkedBulkUpsert(TeamSeasonStat, ops);
      } else {
        console.log('   dryRun: not writing teamSeasonStats');
      }
      total += data.length;
      const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
      const guard = guardCursorProgress(cursor, nextCursor);
      if (!guard.shouldContinue) break;
      cursor = nextCursor; page++;
    }
    results.seasons.push({ season: s, pages: page, total });
  }
  console.log('✅ syncTeamSeasonStats finished', results);
  return results;
}

/**
 * syncTeamStats
 */
async function syncTeamStats({ per_page = 100, seasons = null, team_ids = [], game_ids = [], dryRun=false, maxPages = SYNC_MAX_PAGES } = {}) {
  await ensureDbConnected();
  const seasonsArr = seasons ? (Array.isArray(seasons) ? seasons : [seasons]) : seasonsDefaultIfEmpty(null);
  console.log(`🔁 syncTeamStats (seasons=${seasonsArr} teams=${team_ids.length} games=${game_ids.length})`);
  let cursor = null; let page = 0; let total = 0;
  const paramsBase = { per_page };
  if (team_ids && team_ids.length) paramsBase.team_ids = team_ids;
  if (game_ids && game_ids.length) paramsBase.game_ids = game_ids;
  while (true) {
    if (page >= maxPages) { console.log(`Reached maxPages (${maxPages}), stopping teamStats`); break; }
    const params = Object.assign({}, paramsBase);
    if (seasonsArr && seasonsArr.length) params.seasons = seasonsArr;
    if (cursor) params.cursor = cursor;
    const payload = await bdl.listTeamStats(params);
    const data = (payload && payload.data) ? payload.data : payload || [];
    const meta = (payload && payload.meta) ? payload.meta : {};
    if (!Array.isArray(data) || data.length === 0) break;
    console.log(`   Received ${data.length} teamStats rows`);
    if (!dryRun) {
      const ops = data.map(d => {
        const teamId = d.team?.id || d.team_id;
        const gameId = d.game_id || (d.game && d.game.id);
        const filter = { teamId, gameId };
        const update = { teamId, gameId, season: d.season || null, week: d.week || null, stats: d, raw: d };
        return { updateOne: { filter, update: { $set: update }, upsert: true } };
      });
      await chunkedBulkUpsert(TeamStat, ops);
    } else { console.log('   dryRun: not writing teamStats'); }
    total += data.length;
    const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
    const guard = guardCursorProgress(cursor, nextCursor);
    if (!guard.shouldContinue) break;
    cursor = nextCursor; page++;
  }
  console.log(`✅ syncTeamStats finished pages=${page} total=${total}`);
  return { ok: true, pages: page, total };
}

/**
 * syncAdvancedStatsEndpoint(type, options)
 */
async function syncAdvancedStatsEndpoint(type = 'rushing', { season = null, per_page = 100, dryRun=false, maxPages = SYNC_MAX_PAGES } = {}) {
  await ensureDbConnected();
  const seasons = season ? (Array.isArray(season) ? season : [season]) : seasonsDefaultIfEmpty(null);
  const fnMap = {
    rushing: bdl.listAdvancedRushing,
    passing: bdl.listAdvancedPassing,
    receiving: bdl.listAdvancedReceiving
  };
  const fn = fnMap[type];
  if (!fn) throw new Error('Unsupported advanced stat type: ' + type);
  const results = { ok: true, type, seasons: [] };
  for (const s of seasons) {
    console.log(`🔁 syncAdvancedStatsEndpoint type=${type} season=${s}`);
    let cursor = null; let page = 0; let total = 0;
    while (true) {
      if (page >= maxPages) { console.log(`Reached maxPages (${maxPages}), stopping advanced ${type} season ${s}`); break; }
      const params = { per_page, season: s };
      if (cursor) params.cursor = cursor;
      const payload = await fn(params);
      const data = (payload && payload.data) ? payload.data : payload || [];
      const meta = (payload && payload.meta) ? payload.meta : {};
      if (!Array.isArray(data) || data.length === 0) break;
      console.log(`   Received ${data.length} advanced ${type} rows`);
      if (!dryRun) {
        const ops = data.map(d => {
          // Determine the entity type (player or team) and IDs from the response
          const entityType = d.player ? 'player' : 'team';
          const entityId = (d.player && d.player.id) || (d.team && d.team.id) || null;
          // Build a stable key for internal reference
          const key = `advanced:${type}:season:${s}:${entityType}:${entityId}`;
          /*
           * Upsert using a filter that matches the unique index on entityType, entityId, season, scope, and type.
           * Including the "type" field in the filter ensures we don't violate the unique index on
           * entityType + entityId + season + scope (when combined with type).
           */
          const filter = { entityType, entityId, season: s, scope: 'season', type };
          // Each advanced stat type will be stored as its own document. Store both the key and type for clarity.
          const update = {
            key,
            entityType,
            entityId,
            season: s,
            scope: 'season',
            type,
            // Keep the raw metrics under metrics and sources.bdl
            metrics: d,
            sources: { bdl: d },
            raw: d
          };
          return { updateOne: { filter, update: { $set: update }, upsert: true } };
        });
        // Use chunkedBulkUpsert to write the operations in batches
        await chunkedBulkUpsert(AdvancedMetric, ops);
      } else { console.log('   dryRun: not writing advanced metrics'); }
      total += data.length;
      const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
      const guard = guardCursorProgress(cursor, nextCursor);
      if (!guard.shouldContinue) break;
      cursor = nextCursor; page++;
    }
    results.seasons.push({ season: s, pages: page, total });
  }
  console.log(`✅ syncAdvancedStatsEndpoint finished`, results);
  return results;
}

/**
 * syncPlays (game by game)
 */
async function syncPlays({ game_id, per_page = 100, dryRun = false, maxPages = SYNC_MAX_PAGES } = {}) {
  if (!game_id) throw new Error('game_id is required for plays sync');
  await ensureDbConnected();
  console.log(`🔁 syncPlays game_id=${game_id}`);
  let cursor = null; let page = 0; let total = 0;
  while (true) {
    if (page >= maxPages) { console.log(`Reached maxPages (${maxPages}), stopping plays`); break; }
    const params = { per_page, game_id };
    if (cursor) params.cursor = cursor;
    const payload = await bdl.listPlays(params);
    const data = (payload && payload.data) ? payload.data : payload || [];
    const meta = (payload && payload.meta) ? payload.meta : {};
    if (!Array.isArray(data) || data.length === 0) break;
    console.log(`   Received ${data.length} plays`);
    if (!dryRun) {
      const ops = data.map((d, idx) => {
        const playId = d.id || `${game_id}_${idx}`;
        const filter = { playId };
        const update = { playId, gameId: game_id, sequence: d.sequence || idx, raw: d };
        return { updateOne: { filter, update: { $set: update }, upsert: true } };
      });
      await chunkedBulkUpsert(Play, ops);
    } else { console.log('   dryRun: not writing plays'); }
    total += data.length;
    const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
    const guard = guardCursorProgress(cursor, nextCursor);
    if (!guard.shouldContinue) break;
    cursor = nextCursor; page++;
  }
  console.log(`✅ syncPlays finished pages=${page} total=${total}`);
  return { ok:true, pages:page, total };
}

/**
 * syncOdds
 */
async function syncOdds({ season = null, week = null, per_page = 100, game_ids = null, dryRun = false, maxPages = SYNC_MAX_PAGES } = {}) {
  await ensureDbConnected();
  let seasons = season ? (Array.isArray(season) ? season : [season]) : null;
  if (!seasons && (!game_ids || !game_ids.length)) {
    seasons = seasonsDefaultIfEmpty(null);
  }
  console.log(`🔁 syncOdds seasons=${JSON.stringify(seasons)} week=${week} game_ids=${game_ids ? game_ids.length : 0}`);
  let total = 0, pages = 0;
  if (game_ids && game_ids.length) {
    let cursor = null, page = 0;
    while (true) {
      if (page >= maxPages) break;
      const params = { per_page, game_ids };
      if (cursor) params.cursor = cursor;
      const payload = await bdl.listOdds(params);
      const data = (payload && payload.data) ? payload.data : payload || [];
      const meta = (payload && payload.meta) ? payload.meta : {};
      if (!Array.isArray(data) || data.length === 0) break;
      console.log(`   Received ${data.length} odds rows`);
      if (!dryRun) {
        const ops = [];
        for (const d of data) {
          const gameId = d.game_id || (d.game && d.game.id);
          const vendor = d.vendor || null;
          const id = `${gameId}_${vendor || 'v'}`;
          const filter = { oddsId: id };
          const update = { oddsId: id, gameId, vendor, payload: d, raw: d };
          ops.push({ updateOne: { filter, update: { $set: update }, upsert: true } });
        }
        await chunkedBulkUpsert(Odds, ops);
      } else { console.log('   dryRun: not writing odds'); }
      total += data.length; pages++;
      const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
      const guard = guardCursorProgress(cursor, nextCursor);
      if (!guard.shouldContinue) break;
      cursor = nextCursor; page++;
    }
  } else if (seasons && seasons.length) {
    for (const s of seasons) {
      let cursor = null, page = 0;
      while (true) {
        if (page >= maxPages) break;
        const params = { per_page, season: s };
        if (week !== null && week !== undefined) params.week = week;
        if (cursor) params.cursor = cursor;
        const payload = await bdl.listOdds(params);
        const data = (payload && payload.data) ? payload.data : payload || [];
        const meta = (payload && payload.meta) ? payload.meta : {};
        if (!Array.isArray(data) || data.length === 0) break;
        console.log(`   Received ${data.length} odds rows for season ${s}`);
        if (!dryRun) {
          const ops = [];
          for (const d of data) {
            const gameId = d.game_id || (d.game && d.game.id);
            const vendor = d.vendor || null;
            const id = `${gameId}_${vendor || 'v'}`;
            const filter = { oddsId: id };
            const update = { oddsId: id, gameId, vendor, payload: d, raw: d };
            ops.push({ updateOne: { filter, update: { $set: update }, upsert: true } });
          }
          await chunkedBulkUpsert(Odds, ops);
        } else {
          console.log('   dryRun: not writing odds');
        }
        total += data.length; pages++;
        const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
        const guard = guardCursorProgress(cursor, nextCursor);
        if (!guard.shouldContinue) break;
        cursor = nextCursor; page++;
      }
    }
  } else {
    console.log('No seasons or game_ids provided for odds; nothing to do.');
  }
  console.log(`✅ syncOdds finished pages=${pages} total=${total}`);
  return { ok:true, pages, total };
}

/**
 * syncPlayerProps
 */
async function syncPlayerProps({ game_id, vendor = null, player_id = null, prop_type = null, dryRun = false } = {}) {
  if (!game_id) throw new Error('game_id required for player props');
  await ensureDbConnected();
  console.log(`🔁 syncPlayerProps game_id=${game_id} vendor=${vendor}`);
  const params = { game_id };
  if (player_id) params.player_id = player_id;
  if (vendor) params.vendors = Array.isArray(vendor) ? vendor : [vendor];
  if (prop_type) params.prop_type = prop_type;
  const payload = await bdl.listOddsPlayerProps(params);
  const data = (payload && payload.data) ? payload.data : payload || [];
  const rows = Array.isArray(data) ? data : (data.data || []);
  if (!rows.length) { console.log('   No player props returned'); return { ok:true, total:0 }; }
  if (!dryRun) {
    const ops = rows.map(r => {
      const update = { gameId: game_id, playerId: r.player_id || (r.player && r.player.id), vendor: r.vendor || vendor, prop_type: r.prop_type, value: r.value || null, payload: r };
      const filter = { gameId: game_id, playerId: update.playerId, vendor: update.vendor, prop_type: update.prop_type };
      return { updateOne: { filter, update: { $set: update }, upsert: true } };
    });
    await chunkedBulkUpsert(PlayerProp, ops);
    return { ok:true, total: rows.length };
  } else {
    console.log('   dryRun: not writing player props');
    return { ok:true, total: rows.length };
  }
}

/**
 * syncInjuriesFromAPI
 */
async function syncInjuriesFromAPI({ per_page = 25, team_ids = [], player_ids = [], dryRun = false, maxPages = SYNC_MAX_PAGES } = {}) {
  await ensureDbConnected();
  console.log(`🔁 syncInjuriesFromAPI per_page=${per_page} teams=${team_ids.length} players=${player_ids.length}`);
  let cursor = null; let page = 0; let total = 0;
  while (true) {
    if (page >= maxPages) { console.log(`Reached maxPages (${maxPages}), stopping injuries`); break; }
    const params = { per_page };
    if (team_ids && team_ids.length) params.team_ids = team_ids;
    if (player_ids && player_ids.length) params.player_ids = player_ids;
    if (cursor) params.cursor = cursor;
    const payload = await bdl.listPlayerInjuries(params);
    const data = (payload && payload.data) ? payload.data : payload || [];
    const meta = (payload && payload.meta) ? payload.meta : {};
    if (!Array.isArray(data) || data.length === 0) break;
    console.log(`   Received ${data.length} injuries`);
    if (!dryRun) {
      const ops = data.map(d => {
        const bdlId = d.player && d.player.id ? d.player.id : null;
        const update = { player: d.player, status: d.status, comment: d.comment, date: d.date ? new Date(d.date) : null, bdlId, raw: d };
        const filter = { bdlId, date: update.date };
        return { updateOne: { filter, update: { $set: update }, upsert: true } };
      });
      await chunkedBulkUpsert(Injury, ops);
    } else {
      console.log('   dryRun: not writing injuries');
    }
    total += data.length;
    const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
    const guard = guardCursorProgress(cursor, nextCursor);
    if (!guard.shouldContinue) break;
    cursor = nextCursor; page++;
  }
  console.log(`✅ syncInjuriesFromAPI finished pages=${page} total=${total}`);
  return { ok:true, pages:page, total };
}

/**
 * computeAllDerived orchestration
 */
async function computeAllDerived(options = {}) {
  await ensureDbConnected();
  const season = options.season || (new Date()).getFullYear();
  const res = {};
  if (options.syncStandings !== false) res.standings = await syncStandingsFromAPI({ season, per_page: options.per_page || 100, dryRun: options.dryRun || false });
  if (options.syncTeamSeason !== false) res.teamSeason = await syncTeamSeasonStats({ season, per_page: options.per_page || 100, dryRun: options.dryRun || false });
  if (options.syncSeasonStats !== false) res.seasonStats = await syncSeasonStats({ season, per_page: options.per_page || 100, dryRun: options.dryRun || false });
  if (options.syncAdvanced !== false) {
    res.adv_rushing = await syncAdvancedStatsEndpoint('rushing', { season, per_page: options.per_page || 100, dryRun: options.dryRun || false });
    res.adv_passing = await syncAdvancedStatsEndpoint('passing', { season, per_page: options.per_page || 100, dryRun: options.dryRun || false });
    res.adv_receiving = await syncAdvancedStatsEndpoint('receiving', { season, per_page: options.per_page || 100, dryRun: options.dryRun || false });
  }
  if (options.syncInjuries !== false) res.injuries = await syncInjuriesFromAPI({ per_page: options.per_page || 100, dryRun: options.dryRun || false });
  return res;
}

module.exports = {
  syncStandingsFromAPI,
  syncTeamSeasonStats,
  syncTeamStats,
  syncAdvancedStatsEndpoint,
  syncPlays,
  syncOdds,
  syncPlayerProps,
  syncInjuriesFromAPI,
  syncSeasonStats,
  computeAllDerived
};