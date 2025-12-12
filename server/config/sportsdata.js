// server/config/sportsdata.js
require("dotenv").config();

const BALLDONTLIE_BASE_URL =
  process.env.BALLDONTLIE_BASE_URL || "https://api.balldontlie.io";

const BALLDONTLIE_API_KEY = process.env.BALLDONTLIE_API_KEY;

if (!BALLDONTLIE_API_KEY) {
  console.warn(
    "[BallDontLie] Warning: BALLDONTLIE_API_KEY is not set in your .env file"
  );
}

module.exports = {
  BALLDONTLIE_BASE_URL,
  BALLDONTLIE_API_KEY,
};
