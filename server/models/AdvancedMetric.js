// server/models/AdvancedMetric.js
const mongoose = require("mongoose");

/**
 * Generic container for derived advanced metrics.
 * entityType: 'player' | 'team'
 * entityId: numeric id (bdlId or teamId)
 * season: number
 * scope: e.g., 'season', 'week', 'rolling-4', etc.
 * metrics: free-form object containing derived metrics (per-game averages, rates, etc.)
 */
const AdvancedMetricSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, enum: ["player", "team"] },
    entityId: { type: Number, required: true, index: true },
    season: { type: Number, required: true, index: true },
    scope: { type: String, default: "season" },
    gameCount: { type: Number, default: 0 },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

AdvancedMetricSchema.index({ entityType: 1, entityId: 1, season: 1, scope: 1 }, { unique: true });

module.exports = mongoose.model("AdvancedMetric", AdvancedMetricSchema);
