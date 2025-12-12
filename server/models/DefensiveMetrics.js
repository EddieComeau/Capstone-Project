// server/models/DefensiveMetrics.js
const mongoose = require("mongoose");

const DefensiveMetricsSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },

    PlayerID: Number,
    Team: String,
    Position: String,

    season: Number,
    week: Number,

    // Snap distribution
    snaps: {
      total: Number,
      run: Number,
      pass: Number,
    },

    coverage: {
      targets: Number,
      receptionsAllowed: Number,
      yardsAllowed: Number,
      tdsAllowed: Number,
      interceptions: Number,
      passBreakups: Number,
    },

    tackling: {
      solo: Number,
      assisted: Number,
      missed: Number,
      stops: Number,
    },

    passRush: {
      sacks: Number,
      pressures: Number,
      hits: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "DefensiveMetrics",
  DefensiveMetricsSchema
);
