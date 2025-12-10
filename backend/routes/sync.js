// routes/sync.js
const express = require("express");
const router = express.Router();

const {
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
} = require("../services/syncService");

/**
 * Small helper: if season not provided, default to current year.
 * Week is required at the route level; this just helps when omitted.
 */
function resolveSeasonAndWeek(body) {
  const now = new Date();
  const defaultSeason = now.getFullYear();

  const season =
    body && body.season !== undefined
      ? Number(body.season)
      : defaultSeason;

  const week =
    body && body.week !== undefined && body.week !== null
      ? Number(body.week)
      : undefined;

  return { season, week };
}

/**
 * POST /api/sync/weekly/team/:team
 *
 * Sync a SINGLE team for a given season/week.
 *
 * Body (optional):
 * {
 *   "season": 2025,
 *   "week": 3
 * }
 *
 * - If season is not provided, defaults to current year.
 * - week must be provided (either in body or your own calling logic).
 */
router.post("/weekly/team/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const { season: bodySeason, week: bodyWeek } = req.body || {};

    const { season, week } = resolveSeasonAndWeek({
      season: bodySeason,
      week: bodyWeek,
    });

    if (!week && week !== 0) {
      return res.status(400).json({ error: "week is required" });
    }

    const result = await syncWeeklyForTeam(season, week, team.toUpperCase());

    return res.json({
      season,
      week,
      team: team.toUpperCase(),
      result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sync/weekly
 *
 * Sync one or more teams for a given season/week.
 *
 * Body:
 * {
 *   "season": 2025,      // optional, defaults to current year
 *   "week": 3,           // required
 *   "teams": ["BUF","KC"], // optional; if omitted, all teams from DB
 *   "concurrency": 4,    // optional; defaults to 4
 *   "maxRetries": 2      // optional; defaults to 2
 * }
 *
 * This route now uses syncAllTeamsForWeek under the hood so it
 * gets concurrency limiting, retries, and per-team progress.
 */
router.post("/weekly", async (req, res, next) => {
  try {
    const {
      season: bodySeason,
      week: bodyWeek,
      teams,
      concurrency,
      maxRetries,
    } = req.body || {};

    const { season, week } = resolveSeasonAndWeek({
      season: bodySeason,
      week: bodyWeek,
    });

    if (!week && week !== 0) {
      return res.status(400).json({ error: "week is required" });
    }

    const result = await syncAllTeamsForWeek({
      season,
      week,
      teams,        // can be undefined => all teams in DB
      concurrency,
      maxRetries,
    });

    // Same shape as /api/sync/week route, but under /weekly.
    return res.json({
      message: "Weekly sync completed (multi-team)",
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sync/week
 *
 * "Admin" style endpoint to sync ALL 32 teams (or a subset) for a week,
 * using concurrency limiting + retry/backoff + detailed per-team status.
 *
 * Body:
 * {
 *   "season": 2025,
 *   "week": 3,
 *   "teams": ["BUF", "KC"], // optional; if omitted, all teams in DB
 *   "concurrency": 4,
 *   "maxRetries": 2
 * }
 */
router.post("/week", async (req, res, next) => {
  try {
    const {
      season: bodySeason,
      week: bodyWeek,
      teams,
      concurrency,
      maxRetries,
    } = req.body || {};

    const { season, week } = resolveSeasonAndWeek({
      season: bodySeason,
      week: bodyWeek,
    });

    if (!week && week !== 0) {
      return res.status(400).json({
        error: "week is required",
      });
    }

    const result = await syncAllTeamsForWeek({
      season,
      week,
      teams,        // optional: undefined => all teams
      concurrency,
      maxRetries,
    });

    return res.status(200).json({
      message: "Week sync completed (all-teams endpoint)",
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
