// services/sportsdataService.js
const axios = require("axios");

const BASE_URL =
  process.env.SPORTSDATA_BASE_URL || "https://api.sportsdata.io/v3/nfl";
const API_KEY = process.env.SPORTSDATA_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.warn(
    "[sportsdataService] SPORTSDATA_BASE_URL or SPORTSDATA_API_KEY is not set in .env"
  );
}

/**
 * Build a full SportsData.io URL for a given path.
 * `path` should start with a "/" (e.g. "/scores/json/AllTeams").
 * We always append `?key=...` or `&key=...` as required.
 */
function buildUrl(path) {
  if (!path.startsWith("/")) {
    throw new Error(
      `[sportsdataService] Path must start with "/". Received: ${path}`
    );
  }

  const sep = path.includes("?") ? "&" : "?";
  return `${BASE_URL}${path}${sep}key=${API_KEY}`;
}

/**
 * Core GET helper that all other functions use.
 */
async function get(path, axiosConfig = {}) {
  const url = buildUrl(path);
  try {
    const response = await axios.get(url, axiosConfig);
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;

    console.error(
      `[sportsdataService] GET ${path} failed:`,
      status || "",
      data || err.message
    );

    // Re-throw so routes/controllers can decide how to respond
    throw err;
  }
}

/**
 * Utility: coerce season to a string for SportsData.io.
 * They accept "2024", "2024REG", "2024POST", etc.
 */
function toSeasonString(season) {
  if (!season && season !== 0) {
    throw new Error("[sportsdataService] Season is required");
  }
  return String(season);
}

/**
 * Utility: normalize team key (NE, DAL, KC, etc).
 */
