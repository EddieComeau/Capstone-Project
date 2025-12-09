// models/PlayerAdvancedMetrics.js
const mongoose = require("mongoose");

const PlayerAdvancedMetricsSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },

  PlayerID: Number,
  Team: String,
  Position: String,

  season: Number,
  week: Number, // null for season totals

  // Raw API blob (store everything — your card UI will pick what it needs)
  metrics: {},

}, { timestamps: true });

module.exports = mongoose.model("PlayerAdvancedMetrics", PlayerAdvancedMetricsSchema);
