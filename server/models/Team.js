// server/models/Team.js
const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    // BallDontLie team id
    ballDontLieTeamId: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    abbreviation: {
      type: String,
      required: true,
    },
    conference: String,
    division: String,
    city: String,
    fullName: String,
    logoUrl: String, // you can fill this manually or from another source
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
