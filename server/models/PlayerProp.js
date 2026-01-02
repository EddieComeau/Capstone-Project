const mongoose = require('mongoose');

// Define the PlayerProp schema for storing player proposition betting lines.
// A player prop is usually keyed by the combination of gameId and playerId.
// We avoid defining single-field indexes on gameId and playerId because
// we instead define a compound index on (gameId, playerId) below.  Having
// both single-field indexes and a compound index would produce duplicate
// indexes and Mongoose would warn about it.

const PlayerPropSchema = new mongoose.Schema({
  // Identifier for the game the prop relates to
  gameId: { type: Number, required: true },
  // Identifier for the player the prop relates to (BDL or internal ID)
  playerId: { type: Number, required: true },
  // Sportsbook or provider name
  sportsbook: { type: String, required: true },
  // Type of proposition (e.g. passing_yards, rushing_yards, receptions)
  propType: { type: String, required: true },
  // The line value (e.g. 250.5 yards, 6.5 receptions)
  line: { type: Number, required: true },
  // Odds for betting over the line
  overOdds: { type: Number },
  // Odds for betting under the line
  underOdds: { type: Number },
  // Timestamp when the prop was recorded
  timestamp: { type: Date, default: Date.now },
  // Additional metadata (e.g. alternate lines, first half props)
  extra: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

// Compound index on gameId and playerId.  This supports efficient queries for
// all props for a given player in a game.  We deliberately do not index
// gameId or playerId individually to avoid creating duplicate indexes.
PlayerPropSchema.index({ gameId: 1, playerId: 1 });

module.exports = mongoose.model('PlayerProp', PlayerPropSchema);