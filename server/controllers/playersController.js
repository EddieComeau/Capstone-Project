// server/controllers/playersController.js

const syncService = require('../services/syncService');

/**
 * POST /api/players/sync
 */
async function syncPlayers(req, res) {
  try {
    const result = await syncService.syncPlayers(req.body || {});
    return res.status(200).json(result);
  } catch (err) {
    // Avoid leaking secrets
    return res.status(500).json({
      ok: false,
      error: err.message || 'Sync failed',
    });
  }
}

module.exports = {
  syncPlayers,
};
