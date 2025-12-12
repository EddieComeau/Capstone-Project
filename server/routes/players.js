// server/routes/players.js
const express = require("express");
const router = express.Router();

const {
  getAllPlayers,
  getPlayerById,
  getPlayersByTeam,
  syncPlayersForTeam,
} = require("../controllers/playersController");

// GET /api/players
router.get("/", getAllPlayers);

// GET /api/players/:id
router.get("/:id", getPlayerById);

// GET /api/players/team/:team
router.get("/team/:team", getPlayersByTeam);

// POST /api/players/sync/:team
router.post("/sync/:team", syncPlayersForTeam);

module.exports = router;
