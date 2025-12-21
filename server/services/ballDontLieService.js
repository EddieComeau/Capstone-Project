// server/services/ballDontLieService.js
const axios = require("axios");

const BALLDONTLIE_API_KEY = process.env.BALLDONTLIE_API_KEY;
const BALLDONTLIE_NFL_BASE_URL = process.env.BALLDONTLIE_NFL_BASE_URL;

function assertEnv() {
  if (!BALLDONTLIE_API_KEY) throw new Error("Missing env var: BALLDONTLIE_API_KEY");
  if (!BALLDONTLIE_NFL_BASE_URL) throw new Error("Missing env var: BALLDONTLIE_NFL_BASE_URL");
}

function makeHeadersRaw() {
  // Some BallDontLie endpoints accept raw key in Authorization header
  return { Authorization: BALLDONTLIE_API_KEY };
}

function makeHeadersBearer() {
  // Some setups want Bearer <key>
  return {
    Authorization: BALLDONTLIE_API_KEY.startsWith("Bearer ")
      ? BALLDONTLIE_API_KEY
      : `Bearer ${BALLDONTLIE_API_KEY}`,
  };
}

/**
 * Fetch players from Ball Don't Lie NFL API (cursor pagination)
 *
 * Returns:
 *   { data: [...], meta: { next_cursor, per_page, ... } }
 */
async function fetchPlayersFromBallDontLie({
  cursor = null,
  perPage = 100,
  activeOnly = false,
  teamIds = [],
} = {}) {
  assertEnv();

  const path = activeOnly ? "/players/active" : "/players";
  const url = `${BALLDONTLIE_NFL_BASE_URL}${path}`;

  const params = {
    per_page: Math.min(Number(perPage || 100), 100),
  };

  if (cursor !== null && cursor !== undefined) params.cursor = cursor;

  // team_ids[] filter (optional)
  if (Array.isArray(teamIds) && teamIds.length > 0) {
    params["team_ids[]"] = teamIds
      .map((t) => Number(t))
      .filter((n) => !Number.isNaN(n));
  }

  const doRequest = async (headers) => {
    const response = await axios.get(url, { params, headers });
    return {
      data: response.data?.data ?? [],
      meta: response.data?.meta ?? {},
    };
  };

  try {
    return await doRequest(makeHeadersRaw());
  } catch (err) {
    const status = err?.response?.status;

    // Retry with Bearer if unauthorized/forbidden
    if (status === 401 || status === 403) {
      try {
        return await doRequest(makeHeadersBearer());
      } catch (err2) {
        console.error("❌ Ball Don't Lie auth failed (raw + bearer).");
        if (err2.response) {
          console.error("Response status:", err2.response.status);
          console.error("Response data:", err2.response.data);
        }
        throw err2;
      }
    }

    console.error("❌ Error fetching players from Ball Don't Lie:", err.message);
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
    throw err;
  }
}

module.exports = {
  fetchPlayersFromBallDontLie,
};
