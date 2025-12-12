// server/services/syncService.js
const Player = require("../models/Player");
const PlayerStats = require("../models/PlayerStats");
const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");
const Team = require("../models/Team");
const {
  BALLDONTLIE_BASE_URL,
  BALLDONTLIE_API_KEY,
} = require("../config/sportsdata");

// reuse fetch logic from sportsdataService
let fetchFn = global.fetch;
if (!fetchFn) {
  // eslint-disable-next-line global-require
  fetchFn = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
}

function buildUrl(path, params = {}) {
  const base = BALLDONTLIE_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  const url = new URL(`${base}/${cleanPath}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach((item) => url.searchParams.append(k, String(item)));
    } else {
      url.searchParams.append(k, String(v));
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

async function bdlList(path, params = {}) {
  let cursor;
  const items = [];
  while (true) {
    const page = await bdlRequest(path, { ...params, cursor });
    if (Array.isArray(page?.data)) {
      items.push(...page.data);
    } else if (page?.data) {
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
 * Sync Team document from BALLDONTLIE teams endpoint.
 */
async function ensureTeam(teamAbbrev) {
  const res = await bdlRequest("/nfl/v1/teams");
  const teams = res.data || [];
  const match = teams.find(
    (t) => t.abbreviation.toUpperCase() === teamAbbrev.toUpperCase()
  );

  if (!match) {
    throw new Error(`Team not found for abbreviation ${teamAbbrev}`);
  }

  const update = {
    ballDontLieTeamId: match.id,
    name: match.name,
    abbreviation: match.abbreviation,
    conference: match.conference,
    division: match.division,
    city: match.location,
    fullName: match.full_name,
  };

  const teamDoc = await Team.findOneAndUpdate(
    { ballDontLieTeamId: match.id },
    update,
    { new: true, upsert: true }
  );

  return { teamDoc, raw: match };
}

/**
 * Sync all players for a given team abbreviation.
 * Uses /nfl/v1/players with team_ids filter.
 */
async function syncTeamPlayers(teamAbbrev) {
  const { teamDoc, raw } = await ensureTeam(teamAbbrev);

  // Pull all active players for this team
  const players = await bdlList("/nfl/v1/players/active", {
    team_ids: [raw.id],
    per_page: 100,
  });

  let upsertCount = 0;

  for (const p of players) {
    // NOTE: property names are inferred; adjust to match docs exactly.
    const fullName = `${p.first_name} ${p.last_name}`.trim();

    const update = {
      PlayerID: p.id,
      FullName: fullName,
      FirstName: p.first_name,
      LastName: p.last_name,
      Team: teamDoc.abbreviation,
      Position: p.position,
      Status: p.status,
      DepthChartPosition: p.depth_chart_position,
      DepthChartOrder: p.depth_chart_order,
      Jersey: p.jersey,
      Height: p.height,
      Weight: p.weight,
      BirthDate: p.birth_date,
      College: p.college,
      Experience: p.experience,
      PhotoUrl: p.photo_url,
      raw: p,
    };

    const doc = await Player.findOneAndUpdate(
      { PlayerID: p.id },
      update,
      { new: true, upsert: true }
    );

    if (doc) upsertCount++;
  }

  return upsertCount;
}

/**
 * Helper to build a map from PlayerID => Player doc.
 */
async function getPlayerMapForTeam(teamAbbrev) {
  const players = await Player.find({
    Team: teamAbbrev.toUpperCase(),
  });
  const map = new Map();
  players.forEach((p) => map.set(p.PlayerID, p));
  return map;
}

/**
 * Sync season_stats and advanced_stats (rushing/passing/receiving)
 * for all players on team for given season/week, storing:
 *  - PlayerStats
 *  - PlayerAdvancedMetrics
 */
async function syncWeeklyForTeam(season, week, teamAbbrev) {
  const team = teamAbbrev.toUpperCase();

  // Ensure roster is in DB
  await syncTeamPlayers(team);

  const teamDoc = await Team.findOne({ abbreviation: team });
  if (!teamDoc) throw new Error(`Team not found locally: ${team}`);

  const playerMap = await getPlayerMapForTeam(team);

  // 1. Season stats (basic counting stats)
  const seasonStats = await bdlList("/nfl/v1/season_stats", {
    season,
    team_id: teamDoc.ballDontLieTeamId,
    per_page: 100,
  });

  for (const row of seasonStats) {
    const playerId = row.player?.id;
    if (!playerId) continue;

    const playerDoc = playerMap.get(playerId);
    if (!playerDoc) continue;

    const update = {
      playerId: playerDoc._id,
      PlayerID: playerId,
      Team: team,
      Position: playerDoc.Position,
      season,
      week: null,
      raw: row,
    };

    await PlayerStats.findOneAndUpdate(
      { playerId: playerDoc._id, season, week: null },
      update,
      { upsert: true, new: true }
    );
  }

  // 2. Advanced stats (rushing, passing, receiving) for this week
  const advRushing = await bdlList("/nfl/v1/advanced_stats/rushing", {
    season,
    week,
    per_page: 100,
  });
  const advPassing = await bdlList("/nfl/v1/advanced_stats/passing", {
    season,
    week,
    per_page: 100,
  });
  const advReceiving = await bdlList("/nfl/v1/advanced_stats/receiving", {
    season,
    week,
    per_page: 100,
  });

  const advancedAll = [...advRushing, ...advPassing, ...advReceiving];

  for (const m of advancedAll) {
    const playerId = m.player?.id;
    if (!playerId) continue;
    const teamAbbr = m.team?.abbreviation?.toUpperCase();
    if (teamAbbr !== team) continue;

    const playerDoc = playerMap.get(playerId);
    if (!playerDoc) continue;

    const update = {
      player: playerDoc._id,
      PlayerID: playerId,
      Team: team,
      Position: playerDoc.Position,
      season,
      week,
      metrics: m,
    };

    await PlayerAdvancedMetrics.findOneAndUpdate(
      {
        player: playerDoc._id,
        season,
        week,
      },
      update,
      { new: true, upsert: true }
    );
  }

  return {
    team,
    season,
    week,
    playersSynced: playerMap.size,
    advancedRows: advancedAll.length,
    seasonStatRows: seasonStats.length,
  };
}

/**
 * Convenience helper to sync an entire week across all teams.
 * Use carefully; it will call a lot of endpoints.
 */
async function syncAllTeamsForWeek(season, week, { concurrency = 2 } = {}) {
  const res = await bdlRequest("/nfl/v1/teams");
  const teams = res.data || [];
  const abbrevs = teams.map((t) => t.abbreviation);

  const results = [];
  const queue = [...abbrevs];

  async function worker() {
    while (queue.length) {
      const team = queue.shift();
      try {
        const r = await syncWeeklyForTeam(season, week, team);
        results.push({ team, ok: true, ...r });
      } catch (err) {
        console.error(`Sync failed for ${team}:`, err.message);
        results.push({ team, ok: false, error: err.message });
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return {
    season,
    week,
    concurrency,
    results,
  };
}

module.exports = {
  syncTeamPlayers,
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
};
