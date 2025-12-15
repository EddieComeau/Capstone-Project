// controllers/standingsController.js
const { fetchFromSportsData } = require("../services/sportsdataService");

// GET /api/standings/:season  (e.g. 2024, or 2024REG -> treated as 2024)
async function getStandingsBySeason(req, res) {
  try {
    const { season } = req.params;
    if (!season) return res.status(400).json({ error: "Season is required" });

    const yearMatch = String(season).match(/\d{4}/);
    if (!yearMatch) {
      return res.status(400).json({ error: "Season must contain a 4-digit year" });
    }

    const year = Number(yearMatch[0]);

    // BALLDONTLIE: /standings?season=YYYY
    const data = await fetchFromSportsData("/standings", { season: year });
    res.json(data);
  } catch (err) {
    console.error("Error fetching standings:", err.message);
    res.status(err.status || 500).json({ error: "Failed to fetch standings" });
  }
}

module.exports = { getStandingsBySeason };

