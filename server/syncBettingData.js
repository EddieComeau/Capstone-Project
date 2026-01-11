// server/syncBettingData.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const syncService = require("./services/syncService");

const DEFAULT_SEASON = Number(process.env.SEASON || 2024);
const DEFAULT_WEEK = Number(process.env.WEEK || 18);

// Allow CLI overrides
const season = Number(process.argv[2]) || DEFAULT_SEASON;
const week = Number(process.argv[3]) || DEFAULT_WEEK;

if (!season || !week) {
  console.error("❌ season and week are required");
  process.exit(1);
}

async function run() {
  console.log(`🔁 Syncing betting data for season ${season}, week ${week}`);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "nfl_cards",
    });

    console.log("✅ Connected to MongoDB");

    await syncService.syncOddsAndPropsForWeek({ season, week });

    console.log("🎉 Betting sync completed");
  } catch (err) {
    console.error("❌ Betting sync failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

run();
