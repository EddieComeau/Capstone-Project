import { useEffect, useState } from "react";
import Lottie from "lottie-react";

export default function PlayEventFXLayer({ activeFx }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);

    if (!activeFx?.lottieUrl) return;

    fetch(activeFx.lottieUrl)
      .then((r) => r.json())
      .then((json) => alive && setData(json))
      .catch(() => alive && setData(null));

    return () => {
      alive = false;
    };
  }, [activeFx?.key, activeFx?.lottieUrl]);

  if (!activeFx) return null;

  return (
    <div className="fxOverlay" aria-hidden="true">
      <div className={`fxBadge fx-${activeFx.type}`}>
        {activeFx.type.replace("_", " ")}
      </div>
      <div className="fxAnim">{data ? <Lottie animationData={data} loop={false} autoplay /> : null}</div>
    </div>
  );
}
