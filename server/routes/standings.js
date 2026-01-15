// server/routes/standings.js

const express = require("express");
const router = express.Router();

const Game = require("../models/Game");
const Team = require("../models/Team");

// GET /api/standings?season=YYYY
// Computes local standings based on games stored in the database.  If
// ?season= is omitted, defaults to the current year.  Results are grouped
// by division with teams sorted by win percentage.
router.get("/", async (req, res) => {
  const season = Number(req.query.season) || new Date().getFullYear();
  try {
    const games = await Game.find({ season });
    const records = {};
    // Aggregate wins/losses/ties and points for/against
    games.forEach((g) => {
      const home = g.home_team?.abbreviation;
      const away = g.visitor_team?.abbreviation;
      const homeScore = g.home_score ?? 0;
      const awayScore = g.visitor_score ?? 0;
      if (!home || !away) return;
      if (!records[home]) records[home] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
      if (!records[away]) records[away] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
      records[home].pointsFor += homeScore;
      records[home].pointsAgainst += awayScore;
      records[away].pointsFor += awayScore;
      records[away].pointsAgainst += homeScore;
      if (homeScore > awayScore) {
        records[home].wins++;
        records[away].losses++;
      } else if (awayScore > homeScore) {
        records[away].wins++;
        records[home].losses++;
      } else {
        // tie
        records[home].ties++;
        records[away].ties++;
      }
    });
    // Fetch team metadata to group by division
    const teams = await Team.find({});
    const divisions = {};
    teams.forEach((t) => {
      const abbr = t.abbreviation;
      const rec = records[abbr] || { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
      const gp = rec.wins + rec.losses + rec.ties;
      const winPct = gp ? (rec.wins + 0.5 * rec.ties) / gp : 0;
      const entry = {
        team: abbr,
        wins: rec.wins,
        losses: rec.losses,
        ties: rec.ties,
        winPct,
        pointsDiff: rec.pointsFor - rec.pointsAgainst,
      };
      const division = t.division || "Unknown";
      if (!divisions[division]) divisions[division] = [];
      divisions[division].push(entry);
    });
    // Sort each division by win percentage then point differential
    Object.keys(divisions).forEach((div) => {
      divisions[div].sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.pointsDiff - a.pointsDiff;
      });
    });
    return res.json({ ok: true, season, standings: divisions });
  } catch (err) {
    console.error("standings error:", err);
    return res.status(500).json({ ok: false, error: "Failed to compute standings" });
  }
});

module.exports = router;
