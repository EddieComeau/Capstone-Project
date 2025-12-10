// services/skillMetricsService.js
const Player = require("../models/Player");
const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");
const { getPlayerSeasonStatsByTeam } = require("./sportsdataService");

const POSITION_GRADERS = {
  QB: computeQuarterbackGrade,
  RB: computeRushingGrade,
  FB: computeRushingGrade,
  WR: computeReceivingGrade,
  TE: computeReceivingGrade,
  K: computeKickerGrade,
  P: computePunterGrade,
  KR: computeReturnerGrade,
  PR: computeReturnerGrade,
  CB: computeSecondaryGrade,
  S: computeSecondaryGrade,
  FS: computeSecondaryGrade,
  SS: computeSecondaryGrade,
  DB: computeSecondaryGrade,
  DE: computeFrontSevenGrade,
  DT: computeFrontSevenGrade,
  NT: computeFrontSevenGrade,
  EDGE: computeFrontSevenGrade,
  LB: computeFrontSevenGrade,
  OLB: computeFrontSevenGrade,
  ILB: computeFrontSevenGrade,
  MLB: computeFrontSevenGrade,
  C: computeOffensiveLineGrade,
  G: computeOffensiveLineGrade,
  LG: computeOffensiveLineGrade,
  RG: computeOffensiveLineGrade,
  T: computeOffensiveLineGrade,
  LT: computeOffensiveLineGrade,
  RT: computeOffensiveLineGrade,
};

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function scaleTo100(value, min, max) {
  if (value === undefined || value === null) return 0;
  if (max === min) return 50;
  const scaled = ((value - min) / (max - min)) * 100;
  return clamp(Math.round(scaled), 0, 100);
}

function calcCatchRate(stats) {
  const receptions = Number(stats.Receptions || 0);
  const targets = Number(stats.Targets || stats.ReceivingTargets || 0);
  if (!targets) return undefined;
  return (receptions / targets) * 100;
}

function calcCompletionRate(stats) {
  const completions = Number(stats.PassingCompletions || stats.Completions || 0);
  const attempts = Number(stats.PassingAttempts || stats.Attempts || 0);
  if (!attempts) return undefined;
  return (completions / attempts) * 100;
}

function computeQuarterbackGrade(stats, games) {
  const passingYards = Number(stats.PassingYards || 0);
  const passingTds = Number(stats.PassingTouchdowns || 0);
  const interceptions = Number(stats.PassingInterceptions || stats.Interceptions || 0);
  const completionRate = calcCompletionRate(stats);

  const passingYpg = passingYards / games;
  const passingTdsPerGame = passingTds / games;
  const interceptionsPerGame = interceptions / games;

  const yardScore = scaleTo100(passingYpg, 175, 325);
  const tdScore = scaleTo100(passingTdsPerGame, 0.8, 3.5);
  const compScore = scaleTo100(
    completionRate ?? Number(stats.PassingCompletionPercentage || stats.CompletionPercentage || 0),
    55,
    72
  );
  const turnoverScore = scaleTo100(1 - interceptionsPerGame, 0, 1);

  const grade =
    0.4 * yardScore + 0.3 * tdScore + 0.2 * compScore + 0.1 * turnoverScore;

  return Math.round(grade);
}

function computeRushingGrade(stats, games) {
  const rushingYards = Number(stats.RushingYards || 0);
  const rushingAttempts = Number(stats.RushingAttempts || 0);
  const rushingTds = Number(stats.RushingTouchdowns || 0);
  const yardsPerCarry = rushingAttempts ? rushingYards / rushingAttempts : 0;

  const receivingYards = Number(stats.ReceivingYards || 0);
  const receivingTds = Number(stats.ReceivingTouchdowns || 0);

  const rushingYpg = rushingYards / games;
  const rushingTdsPerGame = rushingTds / games;
  const receivingYpg = receivingYards / games;

  const rushYardScore = scaleTo100(rushingYpg, 30, 120);
  const rushTdScore = scaleTo100(rushingTdsPerGame, 0.2, 1.2);
  const efficiencyScore = scaleTo100(yardsPerCarry, 3.0, 5.5);
  const receivingBoost = scaleTo100(receivingYpg, 10, 60) * 0.2;

  const grade =
    0.4 * rushYardScore +
    0.25 * rushTdScore +
    0.25 * efficiencyScore +
    receivingBoost;

  return Math.round(grade);
}

