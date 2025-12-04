// services/sportsdataService.js
const axios = require("axios");
const {
  SPORTS_DATA_BASE_URL,
  SPORTS_DATA_API_KEY,
} = require("../config/sportsdata");

// Create a reusable axios client
const client = axios.create({
  baseURL: SPORTS_DATA_BASE_URL, // e.g. https://api.sportsdata.io/v3/nfl
  timeout: 10000,
});

/**
 * Generic wrapper for GET requests to SportsData.io
 * @param {string} path - Path after /v3/nfl, e.g. "/scores/json/AllTeams"
 * @param {object} [params] - Extra query params
 * @returns {Promise<any>} - Response JSON
 */
async function fetchFromSportsData(path, params = {}) {
  if (!SPORTS_DATA_API_KEY) {
    throw new Error("SPORTSDATA_API_KEY is not configured");
  }

  const mergedParams = {
    key: SPORTS_DATA_API_KEY, // SportsData.io expects ?key=...
    ...params,
  };

  const response = await client.get(path, { params: mergedParams });
  return response.data;
}

/**
 * Get all NFL teams (team profiles).
 * This hits: /scores/json/AllTeams
 */
async function getTeams() {
  // No season needed for AllTeams
  return fetchFromSportsData("/scores/json/AllTeams");
}

/**
 * Get full NFL schedule for a season.
 *
 * For many plans, the endpoint is:
 *   /scores/json/Schedules/{season}
 * where {season} is a year like 2023.
 *
 * If your docs show a slightly different path (like "Schedule" vs "Schedules"),
 * just adjust the string below.
 *
 * @param {number|string} season - Season year, e.g. 2023
 */
async function getSchedule(season) {
  // Make sure it's a string, just in case
  const seasonStr = String(season);
  return fetchFromSportsData(`/scores/json/Schedules/${seasonStr}`);
}

/**
 * OPTIONAL: Get standings by season (if you want a shared helper)
 * Example endpoint: /scores/json/Standings/{seasonType}
 * where seasonType might be "2023REG", "2023POST", etc.
 */
async function getStandings(seasonType) {
  const seasonTypeStr = String(seasonType);
  return fetchFromSportsData(`/scores/json/Standings/${seasonTypeStr}`);
}

module.exports = {
  fetchFromSportsData,
  getTeams,
  getSchedule,
  getStandings, // if you want to use this in standingsController
};
