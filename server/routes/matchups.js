// server/routes/matchups.js
const express = require("express");
const router = express.Router();

const { getSchedule } = require("../services/sportsdataService");
const Team = require("../models/Team");
const Matchup = require("../models/Matchup");

/**
 * Upsert/ensure a Team document based on BALLDONTLIE fields.
 * Returns the MongoDB _id of the Team.
 */
async function upsertTeam(bdlTeam) {
  if (!bdlTeam) return null;

  const update = {
    ballDontLieTeamId: bdlTeam.id,
    name: bdlTeam.name,
    abbreviation: bdlTeam.abbreviation,
    conference: bdlTeam.conference,
    division: bdlTeam.division,
    city: bdlTeam.location,
    fullName: bdlTeam.full_name,
  };

  const teamDoc = await Team.findOneAndUpdate(
    { ballDontLieTeamId: bdlTeam.id },
    update,
    { new: true, upsert: true }
  );

  return teamDoc._id;
}

/**
 * POST /api/matchups/sync/:season
 * Pulls entire season schedule from BALLDONTLIE and stores as Matchup docs.
 */
router.post("/sync/:season", async (req, res) => {
  try {
    const season = parseInt(req.params.season, 10);
    const postseason = req.query.postseason === "true";

    const games = await getSchedule(season, { postseason });

    let upserted = 0;

    for (const g of games) {
      const homeTeamId = await upsertTeam(g.home_team);
      const awayTeamId = await upsertTeam(g.away_team);

      const update = {
        ballDontLieGameId: g.id,
        season,
        week: g.week,
        postseason: g.postseason,
        homeTeam: homeTeamId,
        awayTeam: awayTeamId,
        homeScore: g.home_score,
        awayScore: g.away_score,
        status: g.status,
        kickoffTime: g.start_time ? new Date(g.start_time) : null,
        venue: g.venue,
        spread: g.spread ?? null,
        overUnder: g.over_under ?? null,
      };

      await Matchup.findOneAndUpdate(
        { ballDontLieGameId: g.id },
        update,
        { new: true, upsert: true }
      );
      upserted++;
    }

    res.json({
      message: "Season schedule synced",
      season,
      postseason,
      games: games.length,
      upserted,
    });
  } catch (err) {
    console.error("Error syncing matchups:", err.message);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message,
      details: err.response,
    });
  }
});

/**
 * GET /api/matchups
 * Query by season, week, team abbreviation (optional).
 */
router.get("/", async (req, res) => {
  try {
    const { season, week, team } = req.query;
    const filter = {};
    if (season) filter.season = parseInt(season, 10);
    if (week) filter.week = parseInt(week, 10);

    let matchupsQuery = Matchup.find(filter)
      .populate("homeTeam")
      .populate("awayTeam")
      .sort({ week: 1, kickoffTime: 1 });

    if (team) {
      const teamAbbr = team.toUpperCase();
      // Filter via Mongo after populating
      const matchups = await matchupsQuery.exec();
      const filtered = matchups.filter(
        (m) =>
          m.homeTeam?.abbreviation === teamAbbr ||
          m.awayTeam?.abbreviation === teamAbbr
      );
      return res.json({
        count: filtered.length,
        data: filtered,
      });
    }

    const matchups = await matchupsQuery.exec();
    res.json({
      count: matchups.length,
      data: matchups,
    });
  } catch (err) {
    console.error("Error fetching matchups:", err.message);
    res.status(500).json({ error: "Failed to fetch matchups" });
  }
});

/**
 * GET /api/matchups/:id  (Mongo ID)
 */
router.get("/:id", async (req, res) => {
  try {
    const matchup = await Matchup.findById(req.params.id)
      .populate("homeTeam")
      .populate("awayTeam");

    if (!matchup) {
      return res.status(404).json({ error: "Matchup not found" });
    }
    res.json(matchup);
  } catch (err) {
    console.error("Error fetching matchup:", err.message);
    res.status(500).json({ error: "Failed to fetch matchup" });
  }
});

module.exports = router;
