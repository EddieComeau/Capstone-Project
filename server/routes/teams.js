// server/routes/teams.js
const express = require("express");
const {
  getAllTeamsLive,
  getAllTeamsFromDB,
} = require("../controllers/teamsController");

const router = express.Router();

// Live data from BALLDONTLIE
router.get("/live", getAllTeamsLive);

// Data from Mongo Team collection
router.get("/db", getAllTeamsFromDB);

module.exports = router;
