// server/server.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const connectDB = require('./db');

const playersRoutes = require('./routes/players');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/players', playersRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT || 5000);

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set');
    }

    await connectDB(mongoUri);

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
