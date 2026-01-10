const axios = require('axios');

/*
 * ballDontLieService
 *
 * Thin client for the BallDontLie NFL API. Wraps axios to include the
 * appropriate base URL and authorization header on all requests. The
 * functions exposed here mirror the official API endpoints for odds
 * and player prop lines. See https://api.balldontlie.io for more
 * details on accepted query parameters.
 */

const API_BASE = 'https://api.balldontlie.io/nfl/v1/odds';
const API_KEY = process.env.BDL_API_KEY || '';

async function request(endpoint, params = {}) {
  const headers = {};
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  const url = `${API_BASE}${endpoint}`;
  const response = await axios.get(url, { params, headers });
  return response.data;
}

/**
 * List game‑level odds. Accepts season/week or a list of game IDs.
 *
 * @param {Object} options
 * @param {number} [options.season] Four‑digit season (e.g. 2025)
 * @param {number} [options.week] Week number within the season
 * @param {number[]} [options.game_ids] Array of game IDs
 * @param {number} [options.per_page] Items per page (when season/week provided)
 * @returns {Promise<Object>} The API response JSON
 */
async function listOdds({ season, week, game_ids, per_page } = {}) {
  const params = {};
  if (season) params.season = season;
  if (week) params.week = week;
  if (Array.isArray(game_ids) && game_ids.length) {
    params.game_ids = game_ids.join(',');
  }
  if (per_page) params.per_page = per_page;
  return request('', params);
}

/**
 * List player proposition lines for a single game. Optionally filter by
 * player, prop type or vendor list. Vendors are provided as an array
 * and encoded into vendors[0], vendors[1], etc.
 *
 * @param {Object} options
 * @param {number} options.game_id Required game ID
 * @param {number} [options.player_id] Filter by player ID
 * @param {string} [options.prop_type] Filter by prop type (passing_yards, rushing_yards, etc.)
 * @param {string[]} [options.vendors] Filter by list of sportsbook vendors
 * @returns {Promise<Object>} The API response JSON
 */
async function listOddsPlayerProps({ game_id, player_id, prop_type, vendors } = {}) {
  if (!game_id) {
    throw new Error('game_id is required');
  }
  const params = { game_id };
  if (player_id) params.player_id = player_id;
  if (prop_type) params.prop_type = prop_type;
  if (Array.isArray(vendors) && vendors.length) {
    vendors.forEach((v, idx) => {
      params[`vendors[${idx}]`] = v;
    });
  }
  return request('/player_props', params);
}

module.exports = {
  listOdds,
  listOddsPlayerProps,
};