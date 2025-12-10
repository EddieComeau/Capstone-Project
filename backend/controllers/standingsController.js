// controllers/standingsController.js
const { fetchFromSportsData } = require("../services/sportsdataService");

// GET /api/standings/:season  (e.g. 2024REG, 2024POST, or just 2024)
async function getStandingsBySeason(req, res) {
  try {
    const { season } = req.params;

    if (!season) {
      return res
        .status(400)
        .json({ error: "Season is required (e.g. 2024REG)" });
    }

    const path = `/scores/json/Standings/${season}`;
    const data = await fetchFromSportsData(path);

    res.json(data);
  } catch (err) {
    console.error("Error fetching standings:", err.message);
    res.status(500).json({ error: "Failed to fetch standings" });
  }
}

module.exports = { getStandingsBySeason };
