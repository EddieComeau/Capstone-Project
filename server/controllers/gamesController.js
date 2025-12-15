// controllers/gamesController.js
const { getGames } = require("../services/sportsdataService");

async function listGames(req, res) {
  try {
    const { season, week, per_page, cursor } = req.query;

    const data = await getGames({
      season: season != null ? Number(season) : undefined,
      week: week != null ? Number(week) : undefined,
      per_page: per_page != null ? Number(per_page) : undefined,
      cursor: cursor != null ? Number(cursor) : undefined,
    });

    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({
      error: "Failed to fetch games",
      details: err.details || undefined,
    });
  }
}

module.exports = { listGames };
