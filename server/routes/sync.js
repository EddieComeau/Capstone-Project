// server/routes/sync.js
const express = require("express");
const router = express.Router();

const {
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
} = require("../services/syncService");

/**
 * Small helper: if season not provided, default to current year.
 */
function resolveSeasonAndWeek(body, params) {
  const now = new Date();
  const defaultSeason = now.getFullYear();

  const season =
    parseInt(params.season || body.season, 10) || defaultSeason;
  const week = parseInt(params.week || body.week, 10);

  if (!week && week !== 0) {
    const err = new Error("Week is required");
    err.status = 400;
    throw err;
  }
  return { season, week };
}

/**
 * POST /api/sync/team/:team
 * Body: { season?: number, week: number }
 */
router.post("/team/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const { season, week } = resolveSeasonAndWeek(req.body, req.params);

    const result = await syncWeeklyForTeam(season, week, team);

    res.status(200).json({
      message: "Team/week sync completed",
      team: team.toUpperCase(),
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sync/week
 * Body: { season?: number, week: number, concurrency?: number }
 */
router.post("/week", async (req, res, next) => {
  try {
    const { season, week } = resolveSeasonAndWeek(req.body, {});
    const concurrency = parseInt(req.body.concurrency, 10) || 2;

    const result = await syncAllTeamsForWeek(season, week, {
      concurrency,
    });

    res.status(200).json({
      message: "Week sync completed (all teams)",
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
