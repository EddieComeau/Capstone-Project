/*
 * syncBettingData.js
 *
 * This module encapsulates the logic for synchronising betting odds
 * and player proposition lines from the Ball Don't Lie API into
 * MongoDB. It can be consumed either as a CLI script (by running
 * `node server/syncBettingData.js`) or imported into other parts of
 * the application such as Express routes or a cron scheduler. When
 * imported it exposes a single async function, `syncBettingData`,
 * which accepts an optional configuration object.
 *
 * The optional configuration parameters allow callers to override
 * environment variables or restrict the sync to particular games.
 * Supported options include:
 *  - season (Number)    – four‑digit season year (e.g. 2024)
 *  - week (Number)      – week number within the season
 *  - gameIds (Array)    – list of numeric game IDs to sync
 *  - perPage (Number)   – number of odds records per page (for weekly pulls)
 *  - maxGames (Number)  – maximum number of game IDs to derive when
 *                          season/week are provided but gameIds are not
 *  - dryRun (Boolean)   – if true, fetches data but does not write to DB
 *  - doOdds (Boolean)   – if false, skips syncing game‑level odds
 *  - doProps (Boolean)  – if false, skips syncing player prop lines
 *
 * The function returns a summary object describing how many odds and
 * prop records were persisted along with the number of games processed.
 */

const path = require('path');
// Load environment variables from the project root. When this file
// lives inside the `server/` directory, joining one level up will
// correctly locate .env in the repository root regardless of the
// current working directory.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('./db');
const Game = require('./models/Game');
const Odds = require('./models/Odds');
const PlayerProp = require('./models/PlayerProp');
const bdl = require('./services/ballDontLieService');

/**
 * Synchronise betting odds and player props from Ball Don't Lie into Mongo.
 *
 * When called as a function, resolves once the sync has completed. If
 * invoked directly from the command line, will exit the process
 * automatically with status code 0 on success or 1 on failure.
 *
 * @param {Object} options Optional configuration overrides
 * @returns {Promise<{savedOdds: number, savedProps: number, gameCount: number}>}
 */
async function syncBettingData(options = {}) {
  // Establish a single MongoDB connection. If connectDB() has already
  // been called elsewhere, Mongoose will reuse the existing connection.
  await connectDB();

  // Resolve configuration from provided options or fall back to env vars.
  const season = options.season != null
    ? Number(options.season)
    : (process.env.SEASON ? Number(process.env.SEASON) : null);
  const week = options.week != null
    ? Number(options.week)
    : (process.env.WEEK ? Number(process.env.WEEK) : null);
  const gameIds = Array.isArray(options.gameIds)
    ? options.gameIds.map((id) => Number(id))
    : (process.env.GAME_IDS
        ? process.env.GAME_IDS.split(',').map((id) => parseInt(id, 10))
        : []);
  const perPage = options.perPage != null
    ? Number(options.perPage)
    : Number(process.env.PER_PAGE || 100);
  const maxGames = options.maxGames != null
    ? Number(options.maxGames)
    : Number(process.env.MAX_GAMES || 50);
  const dryRun = options.dryRun != null
    ? Boolean(options.dryRun)
    : String(process.env.DRY_RUN).toLowerCase() === 'true';
  const doOdds = options.doOdds != null
    ? Boolean(options.doOdds)
    : String(process.env.DO_ODDS).toLowerCase() !== 'false';
  const doProps = options.doProps != null
    ? Boolean(options.doProps)
    : String(process.env.DO_PROPS).toLowerCase() !== 'false';

  // Derive list of game IDs when explicit gameIds not provided but
  // season/week are. Limit to avoid inadvertently pulling massive
  // datasets (e.g. pre‑season full slates).
  let gamesToProcess = gameIds.slice();
  if (!gamesToProcess.length && season && week) {
    const gameDocs = await Game.find({ season, week }).limit(maxGames).lean();
    gamesToProcess = gameDocs.map((g) => g.gameId).filter(Boolean);
  }
  const summary = { savedOdds: 0, savedProps: 0, gameCount: gamesToProcess.length };

  // ----------------------
  // Sync game‑level odds
  // ----------------------
  if (doOdds) {
    let odds = [];
    try {
      if (season && week) {
        // Pull all odds for a particular week. per_page controls
        // pagination for weekly queries on the BDL API.
        const res = await bdl.listOdds({ season, week, per_page: perPage });
        odds = res && res.data ? res.data : [];
      } else if (gamesToProcess.length) {
        // Pull odds only for specified games.
        const res = await bdl.listOdds({ game_ids: gamesToProcess });
        odds = res && res.data ? res.data : [];
      } else {
        console.warn('⚠️  No season/week or gameIds provided – skipping odds sync');
      }
      if (!dryRun && odds.length) {
        // Use insertMany with ordered:false to ignore duplicate key errors
        await Odds.insertMany(odds, { ordered: false }).catch(() => {});
      }
      summary.savedOdds = odds.length;
      if (odds.length) {
        console.log(`🎲 Synced ${odds.length} odds record(s)`);
      }
    } catch (err) {
      console.error('❌ Failed to sync odds:', err && err.message ? err.message : err);
    }
  }

  // ----------------------
  // Sync player props
  // ----------------------
  if (doProps) {
    let totalProps = 0;
    if (!gamesToProcess.length) {
      console.warn('⚠️  No games available for props. Provide season/week or gameIds.');
    } else {
      for (const gId of gamesToProcess) {
        try {
          const res = await bdl.listOddsPlayerProps({ game_id: gId });
          const props = res && res.data ? res.data : [];
          totalProps += props.length;
          if (!dryRun && props.length) {
            await PlayerProp.insertMany(props, { ordered: false }).catch(() => {});
          }
        } catch (err) {
          console.warn(`⚠️  Props fetch failed for game ${gId}:`, err && err.message ? err.message : err);
        }
      }
    }
    summary.savedProps = totalProps;
    if (totalProps) {
      console.log(`🎯 Synced ${totalProps} prop line(s)`);
    }
  }

  return summary;
}

// CLI entry point. When executed directly (e.g. node server/syncBettingData.js),
// perform a full sync using environment variables and exit when
// complete. Provide useful logging on success/failure.
if (require.main === module) {
  syncBettingData().then((summary) => {
    console.log('✅ syncBettingData complete', summary);
    process.exit(0);
  }).catch((err) => {
    console.error('❌ syncBettingData failed:', err && err.message ? err.message : err);
    process.exit(1);
  });
}

module.exports = { syncBettingData };