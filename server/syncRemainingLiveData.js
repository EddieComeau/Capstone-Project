/*
 * server/syncRemainingLiveData.js
 *
 * Replaces your legacy "syncAllRemainingData" script.
 *
 * What it does:
 * 1) Sync standings from Ball Don't Lie (DB-backed standings)
 * 2) Sync odds + player props for the target games (periodic / not every tick)
 * 3) LIVE plays polling loop every N seconds:
 *    - Fetch ONLY new plays since last run using a per-game persisted cursor
 *    - Upsert plays into MongoDB
 *
 * Usage (recommended):
 *   cd server
 *   LIVE_SEASON=2025 LIVE_WEEK=1 LIVE_POLL_INTERVAL_MS=5000 node syncRemainingLiveData.js
 *
 * Or explicitly specify game IDs:
 *   LIVE_GAME_IDS=424150,424151 LIVE_POLL_INTERVAL_MS=10000 node syncRemainingLiveData.js
 *
 * Debug / one-shot run:
 *   node syncRemainingLiveData.js --once
 */

// 🔒 Load root .env no matter where script is run from
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('./db');

const ballDontLieService = require('./services/ballDontLieService');
const fullSyncService = require('./services/fullSyncService');
const desiredService = require('./services/desiredService');

const Game = require('./models/Game');
const Play = require('./models/Play');
const SyncState = require('./models/SyncState');

const POLL_INTERVAL_MS = Number(process.env.LIVE_POLL_INTERVAL_MS || 5000); // 5000 or 10000
const PLAYS_PER_PAGE = Number(process.env.LIVE_PLAYS_PER_PAGE || 100);
const MAX_PAGES_PER_TICK = Number(process.env.LIVE_PLAYS_MAX_PAGES_PER_TICK || 25);

// Odds/props don’t need 5-second polling. Refresh periodically.
const ODDS_PROPS_REFRESH_MS = Number(process.env.LIVE_ODDS_PROPS_REFRESH_MS || 10 * 60 * 1000); // 10 min
const STANDINGS_REFRESH_MS = Number(process.env.LIVE_STANDINGS_REFRESH_MS || 60 * 60 * 1000); // 1 hour
const INJURIES_REFRESH_MS = Number(process.env.LIVE_INJURIES_REFRESH_MS || 30 * 60 * 1000); // 30 min

function parseCsvNumbers(v) {
  if (!v || typeof v !== 'string') return [];
  return v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => Number(s))
    .filter(n => Number.isFinite(n));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* -------------------- SyncState helpers -------------------- */
async function getCursor(key) {
  const doc = await SyncState.findOne({ key }).lean();
  return doc ? doc.cursor : null;
}

async function setCursor(key, cursor, meta = null) {
  await SyncState.updateOne(
    { key },
    { $set: { key, cursor: cursor ?? null, meta: meta ?? null, updatedAt: new Date() } },
    { upsert: true },
  );
  return cursor;
}

/* -------------------- Target game selection -------------------- */
async function getTrackedGameIds() {
  const explicit = parseCsvNumbers(process.env.LIVE_GAME_IDS);
  if (explicit.length) return explicit;

  const season = process.env.LIVE_SEASON ? Number(process.env.LIVE_SEASON) : null;
  const week = process.env.LIVE_WEEK ? Number(process.env.LIVE_WEEK) : null;

  if (Number.isFinite(season) && Number.isFinite(week)) {
    const docs = await Game.find({ season, week }).select('gameId').lean();
    return docs.map(d => d.gameId).filter(Boolean);
  }

  throw new Error(
    'No games to track. Provide LIVE_GAME_IDS="424150,424151" OR LIVE_SEASON=2025 and LIVE_WEEK=1',
  );
}

/* -------------------- Plays: incremental per-game sync -------------------- */
function extractPlayId(rec) {
  return rec?.id ?? rec?.play_id ?? rec?.playId ?? null;
}

