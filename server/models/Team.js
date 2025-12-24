// server/models/Team.js
// Mongoose schema for NFL teams.  Mirrors the data returned by the
// Ball Don't Lie NFL API `/nfl/v1/teams` endpoint, which includes fields
// like id, name, abbreviation, conference, division, city, and full_name【622477558119146†L5603-L5620】.  This schema uses
// `ballDontLieTeamId` to store the BDL id and ensures uniqueness on that
// field.  You can extend this model with additional fields (e.g., logo
// URL) as needed.

const mongoose = require('mongoose');

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
    conference: {
      type: String,
      default: null,
    },
    division: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    fullName: {
      type: String,
      default: null,
    },
    logoUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);