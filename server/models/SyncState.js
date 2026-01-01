// server/models/SyncState.js
const mongoose = require('mongoose');

/**
 * SyncState
 * Stores last cursor for long-running syncs so they can resume.
 * key should uniquely identify the job (e.g., 'advanced_rushing_season_2024')
 */
const SyncStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    cursor: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SyncState', SyncStateSchema);
