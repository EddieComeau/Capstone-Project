// server/models/Standing.js
const mongoose = require("mongoose");

const StandingSchema = new mongoose.Schema(
  {
    teamId: { type: Number, required: true, index: true },
    season: { type: Number, required: true, index: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    ties: { type: Number, default: 0 },
    pointsFor: { type: Number, default: 0 },
    pointsAgainst: { type: Number, default: 0 },
    winPct: { type: Number, default: 0 },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

StandingSchema.index({ teamId: 1, season: 1 }, { unique: true });

module.exports = mongoose.model("Standing", StandingSchema);
