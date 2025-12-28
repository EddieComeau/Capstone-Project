// server/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

/* -------------------- Optional hardening (won't crash if not installed) -------------------- */
try {
  const helmet = require('helmet');
  app.use(helmet());
} catch (_) {}

try {
  const compression = require('compression');
  app.use(compression());
} catch (_) {}

/* -------------------- Trust proxy (good for deployment behind a proxy) -------------------- */
app.set('trust proxy', 1);

/* -------------------- CORS -------------------- */
const CORS_ORIGIN = process.env.CORS_ORIGIN;
app.use(
  cors(
    CORS_ORIGIN
      ? {
          origin: CORS_ORIGIN.split(',').map((s) => s.trim()),
          credentials: true,
        }
      : undefined
  )
);

/* -------------------- Body parsing + logging -------------------- */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

/* -------------------- Routes -------------------- */
// These paths are relative to /server because you're running from /server
const metricsRoutes = require('./routes/metricsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const livePlayRoutes = require('./routes/livePlay');

let syncRoutes = null;
try {
  syncRoutes = require('./routes/syncRoutes');
} catch (e) {
  console.warn('syncRoutes not found, skipping');
}

let syncStateRoutes = null;
try {
  syncStateRoutes = require('./routes/syncStateRoutes');
} catch (e) {
  console.warn('syncStateRoutes not found, skipping');
}

/* -------------------- Health -------------------- */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    now: new Date().toISOString(),
  });
});

/* -------------------- API Mounts -------------------- */
app.use('/api/metrics', metricsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live-play', livePlayRoutes);

if (syncRoutes) app.use('/api/sync', syncRoutes);
if (syncStateRoutes) app.use('/api/syncstate', syncStateRoutes);

/* -------------------- Production Frontend Hosting -------------------- */
/**
 * Your MAIN frontend is CRA → outputs to: frontend/build
 * Your ADMIN frontend is CRA → outputs to: frontend/admin/build
 *
 * When running from /server:
 *  - main build is: ../frontend/build
 *  - admin build is: ../frontend/admin/build
 */
if (process.env.NODE_ENV === 'production') {
  const mainBuild = path.join(__dirname, '..', 'frontend', 'build');
  const adminBuild = path.join(__dirname, '..', 'frontend', 'admin', 'build');

  // Serve admin app at /admin
  app.use('/admin', express.static(adminBuild));

  // Serve main app at /
  app.use(express.static(mainBuild));

  // Admin SPA fallback (handles /admin/* routes)
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminBuild, 'index.html'));
  });

  // Main SPA fallback (handles everything else non-API)
  app.get('*', (req, res) => {
    res.sendFile(path.join(mainBuild, 'index.html'));
  });
}

/* -------------------- Error handler -------------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal server error',
  });
});

/* -------------------- Mongo + Start -------------------- */
const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in server/.env');
  process.exit(1);
}

mongoose.set('strictQuery', false);

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

  // Notification service (change streams / watchers)
  try {
    const notificationService = require('./services/notificationService');
    await notificationService.start();
    console.log('🔔 Notification service started');
  } catch (e) {
    console.warn('Notification service failed to start:', e?.message || e);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server listening at http://localhost:${PORT}`);
    if (process.env.NODE_ENV === 'production') {
      console.log(`🟢 Main App:  http://localhost:${PORT}/`);
      console.log(`🟣 Admin App: http://localhost:${PORT}/admin`);
    }
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down...`);
    server.close(async () => {
      try {
        await mongoose.connection.close();
      } catch (_) {}
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('❌ Startup failed:', err);
  process.exit(1);
});

module.exports = app;
