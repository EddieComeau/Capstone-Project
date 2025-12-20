// src/components/playbyplay/RetroField.jsx
import { useMemo } from "react";
import { getTheme } from "../common/teamTheme";
import "./playbyplay.css";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function RetroField({
  plays = [],
  homeAbbr,
  awayAbbr,
  ballSpot = 50,
  currentDown = 1,
  hasPenalty = false,
}) {
  const homeTheme = getTheme(homeAbbr);
  const awayTheme = getTheme(awayAbbr);

  const vizPlays = useMemo(() => plays.slice(-40), [plays]);

  const ballLeft = useMemo(() => {
    const pct = clamp(Number(ballSpot ?? 50), 0, 100);
    return pct;
  }, [ballSpot]);

  const downNumber = clamp(Number(currentDown ?? 1), 1, 4);

  const refs = useMemo(
    () => [
      { left: 10, top: 40 },
      { left: 50, top: 8 },
      { left: 90, top: 40 },
    ],
    []
  );

  return (
    <div
      className="retroField"
      style={{ "--home": homeTheme.primary, "--away": awayTheme.primary }}
    >
      <div className="endzone left">
        <div className="endzoneText">{awayAbbr}</div>
      </div>
      <div className="endzone right">
        <div className="endzoneText">{homeAbbr}</div>
      </div>

      <div className="yardNums">
        {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((n, i) => (
          <div key={`${n}-${i}`} className="yardNum">
            {n}
          </div>
        ))}
      </div>

      <div className="ballMarker" style={{ left: `${ballLeft}%` }}>
        <div className="ballShape" />
      </div>

      <div className="downMarker" style={{ left: `${ballLeft}%` }}>
        <div className="markerPole" />
        <div className="markerFlag">{downNumber}</div>
      </div>

      <div className="digitalDownBox">
        <div className="digitalDownFace">
          <div className="digitalLabel">DOWN</div>
          <div className="digitalDigit">{downNumber}</div>
        </div>
        <div className="digitalStick" />
      </div>

      {refs.map((r, idx) => (
        <div
          key={idx}
          className={`referee ${hasPenalty ? "penalty" : ""}`}
          style={{ left: `${r.left}%`, top: `${r.top}px` }}
        >
          <div className="refTorso" />
          <div className="refArms" />
          <div className="refLegs" />
        </div>
      ))}

      {vizPlays.map((p, idx) => {
        const start = clamp(Number(p.start_yard_line ?? 50), 0, 100);
        const end = clamp(Number(p.end_yard_line ?? start), 0, 100);

        const leftPct = (Math.min(start, end) / 100) * 100;
        const widthPct = (Math.max(1, Math.abs(end - start)) / 100) * 100;

        const lane = idx % 6;
        const topPx = 26 + lane * 22;

        const teamAbbr = p?.team?.abbreviation;
        const theme = getTheme(teamAbbr);

        // Lightweight “1st down” indicator heuristic
        const isFirstDown =
          p.start_down === 1 && idx > 0 && vizPlays[idx - 1]?.end_down === 1;

        return (
          <div
            key={`${p.id ?? idx}-${idx}`}
            className="playSeg"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              top: `${topPx}px`,
              "--seg": theme.primary,
            }}
            title={p.short_text || p.text || ""}
          >
            <div className="playDot" />
            {isFirstDown ? <div className="firstDownFlag">1st</div> : null}
          </div>
        );
      })}
    </div>
  );
}
