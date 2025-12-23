// server/models/PlayerProp.js
const mongoose = require('mongoose');

const PlayerPropSchema = new mongoose.Schema(
  {
    gameId: { type: Number, required: true, index: true },
    playerId: { type: Number, index: true },
    prop_type: { type: String },
    vendor: { type: String },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

PlayerPropSchema.index({ gameId: 1, playerId: 1, prop_type: 1, vendor: 1 }, { unique: true });

module.exports = mongoose.model('PlayerProp', PlayerPropSchema);
