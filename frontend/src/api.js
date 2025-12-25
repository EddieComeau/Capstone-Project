// Unified API wrapper for the React dashboard (CRA or Vite)
//
// This module exposes helper functions for fetching data from the back‑end
// and triggering long‑running sync operations. It supports both Vite (using
// import.meta.env.VITE_API_URL) and Create‑React‑App (using
// process.env.REACT_APP_API_BASE) to configure the API base URL. If no base
// is set, it defaults to same‑origin ('').

// Resolve API base URL.  This file is primarily used in a Create‑React‑App
// environment, where environment variables are exposed on process.env with a
// REACT_APP_ prefix.  We avoid referencing the reserved `import` identifier
// to keep Babel happy in CRA.  Set REACT_APP_API_BASE in frontend/.env to
// point at your backend (e.g. http://localhost:4000/api).  If not set, it
// defaults to same‑origin ('').
const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) || '';

/**
 * Generic helper for API requests. Uses fetch and automatically
 * serialises JSON bodies and parses JSON responses when appropriate.
 * @param {string} path relative API path (e.g., '/api/players')
 * @param {object} options optional fetch options (method, body, headers)
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const fetchOpts = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };
  // Stringify body if it's an object and not already a string
  if (fetchOpts.body && typeof fetchOpts.body === 'object' && !(fetchOpts.body instanceof FormData)) {
    fetchOpts.body = JSON.stringify(fetchOpts.body);
  }
  const res = await fetch(url, fetchOpts);
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const errMsg = isJson ? body?.error || body?.message || 'Request failed' : body;
    throw new Error(errMsg);
  }
  return body;
}

// ----------------------- Data fetch helpers -----------------------

/**
 * Fetch a list of players. Accepts optional query parameters (e.g. { per_page: 100 }).
 */
export async function fetchPlayers(params = {}) {
  // Append query parameters to the path if provided
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/api/players${query ? '?' + query : ''}`);
}

/**
 * Fetch a single player by ID.
 */
export async function fetchPlayer(playerId) {
  if (!playerId) throw new Error('playerId is required');
  return apiFetch(`/api/players/${playerId}`);
}

/**
 * Fetch a list of teams.
 */
export async function fetchTeams() {
  return apiFetch('/api/teams');
}

/**
 * Fetch metrics for a given entity (player or team). Provide the entity type,
 * its ID, and optionally a season. Example: fetchMetrics('player', 123, 2025).
 */
export async function fetchMetrics(entityType, entityId, season) {
  if (!entityType || !entityId) throw new Error('entityType and entityId are required');
  const params = {};
  if (season) params.season = season;
  const query = new URLSearchParams(params).toString();
  const url = `/api/metrics/${entityType}/${entityId}${query ? '?' + query : ''}`;
  return apiFetch(url);
}

// ----------------------- Sync helpers -----------------------

/**
 * Get the current sync states (jobs in progress). Returns an array of jobs.
 */
export async function fetchSyncStates() {
  return apiFetch('/api/sync/states');
}

/**
 * Trigger a players sync. Accepts an options object (e.g. { per_page: 100 }).
 */
export async function triggerSyncPlayers(opts = {}) {
  return apiFetch('/api/sync/players', {
    method: 'POST',
    body: opts,
  });
}

/**
 * Trigger a games sync. Accepts an options object (e.g. { season: 2025 }).
 */
export async function triggerSyncGames(opts = {}) {
  return apiFetch('/api/sync/games', {
    method: 'POST',
    body: opts,
  });
}

/**
 * Trigger the computation of all derived metrics (advanced stats, standings, matchups).
 */
export async function triggerComputeDerived(opts = {}) {
  return apiFetch('/api/sync/derived', {
    method: 'POST',
    body: opts,
  });
}

/**
 * Reset the sync state (clears cursors and in‑progress flags).
 */
export async function resetSyncState() {
  return apiFetch('/api/sync/reset', {
    method: 'POST',
  });
}

// ----------------------- Alert & webhook helpers -----------------------

export async function listAlerts() {
  return apiFetch('/api/notifications/alerts');
}

export async function createAlert(alert) {
  return apiFetch('/api/notifications/alerts', {
    method: 'POST',
    body: alert,
  });
}

export async function deleteAlert(alertId) {
  return apiFetch(`/api/notifications/alerts/${alertId}`, {
    method: 'DELETE',
  });
}

export async function listWebhooks() {
  return apiFetch('/api/notifications/webhooks');
}

export async function createWebhook(webhook) {
  return apiFetch('/api/notifications/webhooks', {
    method: 'POST',
    body: webhook,
  });
}

export async function deleteWebhook(webhookId) {
  return apiFetch(`/api/notifications/webhooks/${webhookId}`, {
    method: 'DELETE',
  });
}

// Export the generic apiFetch in case other parts of the app need it
export { apiFetch };