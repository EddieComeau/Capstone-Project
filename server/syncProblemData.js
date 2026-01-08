/*
 * server/syncProblemData.js   (EXTRAS / FLAKY / OPTIONAL)
 *
 * This script contains the steps that were making your original
 * "syncAllButStats.js" brittle (timeouts, partial failures, huge backfills).
 *
 * Run this only when you actually want these datasets.
 *
 * Features:
 * - Advanced stats ingestion (advanced_stats/rushing|passing|receiving)
 * - OPTIONAL backfill for odds / player props / plays
 * - Everything is "continue-on-error" so one bad game won't stop the rest.
 *
 * Usage:
 *   cd server
 *   # Advanced metrics only (recommended default)
 *   node syncProblemData.js
 *
 *   # Backfill odds+props for a specific week
 *   EXTRA_SEASON=2025 EXTRA_WEEK=1 EXTRA_SYNC_ODDS=true EXTRA_SYNC_PROPS=true node syncProblemData.js
 *
 *   # Backfill plays for specific games (recommended; plays can be huge)
 *   EXTRA_GAME_IDS=423945,423946 EXTRA_SYNC_PLAYS=true node syncProblemData.js
 */

// 🔒 Load root .env no matter where script is run from
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("./db");

const fullSyncService = require("./services/fullSyncService");
const desiredService = require("./services/desiredService");
const Game = require("./models/Game");

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

function parseCsvNumbers(v) {
  if (!v || typeof v !== "string") return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

async function getGameIdsForExtras() {
  const explicit = parseCsvNumbers(process.env.EXTRA_GAME_IDS);
  if (explicit.length) return explicit;

  const extraSeason = process.env.EXTRA_SEASON ? Number(process.env.EXTRA_SEASON) : null;
  const extraWeek = process.env.EXTRA_WEEK ? Number(process.env.EXTRA_WEEK) : null;

  if (Number.isFinite(extraSeason) && Number.isFinite(extraWeek)) {
    const docs = await Game.find({ season: extraSeason, week: extraWeek }).select("gameId").lean();
    return docs.map((d) => d.gameId).filter(Boolean);
  }

  // default: all games in SYNC_SEASONS
  const docs = await Game.find({ season: { $in: seasons } }).select("gameId").lean();
  return docs.map((d) => d.gameId).filter(Boolean);
}

(async () => {
  try {
    await connectDB();
    console.log("🔁 EXTRA sync starting — seasons:", seasons.join(", "));

    /* ---------------- Advanced metrics ingestion ---------------- */
    const doAdvanced = envTrue("EXTRA_SYNC_ADVANCED", true);
    if (doAdvanced) {
      for (const season of seasons) {
        for (const type of ["rushing", "passing", "receiving"]) {
          try {
            await desiredService.syncAdvancedStatsEndpoint(type, { season, per_page: 100 });
          } catch (err) {
            console.warn(`⚠️ advanced_stats/${type} season ${season} failed:`, err?.response?.status || "", err?.message || err);
          }
        }
      }

      // Optional: compute advanced metrics from your Stat collection too
      if (envTrue("EXTRA_COMPUTE_ADVANCED", false) && typeof desiredService.computeAdvancedStats === "function") {
        try {
          await desiredService.computeAdvancedStats();
        } catch (err) {
          console.warn("⚠️ computeAdvancedStats failed:", err?.message || err);
        }
      }

      // Refresh matchups so they can include metrics (still works if metrics are missing)
      if (envTrue("EXTRA_REFRESH_MATCHUPS", true)) {
        try {
          await desiredService.computeMatchups({ seasons });
        } catch (err) {
          console.warn("⚠️ computeMatchups failed:", err?.message || err);
        }
      }
    }

    /* ---------------- Optional: odds / props / plays backfill ---------------- */
    const doOdds = envTrue("EXTRA_SYNC_ODDS", false);
    const doProps = envTrue("EXTRA_SYNC_PROPS", false);
    const doPlays = envTrue("EXTRA_SYNC_PLAYS", false);

    if (doOdds || doProps || doPlays) {
      const gameIds = await getGameIdsForExtras();
      console.log(`Selected ${gameIds.length} games for extras backfill`);

      // Safety: plays backfill can be huge; cap unless explicitly overridden
      if (doPlays) {
        const cap = Number(process.env.EXTRA_MAX_PLAY_GAMES || 25);
        if (gameIds.length > cap && !envTrue("EXTRA_ALLOW_HUGE_PLAYS", false)) {
          console.warn(
            `⚠️ EXTRA_SYNC_PLAYS is true but ${gameIds.length} games selected. Capping to first ${cap}. ` +
              `Set EXTRA_ALLOW_HUGE_PLAYS=true to remove the cap (not recommended).`
          );
          gameIds.length = cap;
        }
      }

      if (doOdds) {
        try {
          await fullSyncService.syncOddsForGames({ gameIds });
        } catch (err) {
          console.warn("⚠️ syncOddsForGames failed:", err?.message || err);
        }
      }

      if (doProps) {
        try {
          await fullSyncService.syncPlayerPropsForGames({ gameIds });
        } catch (err) {
          console.warn("⚠️ syncPlayerPropsForGames failed:", err?.message || err);
        }
      }

      if (doPlays) {
        try {
          await fullSyncService.syncPlaysForGames({ gameIds });
        } catch (err) {
          console.warn("⚠️ syncPlaysForGames failed:", err?.message || err);
        }
      }
    }

    console.log("🎉 EXTRA sync complete");
  } catch (err) {
    console.error("❌ syncProblemData failed:", err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch {}
  }
})();