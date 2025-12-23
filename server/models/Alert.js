// server/models/Alert.js
const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    entityType: { type: String, required: true, enum: ['player','team'] },
    entityId: { type: Number, required: true },
    season: { type: Number, default: null },
    scope: { type: String, default: 'season' },
    metric: { type: String, required: true }, // e.g., 'passer_rating'
    operator: { type: String, required: true, enum: ['gt','gte','lt','lte','eq'] },
    value: { type: Number, required: true },
    webhook: { type: mongoose.Schema.Types.ObjectId, ref: 'WebhookSubscription', required: true },
    active: { type: Boolean, default: true },
    lastFiredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', AlertSchema);
