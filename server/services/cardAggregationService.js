const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");
const Player = require("../models/Player");
const { getOffensiveLineCardsFromDb } = require("./lineMetricsService");
const { getAdvancedOlineCardsFromDb } = require("./advancedLineService");
const { getSpecialTeamsCardsFromDb } = require("./specialTeamsService");
const { getDefensiveCardsFromDb } = require("./defensiveMetricsService");
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

// List of positions considered skill positions
const SKILL_POSITIONS = ["QB", "RB", "FB", "WR", "TE"];

/**
 * Retrieve skill position cards for a team from PlayerAdvancedMetrics.
 */
async function getSkillCardsForTeamFromDb(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();
  const rows = await PlayerAdvancedMetrics.find({ Team: team, season, week }).populate("player");
  const filtered = rows.filter((row) => SKILL_POSITIONS.includes((row.Position || "").toUpperCase()));
  return filtered.map((row) => {
    const p = row.player;
    const name =
      p?.full_name || `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
    const photo = p?.raw?.photoUrl || p?.raw?.headshot_url || null;
    return {
      cardType: "skill",
      playerId: p?._id,
      PlayerID: row.PlayerID,
      name,
      team: row.Team,
      position: row.Position,
      season: row.season,
      week: row.week,
      photo,
      metrics: row.metrics,
    };
  });
}

/**
 * Entry point: compute metrics for a team/week and return all card types.
 */
async function getAllCardsForTeam(season, week, teamAbbrev) {
  if (!week && week !== 0) throw new Error("Week is required when fetching cards");
  const team = String(teamAbbrev || "").toUpperCase();
  // Step 1: sync roster + stats + advanced stats for this team/week
  const syncResult = await syncWeeklyForTeam(season, week, team);
  // Step 2: compute metrics for units
  await computeAndSaveLineMetricsForTeam(season, week, team);
  await computeAndSaveAdvancedLineMetricsForTeam(season, week, team);
  await computeAndSaveDefensiveMetricsForTeam(season, week, team);
  await computeAndSaveSpecialTeamsMetricsForTeam(season, week, team);
  // Step 3: fetch cards
  const [oline, olineAdvanced, specialTeams, defense, skills] = await Promise.all([
    getOffensiveLineCardsFromDb(season, week, team),
    getAdvancedOlineCardsFromDb(season, week, team),
    getSpecialTeamsCardsFromDb(season, week, team),
    getDefensiveCardsFromDb(season, week, team),
    getSkillCardsForTeamFromDb(season, week, team),
  ]);
  // Build simple roster list (no depth chart) for convenience
  const roster = await Player.find({ "team.abbreviation": team });
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
