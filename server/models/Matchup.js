// server/models/Matchup.js
const mongoose = require("mongoose");

/**
 * Matchup document - precomputed comparison between two teams for a given game
 */
const MatchupSchema = new mongoose.Schema(
  {
    gameId: { type: Number, required: true, index: true, unique: true },
    season: Number,
    week: Number,
    homeTeamId: Number,
    visitorTeamId: Number,
    homeMetrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    visitorMetrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    comparison: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g., diff in yards/game, winPct diff
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Matchup", MatchupSchema);
