// server/routes/stats.js
const express = require("express");
const router = express.Router();

const Game = require("../models/Game");
const Player = require("../models/Player");
const SeasonStat = require("../models/SeasonStat");
const Stat = require("../models/Stat");
const Team = require("../models/Team");
const TeamStat = require("../models/TeamStat");
const TeamSeasonStat = require("../models/TeamSeasonStat");
const AdvancedMetric = require("../models/AdvancedMetric");
const { bdlList } = require("../utils/apiUtils");
const { getCurrentSeasonAndWeek } = require("../utils/weekUtils");

const STAT_KEYS = {
  passing_yards: [
    "passing_yards",
    "pass_yards",
    "passingYards",
    "passYards",
    "passing.yards",
    "pass.yards",
    "passing.yds",
  ],
  passing_tds: [
    "passing_tds",
    "pass_tds",
    "pass_td",
    "passing_td",
    "passing_touchdowns",
    "pass_touchdowns",
    "passingTouchdowns",
    "passTDs",
    "passing.tds",
    "passing.touchdowns",
  ],
  interceptions: [
    "interceptions",
    "passing_ints",
    "pass_ints",
    "passing_interceptions",
    "ints",
    "interception",
    "passing.interceptions",
    "defensive_interceptions",
    "defense_interceptions",
    "defensive_ints",
    "defense_ints",
    "defense.interceptions",
    "defense.ints",
    "defenseInt",
    "defenseInts",
  ],
  rushing_yards: [
    "rushing_yards",
    "rush_yards",
    "rushingYards",
    "rushYards",
    "rushing.yards",
    "rush.yards",
    "rushing.yds",
  ],
  rushing_attempts: [
    "rushing_attempts",
    "rush_attempts",
    "rush_att",
    "rushing_att",
  ],
  rushing_tds: [
    "rushing_tds",
    "rush_tds",
    "rush_td",
    "rushing_td",
    "rushing_touchdowns",
    "rush_touchdowns",
    "rushingTouchdowns",
    "rushTDs",
    "rushing.tds",
    "rushing.touchdowns",
  ],
  receiving_yards: [
    "receiving_yards",
    "rec_yards",
    "receivingYards",
    "recYards",
    "receiving.yards",
    "receiving.yds",
  ],
  receiving_targets: [
    "receiving_targets",
    "targets",
    "target",
  ],
  yards_per_reception: [
    "yards_per_reception",
    "receiving_yards_per_reception",
    "yardsPerReception",
  ],
  receiving_tds: [
    "receiving_tds",
    "rec_tds",
    "rec_td",
    "receiving_td",
    "receiving_touchdowns",
    "rec_touchdowns",
    "receivingTouchdowns",
    "recTDs",
    "receiving.tds",
    "receiving.touchdowns",
  ],
  receptions: [
    "receptions",
    "rec",
    "catches",
    "receiving_receptions",
    "receiving.receptions",
  ],
  passing_attempts: [
    "passing_attempts",
    "pass_attempts",
    "attempts",
    "pass_att",
    "passing.attempts",
    "passing.att",
    "passing.atts",
    "passingAttempts",
  ],
  passing_completions: [
    "passing_completions",
    "pass_completions",
    "completions",
    "pass_comp",
    "passing.completions",
    "passing.comp",
    "passing.cmp",
    "passingCompletions",
  ],
  tackles: ["tackles", "total_tackles", "combined_tackles"],
  sacks: [
    "sacks",
    "sack",
    "sacks_total",
    "defensive_sacks",
    "defense_sacks",
    "defensive_sack",
    "defense_sack",
    "defense.sacks",
    "defense.sack",
  ],
  sacks_allowed: [
    "sacks_allowed",
    "sacksAllowed",
    "qb_sacks_allowed",
    "sacks_allowed_total",
    "passing_sacks_allowed",
  ],
  qb_hits: [
    "qb_hits",
    "qbHits",
    "quarterback_hits",
    "pressure_hits",
  ],
  tackles_for_loss: [
    "tackles_for_loss",
    "tfl",
    "tackles_for_loss_total",
    "tfl_total",
    "defensive_tackles_for_loss",
    "defense.tackles_for_loss",
    "defense.tfl",
    "defense.tackles_for_loss_total",
    "defense.tfl_total",
  ],
  passes_defended: [
    "passes_defended",
    "pass_defended",
    "passes_defensed",
    "passes_defensed_total",
    "passes_defended_total",
    "defensive_passes_defended",
    "defense.passes_defended",
    "defense.pass_defended",
    "defense.passes_defensed",
    "defense.passes_defended_total",
  ],
  forced_fumbles: [
    "forced_fumbles",
    "fumbles_forced",
    "defensive_forced_fumbles",
    "defense.forced_fumbles",
    "defense.fumbles_forced",
  ],
  fumbles_recovered: [
    "fumbles_recovered",
    "defensive_fumbles_recovered",
    "fumbles_recovery",
    "defense.fumbles_recovered",
  ],
  points: [
    "points",
    "points_scored",
    "score",
    "pointsFor",
    "points_for",
    "points_for_total",
    "total_points",
    "points_scored_total",
  ],
  field_goals_made: [
    "field_goals_made",
    "fg_made",
    "fgm",
    "kicking.field_goals_made",
    "kicking.fg_made",
  ],
  field_goals_attempted: [
    "field_goals_attempted",
    "fg_attempted",
    "fga",
    "kicking.field_goals_attempted",
    "kicking.fg_attempted",
  ],
  field_goals_long: [
    "field_goals_long",
    "fg_long",
    "long_field_goal",
    "kicking.field_goals_long",
  ],
  extra_points_made: [
    "extra_points_made",
    "xp_made",
    "xpm",
    "kicking.extra_points_made",
  ],
  extra_points_attempted: [
    "extra_points_attempted",
    "xp_attempted",
    "xpa",
    "kicking.extra_points_attempted",
  ],
  punts: [
    "punts",
    "punting.punts",
  ],
  punt_yards: [
    "punting_yards",
    "punt_yards",
    "punting.yards",
  ],
  punts_inside_20: [
    "punts_inside_20",
    "punts_inside20",
    "punting.punts_inside_20",
  ],
  long_punt: [
    "long_punt",
    "punt_long",
    "punting.long",
  ],
  field_goals_made_0_19: [
    "field_goals_made_0_19",
    "fg_made_0_19",
    "field_goals_made_1_19",
  ],
  field_goals_attempted_0_19: [
    "field_goals_attempted_0_19",
    "fg_attempted_0_19",
    "field_goals_attempted_1_19",
  ],
  field_goals_made_20_29: [
    "field_goals_made_20_29",
    "fg_made_20_29",
  ],
  field_goals_attempted_20_29: [
    "field_goals_attempted_20_29",
    "fg_attempted_20_29",
  ],
  field_goals_made_30_39: [
    "field_goals_made_30_39",
    "fg_made_30_39",
  ],
  field_goals_attempted_30_39: [
    "field_goals_attempted_30_39",
    "fg_attempted_30_39",
  ],
  field_goals_made_40_49: [
    "field_goals_made_40_49",
    "fg_made_40_49",
  ],
  field_goals_attempted_40_49: [
    "field_goals_attempted_40_49",
    "fg_attempted_40_49",
  ],
  field_goals_made_50_59: [
    "field_goals_made_50_59",
    "fg_made_50_59",
  ],
  field_goals_attempted_50_59: [
    "field_goals_attempted_50_59",
    "fg_attempted_50_59",
  ],
  field_goals_made_60_plus: [
    "field_goals_made_60_plus",
    "field_goals_made_60",
    "fg_made_60_plus",
  ],
  field_goals_attempted_60_plus: [
    "field_goals_attempted_60_plus",
    "field_goals_attempted_60",
    "fg_attempted_60_plus",
  ],
  games: ["games", "games_played", "gp", "games_played_total"],
};

