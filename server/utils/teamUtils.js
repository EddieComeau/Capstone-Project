// server/utils/teamUtils.js

const ballDontLieService = require('../services/ballDontLieService');

async function fetchTeams(params = {}) {
  const payload = await ballDontLieService.listTeams(params);
  return payload && payload.data ? payload.data : payload;
}

module.exports = {
  fetchTeams,
};
