// server/server.js
require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./db");

// Route files
const teamRoutes = require("./routes/teams");
const matchupRoutes = require("./routes/matchups");
const playerRoutes = require("./routes/players");
const boxscoreRoutes = require("./routes/boxscores");
const syncRoutes = require("./routes/sync");
const standingsRoutes = require("./routes/standings");
const authRoutes = require("./routes/auth");
const cardsRoutes = require("./routes/cards");

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const MONGO_URI = process.env.MONGO_URI;

// Create app
const app = express();

// Middleware
app.use(
  cors({
    origin: CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

// Simple healthcheck
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "NFL Cards 4.0 backend running" });
});

// Mount routes under /api
app.use("/api/teams", teamRoutes);
app.use("/api/matchups", matchupRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/boxscores", boxscoreRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/standings", standingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cards", cardsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Server error",
    details: err.response || null,
  });
});

// Connect & start
(async () => {
  try {
    if (!MONGO_URI) {
      console.warn("[MongoDB] MONGO_URI missing; server will still start, but DB calls will fail.");
    } else {
      await connectDB();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
})();

module.exports = app;
