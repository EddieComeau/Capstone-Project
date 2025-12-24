// server/services/syncService.js
require('dotenv').config();
const mongoose = require('mongoose');
const bdl = require('./ballDontLieService');

const Player = require('../models/Player');
const Team = require('../models/Team');
const Game = require('../models/Game');
const Stat = require('../models/Stat');

const DEFAULT_PER_PAGE = 100;
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
  console.log('🔌 Mongoose connected (syncService)');
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

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

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
        console.log(`retrying bulkWrite in ${delay}ms`);
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

/* ---------- Helpers to call onProgress if provided ---------- */
function callProgress(opts, payload) {
  if (opts && typeof opts.onProgress === 'function') {
    try { opts.onProgress(payload); } catch (err) { console.warn('onProgress callback error', err && err.message ? err.message : err); }
  }
}

/* ---------- Sync functions (each accepts options with onProgress) ---------- */

async function syncPlayers({ per_page = DEFAULT_PER_PAGE, dryRun = false, maxPages = SYNC_MAX_PAGES, onProgress } = {}) {
  await ensureDbConnected();
  console.log('🔁 syncPlayers starting...');
  let cursor = null, page = 0, total = 0;

  while (true) {
    if (page >= maxPages) {
      console.log(`Reached maxPages (${maxPages}), stopping syncPlayers.`);
      break;
    }
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    console.log(`📄 Fetching players page ${page + 1} params: ${JSON.stringify(params)}`);
    const payload = await bdl.listPlayers(params);
    const data = (payload && payload.data) ? payload.data : payload || [];
    const meta = (payload && payload.meta) ? payload.meta : {};
    if (!Array.isArray(data) || data.length === 0) break;
    console.log(`   Received ${data.length} players`);
    callProgress({ onProgress }, { model: 'players', page, count: data.length, cursor });

    if (!dryRun) {
      const ops = data.map(p => {
        const bdlId = p.id || p.bdlId || p.player_id;
        return { updateOne: { filter: { bdlId }, update: { $set: { bdlId, PlayerID: p.id || null, first_name: p.first_name, last_name: p.last_name, position: p.position, team: p.team || null, raw: p } }, upsert: true } };
      });
      try {
        await chunkedBulkUpsert(Player, ops);
        total += data.length;
      } catch (err) {
        console.error('❌ bulkWrite failed for model Player:', err && err.message ? err.message : err);
        throw err;
      }
    } else {
      total += data.length;
      console.log('   dryRun: not writing players');
    }

    const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
    console.log(`   Next cursor: ${nextCursor}`);
    callProgress({ onProgress }, { model: 'players', page, nextCursor });
    const guard = guardCursorProgress(cursor, nextCursor);
    if (!guard.shouldContinue) break;
    cursor = nextCursor;
    page++;
  }

  console.log(`✅ syncPlayers finished. pages=${page}, total=${total}`);
  return { ok: true, pages: page, total };
}

