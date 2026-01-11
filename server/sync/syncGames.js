// server/sync/syncGames.js

const syncService = require("../services/syncService");

async function syncGames(seasons = []) {
  if (typeof syncService.syncGames !== "function") {
    throw new Error("syncService.syncGames is not defined — check syncService exports");
  }

  console.log("🔁 wrapper syncGames starting...");
  await syncService.syncGames({ seasons });
  console.log("✅ wrapper syncGames complete");
}

module.exports = { syncGames };
