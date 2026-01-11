// server/routes/index.js

const express = require("express");
const router = express.Router();

const playersRoutes = require("./players");
const teamsRoutes = require("./teams");

router.use("/players", playersRoutes);
router.use("/teams", teamsRoutes);

module.exports = router;
