const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables

// Import routes
const teamRoutes = require("./routes/teams");
const matchupRoutes = require("./routes/matchups");
const playerRoutes = require("./routes/players");
const boxscoreRoutes = require("./routes/boxscores");
const syncRoutes = require("./routes/sync");
const standingsRoutes = require("./routes/standings");
const authRoutes = require("./routes/auth");
const cardRoutes = require("./routes/cards");
const gamesRoutes = require("./routes/games");
const playByPlayRoutes = require("./routes/playbyplay");

// Import sync function
const { syncPlayers } = require("./controllers/playersController");

// Initialize app
const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" })); // Use CORS with dynamic origin
app.use(express.json());
app.use(morgan("dev")); // Log HTTP requests

// Database connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/nfl_cards";

const connectWithRetry = () => {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("✅ Connected to MongoDB");

      if (process.env.SYNC_ON_STARTUP === "true") {
        console.log("⏳ Syncing players from Ball Don't Lie...");
        syncPlayers()
          .then(() => console.log("✅ Players synced successfully on startup"))
          .catch((err) => {
            console.error("❌ Failed to sync players on startup:", err.message);
            console.error("Full error:", err); // Log the full error object for debugging
          });
      }
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed. Retrying in 5 seconds...", err.message);
      setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
    });
};

connectWithRetry();

// Routes
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Sideline Studio backend is running" });
});

app.get("/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    database: dbStatus,
    message: "Sideline Studio backend is healthy",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/matchups", matchupRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/boxscores", boxscoreRoutes);
app.use("/api/standings", standingsRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/playbyplay", playByPlayRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// Start server
const PORT = process.env.PORT || 4000; // Default to port 4000
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});