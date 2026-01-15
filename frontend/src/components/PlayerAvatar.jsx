// src/components/PlayerAvatar.jsx (updated)
//
// This component renders a pixel avatar for a player using DiceBear.  It
// determines the avatar’s seed from various possible player identifier
// properties (id, PlayerID, player_id, full_name) and derives the team
// abbreviation from any of `team_abbr`, `team_abbreviation`, `team` or
// `teamAbbr`.  Primary and secondary colors are obtained via
// `getTeamColors`, and the position is used to select an appropriate
// frame/scale via `positionProfile`.

import React from "react";
import {
  dicebearPixelHeadDataUri,
  positionProfile,
  getTeamColors,
} from "../utils/avatar";
import { padOverlayDataUri, maskOverlayDataUri } from "../utils/pixelOverlays";
import "./PlayerAvatar.css";

export default function PlayerAvatar({ player = {}, size = 56, className = "" }) {
  // Determine a stable seed for the avatar: prefer id or PlayerID (numeric),
  // fall back to player_id or full_name.  If none exist, default to "unknown".
  const seed =
    player?.id ??
    player?.PlayerID ??
    player?.player_id ??
    player?.bdlId ??
    player?.full_name ??
    "unknown";

  // Derive the position code; some APIs may expose pos instead of position.
  const pos = player?.position ?? player?.pos ?? "";

  // Derive the team abbreviation.  Accept multiple properties to maximize
  // compatibility with various API responses.
  const teamAbbr =
    player?.team_abbr ??
    player?.team_abbreviation ??
    player?.team ??
    player?.teamAbbr ??
    "";

  const { primary, secondary } = getTeamColors(teamAbbr);
  const { frame, scale } = positionProfile(pos);

  // Generate the head, pad overlay, and mask images.  Use caching in
  // dicebearPixelHeadDataUri to avoid redundant SVG generation.
  const headSrc = dicebearPixelHeadDataUri(seed, {
    position: pos,
    backgroundHex: secondary,
    clothingHex: primary,
  });
  const padSrc = padOverlayDataUri({ variant: frame, primary, secondary });
  const maskSrc = maskOverlayDataUri();

  // Scale the avatar according to the position profile.  The outer div
  // dimensions reflect the scaled height/width for crisp display.
  const px = Math.round(size * scale);

  return (
    <div
      className={`playerAvatar ${className}`.trim()}
      style={{ width: px, height: px }}
      aria-label={player?.full_name || "Player"}
      title={player?.full_name || ""}
    >
      <img
        className="playerAvatar__pad"
        src={padSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <img
        className="playerAvatar__head"
        src={headSrc}
        alt={player?.full_name || "Player"}
        loading="lazy"
        draggable={false}
      />
      <img
        className="playerAvatar__mask"
        src={maskSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="playerAvatar__shine" />
    </div>
  );
}
