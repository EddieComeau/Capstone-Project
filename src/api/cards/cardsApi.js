// src/api/cardsApi.js
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

export function fetchSkillCard(playerId, season, week) {
  const url = `${API_BASE}/cards/player/${playerId}?season=${season}&week=${week}`;
  return fetchJson(url);
}

export function fetchOlineCards(team, season, week) {
  const url = `${API_BASE}/cards/oline/${team}?season=${season}&week=${week}`;
  return fetchJson(url);
}

export function fetchAdvancedOlineCards(team, season, week) {
  const url = `${API_BASE}/cards/advanced-oline/${team}?season=${season}&week=${week}`;
  return fetchJson(url);
}

export function fetchSpecialTeamsCards(team, season, week) {
  const url = `${API_BASE}/cards/special-teams/${team}?season=${season}&week=${week}`;
  return fetchJson(url);
}

export function fetchDefenseCards(team, season, week) {
  const url = `${API_BASE}/cards/defense/${team}?season=${season}&week=${week}`;
  return fetchJson(url);
}
