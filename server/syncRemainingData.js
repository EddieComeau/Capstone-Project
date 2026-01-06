/*
 * Script to sync remaining data sets that are not included in the main sync.
 * This script focuses on data that may be slower/heavier or optional, and
 * computes derived metrics afterward.
 */

// 🔒 Load root .env no matter where script is run from
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const mongoose = require("mongoose");
const connectDB = require("./db");

const { syncTeams, syncTeamPlayers } = require("./services/syncService");
const ballDontLieService = require("./services/ballDontLieService");
const Standing = require("./models/Standing");

(async () => {
  try {
    await connectDB();
    console.log("🔁 Starting remaining-data sync...");

    // Ensure teams exist
    await syncTeams();

    // Pull all teams from DB after connection
    const Team = require("./models/Team");
    const teams = await Team.find({}).lean();

    // Example: ensure team players/rosters are synced (if your project uses it)
    for (const team of teams) {
      if (!team?.teamId) continue;
      await syncTeamPlayers({ teamId: team.teamId });
    }

    // Example: standings sync (if this script is meant to do it)
    // (Adjust this section if your actual intended logic differs)
    const seasons = process.env.SYNC_SEASONS
      ? process.env.SYNC_SEASONS.split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : [new Date().getFullYear(), new Date().getFullYear() - 1];

    for (const season of seasons) {
      console.log(`🔁 Syncing standings for season ${season}...`);
      const standings = await ballDontLieService.getStandings({ season });

      // Upsert standings (avoid duplicates)
      const ops = standings.map((row) => ({
        updateOne: {
          filter: { season: row.season, teamId: row.team_id },
          update: { $set: row },
          upsert: true,
        },
      }));

      if (ops.length) {
        await Standing.bulkWrite(ops, { ordered: false });
      }
    }

    console.log("✅ syncRemainingData completed");
  } catch (err) {
    console.error("❌ syncRemainingData failed:", err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch {}
  }
})();
