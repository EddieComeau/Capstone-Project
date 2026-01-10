// server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const bettingRoutes = require('./routes/betting');
// You can import more routes as needed:
// const playerRoutes = require('./server/routes/players');
// const teamRoutes = require('./server/routes/teams');
// etc.

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API is healthy 🚀' });
});

// ✅ Betting routes: /api/betting/props and /api/betting/odds
app.use('/api/betting', bettingRoutes);

// Mount additional routes here if needed
// app.use('/api/players', playerRoutes);

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});
