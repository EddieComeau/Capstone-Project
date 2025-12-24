// server/routes/syncRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/syncController');

router.post('/games', ctrl.postSyncGames);
router.post('/players', ctrl.postSyncPlayers);
router.post('/derived', require('../controllers/syncController').postComputeDerived);

// SSE stream for job progress
router.get('/stream/:jobId', ctrl.sseStream);

module.exports = router;
