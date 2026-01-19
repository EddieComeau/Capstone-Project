const axios = require("axios");

const API_KEY = process.env.BDL_API_KEY || process.env.BALLDONTLIE_API_KEY;
const BASE_URL =
  process.env.BALLDONTLIE_NFL_BASE_URL || "https://api.balldontlie.io/nfl/v1";

if (!API_KEY) {
  console.warn("[BDL] Missing API key (BDL_API_KEY or BALLDONTLIE_API_KEY).");
}

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: API_KEY ? `Bearer ${API_KEY}` : undefined,
  },
  timeout: 10000,
});

// Wrapper for GET requests
async function bdlList(endpoint, params = {}) {
  try {
    const res = await axiosInstance.get(endpoint, { params });
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    const url = `${BASE_URL}${endpoint}`;
    console.error(
      `[bdlList] Error fetching ${endpoint}: ${err.message}`,
      status ? `status=${status}` : "",
      data ? `data=${JSON.stringify(data)}` : ""
    );
    if (url && params && Object.keys(params).length) {
      console.error(`[bdlList] Request: ${url} params=${JSON.stringify(params)}`);
    }
    throw err;
  }
}

// Optional: for manual usage
module.exports = {
  bdlList,
  axiosInstance,
};
