// services/sportsdataService.js
const axios = require("axios");
const {
  SPORTS_DATA_BASE_URL,
  SPORTS_DATA_API_KEY,
} = require("../config/sportsdata");

const api = axios.create({
  baseURL: SPORTS_DATA_BASE_URL,
  timeout: 20000,
  headers: {
    Authorization: SPORTS_DATA_API_KEY,
  },
});

async function fetchFromSportsData(path, params = {}) {
  try {
    const res = await api.get(path, { params });
    return res.data;
  } catch (err) {
    const status = err?.response?.status || 500;
    const details = err?.response?.data || { message: err.message };
    const e = new Error("Upstream API request failed");
    e.status = status;
    e.details = details;
    throw e;
  }
}

// --- Convenience helpers for your new PBP tab ---

async function getGames({ season, week, per_page = 100, cursor } = {}) {
  // BALLDONTLIE expects arrays: seasons[]=2025 & weeks[]=8 :contentReference[oaicite:2]{index=2}
  const params = {};
  if (season != null) params["seasons[]"] = Number(season);
  if (week != null) params["weeks[]"] = Number(week);
  if (per_page != null) params.per_page = Number(per_page);
  if (cursor != null) params.cursor = Number(cursor);

  return fetchFromSportsData("/games", params);
}

async function getPlays({ game_id, per_page = 100, cursor } = {}) {
  // game_id required :contentReference[oaicite:3]{index=3}
  const params = {
    game_id: Number(game_id),
    per_page: Number(per_page),
  };
  if (cursor != null) params.cursor = Number(cursor);

  return fetchFromSportsData("/plays", params);
}

module.exports = {
  fetchFromSportsData,

  // PBP helpers
  getGames,
  getPlays,

  /**
   * Retrieve all player injuries from the Ball Don't Lie API.
   *
   * This helper wraps the `/player_injuries` endpoint and accepts optional
   * pagination and filter parameters.  Arrays such as team_ids and
   * player_ids are encoded as `team_ids[]` and `player_ids[]` per the
   * BALLDONTLIE specification.
   *
   * @param {Object} params
   *   @property {number} [per_page]  Number of records per page (1-100)
   *   @property {number} [cursor]    Cursor for pagination
   *   @property {number[]} [team_ids] Array of Ball Dont Lie team IDs to filter
   *   @property {number[]} [player_ids] Array of player IDs to filter
   * @returns {Promise<Object>} Response payload containing `data` and `meta`
   */
  async getPlayerInjuries(params = {}) {
    const query = {};
    if (params.per_page != null) query.per_page = Number(params.per_page);
    if (params.cursor != null) query.cursor = Number(params.cursor);
    if (Array.isArray(params.team_ids) && params.team_ids.length > 0) {
      // ensure numeric values; Ball Don't Lie expects arrays encoded as team_ids[]
      query['team_ids[]'] = params.team_ids.map(Number);
    }
    if (Array.isArray(params.player_ids) && params.player_ids.length > 0) {
      query['player_ids[]'] = params.player_ids.map(Number);
    }
    return fetchFromSportsData('/player_injuries', query);
  },
};