// server/utils/apiUtils.js
const axios = require('axios');

/**
 * Build a backend-relative URL path safely.
 */
function joinUrl(base, path) {
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;
}

/**
 * Serialize params so arrays become name[]=a&name[]=b (per API docs).
 */
function serializeParams(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        // Use the bracketed name so we get team_ids[]=1&team_ids[]=2
        sp.append(`${k}[]`, String(item));
      }
    } else {
      sp.append(k, String(v));
    }
  }
  return sp.toString();
}

/**
 * Make a request to Ball Don't Lie NFL API.
 *
 * Conventions:
 * - Default base: https://api.balldontlie.io
 * - Callers should pass endpoints like '/nfl/v1/players'
 * - This returns response.data (so { data, meta } is preserved)
 */
async function bdlList(endpoint, params = {}) {
  const baseUrl = process.env.BALLDONTLIE_NFL_BASE_URL
    || process.env.BALLDONTLIE_BASE_URL
    || "https://api.balldontlie.io";

  const apiKey = process.env.BALLDONTLIE_API_KEY || process.env.BDL_API_KEY || process.env.BDL_KEY;
  if (!apiKey) {
    const error = new Error("BALLDONTLIE_API_KEY is not set in environment variables. Please set BALLDONTLIE_API_KEY, BDL_API_KEY, or BDL_KEY in your .env file.");
    error.status = 503; // Service Unavailable
    throw error;
  }

  const qs = serializeParams(params);
  const url = `${baseUrl}${endpoint}${qs ? `?${qs}` : ''}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
      timeout: Number(process.env.BDL_TIMEOUT_MS || 30000),
    });
    // return the parsed body (should include .data and .meta when provided by BDL)
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      // Provide more helpful error messages based on status code
      if (error.response.status === 401 || error.response.status === 403) {
        const authError = new Error(`Ball Don't Lie API authentication failed. Please check your API key. (Status: ${error.response.status})`);
        authError.status = 503; // Service Unavailable
        throw authError;
      }
      if (error.response.status === 429) {
        const rateLimitError = new Error(`Ball Don't Lie API rate limit exceeded. Please try again later.`);
        rateLimitError.status = 429;
        throw rateLimitError;
      }
    }
    throw error;
  }
}

module.exports = {
  joinUrl,
  bdlList,
};