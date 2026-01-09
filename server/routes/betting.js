// server/routes/betting.js
//
// Exposes REST endpoints for retrieving and synchronising betting data.
// Clients can query the Odds and PlayerProp collections and trigger
// background syncs on demand. The sync operation leverages the
// shared `syncBettingData` function defined in server/syncBettingData.js.

const express = require('express');
const router = express.Router();

const Odds = require('../models/Odds');
const PlayerProp = require('../models/PlayerProp');
const { syncBettingData } = require('../syncBettingData');

/**
 * GET /api/betting/props
 *
 * Retrieve player prop lines from MongoDB. Supports filtering by
 * playerId, gameId, vendor, prop_type, season and week. Season/week
 * filters derive games via the Game model and then restrict props.
 */
router.get('/props', async (req, res) => {
  try {
    const query = {};
    if (req.query.playerId) query.playerId = Number(req.query.playerId);
    if (req.query.gameId) query.gameId = Number(req.query.gameId);
    if (req.query.propType) query.prop_type = req.query.propType;
    if (req.query.vendor) query.vendor = req.query.vendor;
    // Note: season/week filtering via Game model is not implemented here
    // because props are keyed only by gameId. For now, clients should
    // supply gameId(s) explicitly when filtering by season/week.
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
    const props = await PlayerProp.find(query).limit(limit).lean();
    res.json({ ok: true, count: props.length, props });
  } catch (e) {
    console.error('Error fetching player props:', e && e.message ? e.message : e);
    res.status(500).json({ ok: false, error: 'Failed to fetch player props' });
  }
});

/**
 * GET /api/betting/odds
 *
 * Retrieve gameā€‘level odds from MongoDB. Clients can filter by
 * gameId and provider. Additional query parameters such as season or
 * week can be passed but are not used directly here ā€“ clients should
 * derive game IDs from the Games collection first.
 */
router.get('/odds', async (req, res) => {
  try {
    const query = {};
    if (req.query.gameId) query.gameId = Number(req.query.gameId);
    if (req.query.provider) query.provider = req.query.provider;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
    const odds = await Odds.find(query).limit(limit).lean();
    res.json({ ok: true, count: odds.length, odds });
  } catch (e) {
    console.error('Error fetching odds:', e && e.message ? e.message : e);
    res.status(500).json({ ok: false, error: 'Failed to fetch odds' });
  }
});

/**
 * POST /api/betting/sync
 *
 * Trigger an onā€‘demand sync of betting data. Accepts JSON body
 * matching the options supported by syncBettingData(). Returns a
 * summary of inserted counts. This endpoint can be protected with
 * authentication in production.
 */
router.post('/sync', async (req, res) => {
  try {
    const opts = req.body || {};
    const summary = await syncBettingData(opts);
    res.json({ ok: true, summary });
  } catch (e) {
    console.error('Error performing betting sync:', e && e.message ? e.message : e);
    res.status(500).json({ ok: false, error: 'Sync failed' });
  }
});

module.exports = router;