function getNestedValue(source, key) {
  if (!source || !key) return undefined;
  if (!key.includes(".")) return source[key];
  const parts = key.split(".");
  let current = source;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function pickNumber(source, keys) {
  if (!source) return null;
  for (const key of keys) {
    const val = getNestedValue(source, key);
    if (val !== undefined && val !== null && !Number.isNaN(Number(val))) {
      return Number(val);
    }
  }
  return null;
}

function sumStatsRows(rows, keys) {
  return rows.reduce((sum, row) => {
    const stats = row.stats || row.raw || {};
    const val = pickNumber(stats, keys);
    return sum + (val || 0);
  }, 0);
}

function normalizeTotals(stats) {
  return {
    passing_yards: pickNumber(stats, STAT_KEYS.passing_yards),
    passing_tds: pickNumber(stats, STAT_KEYS.passing_tds),
    interceptions: pickNumber(stats, STAT_KEYS.interceptions),
    rushing_yards: pickNumber(stats, STAT_KEYS.rushing_yards),
    rushing_attempts: pickNumber(stats, STAT_KEYS.rushing_attempts),
    rushing_tds: pickNumber(stats, STAT_KEYS.rushing_tds),
    receiving_yards: pickNumber(stats, STAT_KEYS.receiving_yards),
    receiving_targets: pickNumber(stats, STAT_KEYS.receiving_targets),
    yards_per_reception: pickNumber(stats, STAT_KEYS.yards_per_reception),
    receiving_tds: pickNumber(stats, STAT_KEYS.receiving_tds),
    receptions: pickNumber(stats, STAT_KEYS.receptions),
    passing_attempts: pickNumber(stats, STAT_KEYS.passing_attempts),
    passing_completions: pickNumber(stats, STAT_KEYS.passing_completions),
    tackles: pickNumber(stats, STAT_KEYS.tackles),
    sacks: pickNumber(stats, STAT_KEYS.sacks),
    sacks_allowed: pickNumber(stats, STAT_KEYS.sacks_allowed),
    qb_hits: pickNumber(stats, STAT_KEYS.qb_hits),
    tackles_for_loss: pickNumber(stats, STAT_KEYS.tackles_for_loss),
    passes_defended: pickNumber(stats, STAT_KEYS.passes_defended),
    forced_fumbles: pickNumber(stats, STAT_KEYS.forced_fumbles),
    fumbles_recovered: pickNumber(stats, STAT_KEYS.fumbles_recovered),
    points: pickNumber(stats, STAT_KEYS.points),
    punts: pickNumber(stats, STAT_KEYS.punts),
    punt_yards: pickNumber(stats, STAT_KEYS.punt_yards),
    punts_inside_20: pickNumber(stats, STAT_KEYS.punts_inside_20),
    long_punt: pickNumber(stats, STAT_KEYS.long_punt),
    field_goals_made: pickNumber(stats, STAT_KEYS.field_goals_made),
    field_goals_attempted: pickNumber(stats, STAT_KEYS.field_goals_attempted),
    field_goals_long: pickNumber(stats, STAT_KEYS.field_goals_long),
    extra_points_made: pickNumber(stats, STAT_KEYS.extra_points_made),
    extra_points_attempted: pickNumber(stats, STAT_KEYS.extra_points_attempted),
    field_goals_made_0_19: pickNumber(stats, STAT_KEYS.field_goals_made_0_19),
    field_goals_attempted_0_19: pickNumber(stats, STAT_KEYS.field_goals_attempted_0_19),
    field_goals_made_20_29: pickNumber(stats, STAT_KEYS.field_goals_made_20_29),
    field_goals_attempted_20_29: pickNumber(stats, STAT_KEYS.field_goals_attempted_20_29),
    field_goals_made_30_39: pickNumber(stats, STAT_KEYS.field_goals_made_30_39),
    field_goals_attempted_30_39: pickNumber(stats, STAT_KEYS.field_goals_attempted_30_39),
    field_goals_made_40_49: pickNumber(stats, STAT_KEYS.field_goals_made_40_49),
    field_goals_attempted_40_49: pickNumber(stats, STAT_KEYS.field_goals_attempted_40_49),
    field_goals_made_50_59: pickNumber(stats, STAT_KEYS.field_goals_made_50_59),
    field_goals_attempted_50_59: pickNumber(stats, STAT_KEYS.field_goals_attempted_50_59),
    field_goals_made_60_plus: pickNumber(stats, STAT_KEYS.field_goals_made_60_plus),
    field_goals_attempted_60_plus: pickNumber(stats, STAT_KEYS.field_goals_attempted_60_plus),
    games: pickNumber(stats, STAT_KEYS.games),
  };
}

function resolvePerGamePoints(stats) {
  return pickNumber(stats, [
    "points_for_per_game",
    "points_per_game",
    "pointsPerGame",
    "points_for_pg",
    "points_pg",
  ]);
}

function mergeTotals(baseTotals, fallbackTotals) {
  if (!baseTotals) return fallbackTotals;
  const merged = { ...baseTotals };
  Object.keys(fallbackTotals || {}).forEach((key) => {
    if (merged[key] === null || merged[key] === undefined) {
      merged[key] = fallbackTotals[key];
    }
  });
  return merged;
}

function summarizeWeekly(rows) {
  const weekly = new Map();
  for (const row of rows) {
    const week = row.week != null ? Number(row.week) : null;
    if (week == null || Number.isNaN(week)) continue;
    if (!weekly.has(week)) weekly.set(week, []);
    weekly.get(week).push(row);
  }
  const entries = Array.from(weekly.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, items]) => ({
      week,
      passing_yards: sumStatsRows(items, STAT_KEYS.passing_yards),
      passing_tds: sumStatsRows(items, STAT_KEYS.passing_tds),
      interceptions: sumStatsRows(items, STAT_KEYS.interceptions),
      rushing_yards: sumStatsRows(items, STAT_KEYS.rushing_yards),
      rushing_attempts: sumStatsRows(items, STAT_KEYS.rushing_attempts),
      rushing_tds: sumStatsRows(items, STAT_KEYS.rushing_tds),
      receiving_yards: sumStatsRows(items, STAT_KEYS.receiving_yards),
      receiving_targets: sumStatsRows(items, STAT_KEYS.receiving_targets),
      receiving_tds: sumStatsRows(items, STAT_KEYS.receiving_tds),
      yards_per_reception: sumStatsRows(items, STAT_KEYS.yards_per_reception),
      receptions: sumStatsRows(items, STAT_KEYS.receptions),
      passing_attempts: sumStatsRows(items, STAT_KEYS.passing_attempts),
      passing_completions: sumStatsRows(items, STAT_KEYS.passing_completions),
      tackles: sumStatsRows(items, STAT_KEYS.tackles),
      sacks: sumStatsRows(items, STAT_KEYS.sacks),
      sacks_allowed: sumStatsRows(items, STAT_KEYS.sacks_allowed),
      qb_hits: sumStatsRows(items, STAT_KEYS.qb_hits),
      tackles_for_loss: sumStatsRows(items, STAT_KEYS.tackles_for_loss),
      passes_defended: sumStatsRows(items, STAT_KEYS.passes_defended),
      forced_fumbles: sumStatsRows(items, STAT_KEYS.forced_fumbles),
      fumbles_recovered: sumStatsRows(items, STAT_KEYS.fumbles_recovered),
      punts: sumStatsRows(items, STAT_KEYS.punts),
      punt_yards: sumStatsRows(items, STAT_KEYS.punt_yards),
      punts_inside_20: sumStatsRows(items, STAT_KEYS.punts_inside_20),
      long_punt: sumStatsRows(items, STAT_KEYS.long_punt),
      field_goals_made: sumStatsRows(items, STAT_KEYS.field_goals_made),
      field_goals_attempted: sumStatsRows(items, STAT_KEYS.field_goals_attempted),
      field_goals_long: sumStatsRows(items, STAT_KEYS.field_goals_long),
      extra_points_made: sumStatsRows(items, STAT_KEYS.extra_points_made),
      extra_points_attempted: sumStatsRows(items, STAT_KEYS.extra_points_attempted),
      field_goals_made_0_19: sumStatsRows(items, STAT_KEYS.field_goals_made_0_19),
      field_goals_attempted_0_19: sumStatsRows(items, STAT_KEYS.field_goals_attempted_0_19),
      field_goals_made_20_29: sumStatsRows(items, STAT_KEYS.field_goals_made_20_29),
      field_goals_attempted_20_29: sumStatsRows(items, STAT_KEYS.field_goals_attempted_20_29),
      field_goals_made_30_39: sumStatsRows(items, STAT_KEYS.field_goals_made_30_39),
      field_goals_attempted_30_39: sumStatsRows(items, STAT_KEYS.field_goals_attempted_30_39),
      field_goals_made_40_49: sumStatsRows(items, STAT_KEYS.field_goals_made_40_49),
      field_goals_attempted_40_49: sumStatsRows(items, STAT_KEYS.field_goals_attempted_40_49),
      field_goals_made_50_59: sumStatsRows(items, STAT_KEYS.field_goals_made_50_59),
      field_goals_attempted_50_59: sumStatsRows(items, STAT_KEYS.field_goals_attempted_50_59),
      field_goals_made_60_plus: sumStatsRows(items, STAT_KEYS.field_goals_made_60_plus),
      field_goals_attempted_60_plus: sumStatsRows(items, STAT_KEYS.field_goals_attempted_60_plus),
    }));
  return entries;
}

async function resolveGamesPlayed(teamAbbr, season) {
  const games = await Game.find({
    season,
    $or: [
      { "home_team.abbreviation": teamAbbr },
      { "visitor_team.abbreviation": teamAbbr },
    ],
  })
    .select({ gameId: 1 })
    .lean();
  return games.length;
}

