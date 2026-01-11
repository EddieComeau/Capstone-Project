// server/sync/syncInjuries.js
// Wrapper around server/services/syncService.js

const { syncInjuries: syncInjuriesService } = require("../services/syncService");

/**
 * Sync injuries.
 * NOTE: seasons is accepted for compatibility, but injuries are not
 * typically season-filtered in the API calls used here, so it's unused.
 */
async function syncInjuries(seasons = []) {
  console.log("🔁 wrapper syncInjuries starting...");
  await syncInjuriesService();
  console.log("✅ wrapper syncInjuries complete");
}

module.exports = { syncInjuries };
