import { useMemo, useState } from "react";
import "./MatchupComparisonPage.css";

const PLAYER_OPTIONS = [
  { name: "Patrick Mahomes", team: "KC", position: "QB", grade: 96, yards: 4210, td: 37 },
  { name: "Josh Allen", team: "BUF", position: "QB", grade: 94, yards: 4120, td: 40 },
  { name: "Christian McCaffrey", team: "SF", position: "RB", grade: 95, yards: 1950, td: 18 },
  { name: "Justin Jefferson", team: "MIN", position: "WR", grade: 93, yards: 1800, td: 12 },
];

const TEAM_OPTIONS = [
  { name: "Kansas City Chiefs", abbr: "KC", offense: 91, defense: 90, ppg: 27.5, papg: 19.5 },
  { name: "San Francisco 49ers", abbr: "SF", offense: 95, defense: 92, ppg: 29.1, papg: 18.2 },
  { name: "Buffalo Bills", abbr: "BUF", offense: 92, defense: 88, ppg: 26.9, papg: 20.4 },
  { name: "Philadelphia Eagles", abbr: "PHI", offense: 90, defense: 87, ppg: 26.0, papg: 21.8 },
];

function Selector({ label, options, value, onChange }) {
  return (
    <label className="matchLabel">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScorePill({ label, value }) {
  return (
    <div className="scorePill">
      <span className="scoreLabel">{label}</span>
      <span className="scoreValue">{value}</span>
    </div>
  );
}

export default function MatchupComparisonPage() {
  const [mode, setMode] = useState("players");
  const [left, setLeft] = useState(PLAYER_OPTIONS[0].name);
  const [right, setRight] = useState(PLAYER_OPTIONS[1].name);

  const leftEntity = useMemo(() => {
    if (mode === "players") return PLAYER_OPTIONS.find((p) => p.name === left);
    return TEAM_OPTIONS.find((t) => t.name === left);
  }, [mode, left]);

  const rightEntity = useMemo(() => {
    if (mode === "players") return PLAYER_OPTIONS.find((p) => p.name === right);
    return TEAM_OPTIONS.find((t) => t.name === right);
  }, [mode, right]);

  const primaryMetrics = useMemo(() => {
    if (mode === "players") {
      return [
        { label: "Overall Grade", a: leftEntity?.grade, b: rightEntity?.grade },
        { label: "Yards", a: leftEntity?.yards, b: rightEntity?.yards },
        { label: "TDs", a: leftEntity?.td, b: rightEntity?.td },
      ];
    }
    return [
      { label: "Offense", a: leftEntity?.offense, b: rightEntity?.offense },
      { label: "Defense", a: leftEntity?.defense, b: rightEntity?.defense },
      { label: "PPG", a: leftEntity?.ppg, b: rightEntity?.ppg },
      { label: "PA / G", a: leftEntity?.papg, b: rightEntity?.papg },
    ];
  }, [leftEntity, rightEntity, mode]);

  const leftOptions = mode === "players" ? PLAYER_OPTIONS.map((p) => p.name) : TEAM_OPTIONS.map((t) => t.name);
  const rightOptions = leftOptions.filter((n) => n !== left);

  return (
    <section className="matchPage">
      <header className="matchHeader">
        <div>
          <p className="pill">MATCHUP</p>
          <h2>Player-vs-Player or Team-vs-Team</h2>
          <p className="muted">
            Quick side-by-side to gauge advantage before setting fantasy lineups or bets. Swap mode to flip
            between player and team views.
          </p>
        </div>
        <div className="modeSwitch">
          <button
            type="button"
            className={`modeBtn ${mode === "players" ? "active" : ""}`}
            onClick={() => {
              setMode("players");
              setLeft(PLAYER_OPTIONS[0].name);
              setRight(PLAYER_OPTIONS[1].name);
            }}
          >
            Players
          </button>
          <button
            type="button"
            className={`modeBtn ${mode === "teams" ? "active" : ""}`}
            onClick={() => {
              setMode("teams");
              setLeft(TEAM_OPTIONS[0].name);
              setRight(TEAM_OPTIONS[1].name);
            }}
          >
            Teams
          </button>
        </div>
      </header>

      <div className="matchSelectors">
        <Selector label="Left" options={leftOptions} value={left} onChange={setLeft} />
        <Selector label="Right" options={rightOptions} value={right} onChange={setRight} />
      </div>

      <div className="matchGrid">
        <div className="matchCard">
          <p className="muted">{mode === "players" ? leftEntity?.position : "Offense/Defense"}</p>
          <h3>{leftEntity?.name}</h3>
          <p className="pill">{mode === "players" ? leftEntity?.team : leftEntity?.abbr}</p>
          <div className="scoreRow">
            {primaryMetrics.map((m) => (
              <ScorePill key={m.label} label={m.label} value={m.a ?? "—"} />
            ))}
          </div>
        </div>

        <div className="versus">vs</div>

        <div className="matchCard">
          <p className="muted">{mode === "players" ? rightEntity?.position : "Offense/Defense"}</p>
          <h3>{rightEntity?.name}</h3>
          <p className="pill">{mode === "players" ? rightEntity?.team : rightEntity?.abbr}</p>
          <div className="scoreRow">
            {primaryMetrics.map((m) => (
              <ScorePill key={m.label} label={m.label} value={m.b ?? "—"} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}