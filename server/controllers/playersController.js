// server/controllers/playersController.js
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
    let query = Player.find(filter);

    if (q) {
      const regex = new RegExp(q, "i");
      query = query.find({
        $or: [{ FullName: regex }, { FirstName: regex }, { LastName: regex }],
      });
    }

    const players = await query.sort({ Team: 1, Position: 1, FullName: 1 });
    res.json(players);
  } catch (err) {
    next(err);
  }
}

// GET /api/players/:id
async function getPlayerById(req, res, next) {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(player);
  } catch (err) {
    next(err);
  }
}

// GET /api/players/team/:team
async function getPlayersByTeam(req, res, next) {
  try {
    const team = req.params.team.toUpperCase();
    const players = await Player.find({ Team: team }).sort({
      Position: 1,
      DepthChartOrder: 1,
    });
    res.json(players);
  } catch (err) {
    next(err);
  }
}

// POST /api/players/sync/:team
async function syncPlayersForTeam(req, res, next) {
  try {
    const team = req.params.team;
    const count = await syncTeamPlayers(team);

    res.status(200).json({
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
