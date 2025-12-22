// server/server.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const connectDB = require('./db');
const { syncPlayers } = require('./services/syncService');

const playersRoutes = require('./routes/players');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/players', playersRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT || 5000);

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set');
    }

    await connectDB(mongoUri);

    // Check if SYNC_ON_STARTUP is enabled
    const shouldSyncOnStartup = process.env.SYNC_ON_STARTUP === 'true';
    
    if (shouldSyncOnStartup) {
      console.log('🔄 SYNC_ON_STARTUP is enabled, syncing players from Ball Don\'t Lie...');
      try {
        const result = await syncPlayers();
        console.log(`✅ Startup sync completed: ${result.synced} players synced in ${result.pages} pages`);
      } catch (syncErr) {
        console.error('⚠️ Startup sync failed:', syncErr.message);
        console.error('Server will continue to start, but data may not be up to date.');
      }
    } else {
      console.log('ℹ️ SYNC_ON_STARTUP is disabled. Set SYNC_ON_STARTUP=true in .env to enable automatic syncing.');
    }

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