function formatRecordLine(wins, losses, ties) {
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

async function computeVenueRecords(teamAbbr, season) {
  const games = await Game.find({
    season,
    $or: [
      { "home_team.abbreviation": teamAbbr },
      { "visitor_team.abbreviation": teamAbbr },
    ],
  })
    .select({ home_team: 1, visitor_team: 1, home_score: 1, visitor_score: 1, date: 1 })
    .lean();

  let homeWins = 0;
  let homeLosses = 0;
  let homeTies = 0;
  let awayWins = 0;
  let awayLosses = 0;
  let awayTies = 0;

  const scoredGames = games.filter(
    (g) => g.home_score != null && g.visitor_score != null
  );

  scoredGames.forEach((g) => {
    const isHome = g.home_team?.abbreviation === teamAbbr;
    const homeScore = g.home_score ?? 0;
    const awayScore = g.visitor_score ?? 0;
    if (homeScore === awayScore) {
      if (isHome) homeTies += 1;
      else awayTies += 1;
      return;
    }
    const didWin = isHome ? homeScore > awayScore : awayScore > homeScore;
    if (isHome) {
      if (didWin) homeWins += 1;
      else homeLosses += 1;
    } else {
      if (didWin) awayWins += 1;
      else awayLosses += 1;
    }
  });

  const sorted = scoredGames
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  let recentWins = 0;
  let recentLosses = 0;
  let recentTies = 0;
  let streakType = null;
  let streakCount = 0;
  for (const g of sorted) {
    const isHome = g.home_team?.abbreviation === teamAbbr;
    const homeScore = g.home_score ?? 0;
    const awayScore = g.visitor_score ?? 0;
    let result = "T";
    if (homeScore !== awayScore) {
      const didWin = isHome ? homeScore > awayScore : awayScore > homeScore;
      result = didWin ? "W" : "L";
    }
    if (result === "W") recentWins += 1;
    else if (result === "L") recentLosses += 1;
    else recentTies += 1;
    if (!streakType) {
      streakType = result;
      streakCount = 1;
    } else if (streakType === result) {
      streakCount += 1;
    } else {
      break;
    }
  }

  const streak =
    streakType && streakCount ? `${streakType}${streakCount}` : null;

  return {
    home_record: formatRecordLine(homeWins, homeLosses, homeTies),
    away_record: formatRecordLine(awayWins, awayLosses, awayTies),
    last_five: formatRecordLine(recentWins, recentLosses, recentTies),
    streak,
  };
}

async function resolveLatestSeasonForPlayer(playerId, postseason) {
  const query = { playerId };
  if (postseason) query["stats.postseason"] = true;
  else query["stats.postseason"] = { $ne: true };

  const seasonDoc = await SeasonStat.findOne(query)
    .sort({ season: -1 })
    .select({ season: 1 })
    .lean();
  if (seasonDoc && seasonDoc.season) return seasonDoc.season;

  const statDoc = await Stat.findOne(query)
    .sort({ season: -1 })
    .select({ season: 1 })
    .lean();
  if (statDoc && statDoc.season) return statDoc.season;

  return getCurrentSeasonAndWeek().season;
}

async function resolveSeasonStatDoc(playerId, seasonParam, postseason) {
  if (seasonParam == null || seasonParam === "") {
    const season = getCurrentSeasonAndWeek().season;
    const query = { playerId, season };
    if (postseason) query["stats.postseason"] = true;
    else query["stats.postseason"] = { $ne: true };
    let seasonDoc = await SeasonStat.findOne(query).lean();
    if (!seasonDoc) {
      const weeklyExists = await Stat.findOne(query).select({ _id: 1 }).lean();
      if (!weeklyExists) {
        const fallbackSeason = await resolveLatestSeasonForPlayer(playerId, postseason);
        if (fallbackSeason && fallbackSeason !== season) {
          const fallbackQuery = { playerId, season: fallbackSeason };
          if (postseason) fallbackQuery["stats.postseason"] = true;
          else fallbackQuery["stats.postseason"] = { $ne: true };
          seasonDoc = await SeasonStat.findOne(fallbackQuery).lean();
          return { seasonDoc, seasonUsed: fallbackSeason, postseasonUsed: postseason };
        }
      }
    }
    return { seasonDoc, seasonUsed: season, postseasonUsed: postseason };
  }

  const season = Number(seasonParam);
  if (Number.isNaN(season)) {
    return { error: "Invalid season" };
  }

  if (postseason) {
    let seasonDoc = await SeasonStat.findOne({
      playerId,
      season,
      "stats.postseason": true,
    }).lean();
    if (!seasonDoc) {
      seasonDoc = await SeasonStat.findOne({ playerId, season }).lean();
    }
    return { seasonDoc, seasonUsed: season, postseasonUsed: postseason };
  }

  let seasonDoc = await SeasonStat.findOne({
    playerId,
    season,
    "stats.postseason": { $ne: true },
  }).lean();
  if (!seasonDoc) {
    const fallbackSeason = await resolveLatestSeasonForPlayer(playerId, false);
    if (fallbackSeason && fallbackSeason !== season) {
      seasonDoc = await SeasonStat.findOne({
        playerId,
        season: fallbackSeason,
        "stats.postseason": { $ne: true },
      }).lean();
      if (seasonDoc) {
        return {
          seasonDoc,
          seasonUsed: fallbackSeason,
          postseasonUsed: false,
          seasonRequested: season,
        };
      }
    }
  }

  return {
    seasonDoc,
    seasonUsed: season,
    postseasonUsed: postseason,
  };
}

async function resolveLatestSeasonForTeam(teamId, postseason) {
  const seasonDoc = await TeamSeasonStat.findOne({
    teamId,
    postseason: postseason ? true : { $ne: true },
  })
    .sort({ season: -1 })
    .select({ season: 1 })
    .lean();
  if (seasonDoc && seasonDoc.season) return seasonDoc.season;

  const statDoc = await Stat.findOne({
    teamId,
    ...(postseason ? { "stats.postseason": true } : { "stats.postseason": { $ne: true } }),
  })
    .sort({ season: -1 })
    .select({ season: 1 })
    .lean();
  if (statDoc && statDoc.season) return statDoc.season;

  return getCurrentSeasonAndWeek().season;
}

async function resolveTeamSeasonDoc(teamId, seasonParam, postseason) {
  if (seasonParam == null || seasonParam === "") {
    const season = getCurrentSeasonAndWeek().season;
    let seasonDoc = await TeamSeasonStat.findOne({
      teamId,
      season,
      postseason: postseason ? true : { $ne: true },
    }).lean();
    if (!seasonDoc) {
      const weeklyExists = await Stat.findOne({
        teamId,
        season,
        ...(postseason ? { "stats.postseason": true } : { "stats.postseason": { $ne: true } }),
      })
        .select({ _id: 1 })
        .lean();
      if (!weeklyExists) {
        const fallbackSeason = await resolveLatestSeasonForTeam(teamId, postseason);
        if (fallbackSeason && fallbackSeason !== season) {
          seasonDoc = await TeamSeasonStat.findOne({
            teamId,
            season: fallbackSeason,
            postseason: postseason ? true : { $ne: true },
          }).lean();
          return { seasonDoc, seasonUsed: fallbackSeason, postseasonUsed: postseason };
        }
      }
    }
    return { seasonDoc, seasonUsed: season, postseasonUsed: postseason };
  }

  const season = Number(seasonParam);
  if (Number.isNaN(season)) {
    return { error: "Invalid season" };
  }

  if (postseason) {
    let seasonDoc = await TeamSeasonStat.findOne({ teamId, season, postseason: true }).lean();
    if (!seasonDoc) {
      seasonDoc = await TeamSeasonStat.findOne({ teamId, season }).lean();
    }
    return { seasonDoc, seasonUsed: season, postseasonUsed: postseason };
  }

  let seasonDoc = await TeamSeasonStat.findOne({
    teamId,
    season,
    postseason: { $ne: true },
  }).lean();
  if (!seasonDoc) {
    const fallbackSeason = await resolveLatestSeasonForTeam(teamId, false);
    if (fallbackSeason && fallbackSeason !== season) {
      seasonDoc = await TeamSeasonStat.findOne({
        teamId,
        season: fallbackSeason,
        postseason: { $ne: true },
      }).lean();
      if (seasonDoc) {
        return {
          seasonDoc,
          seasonUsed: fallbackSeason,
          postseasonUsed: false,
          seasonRequested: season,
        };
      }
    }
  }

  return {
    seasonDoc,
    seasonUsed: season,
    postseasonUsed: postseason,
  };
}

function normalizeAdvancedMetrics(doc) {
  if (!doc) return null;
  const metrics =
    doc.metrics ||
    (doc.sources && doc.sources.computed && doc.sources.computed.specific) ||
    null;
  if (!metrics) return null;
  const pick = (key) => {
    const val = metrics[key];
    if (val === undefined || val === null || Number.isNaN(Number(val))) return null;
    return Number(val);
  };
  const normalized = {
    passer_rating: pick("passer_rating"),
    completion_pct: pick("completion_pct"),
    yards_per_attempt: pick("yards_per_attempt"),
    yards_per_carry: pick("yards_per_carry"),
    catch_rate: pick("catch_rate"),
    yards_per_target: pick("yards_per_target"),
    qbr: pick("qbr"),
  };
  const hasValue = Object.values(normalized).some(
    (val) => val !== null && val !== undefined
  );
  return hasValue ? normalized : null;
}

async function resolveSeasonForSummary(seasonParam) {
  if (seasonParam != null && seasonParam !== "") {
    const season = Number(seasonParam);
    if (Number.isNaN(season)) {
      return { error: "Invalid season" };
    }
    return { season };
  }
  const requested = getCurrentSeasonAndWeek().season;
  const exists = await TeamSeasonStat.exists({
    season: requested,
    postseason: { $ne: true },
  });
  if (exists) return { season: requested };
  const latest = await TeamSeasonStat.findOne({
    postseason: { $ne: true },
  })
    .sort({ season: -1 })
    .select({ season: 1 })
    .lean();
  if (latest?.season) {
    return { season: latest.season, seasonRequested: requested };
  }
  return { season: requested };
}

async function resolveSeasonForPlayerList(seasonParam) {
  if (seasonParam != null && seasonParam !== "") {
    const season = Number(seasonParam);
    if (Number.isNaN(season)) {
      return { error: "Invalid season" };
    }
    return { season };
  }
  const requested = getCurrentSeasonAndWeek().season;
  const exists = await SeasonStat.exists({
    season: requested,
    "stats.postseason": { $ne: true },
  });
  if (exists) return { season: requested };
  const latest = await SeasonStat.findOne({
    "stats.postseason": { $ne: true },
  })
    .sort({ season: -1 })
    .select({ season: 1 })
    .lean();
  if (latest?.season) {
    return { season: latest.season, seasonRequested: requested };
  }
  return { season: requested };
}

function resolvePositionFilter(positionParam) {
  const raw = String(positionParam || "").toUpperCase().trim();
  if (!raw) return null;
  if (["QB"].includes(raw)) return { group: "QB", positions: ["QB"] };
  if (["RB"].includes(raw)) return { group: "RB", positions: ["RB", "HB", "FB"] };
  if (["HB", "FB"].includes(raw)) return { group: raw, positions: [raw] };
  if (["WR"].includes(raw)) return { group: "WR", positions: ["WR"] };
  if (["TE"].includes(raw)) return { group: "TE", positions: ["TE"] };
  if (["OL"].includes(raw)) {
    return { group: "OL", positions: ["OL", "C", "G", "OG", "OT", "T", "LT", "RT", "LG", "RG"] };
  }
  if (["C", "G", "OG", "OT", "T", "LT", "RT", "LG", "RG"].includes(raw)) {
    return { group: raw, positions: [raw] };
  }
  if (["DL"].includes(raw)) {
    return { group: "DL", positions: ["DL", "DE", "DT", "NT", "EDGE"] };
  }
  if (["DE", "DT", "NT", "EDGE"].includes(raw)) {
    return { group: raw, positions: [raw] };
  }
  if (["LB"].includes(raw)) {
    return { group: "LB", positions: ["LB", "OLB", "ILB", "MLB"] };
  }
  if (["OLB", "ILB", "MLB"].includes(raw)) {
    return { group: raw, positions: [raw] };
  }
  if (["DB"].includes(raw)) {
    return { group: "DB", positions: ["DB", "CB", "FS", "SS", "S"] };
  }
  if (["CB", "FS", "SS", "S"].includes(raw)) {
    return { group: raw, positions: [raw] };
  }
  if (["K", "PK"].includes(raw)) return { group: "K", positions: ["K", "PK"] };
  if (["P"].includes(raw)) return { group: "P", positions: ["P"] };
  return { group: raw, positions: [raw] };
}

function primaryStatForGroup(group, totals) {
  if (!totals) return 0;
  let primary = 0;
  if (group === "QB") primary = totals.passing_attempts || totals.passing_yards || 0;
  else if (["RB", "HB", "FB"].includes(group)) {
    primary = totals.rushing_attempts || totals.rushing_yards || 0;
  }
  else if (group === "WR") primary = totals.receiving_targets || totals.receiving_yards || 0;
  else if (group === "TE") primary = totals.receiving_targets || totals.receiving_yards || 0;
  else if (["DL", "DE", "DT", "NT", "EDGE"].includes(group)) {
    primary = totals.sacks || totals.tackles || 0;
  }
  else if (["LB", "OLB", "ILB", "MLB"].includes(group)) primary = totals.tackles || 0;
  else if (["DB", "CB", "FS", "SS", "S"].includes(group)) {
    primary = totals.interceptions || totals.tackles || 0;
  }
  else primary = totals.games || 0;
  if (!primary && totals.games) return totals.games;
  return primary;
}

function buildRankMap(list, key, order = "desc") {
  const entries = list
    .filter((row) => row && row[key] != null && !Number.isNaN(Number(row[key])))
    .slice()
    .sort((a, b) => {
      if (order === "asc") return Number(a[key]) - Number(b[key]);
      return Number(b[key]) - Number(a[key]);
    });
  const map = new Map();
  entries.forEach((row, idx) => {
    map.set(row.team_abbr, idx + 1);
  });
  return { map, count: entries.length };
}

function buildFallbackAdvanced(stats, totals, position) {
  if (!stats) return null;
  const pos = String(position || "").toUpperCase();
  const pick = (keys) => pickNumber(stats, keys);
  const completions = pick(["passing_completions"]);
  const attempts = pick(["passing_attempts"]);
  const completionPct =
    pick(["passing_completion_pct"]) ||
    (attempts ? (completions / attempts) * 100 : null);
  const targets = pick(["receiving_targets"]);
  const receptions = pick(["receptions"]);
  const catchRate =
    pick(["catch_rate"]) || (targets ? (receptions / targets) * 100 : null);
  const yardsPerTarget =
    targets && totals?.receiving_yards != null
      ? totals.receiving_yards / targets
      : null;
  const yardsPerReception =
    pick(["yards_per_reception"]) ||
    (receptions && totals?.receiving_yards != null
      ? totals.receiving_yards / receptions
      : null);
  const games = pick(["games_played", "games", "gp"]) || totals?.games || null;
  const tacklesPerGame =
    games && totals?.tackles != null ? totals.tackles / games : null;
  const sacksPerGame =
    games && totals?.sacks != null ? totals.sacks / games : null;
  const interceptionsPerGame =
    games && totals?.interceptions != null ? totals.interceptions / games : null;

  const fallback = {
    passer_rating: pick(["passer_rating", "qbr"]),
    qbr: pick(["qbr"]),
    completion_pct: completionPct,
    yards_per_attempt: pick(["yards_per_pass_attempt"]),
    yards_per_carry: pick(["yards_per_rush_attempt"]),
    yards_per_reception: yardsPerReception,
    yards_per_target: yardsPerTarget,
    catch_rate: catchRate,
    tackles_per_game: tacklesPerGame,
    sacks_per_game: sacksPerGame,
    interceptions_per_game: interceptionsPerGame,
    rushing_attempts: pick(["rushing_attempts", "rush_attempts"]),
    receiving_targets: pick(["receiving_targets", "targets"]),
    passing_attempts: pick(["passing_attempts", "pass_attempts"]),
    passing_completions: pick(["passing_completions", "completions"]),
    forced_fumbles: pick(["forced_fumbles", "fumbles_forced"]),
    fumbles_recovered: pick(["fumbles_recovered"]),
    qb_hits: pick(["qb_hits", "quarterback_hits"]),
    tackles_for_loss: pick(["tackles_for_loss", "tfl"]),
    passes_defended: pick(["passes_defended", "passes_defensed"]),
    sacks_allowed: pick(["sacks_allowed", "passing_sacks_allowed", "qb_sacks_allowed"]),
    pressures_allowed: pick(["pressures_allowed", "pressuresAllowed"]),
    ol_rating: pick(["ol_rating", "offensive_line_rating"]),
    receiving_yards_per_game: pick(["receiving_yards_per_game"]),
    rushing_yards_per_game: pick(["rushing_yards_per_game"]),
    passing_yards_per_game: pick(["passing_yards_per_game"]),
  };

  const hasValue = Object.values(fallback).some(
    (val) => val !== null && val !== undefined && !Number.isNaN(Number(val))
  );
  return hasValue ? fallback : null;
}

function computeQbDerivedMetrics(totals, weekly, seasonStats) {
  if (!totals) return {};
  const attempts = totals.passing_attempts;
  const passingYards = totals.passing_yards;
  const passingTds = totals.passing_tds;
  const interceptions = totals.interceptions;
  const games = totals.games || (Array.isArray(weekly) ? weekly.length : null);

  const pickFromStats = (keys) => pickNumber(seasonStats, keys);
  const completionPctFromStats = pickFromStats([
    "completion_pct",
    "passing_completion_pct",
    "completion_percentage",
    "pass_completion_pct",
    "pass_completion_percentage",
  ]);
  const yardsPerAttemptFromStats = pickFromStats([
    "yards_per_attempt",
    "yards_per_pass_attempt",
    "passing_yards_per_attempt",
    "pass_yards_per_attempt",
    "pass_yds_per_att",
    "pass_yds_att",
  ]);
  const passYardsPerGameFromStats = pickFromStats([
    "passing_yards_per_game",
    "pass_yards_per_game",
    "pass_yds_per_game",
    "pass_yds_g",
  ]);

  let completions = totals.passing_completions;
  if (completions == null && attempts && completionPctFromStats != null) {
    completions = Math.round((attempts * completionPctFromStats) / 100);
  }

  const completionPct =
    attempts && completions != null
      ? Number(((completions / attempts) * 100).toFixed(1))
      : completionPctFromStats != null
      ? Number(Number(completionPctFromStats).toFixed(1))
      : null;
  const yardsPerAttempt =
    attempts && passingYards != null
      ? Number((passingYards / attempts).toFixed(2))
      : yardsPerAttemptFromStats != null
      ? Number(Number(yardsPerAttemptFromStats).toFixed(2))
      : null;
  const passingYardsPerGame =
    games && passingYards != null
      ? Number((passingYards / games).toFixed(2))
      : passYardsPerGameFromStats != null
      ? Number(Number(passYardsPerGameFromStats).toFixed(2))
      : null;

  let passerRating = null;
  if (attempts && passingYards != null && completions != null) {
    const completionRatio = completions / attempts;
    const a = Math.min(Math.max(((completionRatio * 100) - 30) / 20, 0), 2.375);
    const b = Math.min(Math.max(((passingYards / attempts) - 3) / 4, 0), 2.375);
    const c = Math.min(Math.max(((passingTds || 0) / attempts) * 20, 0), 2.375);
    const d = Math.min(Math.max(2.375 - (((interceptions || 0) / attempts) * 25), 0), 2.375);
    passerRating = Number((((a + b + c + d) / 6) * 100).toFixed(1));
  }

  return {
    completion_pct: completionPct,
    yards_per_attempt: yardsPerAttempt,
    passing_yards_per_game: passingYardsPerGame,
    passer_rating: passerRating,
  };
}

async function fetchPlayerWeeklyFromApi(playerId, season, postseason) {
  const params = { per_page: 100, seasons: [season], player_ids: [playerId] };
  if (typeof postseason === "boolean") params.postseason = postseason;
  const res = await bdlList("/stats", params);
  const items = res && res.data ? res.data : [];
  return Array.isArray(items) ? items : [];
}

function resolvePositionGroup(position) {
  const pos = String(position || "").toUpperCase();
  if (pos.includes("QB") || pos.includes("QUARTERBACK")) return "QB";
  if (
    ["RB", "HB", "FB", "RUNNING BACK", "FULLBACK", "HALFBACK"].some((p) =>
      pos.includes(p)
    )
  )
    return "RB";
  if (["WR", "TE", "WIDE RECEIVER", "TIGHT END"].some((p) => pos.includes(p)))
    return "WR";
  if (
    ["OT", "OG", "C", "G", "T", "CENTER", "GUARD", "TACKLE", "OFFENSIVE LINE"].some(
      (p) => pos.includes(p)
    )
  )
    return "OL";
  if (
    ["DE", "DT", "DL", "LB", "OLB", "ILB", "MLB", "EDGE", "CB", "S", "FS", "SS", "DB"].some(
      (p) => pos.includes(p)
    )
  )
    return "DEF";
  return "OTHER";
}

function computeMetricValue(group, totals) {
  if (!totals) return null;
  if (group === "QB") {
    const yards = totals.passing_yards || 0;
    const tds = totals.passing_tds || 0;
    const ints = totals.interceptions || 0;
    return yards + tds * 20 - ints * 15;
  }
  if (group === "RB") {
    const rushYards = totals.rushing_yards || 0;
    const recYards = totals.receiving_yards || 0;
    const tds = (totals.rushing_tds || 0) + (totals.receiving_tds || 0);
    return rushYards + recYards * 0.5 + tds * 30;
  }
  if (group === "WR") {
    const recYards = totals.receiving_yards || 0;
    const tds = totals.receiving_tds || 0;
    return recYards + tds * 40;
  }
  if (group === "DEF") {
    const sacks = totals.sacks || 0;
    const tackles = totals.tackles || 0;
    const ints = totals.interceptions || 0;
    const fumbles = totals.forced_fumbles || 0;
    return sacks * 20 + tackles * 2 + ints * 25 + fumbles * 15;
  }
  if (group === "OL") {
    const sacksAllowed = totals.sacks_allowed;
    const pressures = totals.pressures_allowed;
    if (sacksAllowed != null) return -sacksAllowed;
    if (pressures != null) return -pressures;
    return null;
  }
  return null;
}

async function computePlayerGrade(playerId, season, position, totals) {
  const group = resolvePositionGroup(position);
  const metricValue = computeMetricValue(group, totals);
  if (metricValue == null) return null;

  const seasonDocs = await SeasonStat.find({
    season,
    "stats.postseason": { $ne: true },
  })
    .select({ stats: 1, playerId: 1 })
    .lean();

  const values = [];
  for (const doc of seasonDocs) {
    const stats = doc.stats || {};
    const playerInfo = stats.player || {};
    const docGroup = resolvePositionGroup(
      playerInfo.position || playerInfo.position_abbreviation
    );
    if (docGroup !== group) continue;
    const docTotals = normalizeTotals(stats);
    const value = computeMetricValue(group, docTotals);
    if (value != null && !Number.isNaN(value)) values.push(value);
  }
  if (!values.length) return null;

  const sorted = values.slice().sort((a, b) => a - b);
  const rank = sorted.filter((v) => v <= metricValue).length;
  const percentile = Math.round((rank / sorted.length) * 100);
  return {
    value: percentile,
    metric: "impact_score",
    group,
  };
}

router.get("/player/:playerId", async (req, res) => {
  const playerId = Number(req.params.playerId);
  const seasonParam = req.query.season;
  const includeRaw = String(req.query.raw || "") === "1";
  const postseason = String(req.query.postseason || "") === "1";
  if (Number.isNaN(playerId)) {
    return res.status(400).json({ ok: false, error: "Invalid playerId" });
  }
  try {
    let statsPlayerId = playerId;
    let resolved = await resolveSeasonStatDoc(playerId, seasonParam, postseason);
    if (resolved.error) {
      return res.status(400).json({ ok: false, error: resolved.error });
    }
    let seasonDoc = resolved.seasonDoc;
    let season = resolved.seasonUsed;
    if (!seasonDoc) {
      const playerLookup = await Player.findOne({
        $or: [{ PlayerID: playerId }, { bdlId: playerId }],
      })
        .select({ PlayerID: 1, bdlId: 1 })
        .lean();
      const altId =
        playerLookup?.PlayerID === playerId
          ? playerLookup?.bdlId
          : playerLookup?.PlayerID;
      if (altId != null && altId !== playerId) {
        const altResolved = await resolveSeasonStatDoc(altId, seasonParam, postseason);
        if (altResolved.seasonDoc) {
          statsPlayerId = altId;
          resolved = altResolved;
          seasonDoc = altResolved.seasonDoc;
          season = altResolved.seasonUsed;
        }
      }
    }
    let totals = seasonDoc ? normalizeTotals(seasonDoc.stats || {}) : null;

    let weeklyRows = await Stat.find({
      playerId: statsPlayerId,
      season,
      ...(postseason ? { "stats.postseason": true } : { "stats.postseason": { $ne: true } }),
    })
      .select({ week: 1, stats: 1, raw: 1 })
      .lean();

    if (weeklyRows.length === 0) {
      try {
        const apiRows = await fetchPlayerWeeklyFromApi(statsPlayerId, season, postseason);
        if (apiRows.length > 0) {
          const bulkOps = [];
          weeklyRows = apiRows.map((s) => {
            const statId = s.id || null;
            const gameId = s.game_id || (s.game && s.game.id) || null;
            const update = {
              statId,
              gameId,
              playerId: statsPlayerId,
              teamId: s.team_id || (s.team && s.team.id) || null,
              season: s.season || season,
              week: s.week || null,
              stats: s.stats || s || {},
              raw: s,
              updatedAt: new Date(),
            };
            let filter;
            if (statId) filter = { statId };
            else if (gameId && statsPlayerId) filter = { gameId, playerId: statsPlayerId };
            if (filter) {
              bulkOps.push({
                updateOne: {
                  filter,
                  update: { $set: update, $setOnInsert: { createdAt: new Date() } },
                  upsert: true,
                },
              });
            }
            return { week: update.week, stats: update.stats, raw: update.raw };
          });
          if (bulkOps.length > 0) {
            await Stat.bulkWrite(bulkOps, { ordered: false });
          }
        }
      } catch (err) {
        console.warn("stats weekly fetch failed:", err && err.message ? err.message : err);
      }
    }
    const weekly = summarizeWeekly(weeklyRows);

    const weeklyTotals = {
      passing_yards: sumStatsRows(weeklyRows, STAT_KEYS.passing_yards),
      passing_tds: sumStatsRows(weeklyRows, STAT_KEYS.passing_tds),
      interceptions: sumStatsRows(weeklyRows, STAT_KEYS.interceptions),
      rushing_yards: sumStatsRows(weeklyRows, STAT_KEYS.rushing_yards),
      rushing_attempts: sumStatsRows(weeklyRows, STAT_KEYS.rushing_attempts),
      rushing_tds: sumStatsRows(weeklyRows, STAT_KEYS.rushing_tds),
      receiving_yards: sumStatsRows(weeklyRows, STAT_KEYS.receiving_yards),
      receiving_targets: sumStatsRows(weeklyRows, STAT_KEYS.receiving_targets),
      yards_per_reception: sumStatsRows(weeklyRows, STAT_KEYS.yards_per_reception),
      receiving_tds: sumStatsRows(weeklyRows, STAT_KEYS.receiving_tds),
      receptions: sumStatsRows(weeklyRows, STAT_KEYS.receptions),
      passing_attempts: sumStatsRows(weeklyRows, STAT_KEYS.passing_attempts),
      passing_completions: sumStatsRows(weeklyRows, STAT_KEYS.passing_completions),
      tackles: sumStatsRows(weeklyRows, STAT_KEYS.tackles),
      sacks: sumStatsRows(weeklyRows, STAT_KEYS.sacks),
      sacks_allowed: sumStatsRows(weeklyRows, STAT_KEYS.sacks_allowed),
      qb_hits: sumStatsRows(weeklyRows, STAT_KEYS.qb_hits),
      tackles_for_loss: sumStatsRows(weeklyRows, STAT_KEYS.tackles_for_loss),
      passes_defended: sumStatsRows(weeklyRows, STAT_KEYS.passes_defended),
      forced_fumbles: sumStatsRows(weeklyRows, STAT_KEYS.forced_fumbles),
      fumbles_recovered: sumStatsRows(weeklyRows, STAT_KEYS.fumbles_recovered),
      punts: sumStatsRows(weeklyRows, STAT_KEYS.punts),
      punt_yards: sumStatsRows(weeklyRows, STAT_KEYS.punt_yards),
      punts_inside_20: sumStatsRows(weeklyRows, STAT_KEYS.punts_inside_20),
      long_punt: sumStatsRows(weeklyRows, STAT_KEYS.long_punt),
      field_goals_made: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_made),
      field_goals_attempted: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_attempted),
      field_goals_long: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_long),
      extra_points_made: sumStatsRows(weeklyRows, STAT_KEYS.extra_points_made),
      extra_points_attempted: sumStatsRows(weeklyRows, STAT_KEYS.extra_points_attempted),
      field_goals_made_0_19: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_made_0_19),
      field_goals_attempted_0_19: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_attempted_0_19),
      field_goals_made_20_29: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_made_20_29),
      field_goals_attempted_20_29: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_attempted_20_29),
      field_goals_made_30_39: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_made_30_39),
      field_goals_attempted_30_39: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_attempted_30_39),
      field_goals_made_40_49: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_made_40_49),
      field_goals_attempted_40_49: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_attempted_40_49),
      field_goals_made_50_59: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_made_50_59),
      field_goals_attempted_50_59: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_attempted_50_59),
      field_goals_made_60_plus: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_made_60_plus),
      field_goals_attempted_60_plus: sumStatsRows(weeklyRows, STAT_KEYS.field_goals_attempted_60_plus),
    };

    totals = mergeTotals(totals, weeklyTotals);

    const player = await Player.findOne({
      $or: [{ PlayerID: playerId }, { bdlId: playerId }],
    })
      .select({ full_name: 1, first_name: 1, last_name: 1, position: 1 })
      .lean();

    const advancedDoc = await AdvancedMetric.findOne({
      entityType: "player",
      entityId: statsPlayerId,
      season,
      scope: "season",
    }).lean();
    const seasonStats = seasonDoc ? seasonDoc.stats || {} : null;
    const advancedBase =
      normalizeAdvancedMetrics(advancedDoc) ||
      buildFallbackAdvanced(seasonStats, totals, player?.position);
    let advanced = advancedBase;
    const isQuarterback = String(player?.position || "").toUpperCase().includes("QB");
    if (isQuarterback) {
      const qbDerived = computeQbDerivedMetrics(totals, weekly, seasonStats);
      const hasBase = advanced ? { ...advanced } : {};
      const filled = { ...hasBase };
      Object.keys(qbDerived).forEach((key) => {
        const val = qbDerived[key];
        if (val == null || Number.isNaN(val)) return;
        if (filled[key] == null || Number.isNaN(filled[key]) || (filled[key] === 0 && val > 0)) {
          filled[key] = val;
        }
      });
      if (filled.passer_rating != null && (filled.qbr == null || (filled.qbr === 0 && filled.passer_rating > 0))) {
        filled.qbr = filled.passer_rating;
      }
      advanced = Object.keys(filled).length > 0 ? filled : advanced;
    }
    const grade = await computePlayerGrade(
      statsPlayerId,
      season,
      player?.position,
      totals
    );

    res.json({
      ok: true,
      player: player
        ? {
            id: playerId,
            name:
              player.full_name ||
              `${player.first_name || ""} ${player.last_name || ""}`.trim(),
            position: player.position || null,
          }
        : null,
      season,
      postseason: resolved.postseasonUsed || false,
      ...(resolved.seasonRequested != null
        ? { season_requested: resolved.seasonRequested }
        : null),
      totals,
      weekly,
      advanced,
      grade,
      ...(includeRaw
        ? {
            raw_meta: {
              season_stat_keys: seasonDoc ? Object.keys(seasonDoc.stats || {}) : [],
              season_stat_sample: seasonDoc ? seasonDoc.stats || {} : null,
              weekly_count: weeklyRows.length,
              weekly_sample: weeklyRows[0] ? weeklyRows[0].stats || weeklyRows[0].raw || {} : null,
            },
          }
        : null),
    });
  } catch (err) {
    console.error("stats player error:", err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: "Failed to load player stats" });
  }
});

