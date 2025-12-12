// server/models/SpecialTeamsMetrics.js
const mongoose = require("mongoose");

const SpecialTeamsMetricsSchema = new mongoose.Schema(
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

    // These are placeholders; map them to real BALLDONTLIE fields you care about.
    kicking: {
      fgMade: Number,
      fgAttempted: Number,
      xpMade: Number,
      xpAttempted: Number,
      longFg: Number,
    },

    punting: {
      punts: Number,
      avg: Number,
      inside20: Number,
      long: Number,
    },

    returning: {
      kickReturns: Number,
      kickReturnYards: Number,
      puntReturns: Number,
      puntReturnYards: Number,
      tds: Number,
    },

    snapping: {
      snaps: Number,
      errors: Number,
    },

    gunner: {
      tackles: Number,
      forcedFumbles: Number,
      stopsInside20: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SpecialTeamsMetrics",
  SpecialTeamsMetricsSchema
);
