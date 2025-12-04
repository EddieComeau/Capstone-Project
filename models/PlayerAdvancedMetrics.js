// models/PlayerAdvancedMetrics.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerAdvancedMetricsSchema = new Schema(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    season: {
      type: Number,
      required: true,
    },
    efficiencyScore: Number, // your custom metric based on stats
    boomProbability: Number, // 0–1 or percentage
    matchupNotes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlayerAdvancedMetrics", playerAdvancedMetricsSchema);
