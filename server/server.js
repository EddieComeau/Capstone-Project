require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json());

// --------------------
// MongoDB Connection
// --------------------
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// --------------------
// Routes (MATCH YOUR FILES EXACTLY)
// --------------------

// Core data
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/players', require('./routes/players'));
app.use('/api/games', require('./routes/games'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/betting', require('./routes/betting'));

// Stats / metrics
app.use('/api/metrics', require('./routes/metricsRoutes'));
app.use('/api/standings', require('./routes/standings'));
app.use('/api/matchups', require('./routes/matchups'));
app.use('/api/boxscores', require('./routes/boxscores'));
app.use('/api/play-by-play', require('./routes/playByPlay'));
app.use('/api/live', require('./routes/livePlay'));

// Admin / sync / automation
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/sync', require('./routes/syncRoutes'));
app.use('/api/sync-state', require('./routes/syncStateRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));

// Auth (if used)
app.use('/api/auth', require('./routes/auth'));

// --------------------
// Health Check
// --------------------
app.get('/', (req, res) => {
  res.send('🏈 NFL Cards API is running');
});

// --------------------
// Start Server
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
