// server/sync/syncPlayers.js

const syncService = require("../services/syncService");

async function syncPlayers(seasons = []) {
  if (typeof syncService.syncPlayers !== "function") {
    throw new Error("syncService.syncPlayers is not defined — check syncService exports");
  }

  console.log("🔁 wrapper syncPlayers starting...");
  await syncService.syncPlayers();
  console.log("✅ wrapper syncPlayers complete");
}

module.exports = { syncPlayers };
