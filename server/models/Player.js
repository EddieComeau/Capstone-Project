// server/models/Player.js
const mongoose = require("mongoose");

/**
 * Player model
 *
 * Fields:
 *  - PlayerID: Number (legacy / compatibility)
 *  - bdlId: Number (BDL player id)
 *  - first_name, last_name, full_name: Strings
 *  - position: String
 *  - team: Object (BDL team payload)
 *  - raw: Mixed (entire BDL player payload for forward compatibility)
 *  - createdAt / updatedAt: timestamps
 */

const PlayerSchema = new mongoose.Schema(
  {
    // Legacy / compatibility id (some older code used PlayerID)
    PlayerID: {
      type: Number,
      // index true helps queries; DB may already have an index on this field.
      index: true,
      // do not declare unique here to avoid index recreation conflicts with existing DB index
    },

    bdlId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    first_name: {
      type: String,
      required: true,
      trim: true,
    },

    last_name: {
      type: String,
      required: true,
      trim: true,
    },

    full_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    position: {
      type: String,
      enum: ["QB", "RB", "WR", "TE", "K", "P", "DL", "LB", "DB", ""],
      default: "",
      trim: true,
    },

    team: {
      id: Number,
      abbreviation: String,
      full_name: String,
      conference: String,
      division: String,
      location: String,
      name: String,
    },

    raw: {
      // Entire raw payload from BDL (for debugging/forward compatibility)
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for team name
PlayerSchema.virtual("team_name").get(function () {
  return this.team?.full_name || "Free Agent";
});

// Pre-save hook to normalize data
PlayerSchema.pre("save", function (next) {
  if (this.first_name && this.last_name) {
    this.full_name = `${this.first_name} ${this.last_name}`.trim();
  }
  next();
});

// Add indexes for common queries
PlayerSchema.index({ position: 1 });
PlayerSchema.index({ "team.id": 1 });
// Add index on team abbreviation to speed up roster queries (e.g. find players by team)
PlayerSchema.index({ "team.abbreviation": 1 });

module.exports = mongoose.model("Player", PlayerSchema);