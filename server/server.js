require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nfl_cards';
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Routes
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/players', require('./routes/playerRoutes'));
app.use('/api/games', require('./routes/gameRoutes'));
app.use('/api/stats', require('./routes/statRoutes'));
app.use('/api/cards', require('./routes/cardRoutes'));
app.use('/api/betting', require('./routes/bettingRoutes'));
app.use('/api/admin', require('./routes/adminRoutes')); // ✅ NEW: Sync Betting Admin Route

// Root route
app.get('/', (req, res) => {
  res.send('🏈 NFL Card Collector API');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
