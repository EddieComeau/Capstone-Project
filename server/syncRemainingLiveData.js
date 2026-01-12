require('dotenv').config();

const connectDB = require('./config/db');
const mongoose = require('mongoose');
const { syncRemainingPlays } = require('./services/syncService');

(async () => {
  console.log('🔁 Syncing remaining live data (plays only)...');

  await connectDB();
  console.log('✅ Connected to MongoDB');

  try {
    await syncRemainingPlays();
    console.log('✅ Remaining plays synced');
  } catch (err) {
    console.error('❌ Live sync failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
})();
