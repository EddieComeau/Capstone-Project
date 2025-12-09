// routes/matchups.js
const express = require("express");
const router = express.Router();

const { getSchedule } = require("../services/sportsdataService");
const Team = require("../models/Team");
const Matchup = require("../models/Matchup");

/**
 * Upsert/ensure a Team document based on SportsData.io fields.
 * Returns the MongoDB _id of the Team.
 */
async function upsertTeam(sportsdataTeamId, abbrev) {
  if (!sportsdataTeamId) return null;

  const team = await Team.findOneAndUpdate(
    { sportsdataTeamId },
    {
      sportsdataTeamId,
      abbreviation: abbrev,
      name: abbrev,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return team._id;
}

/**
 * POST /api/matchups/sync
 * Body: { "season": 2024, "seasonType": "REG" }
 *
 * Fetches a full season schedule from SportsData.io and upserts into MongoDB.
 */
router.post("/sync", async (req, res) => {
  try {
    const { season, seasonType } = req.body;

    if (!season) {
      return res
        .status(400)
        .json({ error: 'season is required, e.g. { "season": 2024, "seasonType": "REG" }' });
    }

    const seasonNumber = Number(season);
    const seasonTypeStr = seasonType || "REG";
    const seasonKey = `${seasonNumber}${seasonTypeStr}`; // e.g. "2024REG"

    // 1. Fetch schedule from SportsData.io
    const schedule = await getSchedule(seasonKey);
    console.log(`Fetched ${schedule.length} games from SportsData.io for ${seasonKey}`);

    let upsertedCount = 0;
    let skippedNoId = 0;

    // 2. Upsert each game
    for (const game of schedule) {
      // Pick a reliable unique ID for each game
      const uniqueId =
        game.GameID ??
        game.GlobalGameID ??
        game.GameKey;

      if (uniqueId == null) {
        skippedNoId++;
        console.warn("Skipping game with no usable ID:", {
          GameID: game.GameID,
          GlobalGameID: game.GlobalGameID,
          GameKey: game.GameKey,
        });
        continue;
      }

      const seasonFromGame = Number(game.Season) || seasonNumber;

      // Upsert home / away teams
      const homeTeamId = await upsertTeam(game.HomeTeamID, game.HomeTeam);
      const awayTeamId = await upsertTeam(game.AwayTeamID, game.AwayTeam);

      await Matchup.findOneAndUpdate(
        { sportsdataGameId: uniqueId },
        {
          sportsdataGameId: uniqueId,
          season: seasonFromGame,
          seasonType: game.SeasonType || seasonTypeStr,
          week: game.Week,
          homeTeam: homeTeamId,
          awayTeam: awayTeamId,
          kickoffTime: game.Date ? new Date(game.Date) : null,
          homeScore: game.HomeScore ?? null,
          awayScore: game.AwayScore ?? null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      upsertedCount++;
    }

    // 3. Count documents in DB
    const matchupsInDbForSeason = await Matchup.countDocuments({
      season: seasonNumber,
    });

    const totalMatchupsInDb = await Matchup.countDocuments({});

    res.json({
      message: "Matchups synced successfully",
      season: seasonNumber,
      seasonType: seasonTypeStr,
      gamesFetched: schedule.length,
      gamesUpserted: upsertedCount,
      skippedNoId,
      matchupsInDbForSeason,
      totalMatchupsInDb,
    });
  } catch (err) {
    console.error("Sync error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to sync matchups", details: err.message });
  }
});

/**
 * GET /api/matchups
 * Optional query params:
 *   ?season=2024
 *   ?season=2024&week=1
 */
router.get("/", async (req, res) => {
  try {
    const { season, week } = req.query;
    const filter = {};

    if (season) filter.season = Number(season);
    if (week) filter.week = Number(week);

    const matchups = await Matchup.find(filter)
      .populate("homeTeam")
      .populate("awayTeam")
      .sort({ week: 1, kickoffTime: 1 });

    res.json({
      count: matchups.length,
      filterUsed: filter,
      data: matchups,
    });
  } catch (err) {
    console.error("Error fetching matchups:", err.message);
    res.status(500).json({ error: "Failed to fetch matchups" });
  }
});

module.exports = router;
