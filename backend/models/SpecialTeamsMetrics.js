// models/SpecialTeamsMetrics.js
const mongoose = require("mongoose");

const SpecialTeamsMetricsSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },

  PlayerID: Number,
  Team: String,
  Position: String,

  season: Number,
  week: Number,

  kicking: {
    fgMade: Number,
    fgAttempted: Number,
    fgLong: Number,
    xpMade: Number,
    xpAttempted: Number,
  },

  punting: {
    punts: Number,
    yards: Number,
    netYards: Number,
    inside20: Number,
    long: Number,
    touchbacks: Number
  },

  returning: {
    kickReturns: Number,
    kickReturnYards: Number,
    puntReturns: Number,
    puntReturnYards: Number,
    longKick: Number,
    longPunt: Number,
    touchdowns: Number,
  },

  snapping: {
    snaps: Number,
    errors: Number 
  },

  gunner: {
    tackles: Number,
    forcedFumbles: Number,
    stopsInside20: Number
  }

}, { timestamps: true });

module.exports = mongoose.model("SpecialTeamsMetrics", SpecialTeamsMetricsSchema);
