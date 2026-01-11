// server/services/sportsdataService.js

const axios = require("axios");

const BASE_URL = process.env.BALLDONTLIE_NFL_BASE_URL;
const API_KEY = process.env.BDL_API_KEY || process.env.BALLDONTLIE_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.warn("[BDL] Warning: BALLDONTLIE_NFL_BASE_URL or API key not set");
}

const bdlClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 15000,
});

/* -------------------------------------------------------------------------- */
/*                                   ODDS                                     */
/* -------------------------------------------------------------------------- */

async function getOddsForGame(gameId) {
  try {
    const res = await bdlClient.get(`/odds`, {
      params: { game_id: gameId },
    });
    return res.data;
  } catch (err) {
    console.error(`⚠️ Failed to fetch odds for game ${gameId}:`, err.message);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                               PLAYER PROPS                                 */
/* -------------------------------------------------------------------------- */

async function getPropsForGame(gameId) {
  try {
    const res = await bdlClient.get(`/player-props`, {
      params: { game_id: gameId },
    });
    return res.data;
  } catch (err) {
    console.error(`⚠️ Failed to fetch props for game ${gameId}:`, err.message);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                 INJURIES                                   */
/* -------------------------------------------------------------------------- */

async function getPlayerInjuries({
  season,
  week,
  per_page = 100,
  cursor = null,
} = {}) {
  try {
    const params = { per_page };

    if (season) params.season = season;
    if (week) params.week = week;
    if (cursor) params.cursor = cursor;

    const res = await bdlClient.get(`/injuries`, { params });
    return res.data;
  } catch (err) {
    console.warn(
      `⚠️ Failed to fetch injuries for season ${season}, week ${week}:`,
      err.message
    );
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  EXPORTS                                   */
/* -------------------------------------------------------------------------- */

module.exports = {
  getOddsForGame,
  getPropsForGame,
  getPlayerInjuries,
};
