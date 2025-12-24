// server/server.js
//
// Main Express application entry point.  This file mirrors the upstream
// Capstone Project `server.js` but adds the live play‑by‑play route.  It
// wires up middleware, API routes, connects to MongoDB, and starts
// the HTTP server.  Import your new routes here to expose them under
// `/api/*` paths.

require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

// Existing route modules
const metricsRoutes = require('./routes/metricsRoutes');
let syncRoutes = null;
try {
  syncRoutes = require('./routes/syncRoutes');
} catch (e) {
  console.warn('syncRoutes not found, skipping');
}
const notificationRoutes = require('./routes/notificationRoutes');

// New live play‑by‑play SSE route
const livePlayRoutes = require('./routes/livePlay');

const notificationService = require('./services/notificationService');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Mount API routes
app.use('/api/metrics', metricsRoutes);
if (syncRoutes) app.use('/api/sync', syncRoutes);
app.use('/api/notifications', notificationRoutes);
// Expose live play by play events: GET /api/live-play/:gameId
app.use('/api/live-play', livePlayRoutes);

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'internal' });
});

// Configuration
const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}

mongoose.set('strictQuery', false);
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
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
  })
  .catch((err) => {
    console.error('Mongo connect failed', err && err.message ? err.message : err);
    process.exit(1);
  });

module.exports = app;