// server/server.js
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

function normalizeRouter(maybeRouter, name) {
  if (!maybeRouter) return null;
  // If it's already a function (Express router is callable), return it.
  if (typeof maybeRouter === 'function') {
    console.log(`Route "${name}" resolved as function/router`);
    return maybeRouter;
  }
  // If it is an object with a default property (common when mixing ESM/CJS), use that.
  if (maybeRouter && typeof maybeRouter.default === 'function') {
    console.log(`Route "${name}" resolved as object with default -> using default`);
    return maybeRouter.default;
  }
  // If module exported an object with router property
  if (maybeRouter && typeof maybeRouter.router === 'function') {
    console.log(`Route "${name}" resolved as object.router -> using router`);
    return maybeRouter.router;
  }
  console.warn(`Route "${name}" is not a router (type=${typeof maybeRouter}).`);
  return null;
}

let metricsRoutes = null;
try {
  metricsRoutes = require('./routes/metricsRoutes');
  metricsRoutes = normalizeRouter(metricsRoutes, 'metricsRoutes');
} catch (err) {
  console.warn('metricsRoutes not found or failed to load:', err && err.message ? err.message : err);
}

let syncRoutes = null;
try {
  syncRoutes = require('./routes/syncRoutes');
  syncRoutes = normalizeRouter(syncRoutes, 'syncRoutes');
} catch (e) {
  console.warn('syncRoutes not found, skipping', e && e.message ? e.message : e);
}

let notificationRoutes = null;
try {
  notificationRoutes = require('./routes/notificationRoutes');
  notificationRoutes = normalizeRouter(notificationRoutes, 'notificationRoutes');
} catch (err) {
  console.warn('notificationRoutes not found or failed to load:', err && err.message ? err.message : err);
}

const notificationService = require('./services/notificationService');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

if (metricsRoutes) app.use('/api/metrics', metricsRoutes);
if (syncRoutes) app.use('/api/sync', syncRoutes);
if (notificationRoutes) app.use('/api/notifications', notificationRoutes);

// error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'internal' });
});

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}

mongoose.set('strictQuery', false);
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(async () => {
  console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

  // Start notification service watchers (change streams or polling fallback)
  try {
    await notificationService.start();
    console.log('Notification service started');
  } catch (err) {
    console.warn('Failed to start notification service', err && err.message ? err.message : err);
  }

  app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Mongo connect failed', err && err.message ? err.message : err);
  process.exit(1);
});

module.exports = app;
