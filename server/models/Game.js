const mongoose = require('mongoose');

/**
 * Game schema for NFL games.
 *
 * A unique index is created implicitly on `gameId` via `unique: true` in the
 * schema definition.  Do not declare another index on gameId here, to
 * avoid duplicate-index warnings from Mongoose.
 */
const GameSchema = new mongoose.Schema(
  {
    gameId: { type: Number, required: true, unique: true },
    date: { type: Date },
    season: { type: Number },
    week: { type: Number },
    home_team: { type: mongoose.Schema.Types.Mixed },
    visitor_team: { type: mongoose.Schema.Types.Mixed },
    home_score: { type: Number },
    visitor_score: { type: Number },
    status: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// If you need additional compound indexes (e.g. for season/week), define
// them here on `GameSchema.index()`.

module.exports = mongoose.model('Game', GameSchema);