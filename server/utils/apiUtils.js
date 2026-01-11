const axios = require("axios");

const axiosInstance = axios.create({
  baseURL: process.env.BALLDONTLIE_NFL_BASE_URL || "https://api.balldontlie.io/nfl/v1",
  headers: {
    Authorization: `Bearer ${process.env.BDL_API_KEY}`,
  },
  timeout: 10000,
});

// Wrapper for GET requests
async function bdlList(endpoint, params = {}) {
  try {
    const res = await axiosInstance.get(endpoint, { params });
    return res.data;
  } catch (err) {
    console.error(`[bdlList] Error fetching ${endpoint}: ${err.message}`);
    throw err;
  }
}

// Optional: for manual usage
module.exports = {
  bdlList,
  axiosInstance,
};