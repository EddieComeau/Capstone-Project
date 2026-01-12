const mongoose = require('mongoose');

// Define the Play schema for NFL play-by-play data.  Each play is uniquely
// identified by its `externalId`, which corresponds to the ID returned by
// the Ball Don’t Lie API.  We also track the Ball Don’t Lie game ID (`gameId`)
// and, where available, a numeric `sequence` used for ordering plays.
// Additional fields like offense, defense, quarter, time remaining, down,
// distance, type and description are stored when provided.  The full
// play payload from the API is preserved in the `data` field for future
// reference or processing.

const PlaySchema = new mongoose.Schema(
  {
    // Unique identifier for the play from the data source (Ball Don’t Lie)
    externalId: { type: String, required: true, unique: true },
    // Identifier for the game this play belongs to (Ball Don’t Lie game id)
    gameId: { type: Number, required: true },
    // Sequence or order of the play within the game.  Not all data providers
    // include a numeric sequence; when absent this field will be undefined.
    sequence: { type: Number },
    // Offensive team abbreviation (e.g. "KC")
    offense: { type: String },
    // Defensive team abbreviation (e.g. "NE")
    defense: { type: String },
    // Period (quarter) in which the play occurred
    quarter: { type: Number },
    // Clock time remaining in the quarter when the play occurred (e.g. "12:34")
    timeRemaining: { type: String },
    // Down (1, 2, 3, 4)
    down: { type: Number },
    // Distance needed for a first down
    distance: { type: Number },
    // Play type (e.g. run, pass, punt, field_goal, etc.)
    type: { type: String },
    // Description of the play
    description: { type: String },
    // Preserve the full play payload in a mixed type.  This allows
    // additional fields returned by the API to be stored without
    // altering the schema whenever the API expands.
    data: { type: mongoose.Schema.Types.Mixed },
    // Reference to the Game document (Mongo ObjectId).  This is set
    // automatically when inserting plays through the sync logic.
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  },
  {
    timestamps: true,
  }
);

// Compound index on gameId and sequence.  This provides efficient lookup for
// all plays in a game in order and ensures uniqueness of the (gameId, sequence)
// pair when a sequence is present.  We do not define a separate index on
// gameId alone because that would create a duplicate index and trigger a
// Mongoose warning.  The unique index on externalId ensures that each play
// is only stored once.
PlaySchema.index({ gameId: 1, sequence: 1 });

module.exports = mongoose.model('Play', PlaySchema);