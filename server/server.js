// server/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

/* Optional security middleware; only runs if installed */
try {
  const helmet = require('helmet');
  app.use(helmet());
} catch (_) {}

try {
  const compression = require('compression');
  app.use(compression());
} catch (_) {}

app.set('trust proxy', 1);

// Configure CORS from environment or allow all
const CORS_ORIGIN = process.env.CORS_ORIGIN;
app.use(
  cors(
    CORS_ORIGIN
      ? {
          origin: CORS_ORIGIN.split(',').map(s => s.trim()),
          credentials: true,
        }
      : undefined
  )
);

// Body parsing & logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Load routes
const metricsRoutes = require('./routes/metricsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const livePlayRoutes = require('./routes/livePlay');

let syncRoutes;
try {
  syncRoutes = require('./routes/syncRoutes');
} catch (_) {
  console.warn('syncRoutes not found, skipping');
}

let syncStateRoutes;
try {
  syncStateRoutes = require('./routes/syncStateRoutes');
} catch (_) {
  console.warn('syncStateRoutes not found, skipping');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), now: new Date().toISOString() });
});

// Mount API routes
app.use('/api/metrics', metricsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live-play', livePlayRoutes);
if (syncRoutes) app.use('/api/sync', syncRoutes);
if (syncStateRoutes) app.use('/api/syncstate', syncStateRoutes);

// Serve production builds when NODE_ENV=production
if (process.env.NODE_ENV === 'production') {
  // Note: this assumes you run server from /server directory
  const mainBuild = path.join(__dirname, '..', 'frontend', 'build');
  const adminBuild = path.join(__dirname, '..', 'frontend', 'admin', 'build');

  // Serve admin at /admin
  app.use('/admin', express.static(adminBuild));

  // Serve main at /
  app.use(express.static(mainBuild));

  // SPA fallbacks
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminBuild, 'index.html'));
  });
  app.get('*', (req, res) => {
    res.sendFile(path.join(mainBuild, 'index.html'));
  });
}

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Internal error' });
});

// MongoDB connection and server start
const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}

mongoose.set('strictQuery', false);

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

  // Start notification service watchers
  try {
    const notificationService = require('./services/notificationService');
    await notificationService.start();
    console.log('Notification service started');
  } catch (err) {
    console.warn('Notification service failed to start:', err?.message || err);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
    if (process.env.NODE_ENV === 'production') {
      console.log(`Main App:  http://localhost:${PORT}/`);
      console.log(`Admin App: http://localhost:${PORT}/admin`);
    }
  });

  // Graceful shutdown
  const shutdown = async signal => {
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

start().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});

module.exports = app;