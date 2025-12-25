// Updated Matchup model including ballDontLieGameId
const mongoose = require("mongoose");

/**
 * Matchup document - comparison between two teams for a given game
 * This version includes a ballDontLieGameId field that matches the game ID
 * provided by the BallDonLie API. A unique index is placed on this field
 * so each game is only stored once. gameId remains an indexed field for
 * convenience but is not unique.
 */
const MatchupSchema = new mongoose.Schema(
  {
    // The gameId provided by BallDonLie (unique per game)
    ballDontLieGameId: { type: Number, required: true, index: true, unique: true },
    // A local identifier for the game (also from BDL but may differ if using internal IDs)
    gameId: { type: Number, required: true, index: true },
    season: Number,
    week: Number,
    homeTeamId: Number,
    visitorTeamId: Number,
    homeMetrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    visitorMetrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    comparison: { type: mongoose.Schema.Types.Mixed, default: {} },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Matchup", MatchupSchema);