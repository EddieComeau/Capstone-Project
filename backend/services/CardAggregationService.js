// services/cardAggregationService.js
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
  
  /**
   * Aggregate all card types for a single team + week into one payload.
   */
  async function getAllCardsForTeam(season, week, team) {
    const [oline, olineAdvanced, specialTeams, defense] = await Promise.all([
      getOffensiveLineCardsFromDb(season, week, team),
      getAdvancedOlineCardsFromDb(season, week, team),
      getSpecialTeamsCardsFromDb(season, week, team),
      getDefensiveCardsFromDb(season, week, team),
    ]);
  
    return {
      team,
      season,
      week,
      oline,
      olineAdvanced,
      specialTeams,
      defense,
    };
  }
  
  module.exports = {
    getAllCardsForTeam,
  };
  