// server/services/sportsdataService.js

const axios = require('axios');

const BASE_URL = process.env.BALLDONTLIE_NFL_BASE_URL;
const API_KEY  = process.env.BDL_API_KEY || process.env.BALLDONTLIE_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.warn('[BDL] Warning: BALLDONTLIE_NFL_BASE_URL or API key not set');
}

// Create a dedicated axios client for Ball Don’t Lie NFL API.  The API expects
// requests to include the Authorization header with your API key and uses
// cursor-based pagination on many endpoints.  See the documentation at
// https://nfl.balldontlie.io/ for details.
const bdlClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 15000,
});

/* -------------------------------------------------------------------------- */
/*                              Odds and Props                                */
/* -------------------------------------------------------------------------- */

/**
 * Retrieve betting odds for a single game.
 *
 * The Ball Don't Lie API exposes game odds at `/odds`.  When provided with
 * a `game_id` query parameter, the API returns all available vendor odds for
 * that specific game.  If you wish to fetch odds for multiple games at once
 * or filter by season/week, use the `/odds` endpoint on your own.  This helper
 * focuses on a single game to simplify upstream sync logic.
 *
 * @param {number} gameId - The Ball Don't Lie game ID.
 * @returns {Promise<Object|null>} The API response data or null on failure.
 */
async function getOddsForGame(gameId) {
  try {
    const res = await bdlClient.get(`/odds`, { params: { game_id: gameId } });
    return res.data;
  } catch (err) {
    console.error(`⚠️ Failed to fetch odds for game ${gameId}:`, err.message);
    return null;
  }
}

/**
 * Retrieve player prop betting lines for a single game.
 *
 * The API’s player props endpoint lives at `/player-props` (or
 * `/odds/player_props` in newer specifications).  This helper wraps the
 * `/player-props` route to fetch all prop data for the specified game.  The
 * returned payload includes an array under `data` and optional `meta`.
 *
 * @param {number} gameId - The Ball Don’t Lie game ID.
 * @returns {Promise<Object|null>} The API response data or null on failure.
 */
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
/*                                Injuries                                    */
/* -------------------------------------------------------------------------- */

/**
 * Retrieve player injury information.  Supports optional season/week and
 * pagination via cursor.
 *
 * @param {Object} options
 * @param {number} options.season - Filter injuries to a particular season
 * @param {number} options.week - Filter injuries to a particular week
 * @param {number} [options.per_page=100] - Items per page (max 100)
 * @param {string} [options.cursor] - Cursor token for pagination
 * @returns {Promise<Object|null>} The API response data or null on failure.
 */
async function getPlayerInjuries({ season, week, per_page = 100, cursor = null } = {}) {
  try {
    const params = { per_page };
    if (season) params.season = season;
    if (week)   params.week   = week;
    if (cursor) params.cursor = cursor;
    const res = await bdlClient.get(`/injuries`, { params });
    return res.data;
  } catch (err) {
    console.warn(`⚠️ Failed to fetch injuries for season ${season}, week ${week}:`, err.message);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                               Play‑by‑Play                                 */
/* -------------------------------------------------------------------------- */

/**
 * Retrieve play‑by‑play events for a game.
 *
 * The `/plays` endpoint returns chronological play events.  You must supply
 * at least the `game_id` parameter.  Additional parameters such as
 * `cursor` and `per_page` may be provided for pagination.
 *
 * @param {Object} params - Query parameters (e.g. { game_id, cursor, per_page })
 * @returns {Promise<Object|null>} The API response data or null on failure.
 */
async function getPlays(params = {}) {
  try {
    const res = await bdlClient.get(`/plays`, { params });
    return res.data;
  } catch (err) {
    console.error(`⚠️ Failed to fetch plays:`, err.message);
    return null;
  }
}

module.exports = {
  getOddsForGame,
  getPropsForGame,
  getPlayerInjuries,
  getPlays,
};