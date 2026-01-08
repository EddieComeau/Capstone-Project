// server/routes/players.js
const express = require("express");
const router = express.Router();
const Player = require("../models/Player");

/**
 * GET /api/players
 * Optional query params:
 *   ?name=mahomes
 *   ?team=KC
 *   ?limit=25
 */
router.get("/", async (req, res) => {
  try {
    const { name, team, limit = 25 } = req.query;
    const query = {};

    if (name) {
      query.$or = [
        { firstName: new RegExp(name, "i") },
        { lastName: new RegExp(name, "i") }
      ];
    }

    if (team) {
      query["team.abbreviation"] = team.toUpperCase();
    }

    const players = await Player.find(query)
      .limit(Math.min(Number(limit), 100))
      .lean();

    res.json({ ok: true, count: players.length, players });
  } catch (err) {
    console.error("❌ /api/players error:", err.message);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

/**
 * GET /api/players/:ballDontLieId
 * Example:
 *   /api/players/18
 */
router.get("/:ballDontLieId", async (req, res) => {
  try {
    const ballDontLieId = Number(req.params.ballDontLieId);
    if (!Number.isInteger(ballDontLieId)) {
      return res.status(400).json({ error: "Invalid player id" });
    }

    const player = await Player.findOne({ ballDontLieId }).lean();

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({ ok: true, player });
  } catch (err) {
    console.error("❌ /api/players/:id error:", err.message);
    res.status(500).json({ error: "Failed to fetch player" });
  }
});

module.exports = router;
