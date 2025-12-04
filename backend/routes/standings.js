// routes/standings.js
const express = require("express");
const {
  getStandingsBySeason,
} = require("../controllers/standingsController");

const router = express.Router();

// Live standings data
router.get("/:season", getStandingsBySeason);

module.exports = router;
