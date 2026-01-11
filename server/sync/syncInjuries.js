// server/sync/syncInjuries.js

const syncService = require('../services/syncService');

// Defaults via .env or fallback values
const DEFAULT_SEASON = Number(process.env.INJURY_SEASON || 2024);
const DEFAULT_WEEK   = Number(process.env.INJURY_WEEK || 18);

async function syncInjuries({ season = DEFAULT_SEASON, week = DEFAULT_WEEK } = {}) {
  console.log(`🔁 wrapper syncInjuries starting — season ${season}, week ${week}`);
  await syncService.syncInjuries({ season, week });
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
