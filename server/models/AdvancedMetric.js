// server/models/AdvancedMetric.js
const mongoose = require("mongoose");

/**
 * AdvancedMetric
 *
 * Stores both raw "bdl" advanced stats and computed (from raw Stat docs)
 * and a merged `metrics` view (preferred for read).
 *
 * Schemas:
 * - entityType: 'player' | 'team'
 * - entityId: numeric id (bdlId or teamId)
 * - season: number
 * - scope: 'season' | 'week' | 'rolling-N' | etc.
 * - gameCount: number (from computed or BDL)
 * - sources: { bdl: {...}, computed: {...} }   // keep raw payloads
 * - metrics: merged object (bdl preferred, computed fallback)
 */
const AdvancedMetricSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, enum: ["player", "team"] },
    entityId: { type: Number, required: true, index: true },
    season: { type: Number, required: true, index: true },
    scope: { type: String, default: "season" },

    // number of games used to compute metrics (if available)
    gameCount: { type: Number, default: 0 },

    // the primary merged metrics object used for reads
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },

    // raw sources: keep BDL endpoint payload and computed values separately
    sources: {
      bdl: { type: mongoose.Schema.Types.Mixed, default: null },       // raw BDL advanced stat payload
      computed: { type: mongoose.Schema.Types.Mixed, default: null },  // our computed sums/averages
    },

    // convenience raw field
    raw: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

AdvancedMetricSchema.index({ entityType: 1, entityId: 1, season: 1, scope: 1 }, { unique: true });

module.exports = mongoose.model("AdvancedMetric", AdvancedMetricSchema);
