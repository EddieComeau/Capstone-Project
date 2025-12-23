// server/models/TeamSeasonStat.js
const mongoose = require('mongoose');

const TeamSeasonStatSchema = new mongoose.Schema(
  {
    teamId: { type: Number, required: true, index: true },
    season: { type: Number, required: true, index: true },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

TeamSeasonStatSchema.index({ teamId: 1, season: 1 }, { unique: true });

module.exports = mongoose.model('TeamSeasonStat', TeamSeasonStatSchema);