async function upsertPlays(gameId, items) {
  const ops = [];

  for (const rec of items) {
    const playId = extractPlayId(rec);
    if (!playId) continue;

    ops.push({
      updateOne: {
        filter: { playId },
        update: {
          $set: {
            playId,
            gameId,
            sequence: rec.sequence ?? rec.seq ?? null,
            clock: rec.clock ?? null,
            description: rec.description ?? rec.desc ?? '',
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
    await Play.bulkWrite(ops, { ordered: false });
  }

  return ops.length;
}

/**
 * Fetch and store ONLY new plays for one game.
 *
 * Cursor policy:
 * - We store a per-game cursor in SyncState: `plays_cursor_game_<gameId>`
 * - When BDL returns meta.next_cursor, we use it and continue paging.
 * - When meta.next_cursor is null (end), we store the last play id we saw.
 *
 * This way, when new plays appear later, we can resume from the last seen play.
 */
async function syncNewPlaysForGame(gameId) {
  const key = `plays_cursor_game_${gameId}`;

  let cursor = await getCursor(key); // this is our "last seen play id"
  let pages = 0;
  let totalFetched = 0;
  let totalUpserts = 0;

  while (pages < MAX_PAGES_PER_TICK) {
    pages += 1;

    const params = { per_page: PLAYS_PER_PAGE, game_id: gameId };
    if (cursor) params.cursor = cursor;

    const res = await ballDontLieService.listPlays(params);
    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};

    if (!items.length) break;

    totalFetched += items.length;
    totalUpserts += await upsertPlays(gameId, items);

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    const lastId = extractPlayId(items[items.length - 1]);

    if (nextCursor) {
      cursor = nextCursor;
      continue;
    }

    // End of current stream. Persist last seen play id for future incremental fetches.
    if (lastId) cursor = lastId;
    break;
  }

  // Persist cursor (even if unchanged, harmless)
  if (cursor) await setCursor(key, cursor, { gameId, pages, fetched: totalFetched });

  return { gameId, pages, fetched: totalFetched, upserts: totalUpserts, cursor: cursor || null };
}

/* -------------------- Orchestration -------------------- */
function getDefaultSeasons() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}
function getSeasonsFromEnvOrDefault() {
  if (!process.env.SYNC_SEASONS) return getDefaultSeasons();
  return process.env.SYNC_SEASONS
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n));
}

async function syncOddsAndProps(gameIds) {
  if (!Array.isArray(gameIds) || !gameIds.length) return;
  await fullSyncService.syncOddsForGames({ gameIds });
  await fullSyncService.syncPlayerPropsForGames({ gameIds });
}

async function syncStandings(seasons) {
  if (!Array.isArray(seasons) || !seasons.length) return;
  await desiredService.syncStandingsFromAPI({ seasons });
}

async function syncInjuries() {
  // You can disable in env if you want:
  // LIVE_SYNC_INJURIES=false node syncRemainingLiveData.js
  if (String(process.env.LIVE_SYNC_INJURIES || 'true').toLowerCase() === 'false') return;
  await desiredService.syncInjuriesFromAPI({ per_page: 100 });
}

async function runPlaysCycle(gameIds) {
  const results = [];

  for (const gameId of gameIds) {
    console.log(`🔁 live plays tick: game ${gameId}`);
    try {
      const r = await syncNewPlaysForGame(gameId);
      results.push(r);
      if (r.fetched > 0) {
        console.log(
          `✅ plays game ${gameId}: fetched=${r.fetched}, upserts=${r.upserts}, pages=${r.pages}, cursor=${r.cursor}`,
        );
      }
    } catch (err) {
      console.warn(`⚠️ plays game ${gameId} failed:`, err?.response?.status || '', err?.message || err);
    }

    // Tiny pause to avoid spiky bursts
    await sleep(50);
  }

  return results;
}

async function main() {
  const runOnce = process.argv.includes('--once');

  await connectDB();
  console.log('✅ DB connected');

  const seasons = getSeasonsFromEnvOrDefault();
  console.log('Seasons for standings:', seasons.join(', '));

  // Determine tracked games up front
  let gameIds = await getTrackedGameIds();
  console.log(`Tracking ${gameIds.length} games for live plays`);

  // Initial one-time syncs (fast + unblocks UI)
  await syncStandings(seasons);
  await syncInjuries();

  // If you want odds/props available for the UI, grab them once at startup
  await syncOddsAndProps(gameIds);

  if (runOnce) {
    console.log('Running one cycle (--once)');
    await runPlaysCycle(gameIds);
    return;
  }

  console.log(`🟢 Live polling started (interval=${POLL_INTERVAL_MS}ms)`);
  let running = false;

  let lastOddsProps = 0;
  let lastStandings = 0;
  let lastInjuries = 0;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      // Refresh game list each tick in case you changed LIVE_GAME_IDS or week/season.
      gameIds = await getTrackedGameIds();

      await runPlaysCycle(gameIds);

      const now = Date.now();

      if (!lastOddsProps || now - lastOddsProps >= ODDS_PROPS_REFRESH_MS) {
        console.log('🔁 refreshing odds + player props...');
        await syncOddsAndProps(gameIds);
        lastOddsProps = now;
      }

      if (!lastStandings || now - lastStandings >= STANDINGS_REFRESH_MS) {
        console.log('🔁 refreshing standings...');
        await syncStandings(seasons);
        lastStandings = now;
      }

      if (!lastInjuries || now - lastInjuries >= INJURIES_REFRESH_MS) {
        console.log('🔁 refreshing injuries...');
        await syncInjuries();
        lastInjuries = now;
      }
    } catch (err) {
      console.error('❌ live tick failed:', err?.message || err);
    } finally {
      running = false;
    }
  };

  // Run immediately, then on interval
  await tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async () => {
    clearInterval(interval);
    console.log('\n🛑 Shutting down live sync...');
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('❌ syncRemainingLiveData failed:', err);
  process.exit(1);
});