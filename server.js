// server.js
// Express API server (DB-backed GET routes) + optional static frontend serving.
// This version fixes a crash where an optional route module (e.g., exportRoutes)
// was truthy but NOT an Express router function, causing:
//   TypeError: argument handler must be a function
//
// Key goals:
// 1) Load the *root* .env reliably regardless of where `node` is run from.
// 2) Connect to MongoDB before listening.
// 3) Mount DB-backed routes for the frontend/admin.
// 4) Never crash on optional/mis-exported route modules—skip them with a warning.

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const { spawn } = require("child_process");

// ---------------------------
// Helpers
// ---------------------------
function normalizeRouter(mod) {
  if (!mod) return null;
  // Common export patterns:
  // module.exports = router
  // module.exports = { router }
  // module.exports = { default: router }
  const candidate = mod.router || mod.default || mod;
  return typeof candidate === "function" ? candidate : null;
}

function safeRequireRouter(relPath) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const mod = require(relPath);
    const router = normalizeRouter(mod);
    if (!router) {
      console.warn(
        `⚠️  Skipping ${relPath}: module did not export an Express router function (expected module.exports = router).`
      );
      return null;
    }
    return router;
  } catch (err) {
    // Optional route missing is OK; log only a short message.
    console.warn(`ℹ️  Optional route not loaded: ${relPath} (${err.message})`);
    return null;
  }
}

// ---------------------------
// Route modules (server/routes/*)
// ---------------------------
const metricsRoutes = safeRequireRouter("./server/routes/metricsRoutes");
const notificationRoutes = safeRequireRouter("./server/routes/notificationRoutes");
const teamsRoutes = safeRequireRouter("./server/routes/teams");
const playersRoutes = safeRequireRouter("./server/routes/players");
const matchupsRoutes = safeRequireRouter("./server/routes/matchups");
const gamesRoutes = safeRequireRouter("./server/routes/games");
const standingsRoutes = safeRequireRouter("./server/routes/standings");
const playByPlayRoutes = safeRequireRouter("./server/routes/playByPlay");
const boxscoresRoutes = safeRequireRouter("./server/routes/boxscores");
const cardsRoutes = safeRequireRouter("./server/routes/cards");
const rosterRoutes = safeRequireRouter("./server/routes/roster");
const injuriesRoutes = safeRequireRouter("./server/routes/injuries");
const authRoutes = safeRequireRouter("./server/routes/auth");

// Optional routes
const exportRoutes = safeRequireRouter("./server/routes/exportRoutes");
const syncStateRoutes = safeRequireRouter("./server/routes/syncStateRoutes");

// Services
let notificationService = null;
try {
  // eslint-disable-next-line global-require
  notificationService = require("./server/services/notificationService");
} catch (e) {
  console.warn(`ℹ️  notificationService not loaded (${e.message})`);
}

const app = express();

