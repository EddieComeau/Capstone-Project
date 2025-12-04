// config/sportsdata.js
require("dotenv").config();

const SPORTS_DATA_BASE_URL =
  process.env.SPORTSDATA_BASE_URL || "https://api.sportsdata.io/v3/nfl";

const SPORTS_DATA_API_KEY = process.env.SPORTSDATA_API_KEY;

if (!SPORTS_DATA_API_KEY) {
  console.warn(
    "[SportsData] Warning: SPORTSDATA_API_KEY is not set in your .env file"
  );
}

module.exports = {
  SPORTS_DATA_BASE_URL,
  SPORTS_DATA_API_KEY,
};
