// routes/playByPlay.js
const express = require("express");
const { getPlayByPlay } = require("../controllers/playByPlayController");

const router = express.Router();

// GET /api/playbyplay?gameId=7001&cursor=...&per_page=100
router.get("/", getPlayByPlay);

module.exports = router;
