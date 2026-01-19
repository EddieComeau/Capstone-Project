// server/routes/metrics.js

const express = require("express");
const router = express.Router();

const Game = require("../models/Game");
const Stat = require("../models/Stat");
const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");
const Team = require("../models/Team");

// GET /api/metrics/:entityType/:entityId?season=YYYY
// Supported entity types:
//   - team  : entityId should be a team abbreviation (e.g. "KC").
//             Returns per‑game metrics for the given season.
//   - player: entityId should be a numeric PlayerID.  Returns the metrics
//             stored in PlayerAdvancedMetrics for the given season.
router.get("/:entityType/:entityId", async (req, res) => {
  const { entityType, entityId } = req.params;
  const season = Number(req.query.season);
  if (!season) {
    return res.status(400).json({ ok: false, error: "Missing ?season= query parameter" });
  }
  try {
    if (entityType === "team") {
      const teamAbbr = String(entityId).toUpperCase();
      const team = await Team.findOne({ abbreviation: teamAbbr }).lean();
      if (!team) {
        return res.status(404).json({ ok: false, error: "Team not found" });
      }
      // Fetch all games for this team in the specified season
      const games = await Game.find({
        season,
        $or: [
          { "home_team.abbreviation": teamAbbr },
          { "visitor_team.abbreviation": teamAbbr },
        ],
      });
      const gameIds = games.map((g) => g.gameId);
      // Fetch stats rows for this team across those games
      const statsRows = await Stat.find({
        gameId: { $in: gameIds },
        teamId: team.ballDontLieTeamId,
      });
      let passYards = 0;
      let rushYards = 0;
      let points = 0;
      statsRows.forEach((row) => {
        const s = row.stats || {};
        // Ball Don’t Lie uses different field names depending on endpoint; coalesce accordingly
        passYards += s.passing_yards ?? s.pass_yards ?? 0;
        rushYards += s.rushing_yards ?? s.rush_yards ?? 0;
        points += s.points ?? s.points_scored ?? s.score ?? 0;
      });
      const gamesPlayed = games.length;
      const metrics = {
        passing_yards_per_game: gamesPlayed ? passYards / gamesPlayed : null,
        rushing_yards_per_game: gamesPlayed ? rushYards / gamesPlayed : null,
        points_per_game: gamesPlayed ? points / gamesPlayed : null,
      };
      return res.json({ ok: true, metrics });
    }
    if (entityType === "player") {
      const playerId = Number(entityId);
      if (Number.isNaN(playerId)) {
        return res.status(400).json({ ok: false, error: "Invalid player ID" });
      }
      const adv = await PlayerAdvancedMetrics.findOne({ PlayerID: playerId, season }).lean();
      return res.json({ ok: true, metrics: adv ? adv.metrics : null });
    }
    return res.status(400).json({ ok: false, error: `Unknown entity type: ${entityType}` });
  } catch (err) {
    console.error("metrics lookup error:", err);
    return res.status(500).json({ ok: false, error: "Failed to compute metrics" });
  }
});

module.exports = router;
