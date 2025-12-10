// services/cardAggregationService.js
const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");
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

// Skill positions we care about for skill cards
const SKILL_POSITIONS = ["QB", "RB", "WR", "TE", "FB"];

/**
 * Build skill cards for all relevant players on a team for a given
 * season/week, using PlayerAdvancedMetrics and the populated Player ref.
 */
async function getSkillCardsForTeamFromDb(season, week, team, options = {}) {
  const { limit } = options;

  const query = {
    Team: team,
    season,
    week,
    Position: { $in: SKILL_POSITIONS },
  };

  let mongoQuery = PlayerAdvancedMetrics.find(query).populate("player");

  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    mongoQuery = mongoQuery.limit(limit);
  }

  const docs = await mongoQuery;

  return docs.map((doc) => {
    const player = doc.player || {};
    return {
      cardType: "skill",
      playerId: player._id,
      PlayerID: doc.PlayerID,
      name: player.FullName,
      position: player.Position,
      team: player.Team,
      photo: player.PhotoUrl,
      season: doc.season,
      week: doc.week,
      metrics: doc.metrics || {},
    };
  });
}

/**
 * Aggregate all card types for a single team + week into one payload.
 */
async function getAllCardsForTeam(season, week, team) {
  const [
    oline,
    olineAdvanced,
    specialTeams,
    defense,
    skills,
  ] = await Promise.all([
    getOffensiveLineCardsFromDb(season, week, team),
    getAdvancedOlineCardsFromDb(season, week, team),
    getSpecialTeamsCardsFromDb(season, week, team),
    getDefensiveCardsFromDb(season, week, team),
    getSkillCardsForTeamFromDb(season, week, team),
  ]);

  return {
    team,
    season,
    week,
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
