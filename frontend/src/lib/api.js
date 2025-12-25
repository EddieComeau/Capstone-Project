// frontend/src/lib/api.js

/**
 * Small wrapper for making requests to our backend.
 * Keeps frontend from using Ball Don't Lie API keys directly.
 */

export async function apiFetch(path, options = {}) {
  // Determine the base URL for API calls.  If Vite provides a VITE_API_URL
  // environment variable (via frontend/.env), use that; otherwise fall back
  // to same-origin requests.  This allows the frontend to connect to a
  // backend running on a different host/port (e.g. http://localhost:4000/api).
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