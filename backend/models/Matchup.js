// models/Matchup.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const matchupSchema = new Schema(
  {
    sportsdataGameId: {
      type: Number,
      required: true,
      unique: true,
    },

    season: {
      type: Number,
      required: true,
    },

    // e.g. "REG", "POST", "PRE"
    seasonType: {
      type: String,
    },

    week: {
      type: Number,
      required: true,
    },

    // Relation to Team documents
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

    // Scores
    homeScore: {
      type: Number,
      default: null,
    },
    awayScore: {
      type: Number,
      default: null,
    },

    isFinal: {
      type: Boolean,
      default: false,
    },

    kickoffTime: Date,
    venue: String,

    // Optional betting info
    spread: Number,     // home spread
    overUnder: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Matchup", matchupSchema);
