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
};
