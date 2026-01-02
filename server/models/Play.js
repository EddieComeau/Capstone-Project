const mongoose = require('mongoose');

// Define the Play schema for NFL play-by-play data.  Each play is uniquely
// identified by the combination of a gameId and a sequence number (or
// similar ordering field).  We deliberately avoid specifying single-field
// indexes on gameId because we add a compound index on (gameId, sequence)
// below.  Defining both an index on gameId and the compound index would
// create a duplicate index and trigger a Mongoose warning.

const PlaySchema = new mongoose.Schema({
  // Identifier for the game this play belongs to
  gameId: { type: Number, required: true },
  // Sequence or order of the play within the game
  sequence: { type: Number, required: true },
  // Offensive team abbreviation (e.g. "KC")
  offense: { type: String },
  // Defensive team abbreviation (e.g. "NE")
  defense: { type: String },
  // Period (quarter) in which the play occurred
  quarter: { type: Number },
  // Clock time in seconds remaining in the quarter when the play occurred
  timeRemaining: { type: Number },
  // Down (1, 2, 3, 4)
  down: { type: Number },
  // Distance needed for a first down
  distance: { type: Number },
  // Play type (e.g. run, pass, punt, field_goal, etc.)
  type: { type: String },
  // Description of the play
  description: { type: String },
  // Any additional data (e.g. structured JSON from the data provider)
  data: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

// Compound index on gameId and sequence.  This provides efficient lookup for
// all plays in a game in order and ensures uniqueness of the (gameId,
// sequence) pair.  We do not define an index on gameId alone because that
// would create a duplicate index on the same key, leading to warnings and
// increased storage.
PlaySchema.index({ gameId: 1, sequence: 1 });

module.exports = mongoose.model('Play', PlaySchema);