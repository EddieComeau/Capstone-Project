// server/routes/roster.js

const express = require('express');
const router = express.Router();
const { getRosterByTeam } = require('../controllers/rosterController');

// GET /api/roster/:abbr — returns roster for a given team
router.get('/:abbr', getRosterByTeam);

module.exports = router;