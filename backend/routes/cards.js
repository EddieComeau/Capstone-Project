// routes/cards.js
const express = require("express");
const router = express.Router();

const Player = require("../models/Player");
const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");

const {
  getOffensiveLineCardsFromDb,
} = require("../services/lineMetricsService");
const {
  getAdvancedOlineCardsFromDb,
} = require("../services/advancedLineService");
const {
  getSpecialTeamsCardsFromDb,
} = require("../services/specialTeamsService");
const {
  getDefensiveCardsFromDb,
} = require("../services/defensiveMetricsService");
/*const {
  getAllCardsForTeam,
} = require("../services/cardAggregationService");
*/
/**
 * Unified helper to build a basic card shell for any player.
 */
function buildBasePlayerCard(playerDoc) {
  return {
    playerId: playerDoc?._id,
    PlayerID: playerDoc?.PlayerID,
    name: playerDoc?.FullName,
    position: playerDoc?.Position,
    team: playerDoc?.Team,
    photo: playerDoc?.PhotoUrl,
  };
}

/**
 * GET /api/cards/player/:id
 * Query: season, week (week required for now since we sync weekly metrics)
 *
 * Returns a "skill position" style card using PlayerAdvancedMetrics.
 */
router.get("/player/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const season = Number(req.query.season) || new Date().getFullYear();
    const week = req.query.week ? Number(req.query.week) : null;

    if (!week) {
      return res.status(400).json({
        error:
          "Missing ?week=. Example: /api/cards/player/:id?season=2024&week=3",
      });
    }

    const player = await Player.findById(id);
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const metricsDoc = await PlayerAdvancedMetrics.findOne({
      PlayerID: player.PlayerID,
      season,
      week,
    });

    const base = buildBasePlayerCard(player);

    return res.json({
      cardType: "skill",
      season,
      week,
      ...base,
      metrics: metricsDoc?.metrics || {},
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/oline/:team
 * Query: season, week (week required)
 *
 * Returns basic offensive line cards (shared line grade + snaps).
 */
router.get("/oline/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season) || new Date().getFullYear();
    const week = req.query.week ? Number(req.query.week) : null;

    if (!week) {
      return res.status(400).json({
        error:
          "Missing ?week=. Example: /api/cards/oline/BUF?season=2024&week=3",
      });
    }

    const cards = await getOffensiveLineCardsFromDb(season, week, team);
    return res.json(cards);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/advanced-oline/:team
 * Query: season, week (week required)
 *
 * Returns advanced offensive line cards (pressures, sacks, efficiency).
 */
router.get("/advanced-oline/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season) || new Date().getFullYear();
    const week = req.query.week ? Number(req.query.week) : null;

    if (!week) {
      return res.status(400).json({
        error:
          "Missing ?week=. Example: /api/cards/advanced-oline/BUF?season=2024&week=3",
      });
    }

    const cards = await getAdvancedOlineCardsFromDb(season, week, team);
    return res.json(cards);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/special-teams/:team
 * Query: season, week (week required)
 *
 * Returns special teams cards (K, P, returners, ST gunners).
 */
router.get("/special-teams/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season) || new Date().getFullYear();
    const week = req.query.week ? Number(req.query.week) : null;

    if (!week) {
      return res.status(400).json({
        error:
          "Missing ?week=. Example: /api/cards/special-teams/BUF?season=2024&week=3",
      });
    }

    const cards = await getSpecialTeamsCardsFromDb(season, week, team);
    return res.json(cards);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/defense/:team
 * Query: season, week (week required)
 *
 * Returns defensive cards (safeties, CBs, LBs, hybrids).
 */
router.get("/defense/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season) || new Date().getFullYear();
    const week = req.query.week ? Number(req.query.week) : null;

    if (!week) {
      return res.status(400).json({
        error:
          "Missing ?week=. Example: /api/cards/defense/BUF?season=2024&week=3",
      });
    }

    const cards = await getDefensiveCardsFromDb(season, week, team);
    return res.json(cards);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/team/:team
 * Query: season, week (week required)
 *
 * Returns ALL card groups for a team in one payload:
 * { team, season, week, oline, olineAdvanced, specialTeams, defense }
 */
router.get("/team/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season) || new Date().getFullYear();
    const week = req.query.week ? Number(req.query.week) : null;

    if (!week) {
      return res.status(400).json({
        error:
          "Missing ?week=. Example: /api/cards/team/BUF?season=2024&week=3",
      });
    }

    const payload = await getAllCardsForTeam(season, week, team);
    return res.json(payload);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
