// Updated Injury.js with an additional index on the date field. This index improves
// query performance when filtering injuries by date or sorting by date.

const mongoose = require('mongoose');

const InjurySchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.Mixed, required: true }, // BDL player payload
  status: String,
  comment: String,
  date: { type: Date },
  bdlId: { type: Number, index: true }
}, { timestamps: true });

// Create an index on the date field to improve query performance
InjurySchema.index({ date: 1 });

module.exports = mongoose.model('Injury', InjurySchema);