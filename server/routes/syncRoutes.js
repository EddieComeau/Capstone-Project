const express = require('express');
const syncService = require('../services/syncService');
const desiredService = require('../services/desiredService');

/*
 * This router exposes manual sync endpoints.  It replaces the old
 * single-endpoint syncRoutes.js that only synced players.  The admin
 * dashboard expects these routes to exist so it can trigger sync jobs.
 *
 * Routes:
 *  POST /players  → sync players
 *  POST /games    → sync games (optionally filtered by season)
 *  POST /derived  → recompute derived metrics (advanced stats, standings, matchups)
 */
const router = express.Router();

// POST /api/sync/players
router.post('/players', async (req, res, next) => {
  try {
    const params = req.body || {};
    await syncService.syncPlayers(params);
    res.json({ ok: true, message: 'Players synced' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sync/games
router.post('/games', async (req, res, next) => {
  try {
    const params = req.body || {};
    await syncService.syncGames(params);
    res.json({ ok: true, message: 'Games synced' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sync/derived
router.post('/derived', async (req, res, next) => {
  try {
    // Optionally accept a seasons array in the body
    const { seasons } = req.body || {};
    // First compute advanced metrics (sums/averages) from your Stats collection
    await desiredService.computeAdvancedStats();
    // Then recompute standings and matchups
    await desiredService.computeStandings();
    await desiredService.computeMatchups();
    res.json({ ok: true, message: 'Derived metrics computed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;