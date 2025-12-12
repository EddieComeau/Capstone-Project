// server/models/LineMetrics.js
const mongoose = require("mongoose");

const LineMetricsSchema = new mongoose.Schema(
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

    lineGrade: {
      passGrade: Number,
      runGrade: Number,
      overall: Number,
    },

    snaps: {
      total: Number,
      run: Number,
      pass: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LineMetrics", LineMetricsSchema);
