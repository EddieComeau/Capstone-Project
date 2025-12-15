// app.js
require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

// Existing routes
const teamRoutes = require("./routes/teams");
const matchupRoutes = require("./routes/matchups");
const playerRoutes = require("./routes/players");
const boxscoreRoutes = require("./routes/boxscores");
const syncRoutes = require("./routes/sync");
const standingsRoutes = require("./routes/standings");
const authRoutes = require("./routes/auth");
const cardRoutes = require("./routes/cards");

// NEW
const gamesRoutes = require("./routes/games");
const playByPlayRoutes = require("./routes/playByPlay");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/matchups", matchupRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/boxscores", boxscoreRoutes);
app.use("/api/standings", standingsRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/sync", syncRoutes);

// NEW
app.use("/api/games", gamesRoutes);
app.use("/api/playbyplay", playByPlayRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

module.exports = app;
