import React, { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import PlayRoutesOverlay from "../overlays/PlayRoutesOverlay";
import "./LottiePlaysBackground.css";

/**
 * Background that displays a looping Lottie animation with an optional overlay of
 * route graphics.  If a source is not provided, it defaults to the football
 * loop located at `/lottie/football.json`.  The component honors the user's
 * reduced-motion preference and gracefully falls back to a placeholder when
 * the JSON is missing or fails to load.
 *
 * Props:
 * - src (string): URL to a Lottie JSON file.  Defaults to `/lottie/football.json`.
 * - routes (array): optional SVG path strings for play routes.
 * - dots (array): optional objects with cx, cy, r for marking route stops.
 */
export default function LottiePlaysBackground({
  src = "/lottie/football.json",
  routes = [],
  dots = [],
}) {
  const [data, setData] = useState(null);

  // Determine if the user prefers reduced motion.
  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }, []);

  // Load the Lottie JSON when the src changes.
  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((response) => response.json())
      .then((json) => alive && setData(json))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [src]);

  return (
    <div className="lottieBg">
      {data ? (
        <Lottie
          animationData={data}
          loop={!reduceMotion}
          autoplay={!reduceMotion}
          className="lottieFill"
        />
      ) : (
        <div className="lottieFallback">
          <div className="retroFrame">Retro highlight</div>
          <div>Missing /lottie/football.json</div>
        </div>
      )}
      {/* Pass routes and dots down so the play diagrams appear over the animation */}
      <PlayRoutesOverlay routes={routes} dots={dots} />
    </div>
  );
}
