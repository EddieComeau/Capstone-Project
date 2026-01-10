const express = require('express');
const router = express.Router();

/*
 * Betting Routes
 *
 * Exposes REST endpoints to query betting odds and player props from
 * MongoDB. Provides a manual sync endpoint to pull fresh data from
 * the BallDontLie API via the syncBettingData() function. The field
 * names for queries align with the underlying Mongoose models: use
 * playerId/gameId/propType/vendor to filter props and gameId/vendor
 * to filter odds.
 */

const Odds = require('../models/Odds');
const BettingProp = require('../models/BettingProp');
const { syncBettingData } = require('../syncBettingData');

// GET /api/betting/props
// Retrieve player prop lines. Supports filtering by playerId,
// gameId, propType and vendor. Limit defaults to 100 and is
// capped at 1000.
router.get('/props', async (req, res) => {
  try {
    const query = {};
    if (req.query.playerId) query.player_id = Number(req.query.playerId);
    if (req.query.gameId) query.game_id = Number(req.query.gameId);
    if (req.query.propType) query.prop = req.query.propType;
    if (req.query.vendor) query.vendor = req.query.vendor;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
    const props = await BettingProp.find(query).sort({ updated_at: -1 }).limit(limit).lean();
    res.json({ ok: true, count: props.length, props });
  } catch (e) {
    console.error('Error fetching betting props:', e.message || e);
    res.status(500).json({ ok: false, error: 'Failed to fetch betting props' });
  }
});

// GET /api/betting/odds
// Retrieve game odds. Filter by gameId or vendor. Limit defaults to
// 100 and is capped at 1000.
router.get('/odds', async (req, res) => {
  try {
    const query = {};
    if (req.query.gameId) query.game_id = Number(req.query.gameId);
    if (req.query.vendor) query.vendor = req.query.vendor;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
    const odds = await Odds.find(query).sort({ updated_at: -1 }).limit(limit).lean();
    res.json({ ok: true, count: odds.length, odds });
  } catch (e) {
    console.error('Error fetching betting odds:', e.message || e);
    res.status(500).json({ ok: false, error: 'Failed to fetch betting odds' });
  }
});

// POST /api/betting/sync
// Kick off an on‑demand sync. Accepts JSON body with optional
// season, week and gameIds array. Returns a summary of inserted
// records. This endpoint is unauthenticated for development
// convenience; protect with auth in production.
router.post('/sync', async (req, res) => {
  try {
    const options = req.body || {};
    const summary = await syncBettingData(options);
    res.json({ ok: true, summary });
  } catch (e) {
    console.error('Error syncing betting data:', e.message || e);
    res.status(500).json({ ok: false, error: 'Sync failed' });
  }
});

module.exports = router;