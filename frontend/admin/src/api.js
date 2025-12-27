// frontend/admin/src/api.js
// This module defines helper functions for the admin dashboard.  It uses
// axios to call your Express backend.  Set REACT_APP_API_BASE in
// frontend/admin/.env to the base URL for the API (e.g. http://localhost:4000/api).

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '';

// Fetch all sync states
export async function fetchSyncStates() {
  const res = await axios.get(`${API_BASE}/syncstate`);
  return res.data;
}

// Trigger a full players sync
export async function triggerSyncPlayers(params = {}) {
  const res = await axios.post(`${API_BASE}/sync/players`, params);
  return res.data;
}

// Trigger a full games sync
export async function triggerSyncGames(params = {}) {
  const res = await axios.post(`${API_BASE}/sync/games`, params);
  return res.data;
}

// Trigger computation of derived metrics (advanced stats, standings, matchups)
export async function triggerComputeDerived(params = {}) {
  const res = await axios.post(`${API_BASE}/sync/derived`, params);
  return res.data;
}

// Reset a specific sync state (by key) or all states if no key is given
export async function resetSyncState(params = {}) {
  const res = await axios.post(`${API_BASE}/syncstate/reset`, params);
  return res.data;
}

// Alerts and Webhooks (if your admin UI uses them)
export async function listAlerts() {
  const res = await axios.get(`${API_BASE}/notifications/alerts`);
  return res.data;
}

export async function createAlert(body) {
  const res = await axios.post(`${API_BASE}/notifications/alerts`, body);
  return res.data;
}

export async function deleteAlert(id) {
  const res = await axios.delete(`${API_BASE}/notifications/alerts/${id}`);
  return res.data;
}

export async function listWebhooks() {
  const res = await axios.get(`${API_BASE}/notifications/webhooks`);
  return res.data;
}

export async function createWebhook(body) {
  const res = await axios.post(`${API_BASE}/notifications/webhooks`, body);
  return res.data;
}

export async function deleteWebhook(id) {
  const res = await axios.delete(`${API_BASE}/notifications/webhooks/${id}`);
  return res.data;
}