// server/utils/apiUtils.js

const DEFAULT_BDL_BASE = 'https://nfl.balldontlie.io/v1'; // ← Updated default

/**
 * Returns the base URL for BallDontLie API.
 * Will check env variables in this order:
 * 1. BALLDONTLIE_NFL_BASE_URL  – set this if you need something else
 * 2. BALLDONTLIE_BASE_URL      – legacy fallback
 * 3. DEFAULT_BDL_BASE          – our default (NFL API)
 */
function getBdlBaseUrl() {
  return process.env.BALLDONTLIE_NFL_BASE_URL ||
    process.env.BALLDONTLIE_BASE_URL ||
    DEFAULT_BDL_BASE;
}

/**
 * A simple wrapper around axios to handle BallDontLie list endpoints.
 * Takes a path (e.g. `/odds`) and a params object.
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
