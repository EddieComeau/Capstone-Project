#!/usr/bin/env node
// server/scripts/computeAllDerived.js
require('dotenv').config();
const mongoose = require('mongoose');
const derived = require('../services/derivedService');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

  try {
    console.log('\n=== Computing Standings ===');
    await derived.computeStandings();

    console.log('\n=== Computing Advanced Stats ===');
    await derived.computeAdvancedStats();

    console.log('\n=== Computing Matchups ===');
    await derived.computeMatchups();

    // Injuries: optionally load from a JSON file feed (you can add code to fetch from an API)
    // Example: if you had a file at data/injuries.json:
    // const injuries = require('../../data/injuries.json');
    // await derived.syncInjuriesFromArray(injuries);
    console.log('\n=== Derived data compute finished ===');
  } catch (err) {
    console.error('Error while computing derived data:', err && err.message ? err.message : err);
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed.');
  }
}

main().catch(err => {
  console.error('computeAllDerived: unexpected error', err);
  process.exit(1);
});
