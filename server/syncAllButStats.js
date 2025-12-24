/*
 * Script to synchronize all NFL data sets from Ball Don't Lie for the current
 * and previous seasons, excluding the extremely long per‑game player stats
 * endpoint.  This script connects to MongoDB, fetches teams, players, games,
 * season aggregates, team stats, advanced metrics, play‑by‑play, odds,
 * player props, and injuries.  It then computes derived standings and
 * matchups.  Adjust the seasons array as needed.
 */

require('dotenv/config');

const mongoose = require('mongoose');
const connectDB = require('./db');
const { syncPlayers, syncGames, syncTeams } = require('./services/syncService');
const fullSyncService = require('./services/fullSyncService');
const desiredService = require('./services/desiredService');
const Game = require('./models/Game');

(async () => {
  try {
    // Establish DB connection
    await connectDB();

    // Sync all NFL teams first (no pagination; optional filters omitted)
    await syncTeams();

    // Sync players and games
    await syncPlayers({ per_page: 100 });
    await syncGames({ per_page: 100 });

    // Seasons to sync; adjust as needed
    const seasons = [2025, 2024];

    // Season and team aggregates
    await fullSyncService.syncSeasonStats({ seasons });
    await fullSyncService.syncTeamSeasonStats({ seasons });
    await fullSyncService.syncTeamStats({ seasons });

    // Advanced rushing, passing, and receiving stats for each season
    for (const season of seasons) {
      await desiredService.syncAdvancedStatsEndpoint('rushing', { season, per_page: 100 });
      await desiredService.syncAdvancedStatsEndpoint('passing', { season, per_page: 100 });
      await desiredService.syncAdvancedStatsEndpoint('receiving', { season, per_page: 100 });
    }

    // Compute derived advanced metrics if the function exists
    if (typeof desiredService.computeAdvancedStats === 'function') {
      await desiredService.computeAdvancedStats();
    }

    // Compute standings and matchups
    await desiredService.computeStandings();
    await desiredService.computeMatchups();

    // Gather game IDs for the selected seasons
    const gameDocs = await Game.find({ season: { $in: seasons } }).lean();
    const gameIds = gameDocs.map(g => g.gameId || g.id).filter(Boolean);

    // Play‑by‑play, odds, and player props for all games
    await fullSyncService.syncPlaysForGames({ gameIds });
    await fullSyncService.syncOddsForGames({ gameIds });
    await fullSyncService.syncPlayerPropsForGames({ gameIds });

    // Injuries
    await desiredService.syncInjuriesFromAPI({ per_page: 100 });

    console.log('🎉 Finished syncing all endpoints (excluding per‑game player stats)');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
})();