// routes/teams.js
const express = require("express");
const {
  getAllTeamsLive,
  getAllTeamsFromDB,
} = require("../controllers/teamsController");

const router = express.Router();

// Live data from SportsData.io
router.get("/live", getAllTeamsLive);

// Data from your MongoDB Team collection
router.get("/db", getAllTeamsFromDB);

module.exports = router;
