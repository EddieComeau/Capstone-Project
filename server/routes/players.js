const express = require("express");
const router = express.Router();
// When copied into your `server/routes` directory, this path resolves correctly.
const Player = require("../models/Player");

// GET /api/players/:id
// Return a single player record.  Accepts either the legacy PlayerID or the BDL ID.
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // Accept numeric strings and convert to Number; fall back to string for ObjectId
    const numericId = Number(id);
    const query = {};
    if (!Number.isNaN(numericId)) {
      // Try to match either PlayerID or bdlId
      query.$or = [{ PlayerID: numericId }, { bdlId: numericId }];
    } else {
      // Final fallback: attempt by Mongo ObjectId (unlikely to be used for players)
      query._id = id;
    }

    const player = await Player.findOne(query).lean();
    if (!player) return res.status(404).json({ ok: false, error: "Player not found" });

    const response = {
      ok: true,
      player: {
        id: player.PlayerID || player.bdlId || player._id?.toString(),
        player_id: player.PlayerID || player.bdlId || null,
        PlayerID: player.PlayerID || player.bdlId || null,
        first_name: player.first_name,
        last_name: player.last_name,
        full_name: player.full_name,
        position: player.position,
        team_abbr: player.team?.abbreviation || null,
        team: player.team?.abbreviation || null,
        jersey_number: player.raw?.jersey_number || null,
      },
    };
    res.json(response);
  } catch (e) {
    console.error("player lookup error:", e.message);
    res.status(500).json({ ok: false, error: "Failed to lookup player" });
  }
});

// GET /api/players/search?q=...
// Autocomplete player search.  Returns both modern and legacy fields for compatibility with the frontend.
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json({ ok: true, results: [] });

  try {
    const regex = new RegExp(q, "i");
    const players = await Player.find({
      $or: [
        { full_name: regex },
        { first_name: regex },
        { last_name: regex },
      ],
    })
      .limit(15)
      .lean();

    const results = players.map((p) => {
      const id = p.PlayerID || p.bdlId || p._id?.toString();
      return {
        id,
        player_id: id, // legacy alias
        PlayerID: id,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: p.full_name,
        position: p.position,
        team_abbr: p.team?.abbreviation || null,
        team: p.team?.abbreviation || null,
        jersey_number: p.raw?.jersey_number || null,
      };
    });
    res.json({ ok: true, results });
  } catch (e) {
    console.error("Player search error:", e.message);
    res.status(500).json({ ok: false, error: "Search failed" });
  }
});

module.exports = router;