router.get("/team/:abbr", async (req, res) => {
  const teamAbbr = String(req.params.abbr || "").toUpperCase();
  const seasonParam = req.query.season;
  const postseason = String(req.query.postseason || "") === "1";
  if (!teamAbbr) {
    return res.status(400).json({ ok: false, error: "Team abbreviation is required" });
  }

  try {
    const team = await Team.findOne({ abbreviation: teamAbbr }).lean();
    if (!team) {
      return res.status(404).json({ ok: false, error: "Team not found" });
    }

    const resolved = await resolveTeamSeasonDoc(
      team.ballDontLieTeamId,
      seasonParam,
      postseason
    );
    if (resolved.error) {
      return res.status(400).json({ ok: false, error: resolved.error });
    }
    const season = resolved.seasonUsed;
    const teamSeason = resolved.seasonDoc;
    const postseasonDoc = await TeamSeasonStat.findOne({
      teamId: team.ballDontLieTeamId,
      season,
      postseason: true,
    }).lean();
    const madePlayoffs = !!postseasonDoc;

    let totals = teamSeason ? normalizeTotals(teamSeason.stats || {}) : null;
    if (!totals) {
      const teamRows = await Stat.find({
        teamId: team.ballDontLieTeamId,
        season,
        ...(postseason ? { "stats.postseason": true } : { "stats.postseason": { $ne: true } }),
      })
        .select({ stats: 1, raw: 1 })
        .lean();
      totals = {
        passing_yards: sumStatsRows(teamRows, STAT_KEYS.passing_yards),
        rushing_yards: sumStatsRows(teamRows, STAT_KEYS.rushing_yards),
        receiving_yards: sumStatsRows(teamRows, STAT_KEYS.receiving_yards),
        points: sumStatsRows(teamRows, STAT_KEYS.points),
      };
    }

    const gamesPlayed =
      totals?.games || (await resolveGamesPlayed(teamAbbr, season));
    const perGamePointsFallback = teamSeason
      ? resolvePerGamePoints(teamSeason.stats || {})
      : null;
    const totalTds =
      (totals?.passing_tds || 0) + (totals?.rushing_tds || 0);
    const perGame = {
      points:
        totals?.points != null && gamesPlayed
          ? totals.points / gamesPlayed
          : perGamePointsFallback,
      passing_yards: gamesPlayed ? totals.passing_yards / gamesPlayed : null,
      rushing_yards: gamesPlayed ? totals.rushing_yards / gamesPlayed : null,
      receiving_yards: gamesPlayed ? totals.receiving_yards / gamesPlayed : null,
      total_yards:
        gamesPlayed && (totals.passing_yards || totals.rushing_yards)
          ? (totals.passing_yards + totals.rushing_yards) / gamesPlayed
          : null,
      total_tds: gamesPlayed ? totalTds / gamesPlayed : null,
    };

    const venueRecords = await computeVenueRecords(teamAbbr, season);

    const leagueTotals = await TeamSeasonStat.find({ season, postseason: { $ne: true } })
      .select({ stats: 1 })
      .lean();
    let leagueAvg = null;
    if (leagueTotals.length > 0) {
      const sums = leagueTotals.reduce(
        (acc, doc) => {
          const stats = normalizeTotals(doc.stats || {});
          const perGamePoints = resolvePerGamePoints(doc.stats || {});
          acc.passing_yards += stats.passing_yards || 0;
          acc.rushing_yards += stats.rushing_yards || 0;
          acc.receiving_yards += stats.receiving_yards || 0;
          acc.points += stats.points || 0;
          acc.games += stats.games || 0;
          if (perGamePoints != null) {
            acc.per_game_points += perGamePoints;
            acc.per_game_count += 1;
          }
          return acc;
        },
        {
          passing_yards: 0,
          rushing_yards: 0,
          receiving_yards: 0,
          points: 0,
          games: 0,
          per_game_points: 0,
          per_game_count: 0,
        }
      );
      const divisor = leagueTotals.length || 1;
      const leagueGames = sums.games || divisor * gamesPlayed || 0;
      leagueAvg = {
        points: leagueGames
          ? sums.points / leagueGames
          : sums.per_game_count
          ? sums.per_game_points / sums.per_game_count
          : null,
        passing_yards: leagueGames ? sums.passing_yards / leagueGames : null,
        rushing_yards: leagueGames ? sums.rushing_yards / leagueGames : null,
        receiving_yards: leagueGames ? sums.receiving_yards / leagueGames : null,
        total_yards: leagueGames
          ? (sums.passing_yards + sums.rushing_yards) / leagueGames
          : null,
      };
    }

    res.json({
      ok: true,
      team: {
        id: team.ballDontLieTeamId,
        abbreviation: team.abbreviation,
        name: team.name,
        full_name: team.fullName || team.name,
      },
      season,
      postseason: resolved.postseasonUsed || false,
      ...(resolved.seasonRequested != null
        ? { season_requested: resolved.seasonRequested }
        : null),
      made_playoffs: madePlayoffs,
      totals,
      per_game: perGame,
      home_record: venueRecords.home_record,
      away_record: venueRecords.away_record,
      last_five: venueRecords.last_five,
      streak: venueRecords.streak,
      league_avg: leagueAvg,
    });
  } catch (err) {
    console.error("stats team error:", err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: "Failed to load team stats" });
  }
});

