// server/utils/apiUtils.js
const axios = require("axios");

/**
 * Build a URL safely:
 * joinUrl("https://x.com/", "/nfl/v1/stats") -> "https://x.com/nfl/v1/stats"
 */
function joinUrl(base, path) {
  if (!base) return String(path || "");
  return `${base.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;
}

/**
 * Serialize params so arrays become name[]=a&name[]=b
 * (matches what you were already doing)
 */
function serializeParams(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        sp.append(`${k}[]`, String(item));
      }
    } else {
      sp.append(k, String(v));
    }
  }
  return sp.toString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getBdlBaseUrl() {
  return (
    process.env.BALLDONTLIE_NFL_BASE_URL ||
    process.env.BALLDONTLIE_BASE_URL ||
    "https://api.balldontlie.io"
  );
}

function getBdlApiKey() {
  return (
    process.env.BALLDONTLIE_API_KEY ||
    process.env.SPORTSDATA_API_KEY || // your codebase uses this fallback in places
    process.env.BDL_API_KEY ||
    process.env.BDL_KEY ||
    ""
  );
}

function isRetryable(err) {
  const code = err?.code;
  const status = err?.response?.status;

  // timeouts / network errors
  if (code === "ECONNABORTED") return true;
  if (!status) return true;

  // rate limit
  if (status === 429) return true;

  // upstream server errors
  if (status >= 500 && status <= 599) return true;

  return false;
}

function getRetryDelayMs(err, attempt) {
  // Respect Retry-After header on 429 if present
  const status = err?.response?.status;
  if (status === 429) {
    const ra = err?.response?.headers?.["retry-after"];
    if (ra) {
      const seconds = Number(ra);
      if (!Number.isNaN(seconds) && seconds > 0) return Math.min(seconds * 1000, 60000);
    }
  }

  const base = Number(process.env.BDL_RETRY_BASE_MS || 1000); // 1s
  const max = Number(process.env.BDL_RETRY_MAX_MS || 30000);  // 30s cap
  const backoff = base * 2 ** (attempt - 1);
  // small jitter
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(max, backoff + jitter);
}

/**
 * Make a request to Ball Don't Lie NFL API and return response.data.
 *
 * - endpoint: "/nfl/v1/stats"
 * - params: { per_page: 100, season: 2025, cursor: 123 }
 *
 * Env knobs:
 * - BDL_TIMEOUT_MS (default 120000)
 * - BDL_RETRIES (default 5)
 * - BDL_RETRY_BASE_MS (default 1000)
 * - BDL_RETRY_MAX_MS (default 30000)
 */
async function bdlList(endpoint, params = {}, options = {}) {
  const baseUrl = getBdlBaseUrl();
  const apiKey = getBdlApiKey();

  if (!apiKey) {
    const e = new Error(
      "[BALLDONTLIE] Missing API key. Set BALLDONTLIE_API_KEY (or SPORTSDATA_API_KEY fallback) in your root .env"
    );
    e.status = 503;
    throw e;
  }

  const timeoutMs = Number(options.timeoutMs ?? process.env.BDL_TIMEOUT_MS ?? 120000);
  const maxRetries = Number(options.retries ?? process.env.BDL_RETRIES ?? 5);

  // Build full URL ourselves to preserve your array serialization
  const qs = serializeParams(params);
  const url = `${joinUrl(baseUrl, endpoint)}${qs ? `?${qs}` : ""}`;

  let attempt = 0;
  while (true) {
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: apiKey,
          Accept: "application/json",
        },
        timeout: timeoutMs,
      });
      return res.data;
    } catch (err) {
      attempt += 1;

      // Helpful error surfaces for auth errors
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        const e = new Error(
          `Ball Don't Lie API authentication failed (status ${status}). Check BALLDONTLIE_API_KEY / plan access.`
        );
        e.status = 503;
        throw e;
      }

      if (!isRetryable(err) || attempt > maxRetries) {
        // Print useful info once at failure
        const msg = err?.message || String(err);
        console.error(`Error fetching data from ${url}: ${msg}`);
        if (err?.response?.data) console.error("Response data:", err.response.data);
        throw err;
      }

      const delay = getRetryDelayMs(err, attempt);
      console.warn(
        `⚠️ bdlList retry ${attempt}/${maxRetries} after ${delay}ms (status=${status || "N/A"})`
      );
      await sleep(delay);
    }
  }
}

module.exports = {
  joinUrl,
  serializeParams,
  bdlList,
};
