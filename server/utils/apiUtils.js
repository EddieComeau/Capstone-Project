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
 *
 * Conventions:
 * - Default base URL is https://api.balldontlie.io/v1
 * - Callers should pass endpoints like '/nfl/players' (no repeated /v1)
 * - This helper returns the parsed response body (which should include `data` and `meta` where present)
 */
async function bdlList(endpoint, params = {}) {
  // Pick base URL explicitly; allow older variable names for backwards compatibility.
  const baseUrl = process.env.BALLDONTLIE_NFL_BASE_URL
    || process.env.BALLDONTLIE_BASE_URL
    || "https://api.balldontlie.io/v1";

  // Accept a few common API key env var names
  const apiKey = process.env.BALLDONTLIE_API_KEY || process.env.BDL_API_KEY || process.env.BDL_KEY;

  if (!apiKey) {
    throw new Error("BALLDONTLIE_API_KEY is not set in environment variables");
  }

  try {
    const url = `${baseUrl}${endpoint}`;
    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: apiKey, // Ball Don't Lie uses direct API key in Authorization header (project convention)
      },
    });

    // Return the parsed response body (may have .data and .meta fields)
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
