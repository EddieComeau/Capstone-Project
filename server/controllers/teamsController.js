// controllers/teamsController.js
const { fetchFromSportsData } = require("../services/sportsdataService");
const Team = require("../models/Team");

// GET /api/teams/live  => from BALLDONTLIE
async function getAllTeamsLive(req, res) {
  try {
    const data = await fetchFromSportsData("/teams");
    // BALLDONTLIE returns { data: [...] }
    res.json(data);
  } catch (err) {
    console.error("Error fetching live teams:", err.message);
    res.status(err.status || 500).json({ error: "Failed to fetch live teams" });
  }
}

// GET /api/teams/db  => from your MongoDB Team collection
async function getAllTeamsFromDB(req, res) {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    console.error("Error fetching teams from DB:", err.message);
    res.status(500).json({ error: "Failed to fetch teams from database" });
  }
}

module.exports = {
  getAllTeamsLive,
  getAllTeamsFromDB,
};
