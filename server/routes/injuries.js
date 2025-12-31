// server/routes/injuries.js

const express = require('express');
const router = express.Router();

const {
  getInjuries,
  syncInjuries,
} = require('../controllers/injuriesController');

// List injuries (supports optional filtering via query params)
router.get('/', getInjuries);

// Sync injuries from Ball Don’t Lie
router.post('/sync', syncInjuries);

module.exports = router;