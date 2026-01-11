// server/services/ballDontLieService.js
// Centralized Ball Don't Lie NFL API client

const axios = require("axios");

const BASE_URL = process.env.BALLDONTLIE_NFL_BASE_URL;
const API_KEY = process.env.BDL_API_KEY || process.env.BALLDONTLIE_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.warn(
    "[BDL] Warning: BALLDONTLIE_NFL_BASE_URL or API key is not set"
  );
}

const bdlClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 15000,
});

/* -------------------------------------------------------------------------- */
/*                                   TEAMS                                    */
/* -------------------------------------------------------------------------- */

async function listTeams() {
  const res = await bdlClient.get("/teams");
  return res.data;
}

/* -------------------------------------------------------------------------- */
/*                                  PLAYERS                                   */
/* -------------------------------------------------------------------------- */

async function listPlayers({ per_page = 100, cursor = null } = {}) {
  const params = { per_page };
  if (cursor) params.cursor = cursor;

  const res = await bdlClient.get("/players", { params });
  return res.data;
}

/* -------------------------------------------------------------------------- */
/*                                   GAMES                                    */
/* -------------------------------------------------------------------------- */

async function listGames({ per_page = 100, seasons = [], cursor = null } = {}) {
  const params = { per_page };
  if (seasons?.length) params.seasons = seasons;
  if (cursor) params.cursor = cursor;

  const res = await bdlClient.get("/games", { params });
  return res.data;
}

/* -------------------------------------------------------------------------- */
/*                                   ODDS                                     */
/* -------------------------------------------------------------------------- */

async function listOdds({ season, week } = {}) {
  const params = {};
  if (season) params.season = season;
  if (week) params.week = week;

  const res = await bdlClient.get("/odds", { params });
  return res.data;
}

/* -------------------------------------------------------------------------- */
/*                              PLAYER PROPS                                  */
/* -------------------------------------------------------------------------- */

async function listPlayerProps({
  gameId,
  playerId,
  propType,
  vendors,
} = {}) {
  const params = {};
  if (gameId) params.game_id = gameId;
  if (playerId) params.player_id = playerId;
  if (propType) params.prop_type = propType;
  if (vendors) params.vendors = vendors;

  const res = await bdlClient.get("/player-props", { params });
  return res.data;
}

/* -------------------------------------------------------------------------- */
/*                                EXPORTS                                     */
/* -------------------------------------------------------------------------- */

module.exports = {
  listTeams,
  listPlayers,
  listGames,
  listOdds,
  listPlayerProps,
};
