// server/services/ballDontLieService.js
const { bdlList } = require('../utils/apiUtils');

async function listPlayers(params = {}) {
  // Use the canonical endpoint per BDL NFL spec:
  // GET https://api.balldontlie.io/nfl/v1/players
  return bdlList('/nfl/v1/players', params);
}

async function getPlayer(id) {
  if (!id) throw new Error('Missing player id');
  return bdlList(`/nfl/v1/players/${id}`, {});
}

async function listTeams(params = {}) {
  return bdlList('/nfl/v1/teams', params);
}

module.exports = {
  listPlayers,
  getPlayer,
  listTeams,
};
