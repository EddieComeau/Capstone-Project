// Updated Alert.js with indexes to improve query performance. This model now
// indexes the `webhook` foreign key and `createdAt` timestamp to accelerate
// queries used by listing alerts and filtering by webhook ID.

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

// Index the webhook foreign key to speed up population and filtering by webhook
AlertSchema.index({ webhook: 1 });
// Index createdAt for efficient listing and sorting
AlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);