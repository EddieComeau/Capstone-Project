// server.js with corrected module paths (admin removed)

// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Node's built-in path module is used to resolve the location of the built
// frontend assets.  These assets live in `frontend/dist` relative to the
// repository root.  Without using path.join() the code would fail when
// running from different working directories.
const path = require('path');

// Import routes from the server subdirectory.  These paths point to files
// under the `server/` folder because the main `server.js` lives at the
// project root.  Without the `server/` prefix Node would search for a
// `routes` folder at the root (which does not exist).
const metricsRoutes = require('./server/routes/metricsRoutes');
const notificationRoutes = require('./server/routes/notificationRoutes');

// Notification service (for watching MongoDB change streams)
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

// ---------------------------
// Static frontend serving
// ---------------------------
// When the frontend is built (via `npm run build` in the `frontend` folder),
// its optimised assets are output to `frontend/dist`.  In production we
// serve those files directly from Express so that a single Node process can
// handle both the API and the React app.  The order here matters: static
// routes are defined after the API routes so that `/api/*` continues to
// match first.  Any non-API request will fall through to this static
// handler and ultimately serve the React `index.html` for client-side
// routing.
const distDir = path.join(__dirname, 'frontend', 'dist');
// Serve static files (JS, CSS, images, etc.)
app.use(express.static(distDir));
// For any route not handled by the above (i.e. not starting with /api),
// return the HTML entry point.  The catch-all must come after
// express.static so that existing static files are served correctly.
app.get('*', (req, res) => {
  // If the request path starts with /api we defer to the API routes.
  if (req.path.startsWith('/api')) return res.status(404).json({ ok: false, error: 'Not found' });
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
          // Sync scripts live in the `server/` folder; require them with the prefix.
          await require('./server/syncAllButStats');
          await require('./server/syncRemainingData');
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
        await require('./server/syncAllButStats');
        await require('./server/syncRemainingData');
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