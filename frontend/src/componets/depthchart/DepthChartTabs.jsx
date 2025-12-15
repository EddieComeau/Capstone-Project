// FRONTEND (React/Vite) — Tabs for Offense/Defense/Special Teams/Matchups

import "./DepthChartTabs.css";

const TABS = [
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
  { key: "specialTeams", label: "Special Teams" },
  { key: "matchups", label: "Matchups", disabled: true }, // next step
];

export default function DepthChartTabs({ active, onChange }) {
  return (
    <div className="dctabs">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`dctabs__tab ${active === t.key ? "is-active" : ""}`}
          onClick={() => !t.disabled && onChange(t.key)}
          disabled={t.disabled}
          type="button"
        >
          {t.label}
          {t.disabled && <span className="dctabs__soon">Soon</span>}
        </button>
      ))}
    </div>
  );
}
