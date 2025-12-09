// services/lineMetricsService.js
const Player = require("../models/Player");
const LineMetrics = require("../models/LineMetrics");
const {
  getTeamGameStats,
  getPlayerSnapCountsByTeam,
} = require("./sportsdataService");

// Simple scaler for 0–100
function scaleTo100(value, min, max) {
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

function computeTeamLineGrade(teamStats) {
  const passingAttempts = teamStats.PassingAttempts || 0;
  const sacksAllowed = teamStats.SacksAllowed || 0;
  const dropbacks = passingAttempts + sacksAllowed;

  const rushingAttempts = teamStats.RushingAttempts || 0;
  const rushingYards = teamStats.RushingYards || 0;

  const sacksPerDropback = dropbacks > 0 ? sacksAllowed / dropbacks : 0;
  const ypc = rushingAttempts > 0 ? rushingYards / rushingAttempts : 0;

  const passGrade = scaleTo100(1 - sacksPerDropback, 0, 1);
  const runGrade = scaleTo100(ypc, 0, 6); // 0–6 YPC → 0–100
  const overall = Math.round(0.6 * passGrade + 0.4 * runGrade);

  return { passGrade, runGrade, overall };
}

/**
 * Compute and save LineMetrics for all offensive linemen on a team.
 */
async function computeAndSaveLineMetricsForTeam(season, week, team) {
  const [teamStatsArr, snapCounts] = await Promise.all([
    getTeamGameStats(season, week, team),
    getPlayerSnapCountsByTeam(season, week, team),
  ]);

  const teamStats = Array.isArray(teamStatsArr)
    ? teamStatsArr[0]
    : teamStatsArr;

  const lineGrade = computeTeamLineGrade(teamStats);

  const snapMap = new Map(
    (snapCounts || []).map((s) => [s.PlayerID, s])
  );

  const olPositions = ["C", "G", "OG", "OT", "T", "OL"];
  const linemen = await Player.find({
    Team: team,
    Position: { $in: olPositions },
  });

  const ops = linemen.map(async (lineman) => {
    const snap = snapMap.get(lineman.PlayerID) || {};
    const snaps = {
      total: snap.Snaps || 0,
      run: snap.RunSnaps || 0,
      pass: snap.PassSnaps || 0,
    };

    // Upsert LineMetrics for this player/season/week
    await LineMetrics.findOneAndUpdate(
      {
        PlayerID: lineman.PlayerID,
        season,
        week,
      },
      {
        player: lineman._id,
        PlayerID: lineman.PlayerID,
        Team: lineman.Team,
        Position: lineman.Position,
        season,
        week,
        lineGrade,
        snaps,
      },
      { upsert: true, new: true }
    );
  });

  await Promise.all(ops);

  return { lineGrade, count: linemen.length };
}

/**
 * Read LineMetrics and return card-ready objects for a team/week.
 */
async function getOffensiveLineCardsFromDb(season, week, team) {
  const metrics = await LineMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  return metrics.map((m) => ({
    cardType: "oline-basic",
    playerId: m.player?._id,
    PlayerID: m.PlayerID,
    name: m.player?.FullName,
    team: m.Team,
    position: m.Position,
    photo: m.player?.PhotoUrl,
    snaps: m.snaps,
    lineGrade: m.lineGrade,
  }));
}

module.exports = {
  computeAndSaveLineMetricsForTeam,
  getOffensiveLineCardsFromDb,
};
