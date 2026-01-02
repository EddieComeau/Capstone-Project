// Updated WebhookSubscription.js with added index on createdAt to improve performance
// when listing webhook subscriptions. This index helps with sorting and scanning
// through the collection.

const mongoose = require('mongoose');

const WebhookSubscriptionSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    events: { type: [String], default: [] }, // e.g., ['injury.update', 'metric.threshold']
    active: { type: Boolean, default: true },
    secret: { type: String, default: null }, // optional signing secret
    lastStatus: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Index the createdAt field for improved performance when listing webhooks
WebhookSubscriptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WebhookSubscription', WebhookSubscriptionSchema);