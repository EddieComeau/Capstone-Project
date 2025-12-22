// server/routes/players.js

const express = require('express');
const router = express.Router();

const playersController = require('../controllers/playersController');

// Standardized sync endpoint
router.post('/sync', playersController.syncPlayers);

module.exports = router;
