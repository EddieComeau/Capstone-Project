const mongoose = require("mongoose");

/**
 * SeasonStat
 *
 * Stores aggregated player statistics for a single season.  The BallDon'tLie
 * NFL `/nfl/v1/season_stats` endpoint returns one record per player/season
 * containing totals and averages.  We key on `{ playerId, season }`
 * to prevent duplicates.  Stats are stored in the `stats` field, and the
 * original API response is kept in `raw` for reference.
 */
const SeasonStatSchema = new mongoose.Schema(
  {
    playerId: { type: Number, required: true, index: true },
    season: { type: Number, required: true, index: true },
    stats: { type: mongoose.Schema.Types.Mixed, default: {} },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

SeasonStatSchema.index({ playerId: 1, season: 1 }, { unique: true });

module.exports = mongoose.model("SeasonStat", SeasonStatSchema);