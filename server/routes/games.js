// server/routes/games.js
const express = require("express");
const router = express.Router();
const Game = require("../models/Game");

// GET /api/games/ids?season=2025&week=18
router.get("/ids", async (req, res) => {
  try {
    const { season, week } = req.query;
    const query = {};
    if (season) query.season = parseInt(season);
    if (week) query.week = parseInt(week);

    const games = await Game.find(query, { gameId: 1, _id: 0 }).lean();
    const ids = games.map(g => g.gameId);
    res.json({ ok: true, count: ids.length, gameIds: ids });
  } catch (e) {
    console.error("Error in /games/ids:", e.message);
    res.status(500).json({ error: "Failed to fetch game IDs" });
  }
});

module.exports = router;
