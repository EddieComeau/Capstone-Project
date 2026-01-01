#!/usr/bin/env node
// server/scripts/syncInjuries.js
// Small runner to sync injuries from BallDon'tLie.

require('dotenv').config();
const mongoose = require('mongoose');
// In this branch, the advanced stats and injuries sync functions live in
// `desiredService.js` rather than the previously used `derivedService.js`.  The
// desiredService module exports `syncInjuriesFromAPI` which will fetch
// injury reports from the Ball Don’t Lie API and upsert them into the
// Injury collection.  Importing this here avoids a module-not-found error.
const derived = require('../services/desiredService');

async function main() {
  if (!process.env.MONGO_URI || !process.env.BALLDONTLIE_API_KEY) {
    console.error('Missing MONGO_URI or BALLDONTLIE_API_KEY');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

    // Accept optional CLI args or env overrides for per_page or team filter
    // Usage examples:
    //   node scripts/syncInjuries.js
    //   per_page can be set by env: SYNC_INJURIES_PER_PAGE=50 node scripts/syncInjuries.js
    const per_page = Number(process.env.SYNC_INJURIES_PER_PAGE || 100);

    console.log(`Starting injuries sync (per_page=${per_page})`);
    const res = await derived.syncInjuriesFromAPI({ per_page });
    console.log('Injuries sync result:', res);
  } catch (err) {
    console.error('syncInjuries error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed.');
  }
}

main();