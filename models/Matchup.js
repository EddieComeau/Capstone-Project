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
    week: {
      type: Number,
      required: true,
    },
    homeTeamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    awayTeamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    kickoffTime: Date,
    venue: String,

    // Optional betting info if you add it
    spread: Number,     // home spread
    overUnder: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Matchup", matchupSchema);
