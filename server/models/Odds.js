// server/models/Odds.js

const mongoose = require('mongoose');

/*
 * Stores game-level betting odds (spreads, totals, money lines).
 * Unique combination: game_id + vendor.
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
  raw: { type: mongoose.Schema.Types.Mixed }, // original API payload
  synced_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Avoid duplicates on repeated syncs.
OddsSchema.index({ game_id: 1, vendor: 1 }, { unique: true });

module.exports = mongoose.model('Odds', OddsSchema);