// GET /api/stats/teams/summary?season=2025
// Returns per-game stats for all teams for league-wide ranking comparisons.
router.get("/teams/summary", async (req, res) => {
  const seasonParam = req.query.season;
  try {
    const resolved = await resolveSeasonForSummary(seasonParam);
    if (resolved.error) {
      return res.status(400).json({ ok: false, error: resolved.error });
    }
    const season = resolved.season;
    const teams = await Team.find({}).select({ abbreviation: 1, ballDontLieTeamId: 1, name: 1, fullName: 1 }).lean();
    const teamMap = new Map(
      teams.map((t) => [t.ballDontLieTeamId, { abbreviation: t.abbreviation, name: t.name, full_name: t.fullName || t.name }])
    );

    const teamSeasonDocs = await TeamSeasonStat.find({
      season,
      postseason: { $ne: true },
    })
      .select({ teamId: 1, stats: 1 })
      .lean();

    const toSummary = (teamId, totals, rawStats) => {
      const games = totals?.games || null;
      const perGamePointsFallback = resolvePerGamePoints(rawStats || {});
      const totalTds = (totals?.passing_tds || 0) + (totals?.rushing_tds || 0);
      const perGame = {
        points:
          totals?.points != null && games
            ? totals.points / games
            : perGamePointsFallback,
        passing_yards: games ? totals.passing_yards / games : null,
        rushing_yards: games ? totals.rushing_yards / games : null,
        receiving_yards: games ? totals.receiving_yards / games : null,
        total_yards:
          games && (totals.passing_yards || totals.rushing_yards)
            ? (totals.passing_yards + totals.rushing_yards) / games
            : null,
        total_tds: games ? totalTds / games : null,
      };
      if (games) {
        if (perGame.points == null) perGame.points = 0;
        if (perGame.passing_yards == null) perGame.passing_yards = 0;
        if (perGame.rushing_yards == null) perGame.rushing_yards = 0;
        if (perGame.receiving_yards == null) perGame.receiving_yards = 0;
        if (perGame.total_yards == null) perGame.total_yards = 0;
      }
      const meta = teamMap.get(teamId) || {};
      return {
        team_id: teamId,
        team_abbr: meta.abbreviation || null,
        team_name: meta.full_name || meta.name || null,
        per_game: perGame,
      };
    };

    const teamSeasonMap = new Map();
    teamSeasonDocs.forEach((doc) => {
      const totals = normalizeTotals(doc.stats || {});
      teamSeasonMap.set(doc.teamId, { totals, raw: doc.stats || {} });
    });

    const missingTeamIds = teams
      .map((t) => t.ballDontLieTeamId)
      .filter((id) => id != null && !teamSeasonMap.has(id));
    if (missingTeamIds.length) {
      const teamStatRows = await TeamStat.find({ season, teamId: { $in: missingTeamIds } })
        .select({ teamId: 1, stats: 1, raw: 1 })
        .lean();
      const rowsByTeam = new Map();
      teamStatRows.forEach((row) => {
        if (!row.teamId) return;
        if (!rowsByTeam.has(row.teamId)) rowsByTeam.set(row.teamId, []);
        rowsByTeam.get(row.teamId).push(row);
      });
      rowsByTeam.forEach((rows, teamId) => {
        const totals = {
          points: sumStatsRows(rows, STAT_KEYS.points),
          passing_yards: sumStatsRows(rows, STAT_KEYS.passing_yards),
          rushing_yards: sumStatsRows(rows, STAT_KEYS.rushing_yards),
          receiving_yards: sumStatsRows(rows, STAT_KEYS.receiving_yards),
          passing_tds: sumStatsRows(rows, STAT_KEYS.passing_tds),
          rushing_tds: sumStatsRows(rows, STAT_KEYS.rushing_tds),
          games: rows.length,
        };
        teamSeasonMap.set(teamId, { totals, raw: rows[0]?.stats || rows[0]?.raw || {} });
      });
    }

    const results = Array.from(teamSeasonMap.entries()).map(([teamId, data]) =>
      toSummary(teamId, data.totals, data.raw)
    );

    const resultTeamIds = new Set(teamSeasonMap.keys());
    teams.forEach((team) => {
      const teamId = team.ballDontLieTeamId;
      if (teamId == null || resultTeamIds.has(teamId)) return;
      results.push(toSummary(teamId, null, null));
    });

    res.json({
      ok: true,
      season,
      ...(resolved.seasonRequested != null
        ? { season_requested: resolved.seasonRequested }
        : null),
      results,
    });
  } catch (err) {
    console.error("stats teams summary error:", err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: "Failed to load team summaries" });
  }
});

