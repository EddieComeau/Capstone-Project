/*
 * server/syncRemainingLiveData.js
 *
 * Live + "remaining" data sync script.
 *
 * Key behavior (per your specs):
 * - Plays are synced ONLY for *live* games (in-progress) so you can run this
 *   all day without it spamming non-live games.
 * - If there are NO live games right now, the script does NOT fail — it just
 *   waits and checks again on the next tick.
 * - One game failing will NOT fail the entire script (continue-on-error).
 * - Cursor is persisted per game in SyncState: plays_cursor_game_<gameId>
 *
 * Also refreshes:
 * - standings (BDL standings endpoint) periodically
 * - injuries periodically
 * - odds + player props periodically (for tracked games, not just live ones)
 *
 * Usage:
 *   cd server
 *   LIVE_SEASON=2025 LIVE_WEEK=1 LIVE_POLL_INTERVAL_MS=10000 node syncRemainingLiveData.js
 *
 * Or explicitly specify game IDs to track (odds/props selection), while still syncing
 * plays only for the *live subset*:
 *   LIVE_GAME_IDS=424150,424151 LIVE_POLL_INTERVAL_MS=5000 node syncRemainingLiveData.js
 *
 * One-shot:
 *   node syncRemainingLiveData.js --once
 */

// 🔒 Load root .env no matter where script is run from
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("./db");

const ballDontLieService = require("./services/ballDontLieService");
const fullSyncService = require("./services/fullSyncService");
const desiredService = require("./services/desiredService");

const Game = require("./models/Game");
const Play = require("./models/Play");
const SyncState = require("./models/SyncState");

const POLL_INTERVAL_MS = Number(process.env.LIVE_POLL_INTERVAL_MS || 10000); // 5000 or 10000
const PLAYS_PER_PAGE = Number(process.env.LIVE_PLAYS_PER_PAGE || 100);
const MAX_PAGES_PER_TICK = Number(process.env.LIVE_PLAYS_MAX_PAGES_PER_TICK || 25);

// We don't need to re-check live status every 5s; keep it lighter.
const LIVE_STATUS_REFRESH_MS = Number(process.env.LIVE_STATUS_REFRESH_MS || 30000); // 30s

// Odds/props don’t need 5-second polling. Refresh periodically.
const ODDS_PROPS_REFRESH_MS = Number(process.env.LIVE_ODDS_PROPS_REFRESH_MS || 10 * 60 * 1000); // 10 min
const STANDINGS_REFRESH_MS = Number(process.env.LIVE_STANDINGS_REFRESH_MS || 60 * 60 * 1000); // 1 hour
const INJURIES_REFRESH_MS = Number(process.env.LIVE_INJURIES_REFRESH_MS || 30 * 60 * 1000); // 30 min

function parseCsvNumbers(v) {
  if (!v || typeof v !== "string") return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    { upsert: true }
  );
  return cursor;
}

/* -------------------- Target game selection (tracked list) -------------------- */
async function getTrackedGameIds() {
  const explicit = parseCsvNumbers(process.env.LIVE_GAME_IDS);
  if (explicit.length) return explicit;

  const season = process.env.LIVE_SEASON ? Number(process.env.LIVE_SEASON) : null;
  const week = process.env.LIVE_WEEK ? Number(process.env.LIVE_WEEK) : null;

  if (Number.isFinite(season) && Number.isFinite(week)) {
    const docs = await Game.find({ season, week }).select("gameId").lean();
    return docs.map((d) => d.gameId).filter(Boolean);
  }

  // IMPORTANT: Don't throw. If user didn't configure, just return empty and log.
  console.warn(
    'No tracked games configured. Set LIVE_SEASON + LIVE_WEEK or LIVE_GAME_IDS. ' +
      'Example: LIVE_SEASON=2025 LIVE_WEEK=1 node syncRemainingLiveData.js'
  );
  return [];
}

