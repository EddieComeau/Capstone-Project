// controllers/playByPlayController.js
const { getPlays } = require("../services/sportsdataService");

async function getPlayByPlay(req, res) {
  try {
    const { gameId, cursor, per_page } = req.query;

    if (!gameId) {
      return res.status(400).json({ error: "gameId is required" });
    }

    const data = await getPlays({
      game_id: Number(gameId),
      per_page: per_page != null ? Number(per_page) : 100,
      cursor: cursor != null ? Number(cursor) : undefined,
    });

    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({
      error: "Failed to fetch play-by-play",
      details: err.details || undefined,
    });
  }
}

module.exports = { getPlayByPlay };
