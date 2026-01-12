// server/syncAllButStats.js

/**
 * Core sync script for non-stat data.  Runs through teams, players, games
 * and injuries for the seasons defined in SYNC_SEASONS.  This version
 * iterates over each season when syncing injuries instead of passing
 * the entire season array to the injury sync function.  Injuries use
 * defaults from INJURY_WEEK unless explicitly overridden.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const { syncTeams } = require('./sync/syncTeams');
const { syncPlayers } = require('./sync/syncPlayers');
const { syncGames } = require('./sync/syncGames');
const { syncInjuries } = require('./sync/syncInjuries');

// Parse seasons from SYNC_SEASONS env var; default to current and previous year
const seasons = process.env.SYNC_SEASONS
  ? process.env.SYNC_SEASONS.split(',').map((s) => Number(s.trim()))
  : [new Date().getFullYear(), new Date().getFullYear() - 1];

async function runSync() {
  console.log(`🔁 CORE sync starting — seasons: ${seasons.join(', ')}`);
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    // Teams, players and games can be synced across all seasons at once
    await syncTeams();
    await syncPlayers(seasons);
    await syncGames(seasons);
    // Sync injuries for each season individually.  The week defaults to
    // INJURY_WEEK or falls back to DEFAULT_WEEK in syncInjuries.
    for (const season of seasons) {
      await syncInjuries({ season });
    }
    console.log('🎉 CORE sync completed successfully');
  } catch (err) {
    console.error('❌ syncAllButStats (CORE) failed:', err && err.message ? err.message : err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

runSync();