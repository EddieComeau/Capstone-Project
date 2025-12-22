// server/utils/apiUtils.js
// Shared API utilities

const axios = require('axios');

/**
 * Build a backend-relative URL path safely.
 * NOTE: Frontend should use frontend/src/lib/api.js; server uses absolute URLs.
 */
function joinUrl(base, path) {
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;
}

/**
 * Function to make an API request to Ball Don't Lie NFL API
 */
async function bdlList(endpoint, params = {}) {
  // Base URL for Ball Don't Lie API (without version/sport paths)
  const baseUrl = process.env.BALLDONTLIE_NFL_BASE_URL || "https://api.balldontlie.io";
  const apiKey = process.env.BALLDONTLIE_API_KEY;

  if (!apiKey) {
    throw new Error("BALLDONTLIE_API_KEY is not set in environment variables");
  }

  try {
    const response = await axios.get(`${baseUrl}${endpoint}`, {
      params,
      headers: {
        Authorization: apiKey, // Ball Don't Lie uses direct API key in Authorization header
      },
    });
    
    // Return the full response object to preserve metadata (including next_cursor)
    return response.data;
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
  joinUrl,
  bdlList,
};