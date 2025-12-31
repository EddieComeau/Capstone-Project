// server/controllers/injuriesController.js

const Injury = require('../models/Injury');
const syncService = require('../services/syncService');

/**
 * GET /api/injuries
 *
 * Returns injuries from your MongoDB Injury collection.  You can filter
 * results by providing a team abbreviation via `team` query param or a
 * player ID via `playerId`.  If no filters are provided, all injuries
 * are returned.
 */
async function getInjuries(req, res) {
  try {
    const { team, playerId } = req.query;
    const filter = {};
    // Filter by team abbreviation
    if (team) {
      // The injury document stores the full BDL player payload under `player`.
      // That payload includes a `team` object with an `abbreviation` field.
      filter['player.team.abbreviation'] = team.toUpperCase();
    }
    // Filter by player ID (Ball Don’t Lie player id)
    if (playerId) {
      const idNum = Number(playerId);
      if (!isNaN(idNum)) {
        filter['player.id'] = idNum;
      }
    }
    const injuries = await Injury.find(filter).sort({ date: -1 });
    res.json(injuries);
  } catch (err) {
    console.error('Error fetching injuries:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch injuries' });
  }
}

/**
 * POST /api/injuries/sync
 *
 * Triggers a sync of player injuries from the Ball Don’t Lie API.  Accepts
 * optional `per_page` and `cursor` in the request body to control
 * pagination.  Returns summary information about the sync operation.
 */
async function syncInjuries(req, res) {
  try {
    const options = req.body || {};
    const result = await syncService.syncInjuries(options);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Error syncing injuries:', err && err.message ? err.message : err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to sync injuries' });
  }
}

module.exports = {
  getInjuries,
  syncInjuries,
};