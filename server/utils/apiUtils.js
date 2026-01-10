// server/utils/apiUtils.js

const DEFAULT_BDL_BASE = 'https://api.balldontlie.io/nfl/v1';  // ✅ Correct NFL base

/**
 * Returns the base URL for BallDontLie API.
 * Priority:
 * 1. BALLDONTLIE_NFL_BASE_URL – set this if you need a custom domain
 * 2. BALLDONTLIE_BASE_URL      – legacy fallback
 * 3. DEFAULT_BDL_BASE          – NFL API
 */
function getBdlBaseUrl() {
  return process.env.BALLDONTLIE_NFL_BASE_URL ||
    process.env.BALLDONTLIE_BASE_URL ||
    DEFAULT_BDL_BASE;
}

/**
 * Simple wrapper around axios to handle GET endpoints.
 * @param {Object} axiosInstance - an axios instance
 * @param {String} path - e.g. "/odds"
 * @param {Object} params - query params
 * @param {Object} headers - additional headers
 */
async function bdlList(axiosInstance, path, params = {}, headers = {}) {
  const baseUrl = getBdlBaseUrl();
  const url = `${baseUrl}${path}`;
  const opts = {
    params,
    headers: {
      Authorization: `Bearer ${process.env.BDL_API_KEY}`,
      ...headers,
    },
  };
  const response = await axiosInstance.get(url, opts);
  return response.data;
}

module.exports = {
  getBdlBaseUrl,
  bdlList,
};
