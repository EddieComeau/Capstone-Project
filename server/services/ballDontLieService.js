// server/services/ballDontLieService.js
// Thin wrapper around Ball Don't Lie NFL API aligned to the OpenAPI spec.

const axios = require('axios');

const BASE_URL = process.env.BDL_BASE_URL || 'https://api.balldontlie.io';
const VERSION_PREFIX = process.env.BDL_VERSION_PREFIX || '/v1';

function getClient() {
  const apiKey = process.env.BALLDONTLIE_API_KEY || process.env.BDL_API_KEY;
  if (!apiKey) {
    // Allow server to start without key in dev, but calls will fail clearly.
    // This is preferable to silently calling a wrong URL.
  }

  return axios.create({
    baseURL: `${BASE_URL}${VERSION_PREFIX}`,
    headers: {
      ...(apiKey ? { Authorization: apiKey } : {}),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: Number(process.env.BDL_TIMEOUT_MS || 30000),
  });
}

/**
 * OpenAPI: GET /v1/nfl/players
 */
async function listPlayers(params = {}) {
  const client = getClient();
  const res = await client.get('/nfl/players', { params });
  return res.data;
}

/**
 * OpenAPI: GET /v1/nfl/players/{id}
 */
async function getPlayer(id) {
  const client = getClient();
  const res = await client.get(`/nfl/players/${id}`);
  return res.data;
}

/**
 * OpenAPI: GET /v1/nfl/teams
 */
async function listTeams(params = {}) {
  const client = getClient();
  const res = await client.get('/nfl/teams', { params });
  return res.data;
}

module.exports = {
  listPlayers,
  getPlayer,
  listTeams,
};
