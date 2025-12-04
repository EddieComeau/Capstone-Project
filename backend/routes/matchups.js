// routes/matchups.js
const express = require("express");
const router = express.Router();

const { getTeams, getSchedule } = require("../services/sportsdataService");
const Team = require("../models/Team");
const Matchup = require("../models/Matchup");

/**
 * Helper: upsert teams from SportsData.io payload
 * Adjust property names according to SportsData.io response.
 */
async function upsertTeams(teams) {
  for (const t of teams) {
    await Team.findOneAndUpdate(
      { sportsdataTeamId: t.TeamID },
      {
        sportsdataTeamId: t.TeamID,
        name: t.FullName || t.Name,
        abbreviation: t.Key, // e.g. BUF, KC
        conference: t.Conference,
        division: t.Division,
        logoUrl: t.WikipediaLogoUrl || t.TeamLogoUrl || "",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }
}

/**
 * Helper: upsert matchups (games) from SportsData.io schedule payload
 * @param {Array} schedule - Schedule array from SportsData.io
 * @param {number} season - Season year, e.g. 2023
 */
async function upsertMatchups(schedule, season) {
  for (const game of schedule) {
    // skip incomplete games
    if (!game.HomeTeam || !game.AwayTeam) continue;

    const homeTeam = await Team.findOne({ abbreviation: game.HomeTeam });
    const awayTeam = await Team.findOne({ abbreviation: game.AwayTeam });

    if (!homeTeam || !awayTeam) continue;

    await Matchup.findOneAndUpdate(
      { sportsdataGameId: game.GameID },
      {
        sportsdataGameId: game.GameID,
        season,
        week: game.Week,
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
        kickoffTime: game.Date ? new Date(game.Date) : null,
        venue: game.StadiumDetails?.Name || game.Stadium || "",
        // These may only be present with certain subscriptions:
        spread: game.PointSpread ?? null,
        overUnder: game.OverUnder ?? null,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }
}

/**
 * GET /api/matchups/sync/:season
 *
 * Example:
 *   GET /api/matchups/sync/2023
 *
 * Behavior:
 *   - Pull teams and schedule for the given season from SportsData.io
 *   - Upsert teams into Team collection
 *   - Upsert games into Matchup collection
 *
 * Use this occasionally to sync your DB
 * (e.g. once before the season or once per week).
 */
router.get("/sync/:season", async (req, res, next) => {
  try {
    const season = parseInt(req.params.season, 10);

    if (Number.isNaN(season)) {
      return res.status(400).json({ error: "Invalid season (expected a year, e.g. 2023)" });
    }

    // getTeams typically does not need season, but we can call it anyway
    const [teams, schedule] = await Promise.all([
      getTeams(),           // All teams
      getSchedule(season),  // Schedule for the season
    ]);

    await upsertTeams(teams);
    await upsertMatchups(schedule, season);

    const teamsCount = await Team.countDocuments();
    const gamesCount = await Matchup.countDocuments({ season });

    res.json({
      message: "Matchups sync completed",
      season,
      teamsCount,
      gamesCount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/matchups
 *
 * Query params:
 *   season (required) - year, e.g. 2023
 *   week   (optional) - number, e.g. 1
 *   team   (optional) - team abbrev, e.g. BUF
 *
 * Examples:
 *   /api/matchups?season=2023
 *   /api/matchups?season=2023&week=1
 *   /api/matchups?season=2023&team=BUF
 *   /api/matchups?season=2023&week=5&team=KC
 */
router.get("/", async (req, res, next) => {
  try {
    const { season, week, team } = req.query;

    if (!season) {
      return res.status(400).json({ error: "season query param is required (e.g. ?season=2023)" });
    }

    const query = {
      season: Number(season),
    };

    if (!Number.isNaN(Number(week)) && week !== undefined) {
      query.week = Number(week);
    }

    // If team query is given, filter by either home or away team
    if (team) {
      const teamDoc = await Team.findOne({
        abbreviation: team.toUpperCase(),
      });

      if (!teamDoc) {
        // No such team in DB → no matchups
        return res.json([]);
      }

      query.$or = [
        { homeTeamId: teamDoc._id },
        { awayTeamId: teamDoc._id },
      ];
    }

    const matchups = await Matchup.find(query)
      .populate("homeTeamId", "name abbreviation logoUrl")
      .populate("awayTeamId", "name abbreviation logoUrl")
      .sort({ week: 1, kickoffTime: 1 });

    const result = matchups.map((m) => ({
      id: m._id,
      season: m.season,
      week: m.week,
      sportsdataGameId: m.sportsdataGameId,
      kickoffTime: m.kickoffTime,
      venue: m.venue,
      spread: m.spread,
      overUnder: m.overUnder,
      homeTeam: m.homeTeamId,
      awayTeam: m.awayTeamId,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/matchups/:id
 * Return a single matchup with populated team info.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const matchup = await Matchup.findById(req.params.id)
      .populate("homeTeamId")
      .populate("awayTeamId");

    if (!matchup) {
      return res.status(404).json({ error: "Matchup not found" });
    }

    res.json({
      id: matchup._id,
      season: matchup.season,
      week: matchup.week,
      sportsdataGameId: matchup.sportsdataGameId,
      kickoffTime: matchup.kickoffTime,
      venue: matchup.venue,
      spread: matchup.spread,
      overUnder: matchup.overUnder,
      homeTeam: matchup.homeTeamId,
      awayTeam: matchup.awayTeamId,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
