// server/routes/gamesRoutes.js
const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

router.get('/ids', async (req, res) => {
  try {
    const { season, week } = req.query;
    if (!season || !week) return res.status(400).json({ error: 'season and week required' });

    const games = await Game.find({ season: Number(season), week: Number(week) })
                            .select('gameId -_id')
                            .lean();

    res.json(games.map(g => g.gameId));
  } catch (err) {
    console.error('Error fetching game IDs:', err);
    res.status(500).json({ error: 'Failed to fetch game IDs' });
  }
});

module.exports = router;
