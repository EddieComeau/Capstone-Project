// routes/boxscores.js

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
 * - season: 4-digit year or season key (2024 or 2024REG)
 * - week: NFL week number (0–4 preseason, 1–18 regular, 1–4 postseason)
 * - homeTeam: SportsData.io team abbreviation (NE, DAL, KC, etc)
 */
router.get("/:season/:week/:homeTeam", async (req, res) => {
  try {
    const { season, week, homeTeam } = req.params;

    if (!season || !week || !homeTeam) {
      return res.status(400).json({
        error: "season, week, and homeTeam are all required path params",
      });
    }

    const seasonNumOrKey =
      /^\d{4}$/.test(season) ? Number(season) : season;
    const weekNum = Number(week);

    if (Number.isNaN(weekNum)) {
      return res.status(400).json({ error: "week must be numeric" });
    }

    const boxScore = await getBoxScore(seasonNumOrKey, weekNum, homeTeam);

    if (!boxScore) {
      return res.status(404).json({ error: "Box score not found" });
    }

    res.json(boxScore);
  } catch (err) {
    console.error("Error fetching box score:", err.message);

    const status = err.response?.status;
    const data = err.response?.data;

    if (status && status !== 500) {
      return res.status(status).json({
        error:
          typeof data === "string"
            ? data
            : data?.Message || "Upstream SportsData.io error",
      });
    }

    res.status(500).json({ error: "Failed to fetch box score" });
  }
});

module.exports = router;
