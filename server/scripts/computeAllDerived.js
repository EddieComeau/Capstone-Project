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

    // 1) Sync games & stats (core)
    console.log('\n=== Syncing games ===');
    await syncService.syncGames({ per_page: 100 });

    console.log('\n=== Syncing stats ===');
    await syncService.syncStats({ per_page: 100 });

    // 2) Team-season stats / standings / advanced stats via API
    if (process.env.AUTO_SYNC_STANDINGS === 'true') {
      console.log('\n=== Syncing standings via API ===');
      // example: sync standings for season 2024
      await derived.syncStandingsFromAPI({ season: Number(process.env.SYNC_SEASON || 2024), per_page: 100 });
    }

    console.log('\n=== Syncing team season stats ===');
    await derived.syncTeamSeasonStats({ season: Number(process.env.SYNC_SEASON || 2024), per_page: 100 });

    console.log('\n=== Syncing advanced rushing/passing/receiving ===');
    await derived.syncAdvancedStatsEndpoint('rushing', { season: Number(process.env.SYNC_SEASON || 2024), per_page: 100 });
    await derived.syncAdvancedStatsEndpoint('passing', { season: Number(process.env.SYNC_SEASON || 2024), per_page: 100 });
    await derived.syncAdvancedStatsEndpoint('receiving', { season: Number(process.env.SYNC_SEASON || 2024), per_page: 100 });

    console.log('\n=== Compute derived: standings from games, advanced metrics, matchups ===');
    await derived.computeStandings();
    await derived.computeAdvancedStats();
    await derived.computeMatchups();

    // 3) Plays, odds, and player props if desired
    console.log('\n=== Optional: sync plays/odds/player_props ===');
    if (process.env.SYNC_PLAYS === 'true') {
      console.log(' - Syncing plays (you may want to run per-game)');
      await derived.syncPlays({ per_page: 100 });
    }
    if (process.env.SYNC_ODDS === 'true') {
      console.log(' - Syncing odds');
      await derived.syncOdds({ per_page: 100, season: Number(process.env.SYNC_SEASON || 2024), week: Number(process.env.SYNC_WEEK || 0) });
    }

    // 4) Injuries (always optional)
    if (process.env.SYNC_INJURIES_ON_COMPUTE === 'true') {
      console.log('\n=== Syncing injuries from BDL ===');
      await derived.syncInjuriesFromAPI({ per_page: 100 });
    }

    console.log('\n=== Derived compute complete ===');
  } catch (err) {
    console.error('computeAllDerived error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed.');
  }
}

main();