function computeReceivingGrade(stats, games) {
  const receivingYards = Number(stats.ReceivingYards || 0);
  const receivingTds = Number(stats.ReceivingTouchdowns || 0);
  const receptions = Number(stats.Receptions || 0);
  const catchRate = calcCatchRate(stats);

  const receivingYpg = receivingYards / games;
  const receivingTdsPerGame = receivingTds / games;

  const recvYardScore = scaleTo100(receivingYpg, 25, 110);
  const recvTdScore = scaleTo100(receivingTdsPerGame, 0.2, 1.4);
  const volumeScore = scaleTo100(receptions / games, 3, 9);
  const handsScore = scaleTo100(catchRate ?? 0, 55, 78);

  const grade =
    0.35 * recvYardScore +
    0.25 * recvTdScore +
    0.25 * volumeScore +
    0.15 * handsScore;

  return Math.round(grade);
}

function computeFrontSevenGrade(stats, games) {
  const tackles = Number(stats.Tackles || stats.SoloTackles || 0);
  const assisted = Number(stats.AssistedTackles || 0);
  const sacks = Number(stats.Sacks || 0);
  const tacklesForLoss = Number(stats.TacklesForLoss || 0);
  const forcedFumbles = Number(stats.FumblesForced || 0);
  const fumbleRecoveries = Number(stats.FumblesRecovered || 0);

  const totalTackles = (tackles + assisted * 0.5) / games;
  const sackRate = sacks / games;
  const tflRate = tacklesForLoss / games;
  const turnoverRate = (forcedFumbles + fumbleRecoveries) / games;

  const tackleScore = scaleTo100(totalTackles, 3.5, 9.5);
  const sackScore = scaleTo100(sackRate, 0.2, 1.4);
  const tflScore = scaleTo100(tflRate, 0.2, 1.1);
  const turnoverScore = scaleTo100(turnoverRate, 0, 0.5);

  const grade =
    0.35 * tackleScore +
    0.3 * sackScore +
    0.2 * tflScore +
    0.15 * turnoverScore;

  return Math.round(grade);
}

function computeSecondaryGrade(stats, games) {
  const tackles = Number(stats.Tackles || stats.SoloTackles || 0);
  const assisted = Number(stats.AssistedTackles || 0);
  const interceptions = Number(stats.Interceptions || stats.PassingInterceptions || 0);
  const passesDefended = Number(stats.PassesDefended || 0);
  const forcedFumbles = Number(stats.FumblesForced || 0);
  const fumbleRecoveries = Number(stats.FumblesRecovered || 0);

  const totalTackles = (tackles + assisted * 0.5) / games;
  const interceptionsPerGame = interceptions / games;
  const passesDefendedPerGame = passesDefended / games;
  const turnoverRate = (forcedFumbles + fumbleRecoveries) / games;

  const tackleScore = scaleTo100(totalTackles, 2.5, 8);
  const coverageScore = scaleTo100(passesDefendedPerGame, 0.3, 1.6);
  const ballhawkScore = scaleTo100(interceptionsPerGame, 0.05, 0.6);
  const turnoverScore = scaleTo100(turnoverRate, 0, 0.35);

  const grade =
    0.35 * coverageScore +
    0.25 * tackleScore +
    0.25 * ballhawkScore +
    0.15 * turnoverScore;

  return Math.round(grade);
}

