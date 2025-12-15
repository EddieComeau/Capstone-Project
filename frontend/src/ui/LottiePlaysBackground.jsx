import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import PlayRoutesOverlay from "../overlays/PlayRoutesOverlay";

export default function LottiePlaysBackground() {
  const src = import.meta.env.VITE_HOME_BG_LOTTIE || "/lottie/football.json";
  const [data, setData] = useState(null);

  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((r) => r.json())
      .then((json) => alive && setData(json))
      .catch(() => alive && setData(null));
    return () => { alive = false; };
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
        <div className="lottieFallback">Missing /lottie/football.json</div>
      )}
      <PlayRoutesOverlay />
    </div>
  );
}
