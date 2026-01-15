// server/routes/index.js

const express = require("express");
const router = express.Router();

// Import individual route modules
const playersRoutes = require("./players");
const teamsRoutes = require("./teams");
const cardsRoutes = require("./cards");
const metricsRoutes = require("./metrics");
const standingsRoutes = require("./standings");

// Mount the routes under their respective paths.  Everything is namespaced
// under /api in server/server.js, so these become /api/players, /api/teams, etc.
router.use("/players", playersRoutes);
router.use("/teams", teamsRoutes);
router.use("/cards", cardsRoutes);
router.use("/metrics", metricsRoutes);
router.use("/standings", standingsRoutes);

module.exports = router;
