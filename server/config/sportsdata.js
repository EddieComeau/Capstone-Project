require("dotenv").config();

// Prefer BALLDONTLIE_* but support SPORTSDATA_* fallback
const SPORTS_DATA_BASE_URL =
  process.env.BALLDONTLIE_NFL_BASE_URL ||
  process.env.SPORTSDATA_BASE_URL ||
  "https://api.balldontlie.io/nfl/v1";

const SPORTS_DATA_API_KEY =
  process.env.BALLDONTLIE_API_KEY || process.env.SPORTSDATA_API_KEY;

if (!SPORTS_DATA_API_KEY) {
  console.warn(
    "[BALLDONTLIE] Warning: BALLDONTLIE_API_KEY (or SPORTSDATA_API_KEY fallback) is not set in your .env"
  );
}

module.exports = {
  SPORTS_DATA_BASE_URL,
  SPORTS_DATA_API_KEY,
};
