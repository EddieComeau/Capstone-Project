#!/usr/bin/env node
// server/scripts/syncAllData.js
require('dotenv').config();
const mongoose = require('mongoose');
const sync = require('../services/syncService');

async function main() {
  if (!process.env.MONGO_URI || !process.env.BALLDONTLIE_API_KEY) {
    console.error('Missing MONGO_URI or BALLDONTLIE_API_KEY');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

  // 1) Sync all teams (if desired)
  console.log('\n=== Syncing all teams (reconciliation) ===');
  // If you already have teams, this will upsert and be quick.
  const teamsResult = await sync.syncPlayers(); // Optional - players again - or call team-specific sync function if you made one

  // 2) Sync per-team players (32 teams) - sequential
  console.log('\n=== Syncing per-team players (32 teams) ===');
  const perTeamScript = require('./syncAllTeams'); // reuse earlier per-team runner (if present)
  if (perTeamScript && typeof perTeamScript === 'function') {
    await perTeamScript();
  } else {
    // fallback: call syncAllTeamsForWeek or call syncPlayers as catch-all
    await sync.syncPlayers();
  }

  // 3) Sync games
  console.log('\n=== Syncing games ===');
  // Limit games to the last two seasons.  Determine seasons from the
  // current year unless SYNC_SEASONS is provided in the environment (comma-separated).
  let seasons = null;
  if (process.env.SYNC_SEASONS) {
    seasons = process.env.SYNC_SEASONS.split(',').map(s => Number(s.trim())).filter(Boolean);
  } else {
    const currentYear = new Date().getFullYear();
    seasons = [currentYear, currentYear - 1];
  }
  // Pass the seasons array to syncGames so only those seasons are fetched
  await sync.syncGames({ seasons });

  // 4) Sync stats (per-game player stats)
  console.log('\n=== Syncing stats ===');
  // Stats are synced per season to avoid pulling all historical data.  The
  // syncStats function accepts a season parameter, so iterate through the
  // seasons array and sync each season individually.  Additional options
  // like per_page and maxPages can be set via env.
  for (const season of seasons) {
    await sync.syncStats({ season });
  }

  await mongoose.connection.close();
  console.log('All done — DB connection closed');
}

main().catch(err => {
  console.error('syncAllData error:', err && err.message ? err.message : err);
  process.exit(1);
});