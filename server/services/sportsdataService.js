// server/services/sportsdataService.js
const { BALLDONTLIE_BASE_URL, BALLDONTLIE_API_KEY } = require("../config/sportsdata");

// Node 18+ has global fetch. For older Node, fall back to node-fetch.
let fetchFn = global.fetch;
if (!fetchFn) {
  // eslint-disable-next-line global-require
  fetchFn = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
}

function buildUrl(path, params = {}) {
  const base = BALLDONTLIE_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  const url = new URL(`${base}/${cleanPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, String(v)));
    } else {
      url.searchParams.append(key, String(value));
    }
  });

  return url.toString();
}

async function bdlRequest(path, params = {}) {
  const url = buildUrl(path, params);
  const res = await fetchFn(url, {
    headers: {
      Authorization: BALLDONTLIE_API_KEY,
    },
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = new Error(
      json?.message || json?.error || `BALLDONTLIE error ${res.status}`
    );
    err.status = res.status;
    err.response = json || text;
    throw err;
  }

  return json;
}

/**
 * Helper to pull *all* pages for paginated endpoints that return { data, meta }
 */
async function bdlList(path, params = {}) {
  let cursor = undefined;
  const items = [];
  while (true) {
    const page = await bdlRequest(path, { ...params, cursor });

    if (Array.isArray(page?.data)) {
      items.push(...page.data);
    } else if (page?.data) {
      // non-paginated single resource
      items.push(page.data);
      break;
    } else {
      break;
    }

    const next = page.meta?.next_cursor;
    if (!next) break;
    cursor = next;
  }
  return items;
}

/**
 * Legacy helper used by team + standings controllers.
 * Maps "SportsData" paths to BALLDONTLIE endpoints.
 */
async function fetchFromSportsData(path) {
  if (path === "/scores/json/AllTeams") {
    const res = await bdlRequest("/nfl/v1/teams");
    return res.data || [];
  }

  const standingsMatch = path.match(/^\/scores\/json\/Standings\/(\d{4})/);
  if (standingsMatch) {
    const season = parseInt(standingsMatch[1], 10);
    const res = await bdlRequest("/nfl/v1/standings", { season });
    return res.data || [];
  }

  throw new Error(`Unsupported legacy SportsData path: ${path}`);
}

/**
 * Get all games for a season. Used by matchup syncing.
 */
async function getSchedule(season, { postseason } = {}) {
  const games = await bdlList("/nfl/v1/games", {
    seasons: [season],
    postseason,
    per_page: 100,
  });
  return games;
}

/**
 * Helper: fetch basic player stats for all players on a team
 * for a specific season/week.
 *
 * NOTE: we rely on:
 *   - /nfl/v1/teams  (to find team id by abbreviation)
 *   - /nfl/v1/games  (to find the game ids for that team/week)
 *   - /nfl/v1/stats  (to get per-player stats)
 *
 * Adjust mappings based on your exact BALLDONTLIE schema.
 */
async function getPlayerGameStatsByTeam(season, week, teamAbbrev) {
  const teamsRes = await bdlRequest("/nfl/v1/teams");
  const teams = teamsRes.data || [];
  const team = teams.find(
    (t) => t.abbreviation.toUpperCase() === teamAbbrev.toUpperCase()
  );
  if (!team) return [];

  const games = await bdlList("/nfl/v1/games", {
    seasons: [season],
    weeks: [week],
    team_ids: [team.id],
    per_page: 100,
  });

  const gameIds = games.map((g) => g.id);
  if (!gameIds.length) return [];

  const stats = await bdlList("/nfl/v1/stats", {
    seasons: [season],
    game_ids: gameIds,
    per_page: 100,
  });

  return stats;
}

/**
 * Snap counts aren't a direct BALLDONTLIE endpoint (today).
 * Treat this as a placeholder that just returns per-player
 * play counts based on stats. Refine later once you know
 * which fields you want to treat as "snaps".
 */
async function getPlayerSnapCountsByTeam(season, week, teamAbbrev) {
  const stats = await getPlayerGameStatsByTeam(season, week, teamAbbrev);

  // naive estimation: snaps = offensive_play_count + defensive_play_count etc if present.
  return stats.map((s) => ({
    player_id: s.player?.id,
    team: s.team?.abbreviation,
    snaps: s.snaps || null, // TODO: map to real field(s)
    raw: s,
  }));
}

/**
 * Very simple "box score" helper. You can expand it later to
 * include team stats, drive data, etc.
 */
async function getBoxScore(season, week, homeTeamAbbrev) {
  const teamsRes = await bdlRequest("/nfl/v1/teams");
  const teams = teamsRes.data || [];
  const team = teams.find(
    (t) => t.abbreviation.toUpperCase() === homeTeamAbbrev.toUpperCase()
  );
  if (!team) {
    const err = new Error(`Unknown team abbreviation: ${homeTeamAbbrev}`);
    err.status = 400;
    throw err;
  }

  const games = await bdlList("/nfl/v1/games", {
    seasons: [season],
    weeks: [week],
    team_ids: [team.id],
    per_page: 10,
  });

  // Grab the game where this team is home, or fallback to first.
  const game =
    games.find((g) => g.home_team?.id === team.id) ||
    games[0];

  if (!game) {
    const err = new Error("No game found for given parameters");
    err.status = 404;
    throw err;
  }

  const stats = await bdlList("/nfl/v1/stats", {
    game_ids: [game.id],
    seasons: [season],
    per_page: 200,
  });

  return {
    game,
    stats,
  };
}

module.exports = {
  fetchFromSportsData,
  getSchedule,
  getPlayerGameStatsByTeam,
  getPlayerSnapCountsByTeam,
  getBoxScore,
};
