const axios = require("axios");

// Example function to make an API request
async function bdlList(endpoint, params = {}) {
  const baseUrl = "https://api.example.com"; // Replace with the actual base URL
  const apiKey = process.env.BALLDONTLIE_API_KEY; // Use your API key from .env

  try {
    const response = await axios.get(`${baseUrl}${endpoint}`, {
      params,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error.message);
    throw error;
  }
}

module.exports = {
  bdlList,
};