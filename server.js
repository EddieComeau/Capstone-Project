// server.js – main API and static hosting for Sideline Studio
// This file replaces the faulty root-level server.js on the full‑updated‑project branch.

// Load environment variables from the project root. When this server is executed
// via `npm start` from the server/ directory, process.cwd() will be server/, but
// __dirname points to the project root (where server.js lives). By explicitly
// specifying the path, we ensure the .env file in the project root is loaded.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Import API routes from the server/routes directory. Each file defines a Router
// for a particular resource (players, teams, games, etc.). Do not import from
// ./routes or duplicate these imports—the project only has one set of routes.
const metricsRoutes = require('./server/routes/metricsRoutes');
const authRoutes = require('./server/routes/auth');
const boxscoresRoutes = require('./server/routes/boxscores');
const cardsRoutes = require('./server/routes/cards');
const gamesRoutes = require('./server/routes/games');
const matchupsRoutes = require('./server/routes/matchups');
const playByPlayRoutes = require('./server/routes/playByPlay');
const playersRoutes = require('./server/routes/players');
const standingsRoutes = require('./server/routes/standings');
const teamsRoutes = require('./server/routes/teams');
const syncRoutes = require('./server/routes/sync');
const injuriesRoutes = require('./server/routes/injuries');
const rosterRoutes = require('./server/routes/roster');
const notificationRoutes = require('./server/routes/notificationRoutes');

// Services
const notificationService = require('./server/services/notificationService');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint — returns uptime and current timestamp
app.get('/api/health', (req, res) =>
  res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() })
);

// Mount API routes under their respective prefixes. Each router handles its
// own subpaths; e.g. cardsRoutes defines /player/:id, /team/:abbr, etc.
app.use('/api/metrics', metricsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/boxscores', boxscoresRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/matchups', matchupsRoutes);
app.use('/api/playbyplay', playByPlayRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/standings', standingsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/injuries', injuriesRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/notifications', notificationRoutes);

// In production, serve the prebuilt front‑end assets (Vite and CRA builds).
// The main Vite app lives under frontend/dist, and the admin CRA build is
// under frontend/admin/build. All non‑API routes are redirected to these.
if (process.env.NODE_ENV === 'production') {
  const mainDist = path.join(__dirname, 'frontend', 'dist');
  const adminBuild = path.join(__dirname, 'frontend', 'admin', 'build');

  // Serve admin app at /admin
  app.use('/admin', express.static(adminBuild));
  // Serve main app at root
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

// Generic error handler. Any error passed via next(err) will end up here.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'internal' });
});

// Connect to MongoDB and start the HTTP server. Use environment variables for
// connection string and pool size; default to port 4000. If MONGO_URI is not
// set, exit early.
const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}

// Build optional mongoose options from env
const mongooseOpts = {};
if (process.env.MONGO_MAX_POOL_SIZE) {
  const poolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE, 10);
  if (!Number.isNaN(poolSize)) {
    mongooseOpts.maxPoolSize = poolSize;
  }
}

mongoose
  .connect(MONGO_URI, mongooseOpts)
  .then(async () => {
    console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);
    try {
      await notificationService.start();
      console.log('Notification service started');
    } catch (err) {
      console.warn(
        'Failed to start notification service',
        err && err.message ? err.message : err
      );
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