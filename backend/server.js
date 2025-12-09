// server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    // optional: add options if needed
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/players", require("./routes/players"));
app.use("/api/teams", require("./routes/teams"));         // existing
app.use("/api/matchups", require("./routes/matchups"));   // existing
app.use("/api/boxscores", require("./routes/boxscores")); // existing

app.use("/api/cards", require("./routes/cards")); // NEW card routes
app.use("/api/sync", require("./routes/sync"));   // NEW sync routes

// 404 handler (optional)
app.use((req, res, next) => {
  return res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  const status = err.status || 500;
  return res.status(status).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
