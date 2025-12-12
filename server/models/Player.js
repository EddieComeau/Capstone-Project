// server/models/Player.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PlayerSchema = new Schema(
  {
    // BallDontLie NFL player id
    PlayerID: { type: Number, required: true, unique: true },

    // Identity
    FullName: String,
    FirstName: String,
    LastName: String,

    // Team + position
    Team: String, // abbreviation (BUF, KC, etc.)
    Position: String, // QB, RB, WR, TE, T, G, C, CB, LB, etc.
    Status: String, // Active, Injured, Practice Squad, etc.

    // Depth chart & roles
    DepthChartPosition: String,
    DepthChartOrder: Number,

    // Jersey / physical
    Jersey: Number,
    Height: String,
    Weight: Number,
    BirthDate: String,
    College: String,
    Experience: Number,

    // Media
    PhotoUrl: String,

    // Any raw blob from BALLDONTLIE roster/players endpoints
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Player", PlayerSchema);
