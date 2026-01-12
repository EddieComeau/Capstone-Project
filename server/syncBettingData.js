require('dotenv').config();

const connectDB = require('./config/db');
const mongoose = require('mongoose');
const { syncOddsAndPropsForWeek } = require('./services/syncService');
const { getCurrentSeasonAndWeek } = require('./utils/weekUtils');

(async () => {
  const args = process.argv.slice(2);
  let season, week;

  if (args.length === 2) {
    season = parseInt(args[0], 10);
    week = parseInt(args[1], 10);
    console.log(`🔁 Syncing betting data for season ${season}, week ${week}`);
  } else {
    const current = getCurrentSeasonAndWeek();
    season = current.season;
    week = current.week;
    console.log(`ℹ️ No CLI args passed — using current season/week`);
    console.log(`🔁 Syncing betting data for season ${season}, week ${week}`);
  }

  await connectDB();
  console.log('✅ Connected to MongoDB');

  try {
    const result = await syncOddsAndPropsForWeek(season, week);
    console.log(
      `✅ Betting data synced — odds: ${result.odds}, props: ${result.props}`
    );
  } catch (err) {
    console.error('❌ Betting sync failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
})();
