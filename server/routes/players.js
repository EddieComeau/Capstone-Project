const express = require("express");
const router = express.Router();
const Player = require("../models/Player");

// Lookup player by ID
router.get("/:id", async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    if (!playerId) return res.status(400).json({ ok: false, error: "Invalid ID" });

    const player = await Player.findOne({ player_id: playerId }).lean();
    if (!player) return res.status(404).json({ ok: false, error: "Player not found" });

    res.json({
      ok: true,
      player: {
        full_name: `${player.first_name} ${player.last_name}`,
        team_abbr: player.team_abbr,
        position: player.position,
        player_id: player.player_id,
        jersey_number: player.jersey_number,
      },
    });
  } catch (e) {
    console.error("player lookup error:", e.message);
    res.status(500).json({ ok: false, error: "Failed to lookup player" });
  }
});

// Autocomplete player search
// GET /api/players/search?q=kel
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();
  if (!q || q.length < 2) {
    return res.json({ ok: true, results: [] });
  }

  try {
    const results = await Player.find({
      $or: [
        { full_name: { $regex: q, $options: "i" } },
        { first_name: { $regex: q, $options: "i" } },
        { last_name: { $regex: q, $options: "i" } },
      ],
    })
      .limit(15)
      .lean();

    const formatted = results.map((p) => ({
      player_id: p.player_id,
      full_name: `${p.first_name} ${p.last_name}`,
      team_abbr: p.team_abbr,
    }));

    res.json({ ok: true, results: formatted });
  } catch (e) {
    console.error("Player search error:", e.message);
    res.status(500).json({ ok: false, error: "Search failed" });
  }
});

module.exports = router;
