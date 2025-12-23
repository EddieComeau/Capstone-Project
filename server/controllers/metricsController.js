// server/controllers/metricsController.js
const AdvancedMetric = require('../models/AdvancedMetric');

/**
 * GET /api/metrics/:entityType/:entityId
 * Query params:
 *   - season (optional)
 *   - scope (optional; default 'season')
 *
 * Returns:
 * {
 *   ok: true,
 *   entityType, entityId, season, scope,
 *   metrics, sources, lastUpdated
 * }
 */
async function getMetrics(req, res) {
  try {
    const entityType = req.params.entityType;
    const entityId = Number(req.params.entityId);
    if (!['player','team'].includes(entityType)) return res.status(400).json({ ok:false, error: 'entityType must be player or team' });

    const season = req.query.season ? Number(req.query.season) : undefined;
    const scope = req.query.scope || 'season';
    const q = { entityType, entityId, scope };
    if (season) q.season = season;

    const doc = await AdvancedMetric.findOne(q).lean();
    if (!doc) return res.status(404).json({ ok:false, error: 'metrics not found' });

    const out = {
      ok: true,
      entityType: doc.entityType,
      entityId: doc.entityId,
      season: doc.season,
      scope: doc.scope,
      metrics: doc.metrics || {},
      sources: doc.sources || {},
      lastUpdated: doc.updatedAt || doc.createdAt,
    };

    return res.json(out);
  } catch (err) {
    console.error('getMetrics error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok:false, error: err.message || 'internal error' });
  }
}

module.exports = {
  getMetrics
};
