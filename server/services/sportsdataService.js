const axios = require('axios');

const BASE_URL = process.env.BALLDONTLIE_NFL_BASE_URL;
const API_KEY = process.env.BDL_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.warn('[BDL] Warning: BDL_API_KEY or BALLDONTLIE_NFL_BASE_URL is not set');
}

const bdlClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 15000,
});

module.exports = {
  getOddsForGame: async (gameId) => {
    try {
      const res = await bdlClient.get(`/odds?game_id=${gameId}`);
      return res.data;
    } catch (err) {
      console.error(`⚠️ Failed to fetch odds for game ${gameId}:`, err.message);
      return null;
    }
  },

  getPropsForGame: async (gameId) => {
    try {
      const res = await bdlClient.get(`/player-props?game_id=${gameId}`);
      return res.data;
    } catch (err) {
      console.error(`⚠️ Failed to fetch props for game ${gameId}:`, err.message);
      return null;
    }
  },
};
