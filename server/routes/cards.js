const express = require("express");
const router = express.Router();

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
const {
  getAllCardsForTeam,
  getSkillCardsForTeamFromDb,
} = require("../services/cardAggregationService");
const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");

// GET /api/cards/player/:playerId?season=&week=
// Return a single skill card for a player.
router.get("/player/:playerId", async (req, res, next) => {
  try {
    const playerId = Number(req.params.playerId);
    const season = Number(req.query.season);
    const week = Number(req.query.week);
    const adv = await PlayerAdvancedMetrics.findOne({ PlayerID: playerId, season, week }).populate(
      "player"
    );
    if (!adv) return res.status(404).json({ error: "Card not found for player" });
    const p = adv.player;
    const name =
      p?.full_name || `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
    const photo = p?.raw?.photoUrl || p?.raw?.headshot_url || null;
    const card = {
      cardType: "skill",
      playerId: p?._id,
      PlayerID: adv.PlayerID,
      name,
      team: adv.Team,
      position: adv.Position,
      season: adv.season,
      week: adv.week,
      photo,
      metrics: adv.metrics,
    };
    res.json(card);
  } catch (err) {
    next(err);
  }
});

// GET /api/cards/team/:team?season=&week=
// High-level payload with every card type for that team/week.
router.get("/team/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season);
    const week = Number(req.query.week);
    if (!week && week !== 0) {
      return res.status(400).json({
        error: "Missing ?week=. Example: /api/cards/team/BUF?season=2024&week=3",
      });
    }
    const payload = await getAllCardsForTeam(season, week, team);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /api/cards/oline/:team?season=&week=
router.get("/oline/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season);
    const week = Number(req.query.week);
    const cards = await getOffensiveLineCardsFromDb(season, week, team);
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

// GET /api/cards/advanced-oline/:team?season=&week=
router.get("/advanced-oline/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season);
    const week = Number(req.query.week);
    const cards = await getAdvancedOlineCardsFromDb(season, week, team);
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

// GET /api/cards/special-teams/:team?season=&week=
router.get("/special-teams/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season);
    const week = Number(req.query.week);
    const cards = await getSpecialTeamsCardsFromDb(season, week, team);
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

// GET /api/cards/defense/:team?season=&week=
router.get("/defense/:team", async (req, res, next) => {
  try {
    const { team } = req.params;
    const season = Number(req.query.season);
    const week = Number(req.query.week);
    const cards = await getDefensiveCardsFromDb(season, week, team);
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
