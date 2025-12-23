// server/models/WebhookSubscription.js
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

module.exports = mongoose.model('WebhookSubscription', WebhookSubscriptionSchema);
