require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
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

// Routes (match exactly what exists)
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/players', require('./routes/players'));
app.use('/api/games', require('./routes/games'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/betting', require('./routes/betting'));

app.use('/api/metrics', require('./routes/metricsRoutes'));
app.use('/api/standings', require('./routes/standings'));
app.use('/api/matchups', require('./routes/matchups'));
app.use('/api/boxscores', require('./routes/boxscores'));
app.use('/api/play-by-play', require('./routes/playByPlay'));
app.use('/api/live', require('./routes/livePlay'));

app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/sync', require('./routes/syncRoutes'));
app.use('/api/sync-state', require('./routes/syncStateRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));

app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/', (req, res) => {
  res.send('🏈 NFL Cards API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
