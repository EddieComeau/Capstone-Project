// routes/games.js
const express = require("express");
const { listGames } = require("../controllers/gamesController");

const router = express.Router();

// GET /api/games?season=2025&week=8
router.get("/", listGames);

module.exports = router;
