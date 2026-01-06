/**
 * server/scripts/syncStatsResume.js
 *
 * Purpose: run ONLY the stats sync with resume cursor support.
 *
 * Usage (from project root):
 *   node server/scripts/syncStatsResume.js --season 2025
 *
 * Resume from a cursor:
 *   node server/scripts/syncStatsResume.js --season 2025 --cursor 242692
 *
 * Smaller page size if needed:
 *   node server/scripts/syncStatsResume.js --season 2025 --cursor 242692 --perPage 50
 */

const path = require("path");

// 🔒 Load ROOT .env (project root), regardless of where you run from
require("dotenv").config({
  path: path.join(__dirname, "..", "..", ".env"),
});

const mongoose = require("mongoose");
const connectDB = require("../db");
const { syncStats } = require("../services/syncService");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[key] = val;
  }
  return out;
}

(async () => {
  const args = parseArgs(process.argv);

  const season = Number(args.season);
  if (!season || Number.isNaN(season)) {
    console.error("❌ Missing or invalid --season. Example: --season 2025");
    process.exit(1);
  }

  const perPage = args.perPage ? Number(args.perPage) : 100;
  const startCursor = args.cursor ? Number(args.cursor) : undefined;

  try {
    await connectDB();

    console.log(
      `🔁 Stats resume sync: season=${season}, per_page=${perPage}, startCursor=${startCursor ?? "NONE"}`
    );

    /**
     * IMPORTANT:
     * Your current syncStats already supports pagination via cursor internally.
     * To support resume without rewriting syncService.js, we set an env var
     * that syncService can read, and we also pass it in options.
     *
     * If your syncService currently DOES NOT read STATS_START_CURSOR,
     * add the small patch below (I included it after this file).
     */
    if (startCursor !== undefined) {
      process.env.STATS_START_CURSOR = String(startCursor);
    }

    await syncStats({
      per_page: perPage,
      season,
      // pass through for forward-compat if your syncStats supports it already
      cursor: startCursor,
      startCursor,
    });

    console.log("✅ Stats sync completed");
  } catch (err) {
    console.error("❌ Stats resume sync failed:", err?.message || err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch {}
  }
})();
