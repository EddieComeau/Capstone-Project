// server/services/ballDontLieService.js
// Thin wrapper around Ball Don't Lie NFL API.
// Delegates to the centralized bdlList helper so URL/version handling and headers are consistent.

const { bdlList } = require('../utils/apiUtils');

/**
 * List players (delegates to the central helper)
 * Returns whatever bdlList returns (commonly an object with `.data` and `.meta`)
 */
async function listPlayers(params = {}) {
  return bdlList('/nfl/players', params);
}

/**
 * Get a single player by id
 */
async function getPlayer(id) {
  if (!id) throw new Error('Missing player id');
  return bdlList(`/nfl/players/${id}`, {});
}

/**
 * List teams
 */
async function listTeams(params = {}) {
  return bdlList('/nfl/teams', params);
}

module.exports = {
  listPlayers,
  getPlayer,
  listTeams,
};
