// server.js (ROOT ENTRY FILE)
// Matches package.json "main": "server.js"

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Routes
const metricsRoutes = require('./server/routes/metricsRoutes');
const notificationRoutes = require('./server/routes/notificationRoutes');
const livePlayRoutes = require('./server/routes/livePlay');

// Optional routes (exist in your repo now, but guarded safely)
let syncRoutes;
let syncStateRoutes;

try {
  syncRoutes = require('./server/routes/syncRoutes');
} catch {
  console.warn('syncRoutes not found, skipping');
}

try {
  syncStateRoutes = require('./server/routes/syncStateRoutes');
} catch {
  console.warn('syncStateRoutes not found, skipping');
}

// Services
const notificationService = require('./server/services/notificationService');

const app = express();

/* -------------------- Middleware -------------------- */

app.use(cors()); // open CORS for local dev + prod
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

/* -------------------- Health -------------------- */

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* -------------------- API Routes -------------------- */

app.use('/api/metrics', metricsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live-play', livePlayRoutes);

if (syncRoutes) app.use('/api/sync', syncRoutes);
if (syncStateRoutes) app.use('/api/syncstate', syncStateRoutes);

/* -------------------- Production Frontend Hosting -------------------- */

if (process.env.NODE_ENV === 'production') {
  const mainDist = path.join(__dirname, 'frontend', 'dist');
  const adminBuild = path.join(__dirname, 'frontend', 'admin', 'build');

  // Admin app at /admin
  app.use('/admin', express.static(adminBuild));

  // Main app at /
  app.use(express.static(mainDist));

  // Admin SPA fallback
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminBuild, 'index.html'));
  });

  // Main SPA fallback (non-API)
  app.get('*', (req, res) => {
    res.sendFile(path.join(mainDist, 'index.html'));
  });
}

/* -------------------- Error Handler -------------------- */

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: err.message || 'Internal error' });
});

/* -------------------- Mongo + Server Start -------------------- */

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set');
  process.exit(1);
}

mongoose.set('strictQuery', false);

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log(`Connected to MongoDB: ${mongoose.connection.db.databaseName}`);

    // Start notification listeners
    try {
      await notificationService.start();
      console.log('🔔 Notification service started');
    } catch (err) {
      console.warn('Notification service failed to start:', err.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server listening at http://localhost:${PORT}`);

      if (process.env.NODE_ENV === 'production') {
        console.log(`🟢 Main App:  http://localhost:${PORT}/`);
        console.log(`🟣 Admin App: http://localhost:${PORT}/admin`);
      }
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });

module.exports = app;
