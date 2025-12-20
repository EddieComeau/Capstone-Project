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

// Initialize app
const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" })); // Use CORS with dynamic origin
app.use(express.json());
app.use(morgan("dev"));

// Database connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/nflcards";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1); // Exit process if DB connection fails
  });

// Routes
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
app.use("/api/games", gamesRoutes);
app.use("/api/playbyplay", playByPlayRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});