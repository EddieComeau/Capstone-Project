// server/server.js
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/nfl_cards";
mongoose.connect(MONGO_URI).then(() => {
  console.log("Connected to MongoDB:", mongoose.connection.name);
  app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
}).catch(err => {
  console.error("❌ Mongo connection failed:", err.message);
  process.exit(1);
});

// Optional route loader helper
function tryLoadRoute(relativePath) {
  try {
    const mod = require(relativePath);
    if (typeof mod === "function") return mod;
    console.warn(`⚠️ Skipping ${relativePath}: not an Express router`);
  } catch (e) {
    console.warn(`ℹ️ Optional route not loaded: ${relativePath} (${e.message})`);
  }
  return null;
}

// ✅ Actual working route files from your latest GitHub push:
const routes = {
  metrics: tryLoadRoute("./routes/metricsRoutes"),
  notifications: tryLoadRoute("./routes/notificationRoutes"),
  teams: tryLoadRoute("./routes/teams"),
  players: tryLoadRoute("./routes/players"),
  matchups: tryLoadRoute("./routes/matchups"),
  games: tryLoadRoute("./routes/games"),
  standings: tryLoadRoute("./routes/standings"),
  playbyplay: tryLoadRoute("./routes/playByPlay"),
  boxscores: tryLoadRoute("./routes/boxscores"),
  cards: tryLoadRoute("./routes/cards"),
  roster: tryLoadRoute("./routes/roster"),
  injuries: tryLoadRoute("./routes/injuries"),
  auth: tryLoadRoute("./routes/auth"),
  export: tryLoadRoute("./routes/exportRoutes"),
  syncstate: tryLoadRoute("./routes/syncStateRoutes")
};

// Health check routes
app.get("/api/health", (_, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get("/api/_mounted", (_, res) => {
  const mounts = app._router.stack.filter(r => r.route).map(r => r.route.path);
  res.json({ ok: true, mounts });
});

// Mount all valid routes
for (const [key, router] of Object.entries(routes)) {
  if (router) app.use(`/api/${key}`, router);
}
