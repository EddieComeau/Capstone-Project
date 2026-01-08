/*
 * server/syncAllButStats.js  (CORE / STABLE)
 *
 * Goal:
 * - Keep this script "boring and reliable": it should finish successfully
 *   and populate the collections your app can safely depend on.
 *
 * What it syncs (stable):
 * - teams
 * - players
 * - games (for selected seasons)
 * - per-game player stats (for selected seasons)
 * - season_stats (player season totals)
 * - team_season_stats
 * - team_stats
 * - standings (from BallDontLie standings endpoint → MongoDB)
 * - matchups (computed from Mongo Games; uses team metrics if present)
 * - injuries
 *
 * What it DOES NOT do (moved to other scripts):
 * - advanced player metrics ingestion (advanced_stats/*)  → use syncProblemData.js
 * - full plays backfill / odds backfill / props backfill  → use syncProblemData.js
 * - live plays polling                                 → use syncRemainingLiveData.js
 */

// 🔒 Load root .env no matter where script is run from
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("./db");

const { syncPlayers, syncGames, syncTeams, syncStats } = require("./services/syncService");
const fullSyncService = require("./services/fullSyncService");
const desiredService = require("./services/desiredService");

// Determine seasons (default: current year + previous year)
function getDefaultSeasons() {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1];
}

const seasons = process.env.SYNC_SEASONS
  ? process.env.SYNC_SEASONS
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n))
  : getDefaultSeasons();

function envTrue(name, defaultValue = true) {
  const v = process.env[name];
  if (v == null) return defaultValue;
  return String(v).toLowerCase() === "true";
}

(async () => {
  try {
    await connectDB();
    console.log("🔁 CORE sync starting — seasons:", seasons.join(", "));

    // 1) Base entities (downstream foundations)
    await syncTeams();
    await syncPlayers();
    await syncGames({ seasons });

    // 2) Per-game player stats (big, but stable)
    for (const season of seasons) {
      await syncStats({ per_page: 100, season });
    }

    // 3) Aggregates (season/team layers)
    if (envTrue("CORE_SYNC_AGGREGATES", true)) {
      await fullSyncService.syncSeasonStats({ seasons });
      await fullSyncService.syncTeamSeasonStats({ seasons });
      await fullSyncService.syncTeamStats({ seasons });
    }

    // 4) Standings (use BDL endpoint; avoids needing game scores in Mongo)
    if (envTrue("CORE_SYNC_STANDINGS", true)) {
      await desiredService.syncStandingsFromAPI({ seasons });
    }

    // 5) Matchups (computed from Mongo Games; metrics optional)
    if (envTrue("CORE_SYNC_MATCHUPS", true)) {
      await desiredService.computeMatchups({ seasons });
    }

    // 6) Injuries
    if (envTrue("CORE_SYNC_INJURIES", true)) {
      await desiredService.syncInjuriesFromAPI({ per_page: 100 });
    }

    console.log("🎉 CORE sync complete");
  } catch (err) {
    console.error("❌ syncAllButStats (CORE) failed:", err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch {}
  }
})();