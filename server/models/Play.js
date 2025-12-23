// server/models/Play.js
const mongoose = require('mongoose');

const PlaySchema = new mongoose.Schema({
  playId: { type: String, index: true }, // composite or vendor id if present
  gameId: { type: Number, index: true },
  sequence: { type: Number },
  raw: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

PlaySchema.index({ gameId: 1, sequence: 1 });

module.exports = mongoose.model('Play', PlaySchema);
