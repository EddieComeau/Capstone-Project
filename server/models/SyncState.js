// Updated SyncState.js with added index on updatedAt for faster sorting operations.
// This file is independent of the original location. It defines the SyncState model
// and adds an index on the `updatedAt` field to improve the performance of queries
// that sort by this timestamp (e.g., listing sync state records).

const mongoose = require('mongoose');

/**
 * SyncState
 * Stores last cursor for long-running syncs so they can resume.
 * key should uniquely identify the job (e.g., 'advanced_rushing_season_2024')
 */
const SyncStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    cursor: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

// Add an index on updatedAt to improve query performance when sorting by this field
SyncStateSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('SyncState', SyncStateSchema);