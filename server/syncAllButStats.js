// server/syncAllButStats.js

require("dotenv").config();
const mongoose = require("mongoose");

const { syncTeams } = require("./sync/syncTeams");
const { syncPlayers } = require("./sync/syncPlayers");
const { syncGames } = require("./sync/syncGames");
const { syncInjuries } = require("./sync/syncInjuries");

const seasons = process.env.SYNC_SEASONS
  ? process.env.SYNC_SEASONS.split(",").map(s => Number(s.trim()))
  : [new Date().getFullYear(), new Date().getFullYear() - 1];

async function runSync() {
  console.log(`🔁 CORE sync starting — seasons: ${seasons.join(", ")}`);

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    await syncTeams();
    await syncPlayers(seasons);
    await syncGames(seasons);
    await syncInjuries(seasons);

    console.log("🎉 CORE sync completed successfully");
  } catch (err) {
    console.error("❌ syncAllButStats (CORE) failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

runSync();
