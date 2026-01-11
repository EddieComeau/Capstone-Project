// server/sync/syncInjuries.js

const syncService = require("../services/syncService");

async function syncInjuries(seasons = []) {
  if (typeof syncService.syncInjuries !== "function") {
    throw new Error("syncService.syncInjuries is not defined — check syncService exports");
  }

  console.log("🔁 wrapper syncInjuries starting...");
  await syncService.syncInjuries();
  console.log("✅ wrapper syncInjuries complete");
}

module.exports = { syncInjuries };
