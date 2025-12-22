// server/controllers/playersController.js

const syncService = require('../services/syncService');

/**
 * POST /api/players/sync
 * Endpoint to sync players from the Ball Don't Lie API.
 */
async function syncPlayers(req, res) {
  try {
    console.log("🔄 Starting player sync...");

    // Validate request body
    const options = req.body || {};
    console.log("📄 Sync options received:", options);

    // Call the sync service
    const result = await syncService.syncPlayers(options);

    console.log("✅ Player sync completed successfully.");
    return res.status(200).json({
      ok: true,
      message: "Player sync completed successfully.",
      data: result,
    });
  } catch (err) {
    console.error("❌ Error during player sync:", err.message);

    // Avoid leaking sensitive information
    return res.status(500).json({
      ok: false,
      error: err.message || "Player sync failed.",
    });
  }
}

module.exports = {
  syncPlayers,
};
