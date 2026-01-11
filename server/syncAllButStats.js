// server/syncAllButStats.js

require("dotenv").config();
const mongoose = require("mongoose");
const { syncTeams } = require("./scripts/syncTeams");
const { syncPlayers } = require("./sync/syncPlayers");
const { syncGames } = require("./sync/syncGames");
const { syncInjuries } = require("./sync/syncInjuries");
// Add other sync imports as needed

const seasons = process.env.SYNC_SEASONS
  ? process.env.SYNC_SEASONS.split(",").map((s) => parseInt(s.trim()))
  : [2025];

async function runSync() {
  console.log(`🔁 CORE sync starting — seasons: ${seasons.join(", ")}`);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("✅ Connected to MongoDB");

    // Run core sync functions
    await syncTeams();
    console.log("✅ Teams synced");

    await syncPlayers(seasons);
    console.log("✅ Players synced");

    await syncGames(seasons);
    console.log("✅ Games synced");

    await syncInjuries(seasons);
    console.log("✅ Injuries synced");

    // Add other sync functions here if needed

    console.log("✅ All non-stats sync completed.");
  } catch (err) {
    console.error("❌ syncAllButStats (CORE) failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

runSync();
