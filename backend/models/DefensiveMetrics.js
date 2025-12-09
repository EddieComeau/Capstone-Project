// models/DefensiveMetrics.js
const mongoose = require("mongoose");

const DefensiveMetricsSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },

  PlayerID: Number,
  Team: String,
  Position: String,

  season: Number,
  week: Number,

  // Snap distribution
  snaps: {
    total: Number,
    box: Number,
    slot: Number,
    wide: Number,
    deep: Number,
  },

  coverage: {
    targets: Number,
    receptionsAllowed: Number,
    yardsAllowed: Number,
    touchdownsAllowed: Number,
    interceptions: Number,
    passBreakups: Number,
    qbRatingAllowed: Number
  },

  tackling: {
    tackles: Number,
    assisted: Number,
    missed: Number,
    stops: Number
  },

  passRush: {
    sacks: Number,
    pressures: Number,
    hits: Number
  }

}, { timestamps: true });

module.exports = mongoose.model("DefensiveMetrics", DefensiveMetricsSchema);
