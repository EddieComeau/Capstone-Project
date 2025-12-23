// server/models/Game.js
const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema(
  {
    gameId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    date: Date,
    season: Number,
    week: Number,
    status: String,
    home_team: {
      id: Number,
      abbreviation: String,
      full_name: String,
    },
    visitor_team: {
      id: Number,
      abbreviation: String,
      full_name: String,
    },
    score: {
      home: Number,
      visitor: Number,
    },
    raw: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Game", GameSchema);
