import axios from 'axios';
const API_BASE = process.env.REACT_APP_API_BASE || '';

export function fetchSyncStates() {
  return axios.get(`${API_BASE}/api/syncstate`).then(r => r.data);
}
export function resetSyncState(key, cursor = null) {
  return axios.post(`${API_BASE}/api/syncstate/reset`, { key, cursor }).then(r => r.data);
}
export function listWebhooks() { return axios.get(`${API_BASE}/api/notifications/webhooks`).then(r => r.data); }
export function createWebhook(payload) { return axios.post(`${API_BASE}/api/notifications/webhooks`, payload).then(r => r.data); }
export function deleteWebhook(id) { return axios.delete(`${API_BASE}/api/notifications/webhooks/${id}`).then(r => r.data); }
export function listAlerts() { return axios.get(`${API_BASE}/api/notifications/alerts`).then(r => r.data); }
export function createAlert(payload) { return axios.post(`${API_BASE}/api/notifications/alerts`, payload).then(r => r.data); }
export function deleteAlert(id) { return axios.delete(`${API_BASE}/api/notifications/alerts/${id}`).then(r => r.data); }
