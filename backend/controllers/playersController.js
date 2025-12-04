// controllers/playersController.js
const { fetchFromSportsData } = require("../services/sportsdataService");
const Player = require("../models/Player"); // your existing model

// GET /api/players/live/:team  => SportsData.io PlayersBasic
async function getPlayersByTeamLive(req, res) {
  try {
    const { team } = req.params; // e.g. WAS, DAL, KC

    if (!team) {
      return res.status(400).json({ error: "Team abbreviation is required" });
    }

    const path = `/scores/json/PlayersBasic/${team.toUpperCase()}`;
    const data = await fetchFromSportsData(path);

    res.json(data);
  } catch (err) {
    console.error("Error fetching live players:", err.message);
    res.status(500).json({ error: "Failed to fetch live players" });
  }
}

// GET /api/players/db  => players stored in MongoDB
async function getPlayersFromDB(req, res) {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (err) {
    console.error("Error fetching players from DB:", err.message);
    res.status(500).json({ error: "Failed to fetch players from database" });
  }
}

module.exports = {
  getPlayersByTeamLive,
  getPlayersFromDB,
};
