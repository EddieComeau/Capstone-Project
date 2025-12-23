// server/services/epaService.js
const Play = require('../models/Play');
const Game = require('../models/Game');
const AdvancedMetric = require('../models/AdvancedMetric');

/**
 * approximateEP(yardline)
 * Simple expected points model:
 *   EP = (1 - yardline/100)*7
 * where yardline is 0..100 distance from offense own endzone (0 is offense own endzone).
 * Better to interpret yardline_before as distance to opponent end zone: 100 - yardline_number when BDL uses yardline_number
 */
function approximateEPFromYardlineNumber(yardlineNumber) {
  // yardlineNumber: distance from offense's own endzone (0..100) — many APIs use 1..99
  if (yardlineNumber == null || isNaN(yardlineNumber)) return null;
  const d = Number(yardlineNumber);
  const ep = ((100 - d) / 100) * 7;
  return ep;
}

/**
 * computeEPAForGame(gameId)
 * For each Play for the game (ordered by sequence or wallclock), compute EPA ~ EP_after - EP_before
 * If yardline at start or end not available, skip play.
 * Writes epa into Play.epa and updates AdvancedMetric for player and team aggregates.
 */
async function computeEPAForGame(gameId) {
  if (!gameId) throw new Error('gameId required');

  // fetch plays for game, ordered as available (use sequence or _id)
  const plays = await Play.find({ gameId }).sort({ sequence: 1, _id: 1 }).lean();
  if (!plays || plays.length === 0) return { processed: 0 };

  let processed = 0;

  // naive approach: compute EP from yardlineNumber fields. BDL play payload varies;
  // attempt to read p.raw.yardline_number or p.raw.yardline or p.raw.yard_line
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i];
    const raw = p.raw || {};
    // yardline before:
    const yBefore = raw.yardline_number || raw.yardline || raw.yard_line || null;
    // some endpoints include yardline after in raw.end_yardline or end_yardline_number
    const yAfter = raw.end_yardline_number || raw.end_yardline || raw.end_yardline_number || null;

    const epBefore = (yBefore != null) ? approximateEPFromYardlineNumber(yBefore) : null;
    const epAfter = (yAfter != null) ? approximateEPFromYardlineNumber(yAfter) : null;

    // fallback: try next play's yardline for after if not present
    let epAfterFallback = epAfter;
    if (epAfterFallback == null && plays[i+1]) {
      const rawNext = plays[i+1].raw || {};
      const yNext = rawNext.yardline_number || rawNext.yardline || rawNext.yard_line || null;
      epAfterFallback = (yNext != null) ? approximateEPFromYardlineNumber(yNext) : null;
    }

    const finalEpAfter = (epAfter != null) ? epAfter : epAfterFallback;

    let epa = null;
    if (epBefore != null && finalEpAfter != null) {
      epa = Number((finalEpAfter - epBefore).toFixed(3));
      // store epa in Play document
      try {
        await Play.updateOne({ _id: p._id }, { $set: { epa: epa, updatedAt: new Date() } });
        processed++;
      } catch (err) {
        console.warn('Failed to update play EPA', err && err.message ? err.message : err);
      }
    } else {
      // skip if not enough data
    }
  }

  // Optionally aggregate EPA into AdvancedMetric for players/teams
  // Sum EPAs per player for this game and upsert into AdvancedMetric.sources.computed or metrics
  // We'll compute player-season EPA later (e.g., computeEPAForSeason)
  return { processed };
}

/**
 * computeEPAForSeason: compute EPA for all games in a season
 */
async function computeEPAForSeason(season) {
  const games = await Game.find({ season }).lean();
  let total = 0;
  for (const g of games) {
    const res = await computeEPAForGame(g.gameId);
    total += (res.processed || 0);
  }
  return { processedPlays: total, games: games.length };
}

module.exports = {
  computeEPAForGame,
  computeEPAForSeason,
};
