// server/models/PlayerStats.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerStatsSchema = new Schema(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    PlayerID: Number,
    Team: String,
    Position: String,

    season: {
      type: Number,
      required: true,
    },
    week: Number, // optional if you ever store weekly splits

    // Basic offensive stats (fill out as needed, map from BALLDONTLIE)
    passingAttempts: Number,
    passingCompletions: Number,
    passingYards: Number,
    passingTDs: Number,
    interceptions: Number,

    rushingAttempts: Number,
    rushingYards: Number,
    rushingTDs: Number,

    receptions: Number,
    receivingYards: Number,
    receivingTDs: Number,

    // Defensive & ST basics (tackles, sacks, etc.)
    tackles: Number,
    sacks: Number,
    forcedFumbles: Number,
    interceptionsDef: Number,

    // Full raw stat row for flexibility
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlayerStats", playerStatsSchema);
