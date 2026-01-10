/*
 * syncBettingData.js
 *
 * Pull betting odds and player prop lines from the BallDontLie NFL API
 * and upsert them into MongoDB. This script can be imported as a
 * module or invoked directly via `node server/syncBettingData.js`.
 *
 * Environment variables:
 *  - MONGO_URI: connection string for your MongoDB instance
 *  - BDL_API_KEY: API key for balldontlie.io (required for paid endpoints)
 *
 * Command line arguments when run directly:
 *  --season=<year>   Four‑digit season year (e.g. 2025)
 *  --week=<number>   Week number within the season
 *  --gameIds=1,2,3   Comma‑separated list of game IDs
 *
 * Returns a summary of how many odds and props were saved and how
 * many games were processed.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Minimst = require('minimist');

const BettingProp = require('./models/BettingProp');
const Odds = require('./models/Odds');
const bdl = require('./services/ballDontLieService');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined');
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
}

/**
 * Synchronise betting data.
 *
 * @param {Object} options
 * @param {number} [options.season] Four‑digit season
 * @param {number} [options.week] Week number
 * @param {number[]} [options.gameIds] List of game IDs
 * @param {boolean} [options.doOdds=true] Whether to sync odds
 * @param {boolean} [options.doProps=true] Whether to sync props
 * @returns {Promise<{savedOdds:number, savedProps:number, gameCount:number}>}
 */
async function syncBettingData({ season, week, gameIds, doOdds = true, doProps = true } = {}) {
  await connectDB();
  const summary = { savedOdds: 0, savedProps: 0, gameCount: 0 };

  let games = [];
  // Determine games from provided gameIds or via season/week query
  if (Array.isArray(gameIds) && gameIds.length) {
    games = gameIds.map((id) => Number(id));
  } else if (season && week) {
    const res = await bdl.listOdds({ season, week });
    const data = res && res.data ? res.data : [];
    games = [...new Set(data.map((o) => o.game_id))];
  }
  summary.gameCount = games.length;

  // Sync odds if requested
  if (doOdds) {
    let oddsData = [];
    if (season && week) {
      const res = await bdl.listOdds({ season, week });
      oddsData = res && res.data ? res.data : [];
    } else if (games.length) {
      const res = await bdl.listOdds({ game_ids: games });
      oddsData = res && res.data ? res.data : [];
    }
    for (const entry of oddsData) {
      const doc = {
        game_id: entry.game_id,
        vendor: entry.vendor,
        spread_home: entry.spread_home,
        spread_away: entry.spread_away,
        spread_home_odds: entry.spread_home_odds,
        spread_away_odds: entry.spread_away_odds,
        total: entry.total,
        over_odds: entry.over_odds,
        under_odds: entry.under_odds,
        moneyline_home: entry.moneyline_home,
        moneyline_away: entry.moneyline_away,
        moneyline_draw: entry.moneyline_draw,
        updated_at: entry.updated_at ? new Date(entry.updated_at) : undefined,
        raw: entry,
      };
      try {
        await Odds.updateOne(
          { game_id: doc.game_id, vendor: doc.vendor },
          { $set: doc },
          { upsert: true }
        );
        summary.savedOdds += 1;
      } catch (err) {
        console.warn('Odds upsert error:', err.message || err);
      }
    }
  }

  // Sync props if requested
  if (doProps) {
    for (const gameId of games) {
      try {
        const res = await bdl.listOddsPlayerProps({ game_id: gameId });
        const props = res && res.data ? res.data : [];
        for (const p of props) {
          const doc = {
            game_id: p.game_id,
            player_id: p.player_id,
            vendor: p.vendor,
            prop: p.prop_type,
            line_value: p.line_value,
            market_type: p.market && p.market.type,
            over_odds: p.market && p.market.over_odds,
            under_odds: p.market && p.market.under_odds,
            odds: p.market && p.market.odds,
            updated_at: p.updated_at ? new Date(p.updated_at) : undefined,
            raw: p,
          };
          await BettingProp.updateOne(
            {
              game_id: doc.game_id,
              player_id: doc.player_id,
              vendor: doc.vendor,
              prop: doc.prop,
            },
            { $set: doc },
            { upsert: true }
          );
          summary.savedProps += 1;
        }
      } catch (err) {
        console.warn(`Props sync error for game ${gameId}:`, err.message || err);
      }
    }
  }

  return summary;
}

// CLI entry
if (require.main === module) {
  const argv = Minimst(process.argv.slice(2));
  syncBettingData({
    season: argv.season ? Number(argv.season) : undefined,
    week: argv.week ? Number(argv.week) : undefined,
    gameIds: argv.gameIds ? String(argv.gameIds).split(',').map((id) => Number(id)) : undefined,
  }).then((result) => {
    console.log('✅ Betting sync complete', result);
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Betting sync failed', err);
    process.exit(1);
  });
}

module.exports = { syncBettingData };