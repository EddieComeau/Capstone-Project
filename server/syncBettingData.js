require('dotenv').config();

const connectDB = require('./config/db');
const mongoose = require('mongoose');
const { syncOddsAndPropsForWeek } = require('./services/syncService');
const { getCurrentSeasonAndWeek } = require('./utils/weekUtils');

async function syncBettingData(options = {}) {
  const args = options._cliArgs || [];
  let season = options.season;
  let week = options.week;

  if (args.length === 2) {
    season = parseInt(args[0], 10);
    week = parseInt(args[1], 10);
  }

  if (!season || !week) {
    const current = getCurrentSeasonAndWeek();
    season = season || current.season;
    week = week || current.week;
  }

  const shouldConnect = mongoose.connection.readyState === 0;
  if (shouldConnect) {
    await connectDB();
  }

  try {
    const result = await syncOddsAndPropsForWeek(season, week);
    return { ok: true, season, week, odds: result.odds, props: result.props };
  } catch (err) {
    return { ok: false, season, week, error: err?.message || String(err) };
  } finally {
    if (shouldConnect) {
      await mongoose.disconnect();
    }
  }
}

module.exports = { syncBettingData };

if (require.main === module) {
  const args = process.argv.slice(2);
  syncBettingData({ _cliArgs: args })
    .then((result) => {
      if (result.ok) {
        console.log(
          `✅ Betting data synced — odds: ${result.odds}, props: ${result.props}`
        );
      } else {
        console.error('❌ Betting sync failed:', result.error);
      }
    })
    .catch((err) => {
      console.error('❌ Betting sync failed:', err);
    });
}