// GET /api/stats/teams/defense?season=2025
// Returns defensive stats (against) and rankings for all teams.
router.get("/teams/defense", async (req, res) => {
  const seasonParam = req.query.season;
  try {
    const resolved = await resolveSeasonForSummary(seasonParam);
    if (resolved.error) {
      return res.status(400).json({ ok: false, error: resolved.error });
    }
    const season = resolved.season;

    const teams = await Team.find({}).select({ ballDontLieTeamId: 1, abbreviation: 1, name: 1, fullName: 1 }).lean();
    const teamMeta = new Map(
      teams.map((t) => [
        t.ballDontLieTeamId,
        { team_id: t.ballDontLieTeamId, team_abbr: t.abbreviation, team_name: t.fullName || t.name },
      ])
    );

    const games = await Game.find({ season })
      .select({ gameId: 1, home_team: 1, visitor_team: 1, home_score: 1, visitor_score: 1 })
      .lean();
    const gameMap = new Map();
    const teamGames = new Map();
    const pointsAgainst = new Map();
    games.forEach((g) => {
      const homeId = g.home_team?.id;
      const visitorId = g.visitor_team?.id;
      if (!g.gameId || !homeId || !visitorId) return;
      gameMap.set(g.gameId, { homeId, visitorId });
      teamGames.set(homeId, (teamGames.get(homeId) || 0) + 1);
      teamGames.set(visitorId, (teamGames.get(visitorId) || 0) + 1);
      if (typeof g.home_score === "number") {
        pointsAgainst.set(visitorId, (pointsAgainst.get(visitorId) || 0) + g.home_score);
      }
      if (typeof g.visitor_score === "number") {
        pointsAgainst.set(homeId, (pointsAgainst.get(homeId) || 0) + g.visitor_score);
      }
    });

    const defensivePositions = [
      "DL",
      "DE",
      "DT",
      "NT",
      "EDGE",
      "LB",
      "OLB",
      "ILB",
      "MLB",
      "DB",
      "CB",
      "FS",
      "SS",
      "S",
    ];
    const defRegex = new RegExp(
      `^(${defensivePositions.join("|")})`,
      "i"
    );
    const defStatKeys = {
      interceptions: STAT_KEYS.interceptions,
      sacks: STAT_KEYS.sacks,
      fumbles_recovered: STAT_KEYS.fumbles_recovered,
      tackles_for_loss: STAT_KEYS.tackles_for_loss,
      passes_defended: STAT_KEYS.passes_defended,
      forced_fumbles: STAT_KEYS.forced_fumbles,
    };

    const gameIds = Array.from(gameMap.keys());
    const stats = await Stat.find({ season, gameId: { $in: gameIds } })
      .select({ gameId: 1, teamId: 1, playerId: 1, stats: 1, raw: 1 })
      .lean();

    const offenseByGameTeam = new Map();
    const defenseByTeam = new Map();
    const getOffenseKey = (gameId, teamId) => `${gameId}:${teamId}`;
    const ensureOffense = (gameId, teamId) => {
      const key = getOffenseKey(gameId, teamId);
      let entry = offenseByGameTeam.get(key);
      if (!entry) {
        entry = {
          passing_yards: 0,
          passing_completions: 0,
          passing_attempts: 0,
          rushing_yards: 0,
          rushing_attempts: 0,
        };
        offenseByGameTeam.set(key, entry);
      }
      return entry;
    };

    stats.forEach((row) => {
      const statsObj = row.stats || row.raw || {};
      if (!row.gameId || !row.teamId) return;
      const offense = ensureOffense(row.gameId, row.teamId);
      offense.passing_yards += pickNumber(statsObj, STAT_KEYS.passing_yards) || 0;
      offense.passing_completions += pickNumber(statsObj, STAT_KEYS.passing_completions) || 0;
      offense.passing_attempts += pickNumber(statsObj, STAT_KEYS.passing_attempts) || 0;
      offense.rushing_yards += pickNumber(statsObj, STAT_KEYS.rushing_yards) || 0;
      offense.rushing_attempts += pickNumber(statsObj, STAT_KEYS.rushing_attempts) || 0;

      const hasDefStat = Object.values(defStatKeys).some(
        (keys) => pickNumber(statsObj, keys) != null
      );
      if (hasDefStat) {
        let def = defenseByTeam.get(row.teamId);
        if (!def) {
          def = {
            interceptions: 0,
            sacks: 0,
            fumbles_recovered: 0,
            tackles_for_loss: 0,
            passes_defended: 0,
            forced_fumbles: 0,
          };
          defenseByTeam.set(row.teamId, def);
        }
        def.interceptions += pickNumber(statsObj, defStatKeys.interceptions) || 0;
        def.sacks += pickNumber(statsObj, defStatKeys.sacks) || 0;
        def.fumbles_recovered += pickNumber(statsObj, defStatKeys.fumbles_recovered) || 0;
        def.tackles_for_loss += pickNumber(statsObj, defStatKeys.tackles_for_loss) || 0;
        def.passes_defended += pickNumber(statsObj, defStatKeys.passes_defended) || 0;
        def.forced_fumbles += pickNumber(statsObj, defStatKeys.forced_fumbles) || 0;
      }
    });

    const teamStatFallback = new Map();
    const teamStatRows = await TeamStat.find({ season, gameId: { $in: gameIds } })
      .select({ teamId: 1, stats: 1, raw: 1 })
      .lean();
    teamStatRows.forEach((row) => {
      const statsObj = row.stats || row.raw || {};
      if (!row.teamId) return;
      let def = teamStatFallback.get(row.teamId);
      if (!def) {
        def = {
          interceptions: 0,
          sacks: 0,
          fumbles_recovered: 0,
          tackles_for_loss: 0,
          passes_defended: 0,
          forced_fumbles: 0,
        };
        teamStatFallback.set(row.teamId, def);
      }
      def.interceptions += pickNumber(statsObj, defStatKeys.interceptions) || 0;
      def.sacks += pickNumber(statsObj, defStatKeys.sacks) || 0;
      def.fumbles_recovered += pickNumber(statsObj, defStatKeys.fumbles_recovered) || 0;
      def.tackles_for_loss += pickNumber(statsObj, defStatKeys.tackles_for_loss) || 0;
      def.passes_defended += pickNumber(statsObj, defStatKeys.passes_defended) || 0;
      def.forced_fumbles += pickNumber(statsObj, defStatKeys.forced_fumbles) || 0;
    });

    const teamIdByAbbr = new Map(
      teams
        .map((t) => [String(t.abbreviation || "").toUpperCase(), t.ballDontLieTeamId])
        .filter(([abbr, id]) => abbr && id != null)
    );
    const fallbackDefByTeam = new Map();
    const teamSeasonFallback = new Map();
    const seasonDefRows = await SeasonStat.find({
      season,
      "stats.postseason": { $ne: true },
    })
      .select({ stats: 1 })
      .lean();
    seasonDefRows.forEach((doc) => {
      const statsObj = doc.stats || {};
      const playerInfo = statsObj.player || {};
      const position = String(
        playerInfo.position || playerInfo.position_abbreviation || ""
      ).toUpperCase();
      if (!defRegex.test(position)) return;
      const teamInfo = statsObj.team || playerInfo.team || {};
      const teamAbbr = String(teamInfo.abbreviation || "").toUpperCase();
      const teamId = teamIdByAbbr.get(teamAbbr);
      if (!teamId) return;
      let def = fallbackDefByTeam.get(teamId);
      if (!def) {
        def = {
          interceptions: 0,
          sacks: 0,
          fumbles_recovered: 0,
          tackles_for_loss: 0,
          passes_defended: 0,
          forced_fumbles: 0,
        };
        fallbackDefByTeam.set(teamId, def);
      }
      def.interceptions += pickNumber(statsObj, defStatKeys.interceptions) || 0;
      def.sacks += pickNumber(statsObj, defStatKeys.sacks) || 0;
      def.fumbles_recovered += pickNumber(statsObj, defStatKeys.fumbles_recovered) || 0;
      def.tackles_for_loss += pickNumber(statsObj, defStatKeys.tackles_for_loss) || 0;
      def.passes_defended += pickNumber(statsObj, defStatKeys.passes_defended) || 0;
      def.forced_fumbles += pickNumber(statsObj, defStatKeys.forced_fumbles) || 0;
    });

    const teamSeasonRows = await TeamSeasonStat.find({
      season,
      postseason: { $ne: true },
    })
      .select({ teamId: 1, stats: 1, raw: 1 })
      .lean();
    teamSeasonRows.forEach((row) => {
      const statsObj = row.stats || row.raw || {};
      if (!row.teamId) return;
      let def = teamSeasonFallback.get(row.teamId);
      if (!def) {
        def = {
          interceptions: 0,
          sacks: 0,
          fumbles_recovered: 0,
          tackles_for_loss: 0,
          passes_defended: 0,
          forced_fumbles: 0,
        };
        teamSeasonFallback.set(row.teamId, def);
      }
      def.interceptions += pickNumber(statsObj, defStatKeys.interceptions) || 0;
      def.sacks += pickNumber(statsObj, defStatKeys.sacks) || 0;
      def.fumbles_recovered += pickNumber(statsObj, defStatKeys.fumbles_recovered) || 0;
      def.tackles_for_loss += pickNumber(statsObj, defStatKeys.tackles_for_loss) || 0;
      def.passes_defended += pickNumber(statsObj, defStatKeys.passes_defended) || 0;
      def.forced_fumbles += pickNumber(statsObj, defStatKeys.forced_fumbles) || 0;
    });

    const mergeFallback = (fallbackMap) => {
      fallbackMap.forEach((fallback, teamId) => {
        let def = defenseByTeam.get(teamId);
        if (!def) {
          defenseByTeam.set(teamId, { ...fallback });
          return;
        }
        Object.keys(fallback).forEach((key) => {
          if ((def[key] || 0) <= 0 && fallback[key]) {
            def[key] = fallback[key];
          }
        });
        defenseByTeam.set(teamId, def);
      });
    };

    mergeFallback(teamStatFallback);
    mergeFallback(fallbackDefByTeam);
    mergeFallback(teamSeasonFallback);

    const applyDerivedDefenseTotals = (def) => {
      if (!def) return def;
      if (!def.tackles_for_loss && def.sacks) {
        def.tackles_for_loss = Math.round(def.sacks * 1.5);
      }
      if (!def.passes_defended) {
        if (def.interceptions) {
          def.passes_defended = Math.round(def.interceptions * 2);
        } else if (def.sacks) {
          def.passes_defended = Math.max(1, Math.round(def.sacks * 0.5));
        }
      }
      if (!def.forced_fumbles) {
        if (def.fumbles_recovered) {
          def.forced_fumbles = def.fumbles_recovered;
        } else if (def.sacks) {
          def.forced_fumbles = Math.max(1, Math.round(def.sacks * 0.15));
        }
      }
      return def;
    };

    const againstByTeam = new Map();
    const addAgainst = (teamId, oppTotals) => {
      let entry = againstByTeam.get(teamId);
      if (!entry) {
        entry = {
          passing_yards_against: 0,
          passing_completions_against: 0,
          passing_attempts_against: 0,
          rushing_yards_against: 0,
          rushing_attempts_against: 0,
        };
        againstByTeam.set(teamId, entry);
      }
      entry.passing_yards_against += oppTotals.passing_yards || 0;
      entry.passing_completions_against += oppTotals.passing_completions || 0;
      entry.passing_attempts_against += oppTotals.passing_attempts || 0;
      entry.rushing_yards_against += oppTotals.rushing_yards || 0;
      entry.rushing_attempts_against += oppTotals.rushing_attempts || 0;
    };

    gameMap.forEach((teamsForGame, gameId) => {
      const homeOff = offenseByGameTeam.get(getOffenseKey(gameId, teamsForGame.homeId)) || {};
      const visitorOff = offenseByGameTeam.get(getOffenseKey(gameId, teamsForGame.visitorId)) || {};
      addAgainst(teamsForGame.homeId, visitorOff);
      addAgainst(teamsForGame.visitorId, homeOff);
    });

    const results = [];
    teams.forEach((team) => {
      const teamId = team.ballDontLieTeamId;
      const gamesPlayed = teamGames.get(teamId) || 0;
      const against = againstByTeam.get(teamId) || {};
      const def = applyDerivedDefenseTotals(defenseByTeam.get(teamId) || {});
      let forcedFumblesTotal = def.forced_fumbles || 0;
      if (!forcedFumblesTotal && def.fumbles_recovered) {
        forcedFumblesTotal = def.fumbles_recovered;
      }
      const turnovers = (def.interceptions || 0) + (def.fumbles_recovered || 0);
      const perGame = {
        points_allowed: gamesPlayed ? (pointsAgainst.get(teamId) || 0) / gamesPlayed : null,
        pass_yards_against: gamesPlayed ? against.passing_yards_against / gamesPlayed : null,
        rush_yards_against: gamesPlayed ? against.rushing_yards_against / gamesPlayed : null,
        total_yards_against: gamesPlayed
          ? (against.passing_yards_against + against.rushing_yards_against) / gamesPlayed
          : null,
        avg_pass_completion_against:
          against.passing_completions_against > 0
            ? against.passing_yards_against / against.passing_completions_against
            : gamesPlayed
            ? 0
            : null,
        avg_rush_against:
          against.rushing_attempts_against > 0
            ? against.rushing_yards_against / against.rushing_attempts_against
            : gamesPlayed
            ? 0
            : null,
        turnovers_forced: gamesPlayed ? turnovers / gamesPlayed : null,
        interceptions: gamesPlayed ? def.interceptions / gamesPlayed : null,
        sacks: gamesPlayed ? def.sacks / gamesPlayed : null,
        tackles_for_loss: gamesPlayed ? def.tackles_for_loss / gamesPlayed : null,
        passes_defended: gamesPlayed ? def.passes_defended / gamesPlayed : null,
        forced_fumbles: gamesPlayed ? forcedFumblesTotal / gamesPlayed : null,
        touchdowns_allowed: gamesPlayed
          ? (pointsAgainst.get(teamId) || 0) / 7 / gamesPlayed
          : null,
      };
      if (gamesPlayed) {
        if (perGame.points_allowed == null) perGame.points_allowed = 0;
        if (perGame.pass_yards_against == null) perGame.pass_yards_against = 0;
        if (perGame.rush_yards_against == null) perGame.rush_yards_against = 0;
        if (perGame.total_yards_against == null) perGame.total_yards_against = 0;
        if (perGame.turnovers_forced == null) perGame.turnovers_forced = 0;
        if (perGame.interceptions == null) perGame.interceptions = 0;
        if (perGame.sacks == null) perGame.sacks = 0;
        if (perGame.tackles_for_loss == null) perGame.tackles_for_loss = 0;
        if (perGame.passes_defended == null) perGame.passes_defended = 0;
        if (perGame.forced_fumbles == null) perGame.forced_fumbles = 0;
        if (perGame.touchdowns_allowed == null) perGame.touchdowns_allowed = 0;
      }
      const totals = {
        pass_yards_against: against.passing_yards_against || 0,
        rush_yards_against: against.rushing_yards_against || 0,
        total_yards_against: (against.passing_yards_against || 0) + (against.rushing_yards_against || 0),
        pass_completions_against: against.passing_completions_against || 0,
        rush_attempts_against: against.rushing_attempts_against || 0,
        turnovers_forced: turnovers,
        interceptions: def.interceptions || 0,
        sacks: def.sacks || 0,
        tackles_for_loss: def.tackles_for_loss || 0,
        passes_defended: def.passes_defended || 0,
        forced_fumbles: forcedFumblesTotal,
        touchdowns_allowed: gamesPlayed ? (pointsAgainst.get(teamId) || 0) / 7 : 0,
      };
      const meta = teamMeta.get(teamId) || {
        team_id: teamId,
        team_abbr: team.abbreviation,
        team_name: team.fullName || team.name,
      };
      results.push({
        ...meta,
        games: gamesPlayed,
        defense_per_game: perGame,
        defense_totals: totals,
      });
    });

    const ranks = {
      points_allowed: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.points_allowed,
      })), "value", "asc"),
      total_yards_against: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.total_yards_against,
      })), "value", "asc"),
      pass_yards_against: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.pass_yards_against,
      })), "value", "asc"),
      rush_yards_against: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.rush_yards_against,
      })), "value", "asc"),
      avg_pass_completion_against: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.avg_pass_completion_against,
      })), "value", "asc"),
      avg_rush_against: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.avg_rush_against,
      })), "value", "asc"),
      turnovers_forced: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.turnovers_forced,
      })), "value", "desc"),
      interceptions: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_totals.interceptions,
      })), "value", "desc"),
      sacks: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.sacks,
      })), "value", "desc"),
      tackles_for_loss: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.tackles_for_loss,
      })), "value", "desc"),
      passes_defended: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.passes_defended,
      })), "value", "desc"),
      forced_fumbles: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_totals.forced_fumbles,
      })), "value", "desc"),
      touchdowns_allowed: buildRankMap(results.map((r) => ({
        team_abbr: r.team_abbr,
        value: r.defense_per_game.touchdowns_allowed,
      })), "value", "asc"),
    };

    const ranked = results.map((row) => ({
      ...row,
      defense_ranks: {
        points_allowed: ranks.points_allowed.map.get(row.team_abbr) || null,
        total_yards_against: ranks.total_yards_against.map.get(row.team_abbr) || null,
        pass_yards_against: ranks.pass_yards_against.map.get(row.team_abbr) || null,
        rush_yards_against: ranks.rush_yards_against.map.get(row.team_abbr) || null,
        avg_pass_completion_against: ranks.avg_pass_completion_against.map.get(row.team_abbr) || null,
        avg_rush_against: ranks.avg_rush_against.map.get(row.team_abbr) || null,
        turnovers_forced: ranks.turnovers_forced.map.get(row.team_abbr) || null,
        interceptions: ranks.interceptions.map.get(row.team_abbr) || null,
        sacks: ranks.sacks.map.get(row.team_abbr) || null,
        tackles_for_loss: ranks.tackles_for_loss.map.get(row.team_abbr) || null,
        passes_defended: ranks.passes_defended.map.get(row.team_abbr) || null,
        forced_fumbles: ranks.forced_fumbles.map.get(row.team_abbr) || null,
        touchdowns_allowed: ranks.touchdowns_allowed.map.get(row.team_abbr) || null,
      },
    }));

    res.json({
      ok: true,
      season,
      ...(resolved.seasonRequested != null
        ? { season_requested: resolved.seasonRequested }
        : null),
      results: ranked,
    });
  } catch (err) {
    console.error("stats teams defense error:", err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: "Failed to load team defense stats" });
  }
});

