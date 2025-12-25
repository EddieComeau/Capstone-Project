// Updated API wrapper for the React dashboard
// Uses the VITE_API_URL environment variable to build the base URL for API requests.
// Provides helper functions to interact with the back‑end sync endpoints,
// as well as alerts and webhooks APIs.

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
    ...options,
  });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = typeof body === 'string' ? body : body?.error || 'Request failed';
    throw new Error(msg);
  }
  return body;
}

// ----------------------- Sync helpers -----------------------

// Get current sync states (jobs in progress). Returns an array of jobs.
export async function fetchSyncStates() {
  return apiFetch('/api/sync/states');
}

// Trigger a players sync. Accepts an options object (e.g. { per_page: 100 }).
export async function triggerSyncPlayers(opts = {}) {
  return apiFetch('/api/sync/players', {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

// Trigger a games sync. Accepts an options object (e.g. { season: 2025 }).
export async function triggerSyncGames(opts = {}) {
  return apiFetch('/api/sync/games', {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

// Trigger the computation of all derived metrics (advanced stats, standings, matchups).
export async function triggerComputeDerived(opts = {}) {
  return apiFetch('/api/sync/derived', {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

// Reset the sync state (clears cursors and in‑progress flags).
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
    body: JSON.stringify(alert),
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
    body: JSON.stringify(webhook),
  });
}

export async function deleteWebhook(webhookId) {
  return apiFetch(`/api/notifications/webhooks/${webhookId}`, {
    method: 'DELETE',
  });
}

// Export the base apiFetch function for general use
export { apiFetch };