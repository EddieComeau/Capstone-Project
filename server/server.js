// server/server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');

const notificationService = require('./services/notificationService');
let epaTrainer = null;
let epaService = null;
try { epaTrainer = require('./services/epaTrainer'); } catch (e) { /* optional */ }
try { epaService = require('./services/epaService'); } catch (e) { /* optional */ }

// Routes (ensure these exist in your server/ folder)
let metricsRoutes = null;
let exportRoutes = null;
let syncStateRoutes = null;
let notificationRoutes = null;
try { metricsRoutes = require('./routes/metricsRoutes'); } catch (e) {}
try { exportRoutes = require('./routes/exportRoutes'); } catch (e) {}
try { syncStateRoutes = require('./routes/syncStateRoutes'); } catch (e) {}
try { notificationRoutes = require('./routes/notificationRoutes'); } catch (e) {}

let syncRoutes = null;
try { syncRoutes = require('./routes/syncRoutes'); } catch (err) { /* optional */ }

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

if (metricsRoutes) app.use('/api/metrics', metricsRoutes);
if (exportRoutes) app.use('/api/export', exportRoutes);
if (syncStateRoutes) app.use('/api/syncstate', syncStateRoutes);
if (notificationRoutes) app.use('/api/notifications', notificationRoutes);
if (syncRoutes) app.use('/api/sync', syncRoutes);

// Serve public frontend build (if present)
const publicBuildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(publicBuildPath));
app.get('/', (req, res) => {
  res.sendFile(path.join(publicBuildPath, 'index.html'));
});

// Serve admin UI at /admin (build must be at frontend/admin/build)
const adminBuildPath = path.join(__dirname, '..', 'frontend', 'admin', 'build');
app.use('/admin/static', express.static(path.join(adminBuildPath, 'static')));
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'index.html'));
});

// generic 404
app.use((req, res, next) => {
  res.status(404).json({ ok: false, error: 'Not Found' });
});

// error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Internal server error' });
});

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is required in environment');
  process.exit(1);
}

// Improve mongoose connectivity & buffering robustness
mongoose.set('strictQuery', false);
mongoose.set('bufferTimeoutMS', Number(process.env.MONGOOSE_BUFFER_TIMEOUT_MS || 30000)); // 30s default

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: Number(process.env.SERVER_SELECTION_TIMEOUT_MS || 30000),
  socketTimeoutMS: Number(process.env.SOCKET_TIMEOUT_MS || 45000),
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20)
};

mongoose.connect(MONGO_URI, mongooseOptions).then(async () => {
  console.log('✅ Connected to MongoDB:', mongoose.connection.db.databaseName);

  // start notification service
  try {
    if (notificationService && typeof notificationService.start === 'function') {
      await notificationService.start();
      console.log('🔔 notificationService started');
    }
  } catch (err) {
    console.warn('notificationService failed to start:', err && err.message ? err.message : err);
  }

  // Schedule nightly EPA training & recompute (if trainer/service available)
  if (epaTrainer && epaService) {
    const TRAINING_CRON = process.env.TRAINING_CRON || '0 3 * * *'; // 03:00 daily
    cron.schedule(TRAINING_CRON, async () => {
      console.log(`[${new Date().toISOString()}] Cron: starting nightly EPA training & recompute`);
      try {
        const seasonsEnv = process.env.TRAINING_SEASONS || `${new Date().getFullYear()}`;
        const seasons = seasonsEnv.split(',').map(s => Number(s.trim())).filter(Boolean);
        for (const season of seasons) {
          console.log(`🔁 Training EPAModel for season ${season}...`);
          await epaTrainer.trainEPAModel({ season, lookbackGames: Number(process.env.EPA_TRAIN_LOOKBACK_GAMES || 1000) });
          console.log(`🔁 Recomputing EPA for season ${season}...`);
          await epaService.computeEPAForSeason(season);
        }
        console.log(`✅ Nightly EPA training & recompute finished`);
      } catch (err) {
        console.error('Nightly EPA job error:', err && err.stack ? err.stack : err);
      }
    }, {
      scheduled: true,
      timezone: process.env.TRAINING_TZ || 'UTC'
    });

    if (process.env.RUN_EPA_ON_STARTUP === 'true') {
      (async () => {
        try {
          const season = Number(process.env.SYNC_SEASON || new Date().getFullYear());
          await epaTrainer.trainEPAModel({ season });
          await epaService.computeEPAForSeason(season);
          console.log('✅ EPA trained & computed on startup');
        } catch (err) {
          console.error('EPA on startup failed:', err && err.message ? err.message : err);
        }
      })();
    }
  } else {
    console.log('⚠️ epaTrainer or epaService not available; skipping EPA cron.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server listening at http://localhost:${PORT}`);
    console.log(`🔧 Admin UI (if built) served at http://localhost:${PORT}/admin/`);
  });
}).catch(err => {
  console.error('Mongo connection failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});

module.exports = app;
