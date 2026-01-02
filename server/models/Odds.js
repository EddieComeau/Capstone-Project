const mongoose = require('mongoose');

// Define the Odds schema for storing sportsbook odds and betting lines.
// Each odds document represents a snapshot of the market for a single
// NFL game at a given time.  We deliberately omit single-field
// indexes on gameId because the index defined below covers the same
// field.  Duplicate indexes can cause Mongoose to emit warnings and
// incur unnecessary overhead.

const OddsSchema = new mongoose.Schema({
  // Identifier for the game these odds apply to
  gameId: { type: Number, required: true },
  // Name of the sportsbook or provider
  sportsbook: { type: String, required: true },
  // Point spread (e.g. -7.5)
  spread: { type: Number },
  // Total points (over/under line)
  total: { type: Number },
  // Money line for the home team (positive for underdog, negative for favorite)
  moneyLineHome: { type: Number },
  // Money line for the away team
  moneyLineAway: { type: Number },
  // Timestamp when these odds were recorded
  timestamp: { type: Date, default: Date.now },
  // Any additional odds or prop lines (e.g. first half lines, alternate spreads)
  extra: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

// Index on gameId to enable efficient queries by game.  We do not set
// `index: true` on the gameId field itself in the schema definition
// because doing so alongside this explicit index would create a
// duplicate index in MongoDB.  Defining a single index here avoids
// duplication and the associated Mongoose warning.
OddsSchema.index({ gameId: 1 });

module.exports = mongoose.model('Odds', OddsSchema);