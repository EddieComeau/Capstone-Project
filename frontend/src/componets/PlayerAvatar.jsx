// src/components/PlayerAvatar.jsx
import React from "react";
import { dicebearPixelHeadDataUri, positionProfile, getTeamColors } from "../utils/avatar";
import { padOverlayDataUri, maskOverlayDataUri } from "../utils/pixelOverlays";
import "./PlayerAvatar.css";

export default function PlayerAvatar({ player, size = 56, className = "" }) {
  const seed = player?.id ?? player?.player_id ?? player?.full_name ?? "unknown";
  const pos = player?.position ?? player?.pos ?? "";
  const teamAbbr = player?.team_abbreviation ?? player?.team ?? player?.teamAbbr ?? "";

  const { primary, secondary } = getTeamColors(teamAbbr);
  const { frame, scale } = positionProfile(pos);

  const headSrc = dicebearPixelHeadDataUri(seed, {
    position: pos,
    backgroundHex: secondary,
    clothingHex: primary,
  });

  const padSrc = padOverlayDataUri({ variant: frame, primary, secondary });
  const maskSrc = maskOverlayDataUri();

  const px = Math.round(size * scale);

  return (
    <div
      className={`playerAvatar ${className}`}
      style={{ width: px, height: px }}
      aria-label={player?.full_name || "Player"}
      title={player?.full_name || ""}
    >
      <img className="playerAvatar__pad" src={padSrc} alt="" aria-hidden="true" draggable={false} />
      <img className="playerAvatar__head" src={headSrc} alt={player?.full_name || "Player"} loading="lazy" draggable={false} />
      <img className="playerAvatar__mask" src={maskSrc} alt="" aria-hidden="true" draggable={false} />
      <div className="playerAvatar__shine" />
    </div>
  );
}
