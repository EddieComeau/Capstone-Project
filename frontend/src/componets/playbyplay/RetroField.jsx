// src/components/playbyplay/RetroField.jsx
import React, { useMemo } from "react";
import { getTheme } from "../common/teamTheme";
import "./playbyplay.css";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function RetroField({ plays = [], homeAbbr, awayAbbr }) {
  const homeTheme = getTheme(homeAbbr);
  const awayTheme = getTheme(awayAbbr);

  const vizPlays = useMemo(() => plays.slice(-40), [plays]);

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
