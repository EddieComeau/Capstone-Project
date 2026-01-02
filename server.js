// Server entry point
//
// This file is the main entry point for the backend API and production
// static hosting. It mounts API routes defined in the `server/` folder,
// static hosting. It mounts API routes defined in the `routes/` folder,
// connects to MongoDB, starts the Express server, and, when
// NODE_ENV=production, serves the built front‑end applications. The
// main Vite app (in `frontend/dist`) is served at `/` and the admin CRA
// build (in `frontend/admin/build`) is served under `/admin`.  API routes
// main Vite app (in `../frontend/dist`) is served at `/` and the admin CRA
// build (in `../frontend/admin/build`) is served under `/admin`.  API routes
// remain prefixed under `/api`.  See docs/project.md for details.

require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Import API route modules from server/ folder
const metricsRoutes = require('./server/routes/metricsRoutes');
// Import API route modules from routes folder
const metricsRoutes = require('./routes/metricsRoutes');

// Manual sync routes (players/games/derived)
let syncRoutes = null;
try {
  syncRoutes = require('./server/routes/syncRoutes');
  syncRoutes = require('./routes/syncRoutes');
} catch (e) {
  console.warn('syncRoutes not found, skipping');
}

// Sync state routes (list/reset sync jobs)
let syncStateRoutes = null;
try {
  syncStateRoutes = require('./server/routes/syncStateRoutes');
  syncStateRoutes = require('./routes/syncStateRoutes');
} catch (e) {
  console.warn('syncStateRoutes not found, skipping');
}

// Notifications and live play routes
const notificationRoutes = require('./server/routes/notificationRoutes');
const livePlayRoutes = require('./server/routes/livePlay');
const notificationRoutes = require('./routes/notificationRoutes');
const livePlayRoutes = require('./routes/livePlay');

// Injuries routes
const injuriesRoutes = require('./server/routes/injuries');
const rosterRoutes = require('./server/routes/roster');
const injuriesRoutes = require('./routes/injuries');
const rosterRoutes = require('./routes/roster');

// Services
const notificationService = require('./server/services/notificationService');
const notificationService = require('./services/notificationService');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) =>
  res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() })
);

// Mount API routes
app.use('/api/metrics', metricsRoutes);
if (syncRoutes) app.use('/api/sync', syncRoutes);
if (syncStateRoutes) app.use('/api/syncstate', syncStateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live-play', livePlayRoutes);
app.use('/api/injuries', injuriesRoutes);
app.use('/api/roster', rosterRoutes);

// Production: serve built front‑ends
if (process.env.NODE_ENV === 'production') {
  // Main Vite build output (frontend/dist)
  const mainDist = path.join(__dirname, 'frontend', 'dist');
  const mainDist = path.join(__dirname, '..', 'frontend', 'dist');
  // Admin CRA build output (frontend/admin/build)
  const adminBuild = path.join(__dirname, 'frontend', 'admin', 'build');
  const adminBuild = path.join(__dirname, '..', 'frontend', 'admin', 'build');

  // Serve admin app at /admin
  app.use('/admin', express.static(adminBuild));
  // Serve main app at /
  app.use(express.static(mainDist));

  // SPA fallback for admin routes
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminBuild, 'index.html'));
  });
  // SPA fallback for all other non‑API routes (main app)
  app.get('*', (req, res) => {
    res.sendFile(path.join(mainDist, 'index.html'));
  });
}

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'internal' });
});

// Connect to MongoDB and start server
const PORT = Number(process.env.PORT || 4000);
@@ -124,26 +124,26 @@ if (process.env.MONGO_MAX_POOL_SIZE) {
}

mongoose
  .connect(MONGO_URI, mongooseOpts)
  .then(async () => {
    console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);
    try {
      await notificationService.start();
      console.log('Notification service started');
    } catch (err) {
      console.warn('Failed to start notification service', err && err.message ? err.message : err);
    }
    app.listen(PORT, () => {
      console.log(`Server listening at http://localhost:${PORT}`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`Main App:  http://localhost:${PORT}/`);
        console.log(`Admin App: http://localhost:${PORT}/admin`);
      }
    });
  })
  .catch((err) => {
    console.error('Mongo connect failed', err && err.message ? err.message : err);
    process.exit(1);
  });

module.exports = app;
