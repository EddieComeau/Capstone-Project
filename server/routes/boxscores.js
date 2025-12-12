// server/routes/boxscores.js
const express = require("express");
const router = express.Router();
const { getBoxScore } = require("../services/sportsdataService");

/**
 * GET /api/boxscores/:season/:week/:homeTeam
 *
 * Example:
 *   /api/boxscores/2024/1/NE
 */
router.get("/:season/:week/:homeTeam", async (req, res) => {
  try {
    const season = parseInt(req.params.season, 10);
    const week = parseInt(req.params.week, 10);
    const homeTeam = req.params.homeTeam.toUpperCase();

    const payload = await getBoxScore(season, week, homeTeam);
    res.json(payload);
  } catch (err) {
    console.error("Error fetching box score:", err.message);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message,
      details: err.response,
    });
  }
});

module.exports = router;
