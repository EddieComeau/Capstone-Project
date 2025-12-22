// frontend/src/services/balldontlieNFL.js

import { apiFetch } from '../lib/api';

// Frontend calls backend relative endpoints only.

export function syncPlayers(payload = {}) {
  return apiFetch('/api/players/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
