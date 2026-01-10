const mongoose = require('mongoose');

/*
 * Odds model
 *
 * Stores gameā€‘level betting odds retrieved from the BallDontLie API. Each
 * document is keyed by game_id and vendor. Fields include spreads,
 * totals and money line odds for both sides, along with a raw
 * snapshot of the source payload. A unique compound index prevents
 * duplicates on repeated syncs.
 */

const OddsSchema = new mongoose.Schema({
  game_id: { type: Number, required: true },
  vendor: { type: String, required: true },
  spread_home: { type: Number },
  spread_away: { type: Number },
  spread_home_odds: { type: Number },
  spread_away_odds: { type: Number },
  total: { type: Number },
  over_odds: { type: Number },
  under_odds: { type: Number },
  moneyline_home: { type: Number },
  moneyline_away: { type: Number },
  moneyline_draw: { type: Number },
  updated_at: { type: Date },
  raw: { type: mongoose.Schema.Types.Mixed },
  synced_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

OddsSchema.index({ game_id: 1, vendor: 1 }, { unique: true });

module.exports = mongoose.model('Odds', OddsSchema);