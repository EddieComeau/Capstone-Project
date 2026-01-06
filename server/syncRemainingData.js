/*
 * Script to sync remaining NFL datasets that were not covered by the primary
 * full sync or syncAllButStats scripts.  Specifically, this script will
 * synchronize team rosters (by calling syncTeamPlayers for every team) and
 * persist BallDon'tLie official standings for the specified seasons.  It
 * connects to MongoDB, loads all teams, syncs each team's players, then
 * calls the /nfl/v1/standings endpoint and upserts the results into the
 * Standing collection.  The seasons to sync are determined dynamically
 * based on the current and previous year or via the SYNC_SEASONS
 * environment variable.
 */
// 🔒 Load root .env no matter where script is run from
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

require('dotenv/config');

const mongoose = require('mongoose');
const connectDB = require('./db');
const { syncTeams, syncTeamPlayers } = require('./services/syncService');
const ballDontLieService = require('./services/ballDontLieService');

// We'll require the Team and Standing models at runtime after connection
const Standing = require('./models/Standing');

// Determine the seasons to sync for BDL standings.  Use SYNC_SEASONS
// (comma‑separated) if provided; otherwise default to current and
// previous year.
function getDefaultSeasons() {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1];
}

const seasonsToSync = process.env.SYNC_SEASONS
  ? process.env.SYNC_SEASONS.split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n))
  : getDefaultSeasons();

(async () => {
  try {
    // Connect to MongoDB using configuration from .env
    await connectDB();

    // First, ensure all teams are present so we have abbreviations and IDs
    console.log('🔁 Syncing teams...');
    await syncTeams();

    // Load team documents to get abbreviations for syncTeamPlayers
    const Team = require('./models/Team');
    const teams = await Team.find().lean();
    console.log(`🔁 Syncing roster for ${teams.length} teams...`);
    for (const team of teams) {
      const abbrev = team.abbreviation || team.abbrev || team.shortName || team.short_name;
      if (!abbrev) {
        console.warn(`⚠️ Cannot determine abbreviation for teamId ${team.ballDontLieTeamId}; skipping`);
        continue;
      }
      try {
        await syncTeamPlayers(abbrev);
      } catch (err) {
        console.error(`❌ Failed to sync players for team ${abbrev}:`, err && err.message ? err.message : err);
      }
    }

    // Sync BallDon'tLie official standings for each season in seasonsToSync
    for (const season of seasonsToSync) {
      console.log(`🔁 Syncing BDL standings for season ${season}...`);
      // The /nfl/v1/standings endpoint accepts only a season parameter
      const res = await ballDontLieService.listStandings({ season });
      const standings = res && res.data ? res.data : [];
      console.log(`   Received ${standings.length} standing records`);
      const ops = [];
      for (const rec of standings) {
        // Determine the teamId using available fields; fallback to rec.team.id
        const teamId = rec.team_id || (rec.team && rec.team.id);
        if (!teamId) continue;
        // Extract basic standings metrics if present; otherwise leave undefined
        const wins = rec.wins != null ? rec.wins : undefined;
        const losses = rec.losses != null ? rec.losses : undefined;
        // Some datasets include ties; default to zero if not provided
        const ties = rec.ties != null ? rec.ties : rec.tie != null ? rec.tie : 0;
        const pointsFor = rec.points_for != null ? rec.points_for : rec.pf != null ? rec.pf : undefined;
        const pointsAgainst = rec.points_against != null ? rec.points_against : rec.pa != null ? rec.pa : undefined;
        let winPct = rec.win_pct;
        if (winPct == null && wins != null && losses != null) {
          const totalGames = wins + losses + ties;
          winPct = totalGames > 0 ? wins / totalGames : undefined;
        }
        ops.push({
          updateOne: {
            filter: { teamId, season },
            update: {
              $set: {
                teamId,
                season,
                wins,
                losses,
                ties,
                pointsFor,
                pointsAgainst,
                winPct,
                raw: rec,
                updatedAt: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
          },
        });
      }
      if (ops.length > 0) {
        await Standing.bulkWrite(ops, { ordered: false });
        console.log(`✅ Upserted ${ops.length} standings records for season ${season}`);
      } else {
        console.warn(`⚠️ No standings data found for season ${season}`);
      }
    }
    console.log('🎉 Completed syncing team rosters and BDL standings');
  } catch (err) {
    console.error(err);
  } finally {
    // Always close the DB connection
    await mongoose.connection.close();
  }
})();