async function syncTeamPlayers(teamFilter, { per_page = DEFAULT_PER_PAGE, dryRun = false, maxPages = SYNC_MAX_PAGES, onProgress } = {}) {
  await ensureDbConnected();
  console.log(`🔁 syncTeamPlayers starting for ${teamFilter}`);
  let team_ids = [];
  if (teamFilter) {
    const n = Number(teamFilter);
    if (!Number.isNaN(n) && n > 0) team_ids = [n];
    else {
      const t = await Team.findOne({ abbreviation: teamFilter }).lean();
      if (t && t.bdlId) team_ids = [t.bdlId];
    }
  }
  if (!team_ids.length) {
    console.log('No team_ids resolved; fallback to syncPlayers.');
    return syncPlayers({ per_page, dryRun, maxPages, onProgress });
  }

  let cursor = null, page = 0, total = 0;
  while (true) {
    if (page >= maxPages) break;
    const params = { per_page, team_ids };
    if (cursor) params.cursor = cursor;
    console.log(`📄 Fetching team players page ${page + 1} params: ${JSON.stringify(params)}`);
    const payload = await bdl.listPlayers(params);
    const data = (payload && payload.data) ? payload.data : payload || [];
    const meta = (payload && payload.meta) ? payload.meta : {};
    if (!Array.isArray(data) || data.length === 0) break;
    console.log(`   Received ${data.length} players`);
    callProgress({ onProgress }, { model: 'teamPlayers', page, count: data.length, team_ids });

    if (!dryRun) {
      const ops = data.map(p => {
        const bdlId = p.id || p.bdlId || p.player_id;
        return { updateOne: { filter: { bdlId }, update: { $set: { bdlId, PlayerID: p.id || null, first_name: p.first_name, last_name: p.last_name, position: p.position, team: p.team || null, raw: p } }, upsert: true } };
      });
      try {
        await chunkedBulkUpsert(Player, ops);
        total += data.length;
      } catch (err) {
        console.error('❌ bulkWrite failed for model Player:', err && err.message ? err.message : err);
        throw err;
      }
    } else {
      total += data.length;
      console.log('   dryRun: not writing team players');
    }

    const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
    callProgress({ onProgress }, { model: 'teamPlayers', page, nextCursor });
    const guard = guardCursorProgress(cursor, nextCursor);
    if (!guard.shouldContinue) break;
    cursor = nextCursor;
    page++;
  }

  console.log(`✅ syncTeamPlayers finished. pages=${page}, total=${total}`);
  return { ok: true, pages: page, total };
}

async function syncGames({ per_page = DEFAULT_PER_PAGE, seasons = null, historical = false, dryRun = false, maxPages = SYNC_MAX_PAGES, onProgress } = {}) {
  await ensureDbConnected();

  if (historical) {
    const force = String(process.env.FORCE_HISTORICAL || '').toLowerCase() === 'true';
    if (!force && !process.stdin.isTTY) {
      throw new Error('Historical sync requires interactive terminal or FORCE_HISTORICAL=true');
    }
    if (!force) {
      // interactive confirmation when run directly
      // NOTE: when called via jobManager the controller handles confirmation; here we just assume it's OK if CLI called.
      console.log('Historical sync requested (ensure confirmation in caller).');
    }
  }

  if (!historical) {
    if (!seasons) {
      const cur = (new Date()).getFullYear();
      seasons = [cur, cur - 1];
    } else if (!Array.isArray(seasons)) seasons = [Number(seasons)];
  } else {
    seasons = null;
  }

  console.log('🔁 syncGames starting... seasons:', seasons, 'historical:', historical);
  let cursor = null, page = 0, total = 0;
  while (true) {
    if (page >= maxPages && !historical) break;
    const params = { per_page };
    if (seasons && seasons.length) params.seasons = seasons;
    if (cursor) params.cursor = cursor;
    console.log(`📄 Fetching games page ${page + 1} params: ${JSON.stringify(params)}`);
    const payload = await bdl.listGames(params);
    const data = (payload && payload.data) ? payload.data : payload || [];
    const meta = (payload && payload.meta) ? payload.meta : {};
    if (!Array.isArray(data) || data.length === 0) break;
    console.log(`   Received ${data.length} games`);
    callProgress({ onProgress }, { model: 'games', page, count: data.length, seasons });

    if (!dryRun) {
      const ops = data.map(g => {
        const gameId = g.id || g.game_id || (g.raw && g.raw.id) || null;
        return { updateOne: { filter: { gameId }, update: { $set: { gameId, date: g.date || g.game_date || null, season: g.season || null, week: g.week || null, home_team: g.home_team || null, visitor_team: g.visitor_team || null, home_score: g.home_score != null ? g.home_score : (g.home && g.home.score), visitor_score: g.visitor_score != null ? g.visitor_score : (g.visitor && g.visitor.score), status: g.status || g.boxscore, raw: g } }, upsert: true } };
      });
      try {
        await chunkedBulkUpsert(Game, ops);
        total += data.length;
      } catch (err) {
        console.error('❌ bulkWrite failed for model Game:', err && err.message ? err.message : err);
        throw err;
      }
    } else {
      total += data.length;
      console.log('   dryRun: not writing games');
    }

    const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
    callProgress({ onProgress }, { model: 'games', page, nextCursor });
    const guard = guardCursorProgress(cursor, nextCursor);
    if (!guard.shouldContinue) break;
    cursor = nextCursor;
    page++;
  }

  console.log(`✅ syncGames finished. pages=${page}, total=${total}`);
  return { ok: true, pages: page, total };
}

