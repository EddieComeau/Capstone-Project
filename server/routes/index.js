// server/routes/index.js

const express = require("express");
const router = express.Router();

// Import individual route modules
const playersRoutes = require("./players");
const teamsRoutes = require("./teams");
const cardsRoutes = require("./cards");
const metricsRoutes = require("./metrics");
const standingsRoutes = require("./standings");
const gamesRoutes = require("./games");
const playByPlayRoutes = require("./playByPlay");
const rosterRoutes = require("./roster");
const injuriesRoutes = require("./injuries");
const statsRoutes = require("./stats");
const bettingRoutes = require("./betting");
const adminRoutes = require("./adminRoutes");
const notificationRoutes = require("./notificationRoutes");
const syncRoutes = require("./syncRoutes");
const syncWeekRoutes = require("./sync");
const syncStateRoutes = require("./syncStateRoutes");

// Mount the routes under their respective paths.  Everything is namespaced
// under /api in server/server.js, so these become /api/players, /api/teams, etc.
router.use("/players", playersRoutes);
router.use("/teams", teamsRoutes);
router.use("/cards", cardsRoutes);
router.use("/metrics", metricsRoutes);
router.use("/standings", standingsRoutes);
router.use("/games", gamesRoutes);
router.use("/playbyplay", playByPlayRoutes);
router.use("/roster", rosterRoutes);
router.use("/injuries", injuriesRoutes);
router.use("/stats", statsRoutes);
router.use("/betting", bettingRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/sync", syncRoutes);
router.use("/sync", syncWeekRoutes);
router.use("/syncstate", syncStateRoutes);

module.exports = router;
