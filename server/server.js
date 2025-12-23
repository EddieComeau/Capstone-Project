// server.js
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

const metricsRoutes = require('./routes/metricsRoutes');
let syncRoutes = null;
try { syncRoutes = require('./routes/syncRoutes'); } catch (e) { console.warn('syncRoutes not found, skipping'); }

const notificationRoutes = require('./routes/notificationRoutes');

const notificationService = require('./services/notificationService');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use('/api/metrics', metricsRoutes);
if (syncRoutes) app.use('/api/sync', syncRoutes);
app.use('/api/notifications', notificationRoutes);

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
