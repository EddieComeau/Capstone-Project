// server/services/ballDontLieService.js
// Thin wrappers for Ball Don't Lie NFL endpoints, all delegating to bdlList.

const { bdlList } = require('../utils/apiUtils');

/* Player endpoints */
async function listPlayers(params = {}) {
  return bdlList('/nfl/v1/players', params);
}
async function getPlayer(id) {
  if (!id) throw new Error('Missing player id');
  return bdlList(`/nfl/v1/players/${id}`, {});
}

/* Teams */
async function listTeams(params = {}) {
  return bdlList('/nfl/v1/teams', params);
}

/* Games */
async function listGames(params = {}) {
  return bdlList('/nfl/v1/games', params);
}
async function getGame(id) {
  if (!id) throw new Error('Missing game id');
  return bdlList(`/nfl/v1/games/${id}`, {});
}

/* Stats */
async function listStats(params = {}) {
  return bdlList('/nfl/v1/stats', params);
}
async function listSeasonStats(params = {}) {
  return bdlList('/nfl/v1/season_stats', params);
}

/* Standings */
async function listStandings(params = {}) {
  return bdlList('/nfl/v1/standings', params);
}

/* Advanced stats endpoints */
async function listAdvancedRushing(params = {}) {
  return bdlList('/nfl/v1/advanced_stats/rushing', params);
}
async function listAdvancedPassing(params = {}) {
  return bdlList('/nfl/v1/advanced_stats/passing', params);
}
async function listAdvancedReceiving(params = {}) {
  return bdlList('/nfl/v1/advanced_stats/receiving', params);
}

/* Team season and team stats */
async function listTeamSeasonStats(params = {}) {
  return bdlList('/nfl/v1/team_season_stats', params);
}
async function listTeamStats(params = {}) {
  return bdlList('/nfl/v1/team_stats', params);
}

/* Plays (play-by-play) */
async function listPlays(params = {}) {
  return bdlList('/nfl/v1/plays', params);
}

/* Odds (game-level) */
async function listOdds(params = {}) {
  // The odds endpoint requires either (season + week) OR game_ids.
  // Accept legacy callers that pass `game_id` and convert it automatically.
  const p = { ...(params || {}) };

  if (p.game_id != null && p.game_ids == null && !(p.season != null && p.week != null)) {
    p.game_ids = Array.isArray(p.game_id) ? p.game_id : [p.game_id];
    delete p.game_id;
  }

  if (typeof p.game_ids === 'number') {
    p.game_ids = [p.game_ids];
  }

  return bdlList('/nfl/v1/odds', p);
}
/* Player props (single-game) */
async function listOddsPlayerProps(params = {}) {
  return bdlList('/nfl/v1/odds/player_props', params);
}

/* Injuries */
async function listPlayerInjuries(params = {}) {
  return bdlList('/nfl/v1/player_injuries', params);
}

module.exports = {
  listPlayers,
  getPlayer,
  listTeams,
  listGames,
  getGame,
  listStats,
  listSeasonStats,
  listStandings,
  listAdvancedRushing,
  listAdvancedPassing,
  listAdvancedReceiving,
  listTeamSeasonStats,
  listTeamStats,
  listPlays,
  listOdds,
  listOddsPlayerProps,
  listPlayerInjuries,
};