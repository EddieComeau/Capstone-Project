// server/models/EPAModel.js
const mongoose = require('mongoose');

const EPAModelSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  season: { type: Number, default: null },
  bins: { type: mongoose.Schema.Types.Mixed, default: {} },
  lookup: { type: mongoose.Schema.Types.Mixed, default: {} },
  meta: { type: mongoose.Schema.Types.Mixed, default: null },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('EPAModel', EPAModelSchema);
