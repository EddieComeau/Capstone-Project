#!/usr/bin/env node
// server/scripts/computeAllDerived.js
require('dotenv').config();
const mongoose = require('mongoose');
const derived = require('../services/derivedService');
const syncService = require('../services/syncService');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

    console.log('\n=== Syncing games & stats ===');
    await syncService.syncGames({ per_page: 100, maxPages: Number(process.env.SYNC_MAX_PAGES || 1000) });
    await syncService.syncStats({ per_page: 100, maxPages: Number(process.env.SYNC_MAX_PAGES || 1000) });

    console.log('\n=== Syncing advanced stats from BDL: rushing/passing/receiving ===');
    await derived.syncAdvancedStatsEndpoint('rushing', { season: Number(process.env.SYNC_SEASON || 2024), per_page: 100 });
    await derived.syncAdvancedStatsEndpoint('passing', { season: Number(process.env.SYNC_SEASON || 2024), per_page: 100 });
    await derived.syncAdvancedStatsEndpoint('receiving', { season: Number(process.env.SYNC_SEASON || 2024), per_page: 100 });

    console.log('\n=== Computing computed advanced stats (from stat documents) and merging ===');
    await derived.computeAdvancedStats();

    console.log('\n=== Computing standings and matchups ===');
    await derived.computeStandings();
    await derived.computeMatchups();

    if (process.env.SYNC_INJURIES_ON_COMPUTE === 'true') {
      console.log('\n=== Syncing injuries ===');
      await derived.syncInjuriesFromAPI({ per_page: 100 });
    }

    console.log('\n=== Done ===');
  } catch (err) {
    console.error('computeAllDerived error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed.');
  }
}

main();
