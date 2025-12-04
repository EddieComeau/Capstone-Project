// routes/players.js
const express = require("express");
const {
  getPlayersByTeamLive,
  getPlayersFromDB,
} = require("../controllers/playersController");

const router = express.Router();

// Live player data by team (SportsData.io)
router.get("/live/:team", getPlayersByTeamLive);

// Players from your MongoDB database
router.get("/db", getPlayersFromDB);

module.exports = router;
