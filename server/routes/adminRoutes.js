const express = require('express');
const router = express.Router();
const { syncBettingData } = require('../controllers/adminController');

router.post('/sync-betting', syncBettingData);

module.exports = router;
