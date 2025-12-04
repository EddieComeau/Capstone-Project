// models/Player.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerSchema = new Schema(
  {
    sportsdataPlayerId: {
      type: Number,
      required: true,
      unique: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    name: {
      type: String,
      required: true,
    },
    position: String,
    jerseyNumber: String,
    height: String,
    weight: String,
    headshotUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Player", playerSchema);
