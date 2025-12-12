// server/controllers/teamsController.js
const { fetchFromSportsData } = require("../services/sportsdataService");
const Team = require("../models/Team");

// GET /api/teams/live  => proxied from BALLDONTLIE
async function getAllTeamsLive(req, res) {
  try {
    const data = await fetchFromSportsData("/scores/json/AllTeams");
    res.json(data);
  } catch (err) {
    console.error("Error fetching live teams:", err.message);
    const status = err.status || 500;
    res.status(status).json({ error: err.message, details: err.response });
  }
}

// GET /api/teams/db  => from MongoDB
async function getAllTeamsFromDB(req, res) {
  try {
    const teams = await Team.find().sort({ abbreviation: 1 });
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
