// server/services/cardAggregationService.js
const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");
const Player = require("../models/Player");

const {
  getOffensiveLineCardsFromDb,
} = require("./lineMetricsService");
const {
  getAdvancedOlineCardsFromDb,
} = require("./advancedLineService");
const {
  getSpecialTeamsCardsFromDb,
} = require("./specialTeamsService");
const {
  getDefensiveCardsFromDb,
} = require("./defensiveMetricsService");
const {
  computeAndSaveLineMetricsForTeam,
} = require("./lineMetricsService");
const {
  computeAndSaveAdvancedLineMetricsForTeam,
} = require("./advancedLineService");
const {
  computeAndSaveDefensiveMetricsForTeam,
} = require("./defensiveMetricsService");
const {
  computeAndSaveSpecialTeamsMetricsForTeam,
} = require("./specialTeamsService");
const { syncWeeklyForTeam } = require("./syncService");

// Skill positions we care about for skill cards
const SKILL_POSITIONS = ["QB", "RB", "FB", "WR", "TE"];

/**
 * Skill position cards from PlayerAdvancedMetrics.
 */
async function getSkillCardsForTeamFromDb(season, week, teamAbbrev) {
  const team = teamAbbrev.toUpperCase();

  const rows = await PlayerAdvancedMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  const filtered = rows.filter((row) =>
    SKILL_POSITIONS.includes((row.Position || "").toUpperCase())
  );

  return filtered.map((row) => ({
    cardType: "skill",
    playerId: row.player?._id,
    PlayerID: row.PlayerID,
    name: row.player?.FullName,
    team: row.Team,
    position: row.Position,
    season: row.season,
    week: row.week,
    photo: row.player?.PhotoUrl,
    metrics: row.metrics,
  }));
}

/**
 * High-level entry point used by /api/cards/team/:team.
 *  1. Ensures BALLDONTLIE data for this team/season/week is synced into Mongo
 *     (roster, season_stats, advanced_stats).
 *  2. Ensures line/defense/special-teams metrics are derived.
 *  3. Returns card-friendly payload for your React depth chart UI.
 */
async function getAllCardsForTeam(season, week, teamAbbrev) {
  if (!week && week !== 0) {
    throw new Error("Week is required when fetching cards");
  }

  const team = teamAbbrev.toUpperCase();

  // Step 1: Sync roster + stats + advanced stats into DB
  const syncResult = await syncWeeklyForTeam(season, week, team);

  // Step 2: derive per-unit metrics (OL, defense, ST)
  await computeAndSaveLineMetricsForTeam(season, week, team);
  await computeAndSaveAdvancedLineMetricsForTeam(season, week, team);
  await computeAndSaveDefensiveMetricsForTeam(season, week, team);
  await computeAndSaveSpecialTeamsMetricsForTeam(season, week, team);

  // Step 3: query DB and format card payload
  const [oline, olineAdvanced, specialTeams, defense, skills] =
    await Promise.all([
      getOffensiveLineCardsFromDb(season, week, team),
      getAdvancedOlineCardsFromDb(season, week, team),
      getSpecialTeamsCardsFromDb(season, week, team),
      getDefensiveCardsFromDb(season, week, team),
      getSkillCardsForTeamFromDb(season, week, team),
    ]);

  // simple roster context (handy on the frontend if you ever want it)
  const roster = await Player.find({ Team: team }).sort({
    Position: 1,
    DepthChartOrder: 1,
  });

  return {
    team,
    season,
    week,
    sync: syncResult,
    rosterCount: roster.length,
    oline,
    olineAdvanced,
    specialTeams,
    defense,
    skills,
  };
}

module.exports = {
  getAllCardsForTeam,
  getSkillCardsForTeamFromDb,
};
