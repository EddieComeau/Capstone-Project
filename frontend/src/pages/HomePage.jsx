import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import KenneyPlaysBackground from "../ui/backgrounds/KenneyPlaysBackground";
import LottiePlaysBackground from "../ui/backgrounds/LottiePlaysBackground";

export default function HomePage() {
  const navigate = useNavigate();

  const defaultMode = (import.meta.env.VITE_HOME_BG_MODE || "kenney").toLowerCase();
  const [mode, setMode] = useState(defaultMode);

  const bg = useMemo(() => {
    if (mode === "lottie") return <LottiePlaysBackground />;
    return <KenneyPlaysBackground />;
  }, [mode]);

  return (
    <section className="homeWrap">
      <div className="homeBg" aria-hidden="true">
        {bg}
        <div className="bgOverlay" />
        <div className="bgGrid" />
      </div>

      <div className="homeContent">
        <div className="homeHero">
          <div className="pill">HOME</div>
          <h1 className="homeTitle">NFL Cards 4.0</h1>
          <p className="homeText">
            Greyed-out background uses Kenney sprites (CC0) or Lottie JSON.
            Later you can replace with licensed clips if you have rights.
          </p>

          <div className="homeCtas">
            <button className="primaryBtn" onClick={() => navigate("/depth-chart")} type="button">
              Go to Depth Chart
            </button>
            <button className="ghostBtn" onClick={() => navigate("/cards")} type="button">
              Go to Cards
            </button>
          </div>

          <div className="modeRow">
            <span className="modeLabel">Background:</span>
            <button
              className={`modeBtn ${mode === "kenney" ? "active" : ""}`}
              onClick={() => setMode("kenney")}
              type="button"
            >
              Kenney
            </button>
            <button
              className={`modeBtn ${mode === "lottie" ? "active" : ""}`}
              onClick={() => setMode("lottie")}
              type="button"
            >
              Lottie
            </button>
          </div>

          <div className="homeNote">
            <div className="miniTitle">Expected files</div>
            <div className="miniBody">
              <code>/kenney/grass_tile.png</code>, <code>/kenney/football.png</code>,{" "}
              <code>/kenney/helmet_home.png</code>, <code>/kenney/helmet_away.png</code>,{" "}
              <code>/lottie/football.json</code>
            </div>
          </div>
        </div>

        <div className="homeCards">
          <div className="miniCard">
            <div className="miniTitle">Tabs</div>
            <div className="miniBody">Home + Depth Chart are now in the top tabs.</div>
          </div>
          <div className="miniCard">
            <div className="miniTitle">Play-by-play FX</div>
            <div className="miniBody">You can trigger sound + Lottie pops for TD/INT/etc.</div>
          </div>
          <div className="miniCard">
            <div className="miniTitle">Retro-friendly</div>
            <div className="miniBody">Kenney assets look great with pixelated rendering.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
