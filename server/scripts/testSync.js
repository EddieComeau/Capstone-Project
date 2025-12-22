// server/scripts/testSync.js

require('dotenv').config();

const connectDB = require('../db');
const syncService = require('../services/syncService');

(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
    await connectDB(process.env.MONGO_URI);

    const result = await syncService.syncPlayers({ per_page: 100, maxPages: 2 });
    console.log('Sync result:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
