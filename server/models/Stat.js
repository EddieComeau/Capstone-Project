// server/models/Stat.js
const mongoose = require("mongoose");

const StatSchema = new mongoose.Schema(
  {
    statId: {
      type: Number,
      index: true,
    },
    gameId: {
      type: Number,
      index: true,
    },
    playerId: {
      type: Number,
      index: true,
    },
    teamId: {
      type: Number,
      index: true,
    },
    season: Number,
    week: Number,
    stats: {
      // a free-form object containing stat fields (e.g., rushing, passing, tackles, etc.)
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    raw: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stat", StatSchema);
