// server/models/BettingProp.js

const mongoose = require("mongoose");

const BettingPropSchema = new mongoose.Schema(
  {
    player_id: { type: Number, required: true },
    prop: { type: String, required: true },
    line: { type: mongoose.Schema.Types.Mixed, default: null }, // Could be number or string
    book: { type: String, default: null },
    game_id: { type: Number, default: null },
    team_abbr: { type: String, default: null },
    synced_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Create index to avoid duplicates (player_id + prop + game_id)
BettingPropSchema.index({ player_id: 1, prop: 1, game_id: 1 }, { unique: true });

module.exports = mongoose.model("BettingProp", BettingPropSchema);
