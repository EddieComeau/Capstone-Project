const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: { type: Number, required: true, unique: true },
  date: { type: Date },
  season: { type: Number },
  week: { type: Number },
  home_team: { type: mongoose.Schema.Types.Mixed },
  visitor_team: { type: mongoose.Schema.Types.Mixed },
  home_score: { type: Number },
  visitor_score: { type: Number },
  status: { type: String },
  raw: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// single unique index on gameId (only declared here)
GameSchema.index({ gameId: 1 }, { unique: true });

module.exports = mongoose.model('Game', GameSchema);
