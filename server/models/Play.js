// server/models/Play.js
const mongoose = require('mongoose');

const PlaySchema = new mongoose.Schema(
  {
    playId: { type: Number, index: true },
    gameId: { type: Number, index: true },
    sequence: Number,
    clock: String,
    description: String,
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

PlaySchema.index({ playId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Play', PlaySchema);
