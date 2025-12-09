// services/sportsdataService.js
const axios = require("axios");

const BASE_URL = process.env.SPORTSDATA_BASE_URL; // ex: https://api.sportsdata.io/v3/nfl
const API_KEY = process.env.SPORTSDATA_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.warn(
    "[sportsdataService] SPORTSDATA_BASE_URL or SPORTSDATA_API_KEY is not set in .env"
  );
}

function buildUrl(path) {
  const sep = path.includes("?") ? "&" : "?";
  return `${BASE_URL}${path}${sep}key=${API_KEY}`;
}

/**
 * Low-level GET helper.
 */
async function get(path) {
  const url = buildUrl(path);
  const { data } = await axios.get(url);
  return data;
}

/* ----------------------------------------------------
 * CORE TEAM / PLAYER STATS (STANDARD NFL v3 STATS)
 * --------------------------------------------------*/

/**
 * Team game stats for a specific week.
 * Typically: /stats/json/TeamGameStatsByWeek/{season}/{week}/{team}
 */
async function getTeamGameStats(season, week, team) {
  return get(`/stats/json/TeamGameStatsByWeek/${season}/${week}/${team}`);
}

/**
 * Player game stats for a team and week.
 * Typically: /stats/json/PlayerGameStatsByTeam/{season}/{week}/{team}
 */
async function getPlayerGameStatsByTeam(season, week, team) {
  return get(`/stats/json/PlayerGameStatsByTeam/${season}/${week}/${team}`);
}

/**
 * Player season stats for a team.
 * Typically: /stats/json/PlayerSeasonStatsByTeam/{season}/{team}
 */
async function getPlayerSeasonStatsByTeam(season, team) {
  return get(`/stats/json/PlayerSeasonStatsByTeam/${season}/${team}`);
}

/* ----------------------------------------------------
 * ROSTERS / PLAYERS (SCORES FEED)
 * --------------------------------------------------*/

/**
 * Team players / roster.
 * Typically: /scores/json/Players/{team}
 */
async function getTeamPlayers(team) {
  return get(`/scores/json/Players/${team}`);
}

/* ----------------------------------------------------
 * ADVANCED METRICS FEED (NFL v3 ADVANCED METRICS)
 * --------------------------------------------------*/

/**
 * Season-level advanced metrics for all players.
 * Endpoint name may differ based on your plan; adjust to your docs.
 */
async function getAdvancedPlayerSeasonMetrics(season) {
  return get(`/advanced-metrics/json/AdvancedPlayerSeasonMetrics/${season}`);
}

/**
 * Week-level advanced metrics for all players.
 * Endpoint name may differ; match to your docs.
 */
async function getAdvancedPlayerGameMetricsByWeek(season, week) {
  return get(
    `/advanced-metrics/json/AdvancedPlayerGameMetricsByWeek/${season}/${week}`
  );
}

/**
 * Snap counts by team, season & week.
 * Endpoint name may differ; adjust to Snap Counts endpoint.
 */
async function getPlayerSnapCountsByTeam(season, week, team) {
  return get(
    `/advanced-metrics/json/PlayerSnapCountsByTeam/${season}/${week}/${team}`
  );
}

module.exports = {
  buildUrl,
  get,
  getTeamGameStats,
  getPlayerGameStatsByTeam,
  getPlayerSeasonStatsByTeam,
  getTeamPlayers,
  getAdvancedPlayerSeasonMetrics,
  getAdvancedPlayerGameMetricsByWeek,
  getPlayerSnapCountsByTeam,
};
