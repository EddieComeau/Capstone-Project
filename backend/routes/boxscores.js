// backend/routes/boxscores.js

const express = require("express");
const router = express.Router();
const { getBoxScore } = require("../services/sportsdataService");

/**
 * GET /api/boxscores/:season/:week/:homeTeam
 *
 * Box score by team (home team), live OR final.
 *
 * Examples:
 *   /api/boxscores/2024/1/NE
 *   /api/boxscores/2023/5/DAL
 *
 * - season: 4-digit year, like 2024
 * - week: NFL week number, like 1–18
 * - homeTeam: SportsData.io team abbreviation (NE, DAL, KC, etc)
 */
router.get("/:season/:week/:homeTeam", async (req, res, next) => {
  try {
    const { season, week, homeTeam } = req.params;

    if (!season || !week || !homeTeam) {
      return res.status(400).json({
        error: "season, week, and homeTeam are required path parameters",
      });
    }

    const boxScore = await getBoxScore(season, week, homeTeam);

    // If SportsData.io returns null/empty, handle gracefully
    if (!boxScore) {
      return res.status(404).json({
        error: "No box score data found for the provided parameters",
      });
    }

    return res.json(boxScore);
  } catch (err) {
    console.error("Error in GET /api/boxscores/:season/:week/:homeTeam:", err.message);
    return res.status(500).json({
      error: "Failed to fetch box score data",
    });
  }
});

module.exports = router;
