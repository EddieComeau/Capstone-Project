// server/models/AdvancedMetric.js (local copy)
//
// This model defines the schema for storing advanced metrics (rushing, passing, receiving)
// for players and teams. Each metric type is stored as its own document identified by
// a combination of entityType, entityId, season, scope, and type. A unique index on
// these fields ensures we don't create duplicate documents when syncing multiple
// advanced stat types.

const mongoose = require('mongoose');

// Define the schema. In addition to the fields from the original model, we include
// a required "type" field to distinguish between advanced stat types (rushing, passing,
// receiving). This prevents duplicate key errors when upserting multiple types for
// the same player or team in a given season.
const AdvancedMetricSchema = new mongoose.Schema({
  // A stable key combining type, season, entity type and ID. Used for internal reference.
  key: { type: String, required: true, index: true },
  // The entity type: either a player or a team
  entityType: { type: String, enum: ['player', 'team'], required: true },
  // The numeric ID of the player or team
  entityId: { type: Number, required: true, index: true },
  // The season this metric applies to
  season: { type: Number, required: true },
  // The scope of the metric (e.g., 'season', 'game')
  scope: { type: String, default: 'season' },
  // The type of advanced metric (rushing, passing, receiving). This field is required
  // so that different stat types produce separate documents instead of conflicting.
  type: { type: String, enum: ['rushing', 'passing', 'receiving'], required: true },
  // A bag of computed metrics from the API response
  metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Raw source data or metadata from BallDontLie
  sources: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Raw payload for additional processing or debugging
  raw: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

// Create a unique index so that each combination of entityType, entityId, season,
// scope, and type appears at most once in the collection. Without this, inserting
// multiple stat types would cause duplicate key errors on the default index.
AdvancedMetricSchema.index(
  { entityType: 1, entityId: 1, season: 1, scope: 1, type: 1 },
  { unique: true }
);

module.exports = mongoose.model('AdvancedMetric', AdvancedMetricSchema);