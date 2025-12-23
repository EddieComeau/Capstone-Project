// server/services/ballDontLieService.js
const { bdlList } = require('../utils/apiUtils');

async function listPlayers(params = {}) {
  return bdlList('/nfl/v1/players', params);
}

async function getPlayer(id) {
  if (!id) throw new Error('Missing player id');
  return bdlList(`/nfl/v1/players/${id}`, {});
}

async function listTeams(params = {}) {
  return bdlList('/nfl/v1/teams', params);
}

/**
 * List games from Ball Don't Lie NFL API
 * GET /nfl/v1/games
 */
async function listGames(params = {}) {
  return bdlList('/nfl/v1/games', params);
}

/**
 * List stats from Ball Don't Lie NFL API
 * GET /nfl/v1/stats
 */
async function listStats(params = {}) {
  return bdlList('/nfl/v1/stats', params);
}

module.exports = {
  listPlayers,
  getPlayer,
  listTeams,
  listGames,
  listStats,
};
