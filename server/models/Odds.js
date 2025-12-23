// server/models/Odds.js
const mongoose = require('mongoose');

const OddsSchema = new mongoose.Schema(
  {
    oddsId: { type: Number, index: true, sparse: true },
    gameId: { type: Number, index: true },
    provider: String,
    market: mongoose.Schema.Types.Mixed,
    lines: mongoose.Schema.Types.Mixed,
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

OddsSchema.index({ gameId: 1, provider: 1 });

module.exports = mongoose.model('Odds', OddsSchema);
