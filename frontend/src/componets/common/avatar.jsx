const avatarCache = new Map();

export function getAvatarSvg(cacheKey, renderSvg) {
  if (!cacheKey) return "";
  if (avatarCache.has(cacheKey)) return avatarCache.get(cacheKey);

  const svgMarkup = typeof renderSvg === "function" ? renderSvg() : "";
  avatarCache.set(cacheKey, svgMarkup);
  return svgMarkup;
}

export function clearAvatarCache() {
  avatarCache.clear();
}

export function PlayerAvatar({ cacheKey, renderSvg, size = 72, className = "" }) {
  const svgMarkup = getAvatarSvg(cacheKey, renderSvg);

  return (
    <div
      className={`player-avatar ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

function hashNumber(seed = "seed") {
  return Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function buildAvatarSvg(seed) {
  const base = hashNumber(seed);
  const hue = base % 360;
  const hue2 = (base * 3) % 360;
  return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <defs>
        <linearGradient id="g${base}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue}, 82%, 68%)" />
          <stop offset="100%" stop-color="hsl(${hue2}, 72%, 58%)" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="18" fill="url(#g${base})" />
      <circle cx="50" cy="44" r="20" fill="rgba(255,255,255,0.15)" />
      <path d="M20 86c6-16 24-18 30-18s24 2 30 18" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.22)" stroke-width="2" />
      <circle cx="50" cy="46" r="14" fill="rgba(255,255,255,0.42)" />
      <text x="50" y="52" text-anchor="middle" font-family="'Courier New', monospace" font-size="16" font-weight="800" fill="#0b1020">
        ${seed.slice(0, 2).toUpperCase()}
      </text>
    </svg>
  `;
}

export default function SeededAvatar({ seed = "player", size = 72, className = "" }) {
  return (
    <PlayerAvatar
      cacheKey={`seed:${seed}:${size}`}
      renderSvg={() => buildAvatarSvg(seed)}
      size={size}
      className={className}
    />
  );
}