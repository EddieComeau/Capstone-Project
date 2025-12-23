// server/models/Injury.js
const mongoose = require("mongoose");

/**
 * Injury model - flexible to accept an external feed
 * Fields: playerId, teamId, status (Out / Questionable / Probable), description, source, reportedAt
 */
const InjurySchema = new mongoose.Schema(
  {
    playerId: { type: Number, index: true },
    teamId: { type: Number, index: true },
    status: { type: String, default: "Unknown" },
    description: { type: String, default: "" },
    source: { type: String, default: null }, // e.g., 'thirdparty-api' or url
    reportedAt: { type: Date, default: null },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

InjurySchema.index({ playerId: 1, teamId: 1, reportedAt: -1 });

module.exports = mongoose.model("Injury", InjurySchema);
