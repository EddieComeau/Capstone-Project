// @@ -5,51 +5,51 @@ const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");

// Existing routes
const teamRoutes = require("./routes/teams");
const matchupRoutes = require("./routes/matchups");
const playerRoutes = require("./routes/players");
const boxscoreRoutes = require("./routes/boxscores");
const syncRoutes = require("./routes/sync");
const standingsRoutes = require("./routes/standings");
const authRoutes = require("./routes/auth");
const cardRoutes = require("./routes/cards");

// NEW routes (Play By Play)
const gamesRoutes = require("./routes/games");
const playByPlayRoutes = require("./routes/playByPlay");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Sideline Studio backend is running" });
});

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

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/nflcards";