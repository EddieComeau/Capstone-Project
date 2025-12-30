// frontend/src/lib/api.js

/**
 * Helper for performing GET requests with query parameters.
 * Example:
 *   apiGet('/games', { season: 2025, week: 1, per_page: 100 })
 * This wraps the apiFetch function below.
 */
export async function apiGet(path, params = {}) {
  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const urlWithQuery = queryString ? `${path}?${queryString}` : path;
  return apiFetch(urlWithQuery); // defaults to GET when no method is provided
}

/**
 * Small wrapper for making requests to our backend.
 * Keeps frontend from using Ball Don't Lie API keys directly.
 */
export async function apiFetch(path, options = {}) {
  // Determine the base URL for API calls.  If VITE_API_URL is set, use it; otherwise fall back
  // to same-origin requests.  This allows the frontend to connect to a backend on a different host/port.
  const base = import.meta.env.VITE_API_URL || '';
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

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
