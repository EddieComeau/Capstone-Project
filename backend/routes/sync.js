// routes/sync.js
const express = require("express");
const router = express.Router();

const {
  syncWeeklyForTeam,
} = require("../services/syncService");

/**
 * POST /api/sync/weekly/team/:team
 * Body (optional): { season: 2024, week: 3 }
 * If not provided, season defaults to current year, week is required.
 */
router.post("/weekly/team/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.body.season) || new Date().getFullYear();
    const week = req.body.week ? Number(req.body.week) : null;

    if (!week) {
      return res.status(400).json({
        error: "Missing week in body. Example: { \"season\": 2024, \"week\": 3 }",
      });
    }

    const result = await syncWeeklyForTeam(season, week, team.toUpperCase());
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sync/weekly/many
 * Body: { season: 2024, week: 3, teams: ["BUF", "KC", "PHI"] }
 */
router.post("/weekly/many", async (req, res, next) => {
  try {
    const season = Number(req.body.season) || new Date().getFullYear();
    const week = req.body.week ? Number(req.body.week) : null;
    const teams = Array.isArray(req.body.teams) ? req.body.teams : [];

    if (!week) {
      return res.status(400).json({
        error: "Missing week in body. Example: { \"season\": 2024, \"week\": 3, \"teams\": [\"BUF\"] }",
      });
    }

    if (!teams.length) {
      return res.status(400).json({
        error: "Provide a non-empty teams array in the body.",
      });
    }

    const results = [];
    for (const t of teams) {
      const r = await syncWeeklyForTeam(season, week, t.toUpperCase());
      results.push(r);
    }

    return res.json({ season, week, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
