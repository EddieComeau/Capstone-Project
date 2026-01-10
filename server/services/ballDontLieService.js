// server/services/ballDontLieService.js

const axios = require('axios');
const { getBdlBaseUrl } = require('../utils/apiUtils');

/**
 * List game odds (spreads, totals, money lines).
 * Expects season and week; returns an array.
 */
async function listOdds({ season, week }) {
  const baseUrl = getBdlBaseUrl();
  const response = await axios.get(`${baseUrl}/odds`, {
    params: { season, week },
    headers: { Authorization: `Bearer ${process.env.BDL_API_KEY}` },
  });
  return response.data;
}

/**
 * List player proposition lines for a specific game (or filtered by playerId/propType).
 * `gameId` is required for NFL endpoints.
 */
async function listPlayerProps({ gameId, playerId, propType, vendors }) {
  const baseUrl = getBdlBaseUrl();
  const params = { game_id: gameId };
  if (playerId) params.player_id = playerId;
  if (propType) params.prop_type = propType;
  if (vendors) params.vendors = vendors;
  const response = await axios.get(`${baseUrl}/player-props`, {
    params,
    headers: { Authorization: `Bearer ${process.env.BDL_API_KEY}` },
  });
  return response.data;
}

module.exports = { listOdds, listPlayerProps };
