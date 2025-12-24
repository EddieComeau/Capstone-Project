// server/controllers/syncController.js
const syncService = require('../services/syncService');

async function postSyncGames(req, res) {
  try {
    const { seasons, per_page, dryRun, historical, maxPages } = req.body || {};
    const seasonsParsed = Array.isArray(seasons) ? seasons : (seasons ? seasons.split ? seasons.split(',').map(s => Number(s.trim())).filter(Boolean) : [Number(seasons)] : null);
    const opts = {
      per_page: per_page ? Number(per_page) : undefined,
      seasons: seasonsParsed,
      historical: Boolean(historical),
      dryRun: Boolean(dryRun),
      maxPages: maxPages ? Number(maxPages) : undefined
    };
    console.log('API /api/sync/games called with opts:', opts);
    // Run and await; for long-running jobs you could spawn background job, but admin UI expects a result
    const result = await syncService.syncGames(opts);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('postSyncGames error', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}

async function postSyncPlayers(req, res) {
  try {
    const { per_page, dryRun } = req.body || {};
    const result = await syncService.syncPlayers({ per_page: per_page ? Number(per_page) : undefined, dryRun: Boolean(dryRun) });
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('postSyncPlayers error', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}

async function postComputeDerived(req, res) {
  try {
    const derivedService = require('../services/derivedService');
    const { season, per_page, dryRun } = req.body || {};
    const result = await derivedService.computeAllDerived({ season: season ? Number(season) : undefined, per_page: per_page ? Number(per_page) : undefined, dryRun: Boolean(dryRun) });
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('postComputeDerived error', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}

module.exports = { postSyncGames, postSyncPlayers, postComputeDerived };