function computeOffensiveLineGrade(stats, games) {
  const sacksAllowed = Number(stats.SacksAllowed || 0);
  const penalties = Number(stats.Penalties || 0);
  const offensiveSnaps = Number(stats.OffensiveSnapsPlayed || 0);

  const sacksAllowedPerGame = sacksAllowed / games;
  const penaltiesPerGame = penalties / games;
  const reliabilityScore = scaleTo100(offensiveSnaps / games, 40, 70);
  const protectionScore = scaleTo100(1 - sacksAllowedPerGame, -0.5, 0.5);
  const disciplineScore = scaleTo100(1 - penaltiesPerGame, -0.3, 0.3);

  const grade =
    0.45 * protectionScore +
    0.25 * disciplineScore +
    0.3 * reliabilityScore;

  return Math.round(grade);
}

function computeKickerGrade(stats, games) {
  const fgMade = Number(stats.FieldGoalsMade || 0);
  const fgAttempts = Number(stats.FieldGoalsAttempted || 0);
  const fgPct = fgAttempts ? (fgMade / fgAttempts) * 100 : stats.FieldGoalsPercentage;
  const xpMade = Number(stats.ExtraPointsMade || 0);
  const xpAttempts = Number(stats.ExtraPointsAttempted || 0);
  const xpPct = xpAttempts ? (xpMade / xpAttempts) * 100 : stats.ExtraPointPercentage;
  const longFg = Number(stats.LongFieldGoalMade || stats.FieldGoalsLongestMade || 0);

  const attemptsPerGame = fgAttempts / games;

  const accuracyScore = scaleTo100(fgPct ?? 0, 70, 98);
  const extraPointScore = scaleTo100(xpPct ?? 0, 90, 100);
  const volumeScore = scaleTo100(attemptsPerGame, 0.4, 2.4);
  const rangeScore = scaleTo100(longFg, 40, 60);

  const grade =
    0.45 * accuracyScore +
    0.2 * extraPointScore +
    0.2 * volumeScore +
    0.15 * rangeScore;

  return Math.round(grade);
}

function computePunterGrade(stats, games) {
  const punts = Number(stats.Punts || 0);
  const avg = Number(stats.PuntAverage || stats.PuntAverageNet || stats.AveragePunt || 0);
  const inside20 = Number(stats.PuntsInside20 || 0);
  const touchbacks = Number(stats.PuntTouchbacks || 0);

  const puntsPerGame = punts / games;
  const inside20Rate = punts ? inside20 / punts : 0;
  const touchbackRate = punts ? touchbacks / punts : 0;

  const volumeScore = scaleTo100(puntsPerGame, 2, 5);
  const placementScore = scaleTo100(inside20Rate, 0.25, 0.55);
  const distanceScore = scaleTo100(avg, 42, 50);
  const touchbackPenalty = scaleTo100(1 - touchbackRate, 0.7, 1);

  const grade =
    0.35 * placementScore +
    0.25 * distanceScore +
    0.2 * volumeScore +
    0.2 * touchbackPenalty;

  return Math.round(grade);
}

function computeReturnerGrade(stats, games) {
  const kickReturns = Number(stats.KickReturns || 0);
  const kickReturnYards = Number(stats.KickReturnYards || 0);
  const kickReturnTds = Number(stats.KickReturnTouchdowns || 0);
  const puntReturns = Number(stats.PuntReturns || 0);
  const puntReturnYards = Number(stats.PuntReturnYards || 0);
  const puntReturnTds = Number(stats.PuntReturnTouchdowns || 0);

  const totalReturns = kickReturns + puntReturns;
  const totalReturnYards = kickReturnYards + puntReturnYards;
  const returnTds = kickReturnTds + puntReturnTds;

  const yardsPerReturn = totalReturns ? totalReturnYards / totalReturns : 0;
  const returnsPerGame = totalReturns / games;
  const tdRate = totalReturns ? returnTds / totalReturns : 0;

  const volumeScore = scaleTo100(returnsPerGame, 1, 4.5);
  const efficiencyScore = scaleTo100(yardsPerReturn, 8, 17);
  const tdScore = scaleTo100(tdRate, 0, 0.05);

  const grade = 0.4 * efficiencyScore + 0.35 * volumeScore + 0.25 * tdScore;
  return Math.round(grade);
}

