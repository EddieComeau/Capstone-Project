// server/models/Matchup.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const matchupSchema = new Schema(
  {
    ballDontLieGameId: {
      type: Number,
      required: true,
      unique: true,
    },

    season: {
      type: Number,
      required: true,
    },
    week: {
      type: Number,
      required: true,
    },
    postseason: {
      type: Boolean,
      default: false,
    },

    homeTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    awayTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    homeScore: Number,
    awayScore: Number,

    status: String, // scheduled, in_progress, final, etc.
    kickoffTime: Date,
    venue: String,

    spread: Number, // optional betting info (home spread)
    overUnder: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Matchup", matchupSchema);