// ---------------------------
// Middleware
// ---------------------------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Basic health endpoint
app.get("/api/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ---------------------------
// Mount API routes (only if they loaded)
// ---------------------------
if (metricsRoutes) app.use("/api/metrics", metricsRoutes);
if (notificationRoutes) app.use("/api/notifications", notificationRoutes);
if (teamsRoutes) app.use("/api/teams", teamsRoutes);
if (playersRoutes) app.use("/api/players", playersRoutes);
if (matchupsRoutes) app.use("/api/matchups", matchupsRoutes);
if (gamesRoutes) app.use("/api/games", gamesRoutes);
if (standingsRoutes) app.use("/api/standings", standingsRoutes);
if (playByPlayRoutes) app.use("/api/playbyplay", playByPlayRoutes);
if (boxscoresRoutes) app.use("/api/boxscores", boxscoresRoutes);
if (cardsRoutes) app.use("/api/cards", cardsRoutes);
if (rosterRoutes) app.use("/api/roster", rosterRoutes);
if (injuriesRoutes) app.use("/api/injuries", injuriesRoutes);
if (authRoutes) app.use("/api/auth", authRoutes);

if (exportRoutes) app.use("/api/export", exportRoutes);
if (syncStateRoutes) app.use("/api/syncstate", syncStateRoutes);

// Optional debug endpoint to confirm mounts quickly
if (process.env.ENABLE_ROUTE_DEBUG === "true") {
  app.get("/api/_mounted", (req, res) => {
    res.json({
      ok: true,
      mounts: [
        "/api/health",
        metricsRoutes ? "/api/metrics" : null,
        notificationRoutes ? "/api/notifications" : null,
        teamsRoutes ? "/api/teams" : null,
        playersRoutes ? "/api/players" : null,
        matchupsRoutes ? "/api/matchups" : null,
        gamesRoutes ? "/api/games" : null,
        standingsRoutes ? "/api/standings" : null,
        playByPlayRoutes ? "/api/playbyplay" : null,
        boxscoresRoutes ? "/api/boxscores" : null,
        cardsRoutes ? "/api/cards" : null,
        rosterRoutes ? "/api/roster" : null,
        injuriesRoutes ? "/api/injuries" : null,
        authRoutes ? "/api/auth" : null,
        exportRoutes ? "/api/export" : null,
        syncStateRoutes ? "/api/syncstate" : null,
      ].filter(Boolean),
    });
  });
}

// ---------------------------
// Static frontend serving (optional)
// ---------------------------
const distDir = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // Catch-all for React Router, but only if dist exists
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ ok: false, error: err.message || "internal" });
});

// ---------------------------
// Environment configuration
// ---------------------------
const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not set. Ensure .env is in repo root and is being loaded.");
  process.exit(1);
}

// Mongo connect options (safer defaults for Atlas)
const mongoOptions = {
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
  serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 30000),
  socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 120000),
};

// Run a script in a fresh Node process (avoids require-cache issues)
async function runScript(relPath) {
  const abs = path.join(__dirname, relPath);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [abs], { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${relPath} exited with code ${code}`));
    });
  });
}

async function start() {
  mongoose.set("strictQuery", false);
  await mongoose.connect(MONGO_URI, mongoOptions);
  console.log("Connected to MongoDB:", mongoose.connection.db.databaseName);

  // Optional: run your stable sync scripts automatically on startup
  if (process.env.SYNC_ON_STARTUP === "true") {
    console.log("🔄 SYNC_ON_STARTUP=true -> running core sync scripts...");
    try {
      await runScript("server/syncAllButStats.js");
      await runScript("server/syncProblemData.js");
      console.log("✅ Startup sync complete");
    } catch (err) {
      console.error("❌ Startup sync failed:", err && err.message ? err.message : err);
    }
  }

  // Optional: cron sync (disabled by default; enable via ENABLE_CRON_SYNC=true)
  if (process.env.ENABLE_CRON_SYNC === "true") {
    const schedule = process.env.SYNC_SCHEDULE || "0 3 * * 0"; // 3 AM Sunday
    cron.schedule(schedule, async () => {
      console.log("🔄 Cron sync starting...");
      try {
        await runScript("server/syncAllButStats.js");
        await runScript("server/syncProblemData.js");
        console.log("✅ Cron sync complete");
      } catch (err) {
        console.error("❌ Cron sync failed:", err && err.message ? err.message : err);
      }
    });
    console.log(`🕒 Cron sync enabled: "${schedule}"`);
  }

  // Start notification service (change streams), if available
  if (notificationService && typeof notificationService.start === "function") {
    try {
      await notificationService.start();
      console.log("Notification service started");
    } catch (err) {
      console.warn("Failed to start notification service", err && err.message ? err.message : err);
    }
  }

  // Start Express server
  app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Server startup failed", err && err.stack ? err.stack : err);
  process.exit(1);
});

module.exports = app;