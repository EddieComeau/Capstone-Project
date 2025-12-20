import React, { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import PlayRoutesOverlay from "../overlays/PlayRoutesOverlay";
import "./LottiePlaysBackground.css";

export default function LottiePlaysBackground({ src }) {
  const [data, setData] = useState(null);

  // Check for reduced motion preference
  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }, []);

  // Fetch Lottie animation data
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
      <PlayRoutesOverlay />
    </div>
  );
}
