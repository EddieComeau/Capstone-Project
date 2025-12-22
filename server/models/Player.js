const mongoose = require("mongoose");

/**
 * Player model
 *
 * NOTE: This schema has been migrated to match the Ball Don't Lie (BDL)
 * field format used by syncService.
 *
 * Fields:
 *  - bdlId: Number (BDL player id)
 *  - first_name, last_name, full_name: Strings
 *  - position: String
 *  - team: Mixed (BDL team payload as stored by syncService)
 *  - raw: Mixed (entire BDL player payload for forward compatibility)
 *  - createdAt / updatedAt: timestamps
 */

const PlayerSchema = new mongoose.Schema(
  {
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
      default: "",
      trim: true,
    },

    team: {
      // Team object from BDL (shape may change; keep flexible)
      type: mongoose.Schema.Types.Mixed,
      default: null,
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

// Prevent duplicate index warnings in some environments
PlayerSchema.index({ bdlId: 1 }, { unique: true });
PlayerSchema.index({ full_name: 1 });

module.exports = mongoose.model("Player", PlayerSchema);
