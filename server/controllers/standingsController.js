// server/controllers/standingsController.js
const { fetchFromSportsData } = require("../services/sportsdataService");

// GET /api/standings/:season  (e.g. 2024, 2023)
async function getStandingsBySeason(req, res) {
  try {
    const { season } = req.params;

    if (!season) {
      return res
        .status(400)
        .json({ error: "Season is required (e.g. 2024)" });
    }

    const path = `/scores/json/Standings/${season}`;
    const data = await fetchFromSportsData(path);

    res.json(data);
  } catch (err) {
    console.error("Error fetching standings:", err.message);
    const status = err.status || 500;
    res.status(status).json({ error: err.message, details: err.response });
  }
}

module.exports = { getStandingsBySeason };
