import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '';

export async function fetchPlayers(params = {}) {
  const res = await axios.get(`${API_BASE}/api/players`, { params });
  return res.data;
}

export async function fetchTeams() {
  const res = await axios.get(`${API_BASE}/api/teams`);
  return res.data;
}

export async function fetchMetrics(entityType, entityId, season) {
  const params = {};
  if (season) params.season = season;
  const res = await axios.get(`${API_BASE}/api/metrics/${entityType}/${entityId}`, { params });
  return res.data;
}

export async function fetchPlayer(playerId) {
  const res = await axios.get(`${API_BASE}/api/players/${playerId}`);
  return res.data;
}