function computeFallbackGrade(stats, games) {
  const tackles = Number(stats.Tackles || stats.SoloTackles || 0);
  const totalYards =
    Number(stats.PassingYards || 0) +
    Number(stats.RushingYards || 0) +
    Number(stats.ReceivingYards || 0);
  const bigPlays =
    Number(stats.Sacks || 0) +
    Number(stats.PassesDefended || 0) +
    Number(stats.Interceptions || 0) +
    Number(stats.FumblesForced || 0) +
    Number(stats.FumblesRecovered || 0);

  const perGameImpact =
    totalYards / games +
    (tackles / games) * 5 +
    (bigPlays / games) * 10;

  return clamp(Math.round(scaleTo100(perGameImpact, 5, 120)), 0, 100);
}

function computeSkillGrade(position, stats, gamesPlayed) {
  const games = gamesPlayed || 1;
  const grader = POSITION_GRADERS[position];
  if (grader) return grader(stats, games);

  return computeFallbackGrade(stats, games);
}

async function computeAndSaveSkillMetricsForTeam(season, week, team) {
  const seasonStats = await getPlayerSeasonStatsByTeam(season, team);
  if (!Array.isArray(seasonStats)) return [];

  const playerIds = seasonStats.map((s) => s.PlayerID);
  const players = await Player.find({ PlayerID: { $in: playerIds } });
  const playerById = new Map(players.map((p) => [p.PlayerID, p]));

  const metricsDocs = [];

  for (const stats of seasonStats) {
    const playerDoc = playerById.get(stats.PlayerID);
    if (!playerDoc) continue;

    const games =
      Number(stats.Games || stats.GamesPlayed || stats.Played || stats.GamesStarted || 0) ||
      1;

    const position = String(playerDoc.Position || stats.Position || "").toUpperCase();
    const grade = computeSkillGrade(position, stats, games);

    const metricsPayload = {
      grade,
      gamesPlayed: games,
      totals: {
        passingYards: stats.PassingYards || 0,
        passingTouchdowns: stats.PassingTouchdowns || 0,
        passingInterceptions: stats.PassingInterceptions || stats.Interceptions || 0,
        rushingYards: stats.RushingYards || 0,
        rushingTouchdowns: stats.RushingTouchdowns || 0,
        receptions: stats.Receptions || 0,
        receivingYards: stats.ReceivingYards || 0,
        receivingTouchdowns: stats.ReceivingTouchdowns || 0,
        tackles: stats.Tackles || stats.SoloTackles || 0,
        assistedTackles: stats.AssistedTackles || 0,
        sacks: stats.Sacks || 0,
        tacklesForLoss: stats.TacklesForLoss || 0,
        passesDefended: stats.PassesDefended || 0,
        interceptions: stats.Interceptions || 0,
        fumblesForced: stats.FumblesForced || 0,
        fumblesRecovered: stats.FumblesRecovered || 0,
        sacksAllowed: stats.SacksAllowed || 0,
        penalties: stats.Penalties || 0,
        offensiveSnaps: stats.OffensiveSnapsPlayed || 0,
        fieldGoalsMade: stats.FieldGoalsMade || 0,
        fieldGoalsAttempted: stats.FieldGoalsAttempted || 0,
        fieldGoalsPercentage: stats.FieldGoalsPercentage || 0,
        extraPointsMade: stats.ExtraPointsMade || 0,
        extraPointsAttempted: stats.ExtraPointsAttempted || 0,
        longFieldGoalMade: stats.LongFieldGoalMade || stats.FieldGoalsLongestMade || 0,
        punts: stats.Punts || 0,
        puntAverage: stats.PuntAverage || stats.PuntAverageNet || stats.AveragePunt || 0,
        puntsInside20: stats.PuntsInside20 || 0,
        puntTouchbacks: stats.PuntTouchbacks || 0,
        kickReturns: stats.KickReturns || 0,
        kickReturnYards: stats.KickReturnYards || 0,
        kickReturnTouchdowns: stats.KickReturnTouchdowns || 0,
        puntReturns: stats.PuntReturns || 0,
        puntReturnYards: stats.PuntReturnYards || 0,
        puntReturnTouchdowns: stats.PuntReturnTouchdowns || 0,
      },
      perGame: {
        passingYards: (stats.PassingYards || 0) / games,
        passingTouchdowns: (stats.PassingTouchdowns || 0) / games,
        interceptions: (stats.PassingInterceptions || stats.Interceptions || 0) / games,
        rushingYards: (stats.RushingYards || 0) / games,
        rushingTouchdowns: (stats.RushingTouchdowns || 0) / games,
        receptions: (stats.Receptions || 0) / games,
        receivingYards: (stats.ReceivingYards || 0) / games,
        receivingTouchdowns: (stats.ReceivingTouchdowns || 0) / games,
        tackles: (stats.Tackles || stats.SoloTackles || 0) / games,
        assistedTackles: (stats.AssistedTackles || 0) / games,
        sacks: (stats.Sacks || 0) / games,
        tacklesForLoss: (stats.TacklesForLoss || 0) / games,
        passesDefended: (stats.PassesDefended || 0) / games,
        defensiveInterceptions: (stats.Interceptions || 0) / games,
        fumblesForced: (stats.FumblesForced || 0) / games,
        fumblesRecovered: (stats.FumblesRecovered || 0) / games,
        sacksAllowed: (stats.SacksAllowed || 0) / games,
        penalties: (stats.Penalties || 0) / games,
        offensiveSnaps: (stats.OffensiveSnapsPlayed || 0) / games,
        fieldGoalsMade: (stats.FieldGoalsMade || 0) / games,
        fieldGoalsAttempted: (stats.FieldGoalsAttempted || 0) / games,
        fieldGoalsPercentage: stats.FieldGoalsPercentage || 0,
        extraPointsMade: (stats.ExtraPointsMade || 0) / games,
        extraPointsAttempted: (stats.ExtraPointsAttempted || 0) / games,
        longFieldGoalMade: stats.LongFieldGoalMade || stats.FieldGoalsLongestMade || 0,
        punts: (stats.Punts || 0) / games,
        puntAverage: stats.PuntAverage || stats.PuntAverageNet || stats.AveragePunt || 0,
        puntsInside20: (stats.PuntsInside20 || 0) / games,
        puntTouchbacks: (stats.PuntTouchbacks || 0) / games,
        kickReturns: (stats.KickReturns || 0) / games,
        kickReturnYards: (stats.KickReturnYards || 0) / games,
        kickReturnTouchdowns: (stats.KickReturnTouchdowns || 0) / games,
        puntReturns: (stats.PuntReturns || 0) / games,
        puntReturnYards: (stats.PuntReturnYards || 0) / games,
        puntReturnTouchdowns: (stats.PuntReturnTouchdowns || 0) / games,
      },
    };

    const doc = await PlayerAdvancedMetrics.findOneAndUpdate(
      {
        PlayerID: stats.PlayerID,
        season,
        week,
      },
      {
        PlayerID: stats.PlayerID,
        player: playerDoc._id,
        Team: playerDoc.Team,
        Position: position,
        season,
        week,
        metrics: metricsPayload,
      },
      { new: true, upsert: true }
    );

    metricsDocs.push(doc);
  }

  return metricsDocs;
}

module.exports = {
  computeAndSaveSkillMetricsForTeam,
};