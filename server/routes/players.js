// server/routes/players.js
const express = require("express");
const router = express.Router();

const {
  getAllPlayers,
  getPlayerById,
  getPlayersByTeam,
  syncPlayersForTeam,
  syncPlayers,
} = require("../controllers/playersController");

// GET /api/players
router.get("/", getAllPlayers);

// ✅ Put specific routes BEFORE "/:id"
router.get("/team/:team", getPlayersByTeam);

// GET /api/players/:id
router.get("/:id", getPlayerById);

// POST /api/players/sync
router.post("/sync", syncPlayers);

// POST /api/players/sync/:team
router.post("/sync/:team", syncPlayersForTeam);

module.exports = router;
