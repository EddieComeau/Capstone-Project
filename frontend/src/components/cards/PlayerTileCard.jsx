// FRONTEND (React/Vite) — Small clickable tile used in depth chart (now with headshot)

import { useMemo, useState } from "react";
import "./PlayerTileCard.css";

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PlayerTileCard({ player, onSelect }) {
  const [imgOk, setImgOk] = useState(true);

  const display = useMemo(() => {
    if (!player) return null;

    // Supports either your old mock fields OR BALLDONTLIE fields
    const name =
      player.name ||
      `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim() ||
      "Unknown Player";

    const pos = player.pos || player.position_abbreviation || player.position || "";
    const team = player.team?.abbreviation || player.team || "";
    const number = player.number ?? player.jersey_number ?? null;

    return {
      name,
      pos,
      team,
      number,
      headshotUrl: player.headshotUrl || player.headshot_url || player.image_url || player.imageUrl || null,
    };
  }, [player]);

  if (!display) return null;

  const handleClick = () => {
    // Later: open a side panel / scroll to a details section with graphs
    if (onSelect) onSelect(player);
  };

  const initials = initialsFromName(display.name);

  return (
    <button type="button" className="ptc" onClick={handleClick}>
      <div className="ptc__row">
        <div className="ptc__imgWrap" aria-hidden="true">
          {display.headshotUrl && imgOk ? (
            <img
              className="ptc__img"
              src={display.headshotUrl}
              alt=""
              loading="lazy"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="ptc__imgFallback">
              <div className="ptc__silhouette" />
              <div className="ptc__initials">{initials}</div>
            </div>
          )}
        </div>

        <div className="ptc__content">
          <div className="ptc__top">
            <div className="ptc__pos">{display.pos}</div>
            <div className="ptc__meta">
              <span className="ptc__team">{display.team}</span>
              {display.number != null ? <span className="ptc__num">#{display.number}</span> : null}
            </div>
          </div>

          <div className="ptc__name" title={display.name}>
            {display.name}
          </div>

          <div className="ptc__hint">View details</div>
        </div>
      </div>
    </button>
  );
}
