// server/utils/apiUtils.js
// Shared API utilities

/**
 * Build a backend-relative URL path safely.
 * NOTE: Frontend should use frontend/src/lib/api.js; server uses absolute URLs.
 */
function joinUrl(base, path) {
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;
}

module.exports = {
  joinUrl,
};
