// server/utils/apiUtils.js

const DEFAULT_BDL_BASE = 'https://nfl.balldontlie.io/v1'; // default NFL API base

/**
 * Returns the base URL for BallDontLie API.
 * Order of preference:
 * 1. BALLDONTLIE_NFL_BASE_URL (use this for custom domains)
 * 2. BALLDONTLIE_BASE_URL      (legacy fallback)
 * 3. DEFAULT_BDL_BASE          (NFL API)
 */
function getBdlBaseUrl() {
  return process.env.BALLDONTLIE_NFL_BASE_URL ||
    process.env.BALLDONTLIE_BASE_URL ||
    DEFAULT_BDL_BASE;
}

/**
 * Generic helper for GET endpoints.
 * Accepts an axios instance, a path (e.g. "/odds") and query params.
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
