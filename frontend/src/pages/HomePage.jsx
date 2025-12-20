// @@ -3,86 +3,107 @@ import { useNavigate } from "react-router-dom";
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
          <h1 className="homeTitle">Sideline Studio</h1>
          <p className="homeText">
          Pro football companion with animated Kenney sprites, American-football Lottie loops, and quick jumps to
          depth charts, play-by-play, and matchup tools.
          </p>

          <div className="homeCtas">
            <button className="primaryBtn" onClick={() => navigate("/depth-chart")} type="button">
              Go to Depth Chart
            </button>
            <button className="ghostBtn" onClick={() => navigate("/cards")} type="button">
              Go to Cards
            </button>
            <button className="primaryBtn alt" onClick={() => navigate("/play-by-play")} type="button">
              Play-by-Play
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
              <code>/kenney/grass_tile.png</code>, <code>/kenney/football.png</code>, {" "}
              <code>/kenney/helmet_home.png</code>, <code>/kenney/helmet_away.png</code>, {" "}
              <code>/lottie/football.json</code>
            </div>
          </div>

          <div className="animationShowcase">
            <div className="miniTitle">Football animation previews</div>
            <div className="animationGrid">
              <div className="animationPanel">
                <div className="animationLabel">Kenney Sprites</div>
                <div className="animationStage">
                  <KenneyPlaysBackground />
                </div>
              </div>
              <div className="animationPanel">
                <div className="animationLabel">Lottie Football Loop</div>
                <div className="animationStage">
                  <LottiePlaysBackground />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="homeCards">
          <div className="miniCard">
            <div className="miniTitle">Tabs</div>
            <div className="miniBody">Home + Depth Chart + Matchups live in the top tabs.</div>
          </div>
          <div className="miniCard">
            <div className="miniTitle">Play-by-play FX</div>
            <div className="miniBody">Lottie pops + Kenney-inspired audio for TD/turnovers/first downs.</div>
          </div>
          <div className="miniCard">
            <div className="miniTitle">Retro-friendly</div>
            <div className="miniBody">Kenney assets stay pixelated for the retro field view.</div>
          </div>
        </div>
      </div>
    </section>
  );
}