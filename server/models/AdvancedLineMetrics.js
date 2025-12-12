// server/models/AdvancedLineMetrics.js
const mongoose = require("mongoose");

const AdvancedLineMetricsSchema = new mongoose.Schema(
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

    // Derived analytics (rough, can be refined later)
    pressuresAllowed: Number,
    sacksAllowed: Number,
    hitsAllowed: Number,
    hurriesAllowed: Number,
    runBlockWinRate: Number,
    passBlockWinRate: Number,

    efficiency: {
      pass: Number,
      run: Number,
      total: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AdvancedLineMetrics",
  AdvancedLineMetricsSchema
);
