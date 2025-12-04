// models/PlayerStats.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerStatsSchema = new Schema(
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
    week: Number, // optional if you only track season stats

    // Raw stats from Sportsdata.io – you can add specific fields or just keep an object
    passingYards: Number,
    passingTDs: Number,
    interceptions: Number,
    rushingYards: Number,
    rushingTDs: Number,
    receptions: Number,
    receivingYards: Number,
    receivingTDs: Number,

    // Fallback raw blob if you want to store the whole object
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlayerStats", playerStatsSchema);
