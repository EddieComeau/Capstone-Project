import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import "./BettingPage.css";

const LOTTIE_SPARK = "/lottie/fx/touchdown.json";
const AUDIO_CELEBRATE = "/sfx/touchdown.wav";

const MOCK_LINES = [
  {
    matchup: "Hawks @ Meteors",
    spread: "Meteors -6.5",
    total: "O/U 46.5",
    confidence: 78,
    props: [
      { label: "QB Pass TDs", value: "2.5 OVER", confidence: 74 },
      { label: "RB Rush Yards", value: "69.5 OVER", confidence: 68 },
    ],
  },
  {
    matchup: "Stallions @ Armada",
    spread: "Stallions -2.5",
    total: "O/U 44.0",
    confidence: 65,
    props: [
      { label: "WR Receptions", value: "5.5 OVER", confidence: 63 },
      { label: "TE Red Zone Target", value: "Anytime TD", confidence: 58 },
    ],
  },
];

export default function BettingPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundReady, setSoundReady] = useState(false);
  const [lottieData, setLottieData] = useState(null);

  const active = MOCK_LINES[activeIndex];

  const [celebrate] = useState(() => new Audio(AUDIO_CELEBRATE));

  useEffect(() => {
    let alive = true;
    fetch(LOTTIE_SPARK)
      .then((r) => r.json())
      .then((json) => alive && setLottieData(json))
      .catch(() => setLottieData(null));

    return () => {
      alive = false;
    };
  }, []);

  const handleArmAudio = async () => {
    try {
      celebrate.volume = 0;
      await celebrate.play();
      celebrate.pause();
      celebrate.currentTime = 0;
      setSoundReady(true);
    } catch (e) {
      setSoundReady(false);
    }
  };

  const triggerFx = async () => {
    if (!soundReady) return;
    try {
      celebrate.currentTime = 0;
      celebrate.volume = 0.8;
      await celebrate.play();
    } catch (e) {
      // ignore autoplay issues
    }
  };

  return (
    <div className="bettingWrap">
      <header className="bettingHead">
        <div>
          <h1>Betting Odds & Props</h1>
          <p>Fan-friendly odds view with a quick pop of celebration when you lock your picks.</p>
        </div>
        <div className="bettingControls">
          <button type="button" className="armBtn" onClick={handleArmAudio}>
            {soundReady ? "Audio armed" : "Arm celebratory sound"}
          </button>
        </div>
      </header>

      <div className="bettingCarousel">
        <button
          type="button"
          className="navBtn"
          onClick={() => setActiveIndex((i) => (i - 1 + MOCK_LINES.length) % MOCK_LINES.length)}
        >
          ◀
        </button>

          <div className="bettingCard">
            <div className="bettingLottie">
              {lottieData ? <Lottie animationData={lottieData} loop autoplay /> : null}
            </div>
          <div className="bettingMatchup">{active.matchup}</div>
          <div className="bettingLine">
            <div>
              <div className="label">Spread</div>
              <div className="value">{active.spread}</div>
            </div>
            <div>
              <div className="label">Total</div>
              <div className="value">{active.total}</div>
            </div>
            <div className="confidence">{active.confidence}% confidence</div>
          </div>

          <div className="props">
            {active.props.map((p) => (
              <div key={p.label} className="propRow">
                <div>
                  <div className="label">{p.label}</div>
                  <div className="value">{p.value}</div>
                </div>
                <div className="meter">
                  <div className="meterFill" style={{ width: `${p.confidence}%` }} />
                  <span className="meterValue">{p.confidence}%</span>
                </div>
              </div>
            ))}
          </div>

          <button className="lockBtn" type="button" onClick={triggerFx}>
            Lock these recs
          </button>
        </div>

        <button
          type="button"
          className="navBtn"
          onClick={() => setActiveIndex((i) => (i + 1) % MOCK_LINES.length)}
        >
          ▶
        </button>
      </div>
    </div>
  );
}