function toTeamKey(team) {
  if (!team) {
    throw new Error("[sportsdataService] Team is required");
  }
  return String(team).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/*  GENERIC WRAPPER USED BY CONTROLLERS                                       */
/* -------------------------------------------------------------------------- */

/**
 * Thin wrapper so controllers can call:
 *   fetchFromSportsData("/scores/json/AllTeams")
 *   fetchFromSportsData(`/scores/json/Standings/${season}`)
 * etc.
 */
async function fetchFromSportsData(path, axiosConfig) {
  return get(path, axiosConfig);
}

/* -------------------------------------------------------------------------- */
/*  TEAMS & STANDINGS (SCORES API)                                            */
/* -------------------------------------------------------------------------- */

/**
 * All NFL teams (from Scores API).
 * Not currently used by the new controllers, but kept for compatibility.
 */
async function getAllTeams() {
  return get("/scores/json/AllTeams");
}

/**
 * Standings for a given season key, e.g. "2024REG" or "2024POST".
 * If you pass just "2024", SportsData.io treats it as regular season.
 */
async function getStandings(seasonKey) {
  const season = toSeasonString(seasonKey);
  return get(`/scores/json/Standings/${season}`);
}

/**
 * NEW: Full schedule for a given season key.
 *
 * Example:
 *   getSchedule("2024REG")
 *
 * This matches how `routes/matchups.js` currently calls it:
 *   const seasonKey = `${seasonNumber}${seasonTypeStr}`;
 *   const schedule  = await getSchedule(seasonKey);
 */
async function getSchedule(seasonKey) {
  if (!seasonKey) {
    throw new Error(
      "[sportsdataService] getSchedule called without seasonKey"
    );
  }
  const season = toSeasonString(seasonKey);
  return get(`/scores/json/Schedules/${season}`);
}

/* -------------------------------------------------------------------------- */
/*  BOX SCORES (STATS API)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * NEW: Box score for a given team's game in a given week.
 *
 * Route:
 *   GET /api/boxscores/:season/:week/:homeTeam
 *
 * Example call:
 *   getBoxScore(2024, 1, "NE")
 *
 * Uses Stats "BoxScoreV3" endpoint (live & final):
 *   /v3/nfl/stats/{format}/BoxScoreV3/{season}/{week}/{hometeam}
 *
 * We stick to the convention that `season` can be "2024" or "2024REG".
 */
async function getBoxScore(season, week, homeTeam) {
  const seasonStr = toSeasonString(season);
  const weekStr = String(week);
  const teamKey = toTeamKey(homeTeam);

  const path = `/stats/json/BoxScoreV3/${seasonStr}/${weekStr}/${teamKey}`;
  return get(path);
}

/* -------------------------------------------------------------------------- */
/*  PLAYER & TEAM STATS (STATS API)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Team game stats for a given season/week.
 * If `team` is provided, we filter down to that team's record(s).
 *
 * Underlying endpoint:
 *   /v3/nfl/stats/{format}/TeamGameStats/{season}/{week}
 */
async function getTeamGameStats(season, week, team) {
  const seasonStr = toSeasonString(season);
  const weekStr = String(week);

  const data = await get(
    `/stats/json/TeamGameStats/${seasonStr}/${weekStr}`
  );

  if (!team) return data;

  const teamKey = toTeamKey(team);
  return data.filter(
    (g) =>
      g.Team === teamKey ||
      g.HomeTeam === teamKey ||
      g.AwayTeam === teamKey
  );
}

/**
 * Player game stats for all players on a team in a given week.
 *
 * Endpoint:
 *   /v3/nfl/stats/{format}/PlayerGameStatsByTeam/{season}/{week}/{team}
 */
async function getPlayerGameStatsByTeam(season, week, team) {
  const seasonStr = toSeasonString(season);
  const weekStr = String(week);
  const teamKey = toTeamKey(team);

  return get(
    `/stats/json/PlayerGameStatsByTeam/${seasonStr}/${weekStr}/${teamKey}`
  );
}

/**
 * Season-long stats (aggregated) for all players on a given team.
 *
 * Endpoint:
 *   /v3/nfl/stats/{format}/PlayerSeasonStatsByTeam/{season}/{team}
 */
async function getPlayerSeasonStatsByTeam(season, team) {
  const seasonStr = toSeasonString(season);
  const teamKey = toTeamKey(team);

  return get(
    `/stats/json/PlayerSeasonStatsByTeam/${seasonStr}/${teamKey}`
  );
}

/**
 * Full player bio/details for a team.
 *
 * Endpoint:
 *   /v3/nfl/stats/{format}/Players/{team}
 */
async function getTeamPlayers(team) {
  const teamKey = toTeamKey(team);
  return get(`/stats/json/Players/${teamKey}`);
}

/**
 * Helper to get just the team keys (NE, DAL, KC, etc) from the Scores API.
 * Used by sync scripts to iterate over all teams.
 */
async function getAllTeamKeys() {
  const teams = await getAllTeams();
  return teams
    .map((t) => t.Key)
    .filter(Boolean)
    .map((k) => String(k).toUpperCase());
}

/* -------------------------------------------------------------------------- */
/*  ADVANCED METRICS (ADVANCED-METRICS API)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Advanced season-long metrics by team.
 *
 * Endpoint (Advanced Metrics API):
 *   /v3/nfl/advanced-metrics/{format}/AdvancedPlayerSeasonStats/{season}/{team}
 */
async function getAdvancedPlayerSeasonMetrics(season, team) {
  const seasonStr = toSeasonString(season);
  const teamKey = toTeamKey(team);

  return get(
    `/advanced-metrics/json/AdvancedPlayerSeasonStats/${seasonStr}/${teamKey}`
  );
}

/**
 * Advanced per-game metrics for all players in a given week.
 *
 * Endpoint:
 *   /v3/nfl/advanced-metrics/{format}/AdvancedPlayerGameStats/{season}/{week}
 */
async function getAdvancedPlayerGameMetricsByWeek(season, week) {
  const seasonStr = toSeasonString(season);
  const weekStr = String(week);

  return get(
    `/advanced-metrics/json/AdvancedPlayerGameStats/${seasonStr}/${weekStr}`
  );
}

/**
 * Snap counts by team & week.
 *
 * SportsData.io exposes snaps on the PlayerGame stats, so for now
 * we simply reuse `getPlayerGameStatsByTeam` and let downstream code
 * read the snap-related fields (e.g. OffensiveSnaps, DefensiveSnaps).
 */
async function getPlayerSnapCountsByTeam(season, week, team) {
  return getPlayerGameStatsByTeam(season, week, team);
}

/* -------------------------------------------------------------------------- */

module.exports = {
  // Core
  buildUrl,
  get,
  fetchFromSportsData,

  // Scores / schedule / standings
  getAllTeams,
  getStandings,
  getSchedule,
  getBoxScore,

  // Players & stats
  getAllTeamKeys,
  getTeamPlayers,
  getTeamGameStats,
  getPlayerGameStatsByTeam,
  getPlayerSeasonStatsByTeam,
  getPlayerSnapCountsByTeam,

  // Advanced metrics
  getAdvancedPlayerSeasonMetrics,
  getAdvancedPlayerGameMetricsByWeek,
};
