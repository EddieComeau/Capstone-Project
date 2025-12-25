import axios from 'axios';

// Base URL for API requests. REACT_APP_API_BASE should be defined in your
// `.env` file (e.g., REACT_APP_API_BASE=http://localhost:4000). If not
// defined, requests will default to the same origin.
const API_BASE = process.env.REACT_APP_API_BASE || '';

/**
 * Fetch a paginated list of players. Accepts optional params such as
 * `per_page`, `page`, `season`, etc. Returns the JSON response body.
 *
 * @param {Object} params Query parameters for filtering players
 */
export async function fetchPlayers(params = {}) {
  const res = await axios.get(`${API_BASE}/api/players`, { params });
  return res.data;
}

/**
 * Fetch all NFL teams. Returns an array of team objects.
 */
export async function fetchTeams() {
  const res = await axios.get(`${API_BASE}/api/teams`);
  return res.data;
}

/**
 * Fetch advanced or aggregated metrics for a player or team.
 *
 * @param {string} entityType "player" or "team"
 * @param {number|string} entityId Player or team ID
 * @param {number} [season] Optional season filter (e.g., 2025)
 */
export async function fetchMetrics(entityType, entityId, season) {
  const params = {};
  if (season) params.season = season;
  const res = await axios.get(`${API_BASE}/api/metrics/${entityType}/${entityId}`, { params });
  return res.data;
}

/**
 * Fetch a single player by ID. Returns the player object.
 */
export async function fetchPlayer(playerId) {
  const res = await axios.get(`${API_BASE}/api/players/${playerId}`);
  return res.data;
}

/**
 * Fetch current sync job states from the backend. This endpoint
 * returns information about any background syncs currently running.
 */
export async function fetchSyncStates() {
  const res = await axios.get(`${API_BASE}/api/sync/states`);
  return res.data;
}

/**
 * Trigger a games sync via POST /api/sync/games. Accepts options like
 * `seasons`, `dryRun`, `per_page`, etc. Returns the job metadata.
 *
 * @param {Object} opts Options for syncing games
 */
export async function triggerSyncGames(opts = {}) {
  const res = await axios.post(`${API_BASE}/api/sync/games`, opts);
  return res.data;
}

/**
 * Trigger a players sync via POST /api/sync/players. Accepts options
 * like `per_page` and `dryRun`. Returns the job metadata.
 */
export async function triggerSyncPlayers(opts = {}) {
  const res = await axios.post(`${API_BASE}/api/sync/players`, opts);
  return res.data;
}

/**
 * Trigger computation of derived metrics (advanced stats, standings,
 * matchups). Accepts optional parameters controlling which derived
 * computations to run. Returns the job metadata.
 */
export async function triggerComputeDerived(opts = {}) {
  const res = await axios.post(`${API_BASE}/api/sync/derived`, opts);
  return res.data;
}

/**
 * Fetch a list of alert definitions. These could be used to trigger
 * notifications when certain conditions are met.
 */
export async function listAlerts() {
  const res = await axios.get(`${API_BASE}/api/alerts`);
  return res.data;
}

/**
 * Create a new alert. Provide an alert object (with fields like
 * `type`, `threshold`, etc.) and it will be persisted by the backend.
 */
export async function createAlert(alert) {
  const res = await axios.post(`${API_BASE}/api/alerts`, alert);
  return res.data;
}

/**
 * Delete an existing alert by its ID.
 */
export async function deleteAlert(alertId) {
  const res = await axios.delete(`${API_BASE}/api/alerts/${alertId}`);
  return res.data;
}

/**
 * Fetch a list of registered webhooks.
 */
export async function listWebhooks() {
  const res = await axios.get(`${API_BASE}/api/webhooks`);
  return res.data;
}

/**
 * Register a new webhook. Provide the URL and any configuration.
 */
export async function createWebhook(webhook) {
  const res = await axios.post(`${API_BASE}/api/webhooks`, webhook);
  return res.data;
}

/**
 * Delete a registered webhook by ID.
 */
export async function deleteWebhook(webhookId) {
  const res = await axios.delete(`${API_BASE}/api/webhooks/${webhookId}`);
  return res.data;
}

/**
 * Reset the sync state. This endpoint clears any records of running
 * jobs, allowing a fresh sync to start.
 */
export async function resetSyncState() {
  const res = await axios.post(`${API_BASE}/api/sync/reset`);
  return res.data;
}