// server/models/Injury.js
const mongoose = require('mongoose');

const InjurySchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.Mixed, required: true }, // BDL player payload
  status: String,
  comment: String,
  date: { type: Date },
  bdlId: { type: Number, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Injury', InjurySchema);