/* -------------------- Live game filtering -------------------- */
function normalizeGame(res) {
  if (!res) return null;
  // bdlList sometimes returns {data: ...}
  const d = res.data != null ? res.data : res;
  if (Array.isArray(d)) return d[0] || null;
  return d;
}

function isLikelyLiveGame(game) {
  if (!game || typeof game !== "object") return false;

  // Common-ish patterns across sports APIs
  const status =
    (game.status ?? game.game_status ?? game.state ?? game.gameStatus ?? game.game_state ?? "")
      .toString()
      .toLowerCase()
      .trim();

  // Explicit booleans
  if (game.in_progress === true || game.inProgress === true || game.live === true) return true;

  // If status suggests live / in-progress
  const liveHints = ["in_progress", "in progress", "live", "ongoing", "active", "playing"];
  if (liveHints.some((s) => status.includes(s))) return true;

  // If status suggests NOT live
  const notLiveHints = ["final", "completed", "ended", "scheduled", "pre", "pregame", "not_started", "canceled", "postponed"];
  if (notLiveHints.some((s) => status.includes(s))) return false;

  // Heuristic: if period/quarter is > 0 and not final
  const period = game.period ?? game.quarter ?? game.qtr ?? null;
  if (typeof period === "number" && period > 0) return true;

  // Heuristic: if there is a non-empty clock and it's not 0
  const clock = (game.clock ?? game.game_clock ?? "").toString();
  if (clock && clock !== "0:00" && clock !== "00:00") return true;

  return false;
}

async function getLiveGameIdsFromTracked(trackedGameIds) {
  // Default: plays only for live games (your spec)
  const liveOnly = String(process.env.LIVE_ONLY || "true").toLowerCase() !== "false";
  if (!liveOnly) return trackedGameIds;

  const live = [];

  for (const gameId of trackedGameIds) {
    try {
      const res = await ballDontLieService.getGame(gameId);
      const g = normalizeGame(res);
      if (isLikelyLiveGame(g)) live.push(gameId);
    } catch (err) {
      // If we can't fetch status for this game, just skip it.
      console.warn(`⚠️ status check failed for game ${gameId}:`, err?.response?.status || "", err?.message || err);
    }

    // tiny pause (avoid burst)
    await sleep(25);
  }

  return live;
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
            description: rec.description ?? rec.desc ?? "",
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

async function syncNewPlaysForGame(gameId) {
  const key = `plays_cursor_game_${gameId}`;

  let cursor = await getCursor(key); // "last seen"
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

    // End of stream this tick. Persist last seen play id for future incremental fetches.
    if (lastId) cursor = lastId;
    break;
  }

  if (cursor) await setCursor(key, cursor, { gameId, pages, fetched: totalFetched });

  return { gameId, pages, fetched: totalFetched, upserts: totalUpserts, cursor: cursor || null };
}

