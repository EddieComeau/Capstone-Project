// server/models/AdvancedMetric.js
const mongoose = require('mongoose');

const AdvancedMetricSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true }, // e.g., 'advanced:passing:season:2024:player:123'
  entityType: { type: String, enum: ['player','team'], required: true },
  entityId: { type: Number, required: true, index: true },
  season: Number,
  scope: { type: String, default: 'season' },
  metrics: { type: mongoose.Schema.Types.Mixed, default: {} }, // computed metrics / raw
  sources: { type: mongoose.Schema.Types.Mixed, default: {} }, // store raw BDL payloads or source metadata
  raw: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

AdvancedMetricSchema.index({ entityType: 1, entityId: 1, season: 1 });

module.exports = mongoose.model('AdvancedMetric', AdvancedMetricSchema);
