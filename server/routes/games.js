// server/routes/games.js
const express = require("express");
const router = express.Router();
const Game = require("../models/Game");

function serializeGame(game) {
  return {
    id: game.gameId,
    gameId: game.gameId,
    season: game.season,
    week: game.week,
    status: game.status || game.raw?.status || null,
    date: game.date || null,
    home_team: game.home_team || null,
    visitor_team: game.visitor_team || null,
    home_score: game.home_score ?? null,
    visitor_score: game.visitor_score ?? null,
    home_team_score: game.home_score ?? null,
    visitor_team_score: game.visitor_score ?? null,
  };
}

// GET /api/games?season=2025&week=1&per_page=100&cursor=123
router.get("/", async (req, res) => {
  try {
    const { season, week, per_page, cursor } = req.query;
    const query = {};
    if (season) query.season = parseInt(season, 10);
    if (week) query.week = parseInt(week, 10);
    const cursorNum = cursor != null ? Number(cursor) : null;
    if (cursorNum != null && !Number.isNaN(cursorNum)) {
      query.gameId = { $gt: cursorNum };
    }

    const limit = per_page != null ? Number(per_page) : 100;
    const games = await Game.find(query)
      .sort({ season: 1, week: 1, date: 1, gameId: 1 })
      .limit(limit)
      .lean();

    const data = games.map(serializeGame);
    const nextCursor =
      games.length === limit ? games[games.length - 1].gameId : null;

    res.json({ ok: true, data, meta: { next_cursor: nextCursor } });
  } catch (e) {
    console.error("Error in /games:", e.message);
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

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
