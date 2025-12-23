// server/models/TeamStat.js
const mongoose = require('mongoose');

const TeamStatSchema = new mongoose.Schema({
  teamId: { type: Number, index: true },
  gameId: { type: Number, index: true },
  season: Number,
  week: Number,
  stats: { type: mongoose.Schema.Types.Mixed, default: {} },
  raw: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

TeamStatSchema.index({ teamId: 1, gameId: 1 });

module.exports = mongoose.model('TeamStat', TeamStatSchema);
