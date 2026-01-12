// server/sync/syncInjuries.js

/**
 * Simple wrapper script for syncing player injuries.  This file delegates
 * to the central syncService and ensures that numeric season and week
 * parameters are passed instead of an object.  If season/week are not
 * provided, defaults from the environment are used (INJURY_SEASON,
 * INJURY_WEEK).  To run manually, execute `node sync/syncInjuries.js
 * 2025 5` for week 5 of the 2025 season.
 */

const syncService = require('../services/syncService');

// Defaults via .env or fallback values
const DEFAULT_SEASON = Number(process.env.INJURY_SEASON || 2024);
const DEFAULT_WEEK   = Number(process.env.INJURY_WEEK || 18);

async function syncInjuries({ season = DEFAULT_SEASON, week = DEFAULT_WEEK } = {}) {
  console.log(`🔁 wrapper syncInjuries starting — season ${season}, week ${week}`);
  // Call syncService with numeric arguments rather than an object.  If the
  // underlying syncService implementation supports an object signature, this
  // will still work because numbers are passed positionally.
  await syncService.syncInjuries(season, week);
  console.log('✅ wrapper syncInjuries complete');
}

module.exports = { syncInjuries };

// CLI support: run like `node sync/syncInjuries.js 2025 1`
if (require.main === module) {
  const seasonArg = Number(process.argv[2]) || DEFAULT_SEASON;
  const weekArg   = Number(process.argv[3]) || DEFAULT_WEEK;
  syncInjuries({ season: seasonArg, week: weekArg })
    .then(() => console.log('🎉 CLI sync complete'))
    .catch((err) => {
      console.error('❌ CLI sync failed:', err.message);
      process.exit(1);
    });
}