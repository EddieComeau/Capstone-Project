// server.js (admin removed)

// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Routes
const metricsRoutes = require('./routes/metricsRoutes');
// Note: we intentionally do not load syncRoutes here.  All data syncs are handled
// automatically on startup and via scheduled jobs.  The manual admin endpoints
// have been removed.
const notificationRoutes = require('./routes/notificationRoutes');

// Services
const notificationService = require('./services/notificationService');

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

// Connect to MongoDB
mongoose.set('strictQuery', false);
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

    // Optionally run a full data sync at startup.  Set SYNC_ON_STARTUP=true in
    // your .env file to enable.  The sync scripts run independently from the
    // Express server and may take several minutes to complete.
    if (process.env.SYNC_ON_STARTUP === 'true') {
      (async () => {
        console.log('🔄 Running initial data sync...');
        try {
          await require('./syncAllButStats');
          await require('./syncRemainingData');
          console.log('✅ Initial data sync complete');
        } catch (err) {
          console.error('❌ Initial data sync failed', err && err.message ? err.message : err);
        }
      })();
    }

    // Schedule weekly data sync at 3 AM on Sundays by default.  You can
    // override the schedule by setting SYNC_SCHEDULE to a valid cron
    // expression (e.g., '0 3 * * 3' for Wednesday at 3 AM).
    const schedule = process.env.SYNC_SCHEDULE || '0 3 * * 0';
    cron.schedule(schedule, async () => {
      console.log('🔄 Weekly data sync starting...');
      try {
        await require('./syncAllButStats');
        await require('./syncRemainingData');
        console.log('✅ Weekly data sync complete');
      } catch (err) {
        console.error('❌ Weekly data sync failed', err && err.message ? err.message : err);
      }
    });

    // Start notification service watchers (change streams or polling fallback)
    try {
      await notificationService.start();
      console.log('Notification service started');
    } catch (err) {
      console.warn('Failed to start notification service', err && err.message ? err.message : err);
    }

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server listening at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Mongo connect failed', err && err.message ? err.message : err);
    process.exit(1);
  });

module.exports = app;