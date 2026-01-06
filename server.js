// server.js with corrected module paths and full read-only API routes

// Load environment variables from .env (searches the current working directory)
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');

// Import API route modules.  Each route file lives under `server/routes/`.
// Only read‑only routes (GET endpoints) are mounted here.  Sync endpoints
// that trigger data ingestion (e.g. players/sync) have been removed from
// the Express router to avoid accidental manual syncs.
const metricsRoutes = require('./server/routes/metricsRoutes');
const notificationRoutes = require('./server/routes/notificationRoutes');
const teamsRoutes = require('./server/routes/teams');
const matchupsRoutes = require('./server/routes/matchups');
const gamesRoutes = require('./server/routes/games');
const standingsRoutes = require('./server/routes/standings');
const playByPlayRoutes = require('./server/routes/playByPlay');
const boxscoresRoutes = require('./server/routes/boxscores');
const cardsRoutes = require('./server/routes/cards');
const rosterRoutes = require('./server/routes/roster');
const injuriesRoutes = require('./server/routes/injuries');
const authRoutes = require('./server/routes/auth');

// Notification service for MongoDB change streams
const notificationService = require('./server/services/notificationService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Basic health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Mount API routes
app.use('/api/metrics', metricsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/matchups', matchupsRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/standings', standingsRoutes);
app.use('/api/playbyplay', playByPlayRoutes);
app.use('/api/boxscores', boxscoresRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/injuries', injuriesRoutes);
app.use('/api/auth', authRoutes);

// ---------------------------
// Static frontend serving
// ---------------------------
// Serve the built React app (frontend/dist) with Express.  This allows
// deployment of a single Node process that handles both the API and
// client‑side routes.  The catch‑all route below ensures that any
// non‑API path will return `index.html` to enable React Router.
const distDir = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(distDir));
// Use a regex to match any path that does not start with /api.
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'internal' });
});

// Environment configuration
const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}

// Connect to MongoDB and start the server
mongoose.set('strictQuery', false);
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

    // Optionally run a full data sync at startup
    if (process.env.SYNC_ON_STARTUP === 'true') {
      (async () => {
        console.log('🔄 Running initial data sync...');
        try {
          await require('./server/syncAllButStats');
          await require('./server/syncRemainingData');
          console.log('✅ Initial data sync complete');
        } catch (err) {
          console.error('❌ Initial data sync failed', err && err.message ? err.message : err);
        }
      })();
    }

    // Schedule weekly sync; default is 3 AM Sunday
    const schedule = process.env.SYNC_SCHEDULE || '0 3 * * 0';
    cron.schedule(schedule, async () => {
      console.log('🔄 Weekly data sync starting...');
      try {
        await require('./server/syncAllButStats');
        await require('./server/syncRemainingData');
        console.log('✅ Weekly data sync complete');
      } catch (err) {
        console.error('❌ Weekly data sync failed', err && err.message ? err.message : err);
      }
    });

    // Start notification service
    try {
      await notificationService.start();
      console.log('Notification service started');
    } catch (err) {
      console.warn('Failed to start notification service', err && err.message ? err.message : err);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server listening at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Mongo connect failed', err && err.message ? err.message : err);
    process.exit(1);
  });

module.exports = app;