// GET /api/stats/players/position?position=QB&season=2025
// Returns starter-like players by position with season totals.
router.get("/players/position", async (req, res) => {
  const positionParam = req.query.position;
  const seasonParam = req.query.season;
  const includeAll = String(req.query.all || "") === "1";
  const minPassingYardsParam = Number(req.query.min_passing_yards);
  const filter = resolvePositionFilter(positionParam);
  if (!filter) {
    return res.status(400).json({ ok: false, error: "Position is required" });
  }
  try {
    const resolved = await resolveSeasonForPlayerList(seasonParam);
    if (resolved.error) {
      return res.status(400).json({ ok: false, error: resolved.error });
    }
    const season = resolved.season;
    const positionRegex = new RegExp(`^${filter.group}`, "i");
    const matchesPosition = (position) => {
      if (!position) return false;
      const upper = String(position).toUpperCase();
      if (filter.positions.includes(upper)) return true;
      if (upper.startsWith(filter.group)) return true;
      if (filter.group === "QB" && upper.includes("QUARTERBACK")) return true;
      if (filter.group === "RB" && (upper.includes("RUNNING BACK") || upper.includes("HALFBACK") || upper.includes("FULLBACK"))) {
        return true;
      }
      if (filter.group === "WR" && upper.includes("WIDE RECEIVER")) return true;
      if (filter.group === "TE" && upper.includes("TIGHT END")) return true;
      if (filter.group === "OL" && (upper.includes("CENTER") || upper.includes("GUARD") || upper.includes("TACKLE") || upper.includes("OFFENSIVE LINE"))) {
        return true;
      }
      if (filter.group === "DL" && (upper.includes("DEFENSIVE END") || upper.includes("DEFENSIVE TACKLE") || upper.includes("DEFENSIVE LINE") || upper.includes("NOSE TACKLE") || upper.includes("EDGE"))) {
        return true;
      }
      if (filter.group === "LB" && upper.includes("LINEBACKER")) return true;
      if (filter.group === "DB" && (upper.includes("CORNERBACK") || upper.includes("SAFETY") || upper.includes("DEFENSIVE BACK"))) {
        return true;
      }
      if (filter.group === "K" && (upper.includes("KICKER") || upper.includes("PLACEKICKER") || upper.includes("PLACE KICKER") || upper === "PK")) {
        return true;
      }
      if (filter.group === "P" && upper.includes("PUNTER")) return true;
      return false;
    };
    const players = await Player.find({
      $or: [
        { position: { $in: filter.positions } },
        { position: positionRegex },
        { "raw.position": positionRegex },
        { "raw.position_abbreviation": positionRegex },
      ],
    })
      .select({ first_name: 1, last_name: 1, full_name: 1, position: 1, team: 1, raw: 1, PlayerID: 1, bdlId: 1 })
      .lean();

    const playersById = new Map();
    players.forEach((p) => {
      const id = p.bdlId || p.PlayerID;
      if (id != null) playersById.set(Number(id), p);
    });

    const playerIds = Array.from(playersById.keys());

    const seasonDocs = await SeasonStat.find({
      season,
      "stats.postseason": { $ne: true },
      playerId: { $in: playerIds },
    })
      .select({ playerId: 1, stats: 1 })
      .lean();

    const totalsByPlayer = new Map();
    const infoByPlayer = new Map();
    seasonDocs.forEach((doc) => {
      if (!doc.playerId) return;
      totalsByPlayer.set(doc.playerId, normalizeTotals(doc.stats || {}));
      const info = doc.stats?.player || {};
      const teamInfo = doc.stats?.team || {};
      infoByPlayer.set(doc.playerId, {
        name:
          info.full_name ||
          `${info.first_name || ""} ${info.last_name || ""}`.trim(),
        position: info.position || info.position_abbreviation || null,
        team_abbr: teamInfo.abbreviation || info.team?.abbreviation || null,
        jersey_number: info.jersey_number || null,
      });
    });

    const missingIds = playerIds.filter((id) => !totalsByPlayer.has(id));
    if (missingIds.length > 0) {
      const statRows = await Stat.find({
        season,
        playerId: { $in: missingIds },
        "stats.postseason": { $ne: true },
      })
        .select({ playerId: 1, stats: 1, raw: 1 })
        .lean();

      const rowsByPlayer = new Map();
      statRows.forEach((row) => {
        if (!row.playerId) return;
        if (!rowsByPlayer.has(row.playerId)) rowsByPlayer.set(row.playerId, []);
        rowsByPlayer.get(row.playerId).push(row);
      });

      rowsByPlayer.forEach((rows, id) => {
        const totals = {
          passing_yards: sumStatsRows(rows, STAT_KEYS.passing_yards),
          passing_tds: sumStatsRows(rows, STAT_KEYS.passing_tds),
          interceptions: sumStatsRows(rows, STAT_KEYS.interceptions),
          rushing_yards: sumStatsRows(rows, STAT_KEYS.rushing_yards),
          rushing_attempts: sumStatsRows(rows, STAT_KEYS.rushing_attempts),
          rushing_tds: sumStatsRows(rows, STAT_KEYS.rushing_tds),
          receiving_yards: sumStatsRows(rows, STAT_KEYS.receiving_yards),
          receiving_targets: sumStatsRows(rows, STAT_KEYS.receiving_targets),
          receiving_tds: sumStatsRows(rows, STAT_KEYS.receiving_tds),
          receptions: sumStatsRows(rows, STAT_KEYS.receptions),
          passing_attempts: sumStatsRows(rows, STAT_KEYS.passing_attempts),
          passing_completions: sumStatsRows(rows, STAT_KEYS.passing_completions),
          tackles: sumStatsRows(rows, STAT_KEYS.tackles),
          sacks: sumStatsRows(rows, STAT_KEYS.sacks),
          tackles_for_loss: sumStatsRows(rows, STAT_KEYS.tackles_for_loss),
          passes_defended: sumStatsRows(rows, STAT_KEYS.passes_defended),
          forced_fumbles: sumStatsRows(rows, STAT_KEYS.forced_fumbles),
          fumbles_recovered: sumStatsRows(rows, STAT_KEYS.fumbles_recovered),
          punts: sumStatsRows(rows, STAT_KEYS.punts),
          punt_yards: sumStatsRows(rows, STAT_KEYS.punt_yards),
          punts_inside_20: sumStatsRows(rows, STAT_KEYS.punts_inside_20),
          long_punt: sumStatsRows(rows, STAT_KEYS.long_punt),
          games: rows.length,
        };
        totalsByPlayer.set(id, totals);
      });
    }

    if (includeAll) {
      const existingIds = new Set(totalsByPlayer.keys());
      const statRows = await Stat.find({
        season,
        playerId: { $nin: Array.from(existingIds) },
        "stats.postseason": { $ne: true },
      })
        .select({ playerId: 1, stats: 1, raw: 1 })
        .lean();

      const rowsByPlayer = new Map();
      statRows.forEach((row) => {
        if (!row.playerId) return;
        const statsObj = row.stats || row.raw || {};
        const playerInfo = statsObj.player || statsObj.player_stats || {};
        let pos =
          playerInfo.position ||
          playerInfo.position_abbreviation ||
          statsObj.position ||
          null;
        if (!pos) {
          const passAtt = pickNumber(statsObj, STAT_KEYS.passing_attempts);
          const passYds = pickNumber(statsObj, STAT_KEYS.passing_yards);
          const rushAtt = pickNumber(statsObj, STAT_KEYS.rushing_attempts);
          const rushYds = pickNumber(statsObj, STAT_KEYS.rushing_yards);
          const targets = pickNumber(statsObj, STAT_KEYS.receiving_targets);
          const recYds = pickNumber(statsObj, STAT_KEYS.receiving_yards);
          const fgAtt = pickNumber(statsObj, STAT_KEYS.field_goals_attempted);
          const fgMade = pickNumber(statsObj, STAT_KEYS.field_goals_made);
          const xpAtt = pickNumber(statsObj, STAT_KEYS.extra_points_attempted);
          const xpMade = pickNumber(statsObj, STAT_KEYS.extra_points_made);
          const punts = pickNumber(statsObj, STAT_KEYS.punts);
          const puntYards = pickNumber(statsObj, STAT_KEYS.punt_yards);
          if ((passAtt || passYds) && filter.group === "QB") pos = "QB";
          else if ((rushAtt || rushYds) && filter.group === "RB") pos = "RB";
          else if ((targets || recYds) && (filter.group === "WR" || filter.group === "TE")) pos = filter.group;
          else if ((fgAtt || fgMade || xpAtt || xpMade) && filter.group === "K") pos = "K";
          else if ((punts || puntYards) && filter.group === "P") pos = "P";
        }
        if (!matchesPosition(pos)) return;
        if (!rowsByPlayer.has(row.playerId)) rowsByPlayer.set(row.playerId, []);
        rowsByPlayer.get(row.playerId).push(row);
        if (!infoByPlayer.has(row.playerId)) {
          const name =
            playerInfo.full_name ||
            `${playerInfo.first_name || ""} ${playerInfo.last_name || ""}`.trim();
          const teamInfo = statsObj.team || playerInfo.team || {};
          infoByPlayer.set(row.playerId, {
            name: name || null,
            position: pos,
            team_abbr: teamInfo.abbreviation || null,
            jersey_number: playerInfo.jersey_number || null,
          });
        }
      });

      rowsByPlayer.forEach((rows, id) => {
        const totals = {
          passing_yards: sumStatsRows(rows, STAT_KEYS.passing_yards),
          passing_tds: sumStatsRows(rows, STAT_KEYS.passing_tds),
          interceptions: sumStatsRows(rows, STAT_KEYS.interceptions),
          rushing_yards: sumStatsRows(rows, STAT_KEYS.rushing_yards),
          rushing_attempts: sumStatsRows(rows, STAT_KEYS.rushing_attempts),
          rushing_tds: sumStatsRows(rows, STAT_KEYS.rushing_tds),
          receiving_yards: sumStatsRows(rows, STAT_KEYS.receiving_yards),
          receiving_targets: sumStatsRows(rows, STAT_KEYS.receiving_targets),
          receiving_tds: sumStatsRows(rows, STAT_KEYS.receiving_tds),
          receptions: sumStatsRows(rows, STAT_KEYS.receptions),
          passing_attempts: sumStatsRows(rows, STAT_KEYS.passing_attempts),
          passing_completions: sumStatsRows(rows, STAT_KEYS.passing_completions),
          tackles: sumStatsRows(rows, STAT_KEYS.tackles),
          sacks: sumStatsRows(rows, STAT_KEYS.sacks),
          tackles_for_loss: sumStatsRows(rows, STAT_KEYS.tackles_for_loss),
          passes_defended: sumStatsRows(rows, STAT_KEYS.passes_defended),
          forced_fumbles: sumStatsRows(rows, STAT_KEYS.forced_fumbles),
          fumbles_recovered: sumStatsRows(rows, STAT_KEYS.fumbles_recovered),
          punts: sumStatsRows(rows, STAT_KEYS.punts),
          punt_yards: sumStatsRows(rows, STAT_KEYS.punt_yards),
          punts_inside_20: sumStatsRows(rows, STAT_KEYS.punts_inside_20),
          long_punt: sumStatsRows(rows, STAT_KEYS.long_punt),
          games: rows.length,
        };
        totalsByPlayer.set(id, totals);
      });
    }

    const byTeam = new Map();
    const allPlayers = [];
    const emitCandidate = (candidate) => {
      if (includeAll) {
        allPlayers.push(candidate);
        return;
      }
      if (!candidate.primary) return;
      if (!candidate.team_abbr) return;
      const existing = byTeam.get(candidate.team_abbr);
      if (!existing || candidate.primary > existing.primary) {
        byTeam.set(candidate.team_abbr, candidate);
      }
    };

    totalsByPlayer.forEach((totals, id) => {
      const player = playersById.get(id);
      const info = infoByPlayer.get(id);
      const position = player?.position || info?.position || filter.group;
      if (!matchesPosition(position)) return;
      const teamAbbr =
        player?.team?.abbreviation ||
        player?.raw?.team?.abbreviation ||
        player?.raw?.team_abbr ||
        info?.team_abbr ||
        null;
      const candidate = {
        id,
        PlayerID: id,
        player_id: id,
        name:
          player?.full_name ||
          (player
            ? `${player.first_name || ""} ${player.last_name || ""}`.trim()
            : info?.name || `Player ${id}`),
        position,
        team_abbr: teamAbbr,
        jersey_number: player?.raw?.jersey_number || info?.jersey_number || null,
        totals,
        primary: primaryStatForGroup(filter.group, totals),
        games: totals?.games || 0,
      };
      emitCandidate(candidate);
    });

    if (includeAll) {
      playersById.forEach((player, id) => {
        if (totalsByPlayer.has(id)) return;
        const position = player?.position || filter.group;
        if (!matchesPosition(position)) return;
        const teamAbbr =
          player?.team?.abbreviation ||
          player?.raw?.team?.abbreviation ||
          player?.raw?.team_abbr ||
          null;
        emitCandidate({
          id,
          PlayerID: id,
          player_id: id,
          name:
            player?.full_name ||
            `${player.first_name || ""} ${player.last_name || ""}`.trim(),
          position,
          team_abbr: teamAbbr,
          jersey_number: player?.raw?.jersey_number || null,
          totals: null,
          primary: 0,
          games: 0,
        });
      });
    }

    let source = includeAll ? allPlayers : Array.from(byTeam.values());
    if (!includeAll) {
      const teams = await Team.find({}).select({ abbreviation: 1 }).lean();
      const teamSet = new Set(
        teams.map((t) => t.abbreviation).filter((abbr) => abbr)
      );
      const byTeamSet = new Set(source.map((row) => row.team_abbr).filter(Boolean));
      teamSet.forEach((abbr) => {
        if (byTeamSet.has(abbr)) return;
        const player = players.find((p) => {
          const teamAbbr =
            p.team?.abbreviation ||
            p.raw?.team?.abbreviation ||
            p.raw?.team_abbr ||
            null;
          return teamAbbr === abbr;
        });
        if (!player) return;
        const id = player.bdlId || player.PlayerID;
        const position = player?.position || filter.group;
        source.push({
          id,
          PlayerID: id,
          player_id: id,
          name:
            player?.full_name ||
            `${player?.first_name || ""} ${player?.last_name || ""}`.trim(),
          position,
          team_abbr: abbr,
          jersey_number: player?.raw?.jersey_number || null,
          totals: totalsByPlayer.get(id) || null,
          primary: 0,
          games: totalsByPlayer.get(id)?.games || 0,
        });
      });
    }
    let results = source
      .sort((a, b) => (b.primary || 0) - (a.primary || 0))
      .map((p) => {
        const { primary, ...rest } = p;
        return rest;
      });

    if (filter.group === "QB") {
      const minPassingYards = Number.isNaN(minPassingYardsParam) ? 500 : minPassingYardsParam;
      const careerSeasonIds = await SeasonStat.distinct("playerId");
      const careerWeekIds = await Stat.distinct("playerId");
      const careerSet = new Set([...careerSeasonIds, ...careerWeekIds].map((id) => Number(id)));

      const qbPrimary = (row) =>
        row?.totals?.passing_attempts || row?.totals?.passing_yards || row?.totals?.games || 0;
      const qbPassingYards = (row) => row?.totals?.passing_yards || 0;
      const qbTier = (row) => {
        const passingYards = qbPassingYards(row);
        const hasCurrent = qbPrimary(row) > 0 || passingYards > 0;
        const careerHas = row?.careerHas || false;
        if (passingYards >= minPassingYards) return 0;
        if (hasCurrent) return 1;
        if (careerHas) return 2;
        return 3;
      };

      const byTeam = new Map();
      results.forEach((row) => {
        const teamAbbr = row.team_abbr;
        if (!teamAbbr || row.player_id == null) return;
        if (!byTeam.has(teamAbbr)) byTeam.set(teamAbbr, []);
        const primary = qbPrimary(row);
        const careerHas = careerSet.has(Number(row.player_id));
        byTeam.get(teamAbbr).push({
          ...row,
          primary,
          careerHas,
        });
      });

      const topQbs = [];
      byTeam.forEach((list) => {
        const sorted = list
          .slice()
          .sort((a, b) => {
            if (a.primary !== b.primary) return b.primary - a.primary;
            if (a.careerHas !== b.careerHas) return a.careerHas ? -1 : 1;
            return (a.name || "").localeCompare(b.name || "");
          })
          .slice(0, 3)
          .map((row, idx) => ({ ...row, qb_depth: idx + 1 }));
        topQbs.push(...sorted);
      });

      const topQbMap = new Map();
      topQbs.forEach((qb) => {
        if (qb.player_id != null) topQbMap.set(qb.player_id, qb);
      });

      const sorted = topQbs
        .slice()
        .sort((a, b) => {
          const depthDiff = (a.qb_depth || 99) - (b.qb_depth || 99);
          if (depthDiff !== 0) return depthDiff;
          const tierDiff = qbTier(a) - qbTier(b);
          if (tierDiff !== 0) return tierDiff;
          const passingDiff = qbPassingYards(b) - qbPassingYards(a);
          if (passingDiff !== 0) return passingDiff;
          if (a.careerHas !== b.careerHas) return a.careerHas ? -1 : 1;
          return (a.name || "").localeCompare(b.name || "");
        });

      const rankMap = new Map();
      sorted.forEach((row, idx) => {
        if (row?.player_id != null) rankMap.set(row.player_id, idx + 1);
      });

      results = results.map((row) => {
        const qbMeta = topQbMap.get(row.player_id);
        const passingYards = qbMeta ? qbPassingYards(qbMeta) : 0;
        const qualified = qbMeta ? passingYards >= minPassingYards : false;
        return {
          ...row,
          qb_depth: qbMeta?.qb_depth || null,
          position_rank: qbMeta ? rankMap.get(row.player_id) || null : null,
          qualified,
        };
      });
    } else {
      results.forEach((row, idx) => {
        row.position_rank = idx + 1;
      });
    }

    res.json({
      ok: true,
      season,
      position: filter.group,
      ...(resolved.seasonRequested != null
        ? { season_requested: resolved.seasonRequested }
        : null),
      results,
    });
  } catch (err) {
    console.error("stats position players error:", err && err.message ? err.message : err);
    const debug = String(req.query.debug || "") === "1";
    res.status(500).json({
      ok: false,
      error: "Failed to load players",
      ...(debug ? { detail: err?.message || String(err) } : null),
    });
  }
});

router.get("/player", (req, res) => {
  res.status(400).json({ ok: false, error: "Missing playerId in path" });
});

router.get("/team", (req, res) => {
  res.status(400).json({ ok: false, error: "Missing team abbreviation in path" });
});

router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Use /api/stats/player/:playerId or /api/stats/team/:abbr",
  });
});

module.exports = router;
