// server/routes/syncRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/syncController');

// POST /api/sync/games
// body: { seasons, per_page, dryRun, historical, maxPages }
router.post('/games', ctrl.postSyncGames);

// POST /api/sync/players
// body: { per_page, dryRun }
router.post('/players', ctrl.postSyncPlayers);

// POST /api/sync/derived
// body: { season, per_page, dryRun }
router.post('/derived', ctrl.postComputeDerived);

module.exports = router;