/**
 * syncStats
 * Options:
 *  - per_page (default: DEFAULT_PER_PAGE)
 *  - seasons (array or single number). If not provided, defaults to [currentYear, currentYear-1]
 *  - dryRun (default false)
 *  - maxPages (safety cap)
 *  - onProgress (optional callback)
 */
async function syncStats({ per_page = DEFAULT_PER_PAGE, seasons = null, dryRun = false, maxPages = SYNC_MAX_PAGES, onProgress } = {}) {
  await ensureDbConnected();

  // If seasons not provided, default to current + previous
  if (!seasons) {
    const currentYear = (new Date()).getFullYear();
    seasons = [currentYear, currentYear - 1];
  } else if (!Array.isArray(seasons)) {
    seasons = [Number(seasons)];
  }

  console.log('🔁 syncStats starting...');
  console.log('   seasons filter:', seasons);

  let cursor = null;
  let page = 0;
  let total = 0;
  const model = Stat;

  while (true) {
    if (page >= maxPages) {
      console.log(`Reached maxPages (${maxPages}), stopping syncStats.`);
      break;
    }

    const params = { per_page };
    // attach seasons filter for the API
    if (seasons && seasons.length) params.seasons = seasons;
    if (cursor) params.cursor = cursor;

    console.log(`📄 Fetching stats page ${page + 1} params: ${JSON.stringify(params)}`);
    const payload = await bdl.listStats(params);
    const data = (payload && payload.data) ? payload.data : payload || [];
    const meta = (payload && payload.meta) ? payload.meta : {};

    if (!Array.isArray(data) || data.length === 0) {
      console.log('   No stats returned, finishing.');
      break;
    }

    console.log(`   Received ${data.length} stats rows`);
    if (typeof onProgress === 'function') {
      try { onProgress({ model: 'stats', page, count: data.length }); } catch (e) {}
    }

    if (!dryRun) {
      const ops = data.map(s => {
        const statId = s.id || `${s.game_id || s.game?.id}_${s.player_id || s.player?.id}_${s.team_id || s.team?.id}`;
        const filter = { statId };
        const update = {
          statId,
          gameId: s.game_id || (s.game && s.game.id),
          playerId: s.player_id || (s.player && s.player.id),
          teamId: s.team_id || (s.team && s.team.id),
          season: s.season || null,
          stats: s,
          raw: s
        };
        return {
          updateOne: {
            filter,
            update: { $set: update },
            upsert: true
          }
        };
      });

      try {
        await chunkedBulkUpsert(model, ops);
        total += data.length;
      } catch (err) {
        console.error('❌ bulkWrite failed for model Stat:', err && err.message ? err.message : err);
        throw err;
      }
    } else {
      total += data.length;
      console.log('   dryRun: not writing stats');
    }

    const nextCursor = (meta && (meta.next_cursor || meta.nextCursor)) || null;
    console.log(`   Next cursor: ${nextCursor}`);
    if (typeof onProgress === 'function') {
      try { onProgress({ model: 'stats', page, nextCursor }); } catch (e) {}
    }
    const guard = guardCursorProgress(cursor, nextCursor);
    if (!guard.shouldContinue) {
      if (guard.reason) console.log('   Stopping syncStats: ' + guard.reason);
      break;
    }
    cursor = nextCursor;
    page++;
  }

  console.log(`✅ syncStats finished. pages=${page}, total=${total}`);
  return { ok: true, pages: page, total };
}


module.exports = {
  syncPlayers,
  syncTeamPlayers,
  syncGames,
  syncStats
};
