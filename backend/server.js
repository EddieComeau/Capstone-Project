// server.js
require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");

// Route files
const teamRoutes = require("./routes/teams");
const matchupRoutes = require("./routes/matchups");
const playerRoutes = require("./routes/players");
const boxscoreRoutes = require("./routes/boxscores");
const syncRoutes = require("./routes/sync");
const standingsRoutes = require("./routes/standings");
const authRoutes = require("./routes/auth");
const cardRoutes = require("./routes/cards");

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Simple health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "NFL Cards backend is running" });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/matchups", matchupRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/boxscores", boxscoreRoutes);
app.use("/api/standings", standingsRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/sync", syncRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler (optional, in case next(err) is used somewhere)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ---------------------------------------------------------------------------
// DB & Server bootstrap
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/nflcards";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error connecting to MongoDB:", err);
    process.exit(1);
  });

module.exports = app;
