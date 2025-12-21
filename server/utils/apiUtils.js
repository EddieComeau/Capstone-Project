const axios = require("axios");

// Function to make an API request to Ball Don't Lie NFL API
async function bdlList(endpoint, params = {}) {
  const baseUrl = process.env.BALLDONTLIE_NFL_BASE_URL || "https://api.balldontlie.io/v1/nfl";
  const apiKey = process.env.BALLDONTLIE_API_KEY;

  if (!apiKey) {
    throw new Error("BALLDONTLIE_API_KEY is not set in environment variables");
  }

  try {
    const response = await axios.get(`${baseUrl}${endpoint}`, {
      params,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    
    // Return the data array from the response
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

module.exports = {
  bdlList,
};