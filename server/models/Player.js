// server/models/Player.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PlayerSchema = new Schema(
  {
    // BallDontLie NFL player id
    PlayerID: { type: Number, required: true, unique: true }, // Maps to `id` from Ball Don't Lie API

    // Identity
    FullName: String, // Full name of the player
    FirstName: String, // First name of the player
    LastName: String, // Last name of the player

    // Team + position
    Team: String, // Team abbreviation (e.g., BUF, KC, etc.)
    Position: String, // Player position (e.g., QB, RB, WR, TE, etc.)
    Status: String, // Player status (e.g., Active, Injured, Practice Squad, etc.)

    // Depth chart & roles
    DepthChartPosition: String, // Position on the depth chart
    DepthChartOrder: Number, // Order on the depth chart

    // Jersey / physical attributes
    Jersey: Number, // Jersey number
    Height: String, // Height of the player (e.g., "6'2")
    Weight: Number, // Weight of the player in pounds
    BirthDate: String, // Birthdate of the player
    College: String, // College the player attended
    Experience: Number, // Years of experience in the league

    // Media
    PhotoUrl: String, // URL to the player's photo

    // Any raw blob from Ball Don't Lie API
    raw: Schema.Types.Mixed, // Store raw data for reference
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
);

// Check if the model already exists before defining it
module.exports = mongoose.models.Player || mongoose.model("Player", PlayerSchema);
