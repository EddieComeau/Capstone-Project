// server/sync/syncGames.js
// Wrapper around server/services/syncService.js

const { syncGames: syncGamesService } = require("../services/syncService");

/**
 * Sync games for the given seasons array (e.g., [2025, 2024]).
 */
async function syncGames(seasons = []) {
  console.log("🔁 wrapper syncGames starting...");
  await syncGamesService({ seasons });
  console.log("✅ wrapper syncGames complete");
}

module.exports = { syncGames };
