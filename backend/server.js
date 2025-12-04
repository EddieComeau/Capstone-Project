// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// const connectDB = require("./config/db");

// existing routes
const teamsRoutes = require("./routes/teams");
const playersRoutes = require("./routes/players");
const standingsRoutes = require("./routes/standings");
const matchupsRoutes = require("./routes/matchups");

// 🔹 NEW: auth routes
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// connectDB();

// Health check
app.get("/", (req, res) => {
  res.json({ message: "NFL backend with SportsData.io is running" });
});

// Routes
app.use("/api/teams", teamsRoutes);
app.use("/api/players", playersRoutes);
app.use("/api/standings", standingsRoutes);
// app.use("/api/matchups", matchupsRoutes);

// 🔹 NEW: auth
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
