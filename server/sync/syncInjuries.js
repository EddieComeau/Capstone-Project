// server/sync/syncInjuries.js

/**
 * Simple wrapper script for syncing player injuries.  This wrapper
 * delegates to the central syncService.  Note: the Ball Don’t Lie
 * API exposes injuries through the `/player_injuries` endpoint and
 * does not support filtering by season or week; it always returns
 * the latest injury list.  Therefore, the `season` and `week` values
 * here are ignored by syncService and retained only for backward
 * compatibility.  Defaults from the environment are used (INJURY_SEASON,
 * INJURY_WEEK) but have no effect on the returned data.
 */

const syncService = require('../services/syncService');

// Defaults for backward compatibility.  These values are ignored because
// the injuries endpoint does not support season/week filters.  They are
// retained only so existing CLI invocations with two numeric arguments do not
// break.  They can safely be removed if you no longer use season/week args.
const DEFAULT_SEASON = Number(process.env.INJURY_SEASON || 2024);
const DEFAULT_WEEK   = Number(process.env.INJURY_WEEK || 18);

async function syncInjuries({ team_ids, player_ids } = {}) {
  console.log('🔁 wrapper syncInjuries starting');
  await syncService.syncInjuries({ team_ids, player_ids });
  console.log('✅ wrapper syncInjuries complete');
}

module.exports = { syncInjuries };

// CLI support: run like `node sync/syncInjuries.js` or
// `node sync/syncInjuries.js team_ids=8,18 player_ids=85` to filter by team
// and player.  Season/week arguments are accepted for backward compatibility
// but ignored.
if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = {};
  for (const arg of args) {
    // Accept legacy numeric args (season, week) and ignore them
    if (/^\d+$/.test(arg)) {
      // ignore
      continue;
    }
    const [key, value] = arg.split('=');
    if (key === 'team_ids' && value) {
      opts.team_ids = value.split(',').map((v) => Number(v)).filter((n) => !isNaN(n));
    } else if (key === 'player_ids' && value) {
      opts.player_ids = value.split(',').map((v) => Number(v)).filter((n) => !isNaN(n));
    }
  }
  syncInjuries(opts)
    .then(() => console.log('🎉 CLI sync complete'))
    .catch((err) => {
      console.error('❌ CLI sync failed:', err.message);
      process.exit(1);
    });
}