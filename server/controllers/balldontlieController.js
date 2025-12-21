const { BalldontlieAPI } = require("@balldontlie/sdk");

const apiKey = process.env.BALLDONTLIE_API_KEY; // Ensure this is set in your .env file
const api = new BalldontlieAPI({ apiKey });

/**
 * Fetch all players from the Ball Don't Lie API
 * Supports pagination using cursor-based pagination
 */
async function getAllPlayers(req, res) {
  try {
    const cursor = req.query.cursor || null; // Cursor for pagination
    const perPage = req.query.per_page || 25; // Default to 25 players per page

    // Fetch players from the API
    const response = await api.nfl.getPlayers({
      cursor,
      per_page: perPage,
    });

    // Return the players and pagination metadata
    res.status(200).json({
      players: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("❌ Error fetching players:", error.message);
    res.status(500).json({
      error: "Failed to fetch players",
      details: error.message,
    });
  }
}

module.exports = {
  getAllPlayers,
};