import axios from 'axios';

// Determine API base URL.  CRA only exposes environment variables prefixed with REACT_APP_.
// You should define REACT_APP_API_BASE in frontend/admin/.env (e.g. http://localhost:4000/api).
const API_BASE = process.env.REACT_APP_API_BASE || '';

// Fetch the current list of sync states.  The server defines this at GET /api/syncstate.
export async function fetchSyncStates() {
  const res = await axios.get(`${API_BASE}/api/syncstate`);
  return res.data;
}

// Reset a particular sync state.  This calls POST /api/syncstate/reset with a name payload.
export async function resetSyncState(name) {
  const res = await axios.post(`${API_BASE}/api/syncstate/reset`, { name });
  return res.data;
}

// Trigger a players sync.  This calls POST /api/sync/players with optional parameters.
export async function triggerSyncPlayers(opts = {}) {
  const res = await axios.post(`${API_BASE}/api/sync/players`, opts);
  return res.data;
}

// Trigger a games sync.  This calls POST /api/sync/games with optional parameters.
export async function triggerSyncGames(opts = {}) {
  const res = await axios.post(`${API_BASE}/api/sync/games`, opts);
  return res.data;
}

// Trigger the derived computation (advanced stats, standings, matchups).
export async function triggerComputeDerived(opts = {}) {
  const res = await axios.post(`${API_BASE}/api/sync/derived`, opts);
  return res.data;
}

// Webhook subscriptions
export async function listWebhooks() {
  const res = await axios.get(`${API_BASE}/api/webhooks`);
  return res.data;
}

export async function createWebhook(webhook) {
  const res = await axios.post(`${API_BASE}/api/webhooks`, webhook);
  return res.data;
}

export async function deleteWebhook(id) {
  const res = await axios.delete(`${API_BASE}/api/webhooks/${id}`);
  return res.data;
}

// Alerts
export async function listAlerts() {
  const res = await axios.get(`${API_BASE}/api/alerts`);
  return res.data;
}

export async function createAlert(alert) {
  const res = await axios.post(`${API_BASE}/api/alerts`, alert);
  return res.data;
}

export async function deleteAlert(id) {
  const res = await axios.delete(`${API_BASE}/api/alerts/${id}`);
  return res.data;
}