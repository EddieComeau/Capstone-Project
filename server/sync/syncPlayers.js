// server/sync/syncPlayers.js
// Wrapper around server/services/syncService.js

const { syncPlayers: syncPlayersService } = require("../services/syncService");

/**
 * Sync all players.
 * NOTE: seasons is accepted for compatibility with syncAllButStats.js,
 * but the upstream players endpoint is not season-filtered, so it's unused.
 */
async function syncPlayers(seasons = []) {
  console.log("🔁 wrapper syncPlayers starting...");
  await syncPlayersService();
  console.log("✅ wrapper syncPlayers complete");
}

module.exports = { syncPlayers };
