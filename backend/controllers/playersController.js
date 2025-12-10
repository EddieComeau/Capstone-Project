// controllers/playersController.js
const Player = require("../models/Player");
const { syncTeamPlayers } = require("../services/syncService");

/**
 * GET /api/players
 * Optional query: team, position, q (search by name)
 */
async function getAllPlayers(req, res, next) {
  try {
    const filter = {};
    if (req.query.team) filter.Team = req.query.team.toUpperCase();
    if (req.query.position) filter.Position = req.query.position.toUpperCase();

    const q = req.query.q;
    if (q) {
      filter.$or = [
        { FullName: new RegExp(q, "i") },
        { FirstName: new RegExp(q, "i") },
        { LastName: new RegExp(q, "i") },
      ];
    }

    const players = await Player.find(filter).sort({ Team: 1, Position: 1, DepthChartOrder: 1 });
    res.json(players);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/players/:id
 */
async function getPlayerById(req, res, next) {
  try {
    const { id } = req.params;
    const player = await Player.findById(id);

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json(player);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/players/team/:team
 */
async function getPlayersByTeam(req, res, next) {
  try {
    const { team } = req.params;
    const players = await Player.find({ Team: team.toUpperCase() }).sort({
      Position: 1,
      DepthChartOrder: 1,
    });

    res.json(players);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/players/sync/:team
 * Body (optional): { overwrite: boolean }
 *
 * Syncs roster for a single team into Player collection.
 * Uses syncTeamPlayers from syncService.
 */
async function syncPlayersForTeam(req, res, next) {
  try {
    const { team } = req.params;
    const { count } = await syncTeamPlayers(team.toUpperCase());

    res.json({
      team: team.toUpperCase(),
      syncedPlayers: count,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllPlayers,
  getPlayerById,
  getPlayersByTeam,
  syncPlayersForTeam,
};
