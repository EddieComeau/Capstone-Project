// server/routes/betting.js

const express = require('express');
const router = express.Router();

const Odds = require('../models/Odds');
const BettingProp = require('../models/BettingProp');
const { syncBettingData } = require('../syncBettingData');

/**
 * GET /api/betting/props
 * Filter by playerId, gameId, propType, vendor. Limit default = 100; max = 1000.
 */
router.get('/props', async (req, res) => {
  try {
    const query = {};
    if (req.query.playerId) query.player_id = Number(req.query.playerId);
    if (req.query.gameId) query.game_id = Number(req.query.gameId);
    if (req.query.propType) query.prop = req.query.propType;
    if (req.query.vendor) query.vendor = req.query.vendor;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
    const props = await BettingProp.find(query)
      .sort({ updated_at: -1 })
      .limit(limit)
      .lean();
    res.json({ ok: true, count: props.length, props });
  } catch (e) {
    console.error('Error fetching betting props:', e.message || e);
    res.status(500).json({ ok: false, error: 'Failed to fetch betting props' });
  }
});

/**
 * GET /api/betting/odds
 * Filter by gameId, vendor. Limit default = 100; max = 1000.
 */
router.get('/odds', async (req, res) => {
  try {
    const query = {};
    if (req.query.gameId) query.game_id = Number(req.query.gameId);
    if (req.query.vendor) query.vendor = req.query.vendor;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
    const odds = await Odds.find(query)
      .sort({ updated_at: -1 })
      .limit(limit)
      .lean();
    res.json({ ok: true, count: odds.length, odds });
  } catch (e) {
    console.error('Error fetching betting odds:', e.message || e);
    res.status(500).json({ ok: false, error: 'Failed to fetch betting odds' });
  }
});

/**
 * POST /api/betting/sync
 * Trigger a manual sync (season/week or gameIds).
 * Returns a summary of upserted records.
 */
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