/* -------------------- Orchestration helpers -------------------- */
function getDefaultSeasons() {
  const y = new Date().getFullYear();
  return [y, y - 1];
}
function getSeasonsFromEnvOrDefault() {
  if (!process.env.SYNC_SEASONS) return getDefaultSeasons();
  return process.env.SYNC_SEASONS
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

async function syncOddsAndProps(gameIds) {
  if (!Array.isArray(gameIds) || !gameIds.length) return;
  // fullSyncService is now continue-on-error per game (updated file below)
  await fullSyncService.syncOddsForGames({ gameIds });
  await fullSyncService.syncPlayerPropsForGames({ gameIds });
}

async function syncStandings(seasons) {
  if (!Array.isArray(seasons) || !seasons.length) return;
  await desiredService.syncStandingsFromAPI({ seasons });
}

async function syncInjuries() {
  if (String(process.env.LIVE_SYNC_INJURIES || "true").toLowerCase() === "false") return;
  await desiredService.syncInjuriesFromAPI({ per_page: 100 });
}

async function runPlaysCycle(liveGameIds) {
  if (!Array.isArray(liveGameIds) || !liveGameIds.length) return [];

  const results = [];
  for (const gameId of liveGameIds) {
    console.log(`🔁 live plays tick: game ${gameId}`);
    try {
      const r = await syncNewPlaysForGame(gameId);
      results.push(r);

      if (r.fetched > 0) {
        console.log(
          `✅ plays game ${gameId}: fetched=${r.fetched}, upserts=${r.upserts}, pages=${r.pages}, cursor=${r.cursor}`
        );
      }
    } catch (err) {
      console.warn(`⚠️ plays sync failed for game ${gameId}:`, err?.response?.status || "", err?.message || err);
    }

    await sleep(50);
  }

  return results;
}

async function main() {
  const runOnce = process.argv.includes("--once");

  await connectDB();
  console.log("✅ DB connected");

  const seasons = getSeasonsFromEnvOrDefault();
  console.log("Seasons for standings:", seasons.join(", "));

  let lastOddsProps = 0;
  let lastStandings = 0;
  let lastInjuries = 0;

  let lastLiveCheck = 0;
  let cachedLiveGameIds = [];

  const tick = async () => {
    const trackedGameIds = await getTrackedGameIds();

    // Live games subset (only refresh status occasionally)
    const now = Date.now();
    if (!lastLiveCheck || now - lastLiveCheck >= LIVE_STATUS_REFRESH_MS) {
      cachedLiveGameIds = await getLiveGameIdsFromTracked(trackedGameIds);
      lastLiveCheck = now;

      if (!cachedLiveGameIds.length) {
        console.log("ℹ️ No live games right now. Waiting for the next tick...");
      } else {
        console.log(`🟢 Live games: ${cachedLiveGameIds.join(", ")}`);
      }
    }

    // Plays only for live games
    await runPlaysCycle(cachedLiveGameIds);

    // Odds/props for *tracked* games (can exist pre-game)
    if (!lastOddsProps || now - lastOddsProps >= ODDS_PROPS_REFRESH_MS) {
      if (trackedGameIds.length) {
        console.log("🔁 refreshing odds + player props...");
        try {
          await syncOddsAndProps(trackedGameIds);
        } catch (err) {
          console.warn("⚠️ odds/props refresh failed:", err?.message || err);
        }
      }
      lastOddsProps = now;
    }

    // Standings
    if (!lastStandings || now - lastStandings >= STANDINGS_REFRESH_MS) {
      console.log("🔁 refreshing standings...");
      try {
        await syncStandings(seasons);
      } catch (err) {
        console.warn("⚠️ standings refresh failed:", err?.message || err);
      }
      lastStandings = now;
    }

    // Injuries
    if (!lastInjuries || now - lastInjuries >= INJURIES_REFRESH_MS) {
      console.log("🔁 refreshing injuries...");
      try {
        await syncInjuries();
      } catch (err) {
        console.warn("⚠️ injuries refresh failed:", err?.message || err);
      }
      lastInjuries = now;
    }
  };

  // Initial one-time syncs (fast + unblocks UI)
  await syncStandings(seasons);
  await syncInjuries();

  if (runOnce) {
    console.log("Running one cycle (--once)");
    await tick();
    return;
  }

  console.log(`🟢 Live polling started (interval=${POLL_INTERVAL_MS}ms; plays=LIVE_ONLY)`);
  let running = false;

  const guardedTick = async () => {
    if (running) return;
    running = true;
    try {
      await tick();
    } catch (err) {
      console.error("❌ live tick failed:", err?.message || err);
    } finally {
      running = false;
    }
  };

  await guardedTick();
  const interval = setInterval(guardedTick, POLL_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async () => {
    clearInterval(interval);
    console.log("\n🛑 Shutting down live sync...");
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("❌ syncRemainingLiveData failed:", err);
  process.exit(1);
});