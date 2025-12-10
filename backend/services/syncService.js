// services/syncService.js
const Team = require("../models/Team");
const Player = require("../models/Player");

const {
  getTeamPlayers,
  getAllTeamKeys,
  getAllTeams,
} = require("./sportsdataService");

const {
  computeAndSaveLineMetricsForTeam,
} = require("./lineMetricsService");
const {
  computeAndSaveAdvancedLineMetricsForTeam,
} = require("./advancedLineService");
const {
  computeAndSaveSpecialTeamsForTeam,
} = require("./specialTeamsService");
const {
  computeAndSaveDefensiveMetricsForTeam,
} = require("./defensiveMetricsService");

/**
 * Sync base player data (roster) for a single team/season/week.
 * Uses SportsData.io's team players endpoint via sportsdataService.
 */
async function syncTeamPlayers(team) {
  const teamKey = String(team).toUpperCase();
  const apiPlayers = await getTeamPlayers(teamKey);

  const ops = apiPlayers.map((p) =>
    Player.findOneAndUpdate(
      { PlayerID: p.PlayerID },
      {
        PlayerID: p.PlayerID,
        FullName: p.Name,
        FirstName: p.FirstName,
        LastName: p.LastName,
        Team: p.Team || teamKey,
        Position: p.Position,
        Status: p.Status,
        PhotoUrl: p.PhotoUrl,
        Jersey: p.Jersey,
        Height: p.Height,
        Weight: p.Weight,
        College: p.College,
        Experience: p.Experience,
        Age: p.Age,
      },
      { new: true, upsert: true }
    )
  );

  const docs = await Promise.all(ops);
  return { team, count: docs.length };
}

async function ensureTeamDocument(teamKey) {
  const normalized = String(teamKey).toUpperCase();

  const existing = await Team.findOne({ abbreviation: normalized });
  if (existing) return existing;

  try {
    const allTeams = await getAllTeams();
    const match = allTeams.find(
      (t) =>
        String(t.Key).toUpperCase() === normalized ||
        String(t.Abbreviation || "").toUpperCase() === normalized
    );

    if (!match) return null;

    return Team.findOneAndUpdate(
      { sportsdataTeamId: match.TeamID },
      {
        sportsdataTeamId: match.TeamID,
        abbreviation: match.Key || match.Abbreviation || normalized,
        name: match.FullName || match.Name || match.City || normalized,
        conference: match.Conference || match.ConferenceAbbr,
        division: match.Division,
        city: match.City,
        fullName: match.FullName || match.Name,
        logoUrl:
          match.WikipediaLogoUrl ||
          match.TeamLogo ||
          match.Logo ||
          match.WikipediaWordMark ||
          undefined,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.warn(
      `[syncService] Unable to upsert team ${normalized}: ${err.message}`
    );
    return null;
  }
}

async function resolveTeamKeys(teams) {
  if (Array.isArray(teams) && teams.length) {
    return teams.map((t) => String(t).toUpperCase());
  }

  const dbTeams = await Team.find({}, { abbreviation: 1 });
  const fromDb = dbTeams
    .map((t) => t.abbreviation)
    .filter(Boolean)
    .map((k) => String(k).toUpperCase());

  if (fromDb.length) return fromDb;

  return getAllTeamKeys();
}

/**
 * Sync everything for a single team/week:
 * - roster (Player)
 * - OL basic metrics (LineMetrics)
 * - OL advanced metrics
 * - special teams metrics
 * - defensive metrics
 */
async function syncWeeklyForTeam(season, week, team) {
  await ensureTeamDocument(team);

  const [playersResult, lineBasic, lineAdvanced, special, defense] =
    await Promise.all([
      syncTeamPlayers(team),
      computeAndSaveLineMetricsForTeam(season, week, team),
      computeAndSaveAdvancedLineMetricsForTeam(season, week, team),
      computeAndSaveSpecialTeamsForTeam(season, week, team),
      computeAndSaveDefensiveMetricsForTeam(season, week, team),
    ]);

  return {
    team,
    season,
    week,
    playersSynced: playersResult.count,
    lineMetricsSynced: lineBasic.length,
    advancedLineMetricsSynced: lineAdvanced.length,
    specialTeamsMetricsSynced: special.length,
    defensiveMetricsSynced: defense.length,
  };
}

/**
 * Concurrency helper for syncing teams in bulk with optional retries.
 */
async function syncAllTeamsForWeek({
  season,
  week,
  teams,
  concurrency = 4,
  maxRetries = 2,
} = {}) {
  if (!season && season !== 0) {
    throw new Error("season is required");
  }
  if (!week && week !== 0) {
    throw new Error("week is required");
  }

  const teamKeys = await resolveTeamKeys(teams);
  const results = [];
  const errors = [];
  let index = 0;

  async function syncWithRetry(teamKey) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const result = await syncWeeklyForTeam(season, week, teamKey);
        results.push(result);
        return;
      } catch (err) {
        attempt += 1;
        if (attempt > maxRetries) {
          errors.push({ team: teamKey, message: err.message });
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 300 * attempt)
        );
      }
    }
  }

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= teamKeys.length) break;
      const teamKey = teamKeys[current];
      await syncWithRetry(teamKey);
    }
  }

  const workerCount = Math.min(concurrency, teamKeys.length || 1);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return {
    season,
    week,
    totalTeams: teamKeys.length,
    concurrency,
    maxRetries,
    completed: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

module.exports = {
  syncTeamPlayers,
  syncAdvancedMetricsWeek,
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
};
