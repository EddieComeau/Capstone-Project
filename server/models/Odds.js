// server/models/Odds.js
const mongoose = require('mongoose');

const OddsSchema = new mongoose.Schema({
  oddsId: { type: String, index: true },
  gameId: { type: Number }, // indexed below
  vendor: String,
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  raw: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

OddsSchema.index({ gameId: 1 });

module.exports = mongoose.model('Odds', OddsSchema);
