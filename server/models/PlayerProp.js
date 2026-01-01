// server/models/PlayerProp.js
const mongoose = require('mongoose');

const PlayerPropSchema = new mongoose.Schema({
  gameId: { type: Number }, // indexed via compound index below
  playerId: { type: Number }, // indexed via compound index below
  vendor: String,
  prop_type: String,
  value: mongoose.Schema.Types.Mixed,
  payload: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

PlayerPropSchema.index({ gameId: 1, playerId: 1 });

module.exports = mongoose.model('PlayerProp', PlayerPropSchema);
