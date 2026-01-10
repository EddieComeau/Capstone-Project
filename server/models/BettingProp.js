// server/models/BettingProp.js

const mongoose = require('mongoose');

/*
 * Stores player prop lines from the BallDontLie NFL API.
 * Unique combination: game_id + player_id + vendor + prop.
 */
const BettingPropSchema = new mongoose.Schema({
  game_id: { type: Number, required: true },
  player_id: { type: Number, required: true },
  vendor: { type: String, required: true },
  prop: { type: String, required: true },
  line_value: { type: mongoose.Schema.Types.Mixed },
  market_type: { type: String },
  over_odds: { type: Number },
  under_odds: { type: Number },
  odds: { type: Number },     // for milestone lines
  updated_at: { type: Date },
  raw: { type: mongoose.Schema.Types.Mixed },  // store original API payload if needed
  synced_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Create a compound index to avoid duplicates.
BettingPropSchema.index({ game_id: 1, player_id: 1, vendor: 1, prop: 1 }, { unique: true });

module.exports = mongoose.model('BettingProp', BettingPropSchema);
