// server/routes/metricsRoutes.js
const express = require('express');
const router = express.Router();
const { getMetrics } = require('../controllers/metricsController');

// GET /api/metrics/:entityType/:entityId
router.get('/:entityType/:entityId', getMetrics);

module.exports = router;
