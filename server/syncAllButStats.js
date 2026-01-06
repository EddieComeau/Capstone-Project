/*
 * Script to synchronize all NFL data sets from Ball Don't Lie for the current
 * and previous seasons.  This script connects to MongoDB, fetches teams,
 * players, games, per‑game player stats, season aggregates, team stats,
 * advanced metrics, play‑by‑play, odds, player props, and injuries.  It
 * then computes derived standings and matchups.  The seasons to sync are
 * determined dynamically based on the current year or via the SYNC_SEASONS
 * environment variable (comma‑separated list).
 */
// 🔒 Load root .env no matter where script is run from
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

require('dotenv/config');

const mongoose = require('mongoose');
const connectDB = require('./db');
const { syncPlayers, syncGames, syncTeams, syncStats } = require('./services/syncService');
const fullSyncService = require('./services/fullSyncService');
const desiredService = require('./services/desiredService');
const Game = require('./models/Game');

// Determine the seasons to sync.  If SYNC_SEASONS is provided in the
// environment (comma‑separated list), it will be used.  Otherwise, use
// the current year and the previous year as defaults.
function getDefaultSeasons() {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1];
}

const seasons = process.env.SYNC_SEASONS
  ? process.env.SYNC_SEASONS.split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n))
  : getDefaultSeasons();

(async () => {
  try {
    // Establish DB connection
    await connectDB();

    // Sync all NFL teams first (no pagination; optional filters omitted)
    await syncTeams();

    // Sync players and games
    await syncPlayers({ per_page: 100 });
    await syncGames({ per_page: 100 });

    // Fetch per‑game player stats for each season.  The stats endpoint is
    // extremely large when called without filters, so we supply a season
    // parameter to restrict results to the seasons in the `seasons` array.
    // You can adjust per_page or maxPages in the options object if needed.
    for (const season of seasons) {
      await syncStats({ per_page: 100, season });
    }

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
    const gameIds = gameDocs.map((g) => g.gameId || g.id).filter(Boolean);

    // Play‑by‑play, odds, and player props for all games
    await fullSyncService.syncPlaysForGames({ gameIds });
    await fullSyncService.syncOddsForGames({ gameIds });
    await fullSyncService.syncPlayerPropsForGames({ gameIds });

    // Injuries
    await desiredService.syncInjuriesFromAPI({ per_page: 100 });

    console.log('🎉 Finished syncing all endpoints (including per‑game player stats)');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
})();