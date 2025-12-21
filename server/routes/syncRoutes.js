const express = require("express");
const { syncPlayers } = require("../controllers/playersController");

const router = express.Router();

/**
 * POST /api/sync
 * Trigger the sync process manually
 */
router.post("/", async (req, res) => {
  try {
    console.log("⏳ Starting manual sync of players from Ball Don't Lie...");
    await syncPlayers();
    console.log("✅ Manual sync completed successfully!");
    res.status(200).json({ message: "Players synced successfully!" });
  } catch (error) {
    console.error("❌ Error syncing players:", error.message);

    // Provide detailed error response
    res.status(500).json({
      error: "Failed to sync players",
      details: error.message,
    });
  }
});

module.exports = router;