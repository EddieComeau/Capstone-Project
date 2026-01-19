const express = require('express');
const syncService = require('../services/syncService');
const desiredService = require('../services/desiredService');
const fullSyncService = require('../services/fullSyncService');
const Game = require('../models/Game');

/*
 * This router exposes manual sync endpoints.  It replaces the old
 * single-endpoint syncRoutes.js that only synced players.  The admin
 * dashboard expects these routes to exist so it can trigger sync jobs.
 *
 * Routes:
 *  POST /players  → sync players
 *  POST /games    → sync games (optionally filtered by season)
 *  POST /full     → full sync (players, games, stats, season aggregates, plays)
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

// POST /api/sync/stats
// Trigger a full per-game player stats sync.  This endpoint invokes
// syncService.syncStats() with any options passed in the request body.
// Note: this operation can be very long‑running, as it iterates through
// tens of thousands of stat records.  You can supply per_page or maxPages
// in the body to control pagination.
router.post('/stats', async (req, res, next) => {
  try {
    const {
      season,
      seasons,
      per_page,
      maxPages,
      ...rest
    } = req.body || {};
    // Build a base params object from allowed options
    const baseParams = {};
    if (per_page) baseParams.per_page = per_page;
    if (maxPages) baseParams.maxPages = maxPages;
    // If seasons array is provided, sync each season individually to avoid
    // pulling historical data unintentionally.  Otherwise, fall back to a
    // single season or no season (which will sync all seasons).
    if (Array.isArray(seasons) && seasons.length > 0) {
      for (const s of seasons) {
        await syncService.syncStats({ ...baseParams, season: s, ...rest });
      }
    } else if (season) {
      await syncService.syncStats({ ...baseParams, season, ...rest });
    } else {
      await syncService.syncStats({ ...baseParams, ...rest });
    }
    res.json({ ok: true, message: 'Stats synced' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sync/full
// Runs a full sync for the supplied seasons array.
router.post('/full', async (req, res, next) => {
  try {
    const { seasons } = req.body || {};
    await fullSyncService.fullSync({ seasons });
    res.json({ ok: true, message: 'Full sync complete' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sync/derived
router.post('/derived', async (req, res, next) => {
  try {
    // Optionally accept a seasons array in the body; default to the latest two seasons.
    let { seasons } = req.body || {};
    if (!Array.isArray(seasons) || seasons.length === 0) {
      const distinct = await Game.distinct('season');
      const sorted = distinct.filter(Boolean).sort((a, b) => b - a);
      seasons = sorted.slice(0, 2);
    }
    // First compute advanced metrics (sums/averages) from your Stats collection
    await desiredService.computeAdvancedStats();
    // Then recompute standings and matchups
    await desiredService.computeStandings({ seasons });
    await desiredService.computeMatchups({ seasons });
    res.json({ ok: true, message: 'Derived metrics computed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
