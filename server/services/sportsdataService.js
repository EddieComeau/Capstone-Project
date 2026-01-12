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
    // The Ball Don’t Lie API expects either season/week or an array of game IDs
    // under the `game_ids` parameter for the `/odds` endpoint.  Passing
    // `game_ids` with a single element returns all available odds for that
    // specific game.  Using `game_id` will result in a 400 error.
    const res = await bdlClient.get(`/odds`, { params: { game_ids: [gameId] } });
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
    // Player prop data is served under `/odds/player_props` and requires a
    // `game_id` parameter.  See BDL documentation for more details:
    // https://nfl.balldontlie.io/
    const res = await bdlClient.get(`/odds/player_props`, {
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
 * Retrieve current player injury information.  The Ball Don’t Lie API exposes
 * injuries through the `/player_injuries` endpoint, which returns an array of
 * currently injured players.  This endpoint does not support season or week
 * filters; it always returns the latest injuries.  You may optionally
 * specify `team_ids` or `player_ids` to narrow the results to particular teams
 * or players, as well as standard pagination parameters.  Because the API
 * does not return historical injuries, calling this helper weekly is
 * sufficient to keep your database up to date.
 *
 * @param {Object} [options]
 * @param {number[]} [options.team_ids] - Array of team ids to filter by
 * @param {number[]} [options.player_ids] - Array of player ids to filter by
 * @param {number} [options.per_page=100] - Items per page (max 100)
 * @param {string} [options.cursor] - Cursor token for pagination
 * @returns {Promise<Object|null>} The API response data or null on failure.
 */
async function getPlayerInjuries({ team_ids, player_ids, per_page = 100, cursor = null } = {}) {
  try {
    const params = { per_page };
    // Filter by team ids or player ids if provided.  The API expects arrays.
    if (team_ids && Array.isArray(team_ids) && team_ids.length > 0) params.team_ids = team_ids;
    if (player_ids && Array.isArray(player_ids) && player_ids.length > 0) params.player_ids = player_ids;
    if (cursor) params.cursor = cursor;
    // Use the `/player_injuries` endpoint as documented: https://nfl.balldontlie.io/
    const res = await bdlClient.get(`/player_injuries`, { params });
    return res.data;
  } catch (err) {
    console.warn(`⚠️ Failed to fetch player injuries:`, err.message);
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