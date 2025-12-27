const express = require('express');
const SyncState = require('../models/SyncState');

/*
 * Routes to manage sync state entries.  The admin dashboard uses
 * these endpoints to display current sync jobs and reset them.
 *
 * GET /api/syncstate      → list all sync states
 * POST /api/syncstate/reset  → reset one or all sync states
 */
const router = express.Router();

// GET /api/syncstate
router.get('/', async (req, res, next) => {
  try {
    const states = await SyncState.find({}).sort({ updatedAt: -1 }).lean();
    res.json({ ok: true, states });
  } catch (err) {
    next(err);
  }
});

// POST /api/syncstate/reset
router.post('/reset', async (req, res, next) => {
  try {
    const { key } = req.body || {};
    if (key) {
      // Remove a specific sync state by key
      await SyncState.deleteOne({ key });
    } else {
      // Remove all sync states
      await SyncState.deleteMany({});
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;