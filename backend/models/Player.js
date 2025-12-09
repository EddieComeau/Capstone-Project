// models/Player.js
const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  PlayerID: { type: Number, required: true, unique: true },

  // Basic Identity
  FullName: String,
  FirstName: String,
  LastName: String,
  Team: String,
  Position: String,
  Status: String, // Active, Injured, Practice Squad

  // Depth chart & roles
  DepthChartPosition: String,
  DepthChartOrder: Number,

  // Physical
  Jersey: Number,
  Height: String, // "6'4"
  Weight: Number,
  BirthDate: String,
  College: String,
  Experience: Number,

  // Media
  PhotoUrl: String,
  FanDuelName: String,
  DraftKingsName: String,

  // Data links
  SportsDataID: Number, // Same as PlayerID but kept separate if needed
}, { timestamps: true });

module.exports = mongoose.model("Player", PlayerSchema);
