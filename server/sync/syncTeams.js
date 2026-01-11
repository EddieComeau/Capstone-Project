// server/sync/syncTeams.js
// Safe wrapper that works with current syncService exports

const syncService = require("../services/syncService");

async function syncTeams() {
  if (typeof syncService.syncTeams !== "function") {
    throw new Error("syncService.syncTeams is not defined — check syncService exports");
  }

  console.log("🔁 wrapper syncTeams starting...");
  await syncService.syncTeams();
  console.log("✅ wrapper syncTeams complete");
}

module.exports = { syncTeams };
