/**
 * scheduler.js
 *
 * A lightweight cron scheduler that runs the betting data sync.
 * Loads .env config explicitly for environments where it's missing.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "server", ".env") });

const cron = require("node-cron");
const mongoose = require("mongoose");
const { syncBettingData } = require("./server/syncBettingData");

let task = null;
let isRunning = false;

async function ensureMongoConnected() {
  if (mongoose.connection.readyState !== 0) return;
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is not set in environment.");
  await mongoose.connect(mongoUri);
}

function startBettingScheduler() {
  const enabled = String(process.env.BETTING_SCHEDULER_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) {
    console.log("[scheduler] Betting scheduler disabled via .env");
    return null;
  }

  const cronExpr = process.env.BETTING_SYNC_CRON || "0 */3 * * *";
  const timezone = process.env.BETTING_SYNC_TZ || undefined;

  if (!cron.validate(cronExpr)) {
    throw new Error(`[scheduler] Invalid cron expression "${cronExpr}".`);
  }

  const runJob = async (reason = "cron") => {
    if (isRunning) {
      console.warn("[scheduler] Sync already running, skipping.");
      return;
    }

    isRunning = true;
    const started = new Date();
    console.log(`[scheduler] Betting sync started (${reason}) at ${started.toISOString()}`);

    try {
      await ensureMongoConnected();

      const season = process.env.BETTING_SYNC_SEASON;
      const week = process.env.BETTING_SYNC_WEEK;
      const gameIds = process.env.BETTING_SYNC_GAME_IDS;
      const only = process.env.BETTING_SYNC_ONLY;

      const res = await syncBettingData({ season, week, gameIds, only });

      if (!res.ok) {
        console.error("[scheduler] Sync failed:", res.errors);
      } else {
        console.log(
          `[scheduler] OK. odds=${res.odds?.fetched ?? "?"}, props=${res.props?.fetched ?? "?"}`
        );
      }
    } catch (err) {
      console.error("[scheduler] Threw:", err?.message || err);
    } finally {
      const ended = new Date();
      console.log(`[scheduler] Ended at ${ended.toISOString()}`);
      isRunning = false;
    }
  };

  task = cron.schedule(
    cronExpr,
    () => {
      runJob("cron").catch(() => {});
    },
    {
      scheduled: true,
      timezone,
    }
  );

  console.log(`[scheduler] Started cron "${cronExpr}"${timezone ? ` (tz=${timezone})` : ""}`);

  const runOnStartup = String(process.env.BETTING_SYNC_RUN_ON_STARTUP || "true").toLowerCase() !== "false";
  if (runOnStartup) {
    setTimeout(() => {
      runJob("startup").catch(() => {});
    }, 1500);
  }

  return task;
}

function stopBettingScheduler() {
  if (task) {
    task.stop();
    task = null;
    console.log("[scheduler] Stopped.");
  }
}

module.exports = { startBettingScheduler, stopBettingScheduler };

if (require.main === module) {
  startBettingScheduler();

  const shutdown = async () => {
    try {
      stopBettingScheduler();
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
