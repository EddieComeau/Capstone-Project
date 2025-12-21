const axios = require("axios");

const BALLDONTLIE_API_KEY = process.env.BALLDONTLIE_API_KEY;
const BALLDONTLIE_NFL_BASE_URL = process.env.BALLDONTLIE_NFL_BASE_URL;

/**
 * Fetch players from the Ball Don't Lie API
 * @param {number} page - The page number to fetch
 * @param {number} perPage - The number of players per page
 * @returns {Promise<Object>} The API response containing only players on a team
 */
async function fetchPlayersFromBallDontLie(page = 1, perPage = 100) {
  try {
    const response = await axios.get(`${BALLDONTLIE_NFL_BASE_URL}/players`, {
      params: {
        page, // Specify the page number
        per_page: perPage, // Specify the number of players per page
        on_team: true, // Add this parameter if supported by the API
      },
      headers: {
        Authorization: `Bearer ${BALLDONTLIE_API_KEY}`, // Include the API key in the Authorization header
      },
    });

    // Log the number of players fetched and pagination details
    console.log(`✅ Fetched ${response.data.data.length} players on a team from Ball Don't Lie (page ${page})`);
    console.log(`Pagination Info:`, response.data.meta);

    // Return the players and metadata
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    console.error("❌ Error fetching players from Ball Don't Lie:", error.message);

    // Provide more context for debugging
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    // Throw the error to be handled by the calling function
    throw error;
  }
}

module.exports = {
  fetchPlayersFromBallDontLie,
};