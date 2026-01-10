const mongoose = require('mongoose');

/*
 * BettingProp model
 *
 * Stores player proposition lines retrieved from the BallDontLie API.
 * Each document is uniquely identified by the combination of
 * game_id, player_id, vendor and prop. Additional fields capture
 * the line value and odds metadata returned by the API along with
 * a raw snapshot of the original payload for debugging.
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
  odds: { type: Number }, // milestone lines
  updated_at: { type: Date },
  raw: { type: mongoose.Schema.Types.Mixed },
  synced_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Ensure uniqueness across game, player, vendor and prop to avoid
// duplicates when upserting data repeatedly.
BettingPropSchema.index({ game_id: 1, player_id: 1, vendor: 1, prop: 1 }, { unique: true });

module.exports = mongoose.model('BettingProp', BettingPropSchema);