// server/routes/standings.js

const express = require("express");
const router = express.Router();

const Game = require("../models/Game");
const Team = require("../models/Team");
const Standing = require("../models/Standing");

function formatRecord({ wins, losses, ties }) {
  if (ties) return `${wins}-${losses}-${ties}`;
  return `${wins}-${losses}`;
}

function getSeasonFromReq(req) {
  return Number(req.params.season || req.query.season) || new Date().getFullYear();
}

async function resolveLatestSeasonWithStandings() {
  const doc = await Standing.findOne({}).sort({ season: -1 }).select({ season: 1 }).lean();
  if (doc && doc.season) return doc.season;
  const game = await Game.findOne({
    $or: [{ home_score: { $gt: 0 } }, { visitor_score: { $gt: 0 } }],
  })
    .sort({ season: -1 })
    .select({ season: 1 })
    .lean();
  return game && game.season ? game.season : new Date().getFullYear();
}

async function loadStandingsFromDb(season) {
  const standings = await Standing.find({ season }).lean();
  if (!standings.length) return null;
  const teams = await Team.find({}).lean();
  const teamById = new Map();
  teams.forEach((t) => teamById.set(t.ballDontLieTeamId, t));

  const divisions = new Map();
  standings.forEach((s) => {
    const team = teamById.get(s.teamId);
    if (!team) return;
    const wins = s.wins || 0;
    const losses = s.losses || 0;
    const ties = s.ties || 0;
    const gp = wins + losses + ties;
    const winPct = s.winPct || (gp ? (wins + 0.5 * ties) / gp : 0);
    const entry = {
      team_id: s.teamId,
      team: {
        id: s.teamId,
        abbreviation: team.abbreviation,
        name: team.name,
        full_name: team.fullName || team.name,
      },
      name: team.fullName || team.name,
      conference: team.conference || null,
      division: team.division || null,
      wins,
      losses,
      ties,
      record: formatRecord({ wins, losses, ties }),
      win_pct: winPct,
      points_for: s.pointsFor || 0,
      points_against: s.pointsAgainst || 0,
      point_diff: (s.pointsFor || 0) - (s.pointsAgainst || 0),
      point_differential: (s.pointsFor || 0) - (s.pointsAgainst || 0),
    };
    const divisionKey = team.division || "Unknown";
    if (!divisions.has(divisionKey)) divisions.set(divisionKey, []);
    divisions.get(divisionKey).push(entry);
  });

  const data = [];
  divisions.forEach((teamsInDiv) => {
    teamsInDiv.sort((a, b) => {
      if (b.win_pct !== a.win_pct) return b.win_pct - a.win_pct;
      return b.point_diff - a.point_diff;
    });
    teamsInDiv.forEach((team, idx) => {
      data.push({ ...team, rank: idx + 1 });
    });
  });

  return data;
}

async function buildStandings(req, res) {
  let season = getSeasonFromReq(req);
  try {
    let data = await loadStandingsFromDb(season);
    let seasonRequested = null;

    if (!data || data.length === 0) {
      const fallbackSeason = await resolveLatestSeasonWithStandings();
      if (fallbackSeason && fallbackSeason !== season) {
        seasonRequested = season;
        season = fallbackSeason;
        data = await loadStandingsFromDb(season);
      }
    }

    if (data && data.length > 0) {
      return res.json({
        ok: true,
        season,
        ...(seasonRequested != null ? { season_requested: seasonRequested } : null),
        data,
      });
    }

    const games = await Game.find({ season });
    const records = {};
    games.forEach((g) => {
      const home = g.home_team?.abbreviation;
      const away = g.visitor_team?.abbreviation;
      const homeScore = g.home_score ?? 0;
      const awayScore = g.visitor_score ?? 0;
      if (!home || !away) return;
      if (!records[home]) {
        records[home] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
      }
      if (!records[away]) {
        records[away] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
      }
      records[home].pointsFor += homeScore;
      records[home].pointsAgainst += awayScore;
      records[away].pointsFor += awayScore;
      records[away].pointsAgainst += homeScore;
      if (homeScore > awayScore) {
        records[home].wins++;
        records[away].losses++;
      } else if (awayScore > homeScore) {
        records[away].wins++;
        records[home].losses++;
      } else {
        records[home].ties++;
        records[away].ties++;
      }
    });

    const teams = await Team.find({});
    const divisions = new Map();

    teams.forEach((t) => {
      const abbr = t.abbreviation;
      const rec = records[abbr] || {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
      const gp = rec.wins + rec.losses + rec.ties;
      const winPct = gp ? (rec.wins + 0.5 * rec.ties) / gp : 0;
      const entry = {
        team_id: t.ballDontLieTeamId,
        team: {
          id: t.ballDontLieTeamId,
          abbreviation: t.abbreviation,
          name: t.name,
          full_name: t.fullName || t.name,
        },
        name: t.fullName || t.name,
        conference: t.conference || null,
        division: t.division || null,
        wins: rec.wins,
        losses: rec.losses,
        ties: rec.ties,
        record: formatRecord(rec),
        win_pct: winPct,
        points_for: rec.pointsFor,
        points_against: rec.pointsAgainst,
        point_diff: rec.pointsFor - rec.pointsAgainst,
        point_differential: rec.pointsFor - rec.pointsAgainst,
      };
      const divisionKey = t.division || "Unknown";
      if (!divisions.has(divisionKey)) divisions.set(divisionKey, []);
      divisions.get(divisionKey).push(entry);
    });

    const computedData = [];
    divisions.forEach((teamsInDiv) => {
      teamsInDiv.sort((a, b) => {
        if (b.win_pct !== a.win_pct) return b.win_pct - a.win_pct;
        return b.point_diff - a.point_diff;
      });
      teamsInDiv.forEach((team, idx) => {
        computedData.push({ ...team, rank: idx + 1 });
      });
    });

    return res.json({
      ok: true,
      season,
      ...(seasonRequested != null ? { season_requested: seasonRequested } : null),
      data: computedData,
    });
  } catch (err) {
    console.error("standings error:", err);
    return res.status(500).json({ ok: false, error: "Failed to compute standings" });
  }
}

// GET /api/standings?season=YYYY
router.get("/", buildStandings);

// GET /api/standings/:season
router.get("/:season", buildStandings);

module.exports = router;
