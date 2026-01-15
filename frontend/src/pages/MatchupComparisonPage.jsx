import { useMemo, useState, useEffect } from "react";
import "./MatchupComparisonPage.css";
import PlayerSearchInput from "../components/PlayerSearchInput";
import { TEAM_LIST } from "../data/teamOptions";

// Static player options remain for demonstration.  You could replace these
// with dynamic player stats from your API or advanced metrics.
const PLAYER_OPTIONS = [
  { name: "Patrick Mahomes", team: "KC", position: "QB", grade: 96, yards: 4210, td: 37 },
  { name: "Josh Allen", team: "BUF", position: "QB", grade: 94, yards: 4120, td: 40 },
  { name: "Christian McCaffrey", team: "SF", position: "RB", grade: 95, yards: 1950, td: 18 },
  { name: "Justin Jefferson", team: "MIN", position: "WR", grade: 93, yards: 1800, td: 12 },
];

// Build a list of all NFL teams from the data file.  Only name and
// abbreviation are included here; advanced metrics are fetched on demand.
const TEAM_OPTIONS = TEAM_LIST.map(({ name, abbr }) => ({ name, abbr }));

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

function ScorePill({ label, value, loading }) {
  // Display a placeholder while loading metrics.  If the value is null or
  // undefined and not loading, show an em dash to indicate absence.
  const display = loading ? '…' : value ?? '—';
  return (
    <div className="scorePill">
      <span className="scoreLabel">{label}</span>
      <span className="scoreValue">{display}</span>
    </div>
  );
}

export default function MatchupComparisonPage() {
  const [mode, setMode] = useState("players");
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);

  // Fetched advanced metrics for the selected teams. These states hold
  // objects with fields like passing_yards_per_game, rushing_yards_per_game
  // and points_per_game when the mode is 'teams'. They remain null in
  // player mode.
  const [leftMetrics, setLeftMetrics] = useState(null);
  const [rightMetrics, setRightMetrics] = useState(null);

  // Loading flags for metrics fetches.  These are used to display a
  // loading indicator while waiting for the API response.
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);

  // Determine the season for metrics requests. Use the previous year if
  // the current date is in January or February (NFL seasons end early).
  const currentYear = new Date().getFullYear();
  const season = currentYear - (new Date().getMonth() < 2 ? 1 : 0);

  /**
   * Helper to fetch a team's advanced metrics for the current season.  It
   * first fetches all teams from the backend to find the numeric team ID
   * matching the provided name or abbreviation, then fetches advanced
   * metrics for that team via the `/api/metrics/team/:id` endpoint.
   *
   * @param {string} teamName Full team name or abbreviation.
   * @returns {Promise<object|null>} A metrics object or null if not found.
   */
  async function fetchTeamMetricsByName(teamName) {
    try {
      const resTeams = await fetch('/api/teams/db');
      const teamsData = await resTeams.json();
      if (!Array.isArray(teamsData)) return null;
      // Locate team by name or abbreviation, case insensitive
      const match = teamsData.find((t) => {
        const nameMatch = t.name && t.name.toLowerCase() === teamName.toLowerCase();
        const abbrMatch = t.abbreviation && t.abbreviation.toLowerCase() === teamName.toLowerCase();
        return nameMatch || abbrMatch;
      });
      if (!match) return null;
      const teamId = match.id || match.teamId || match.team_id;
      if (!teamId) return null;
      const resMetrics = await fetch(`/api/metrics/team/${teamId}?season=${season}`);
      const data = await resMetrics.json();
      if (data && data.ok && data.metrics) {
        return data.metrics;
      }
      return null;
    } catch (err) {
      console.error('fetchTeamMetricsByName error', err);
      return null;
    }
  }

  // Whenever the mode or selected teams change, fetch metrics for those teams.
  useEffect(() => {
    if (mode !== 'teams') return;
    // Fetch metrics for the left team
    if (left) {
      setLeftLoading(true);
      fetchTeamMetricsByName(left)
        .then((metrics) => setLeftMetrics(metrics))
        .finally(() => setLeftLoading(false));
    }
    // Fetch metrics for the right team
    if (right) {
      setRightLoading(true);
      fetchTeamMetricsByName(right)
        .then((metrics) => setRightMetrics(metrics))
        .finally(() => setRightLoading(false));
    }
  }, [mode, left, right, season]);

  // Determine the selected entities based on the mode (player or team).  When in
  // team mode, look up the team by name from our dynamic TEAM_OPTIONS list.
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
    // Build metrics from fetched advanced metrics when in team mode.  Each
    // entry displays "—" when the value is null or undefined.
    const passLeft = leftMetrics?.passing_yards_per_game;
    const passRight = rightMetrics?.passing_yards_per_game;
    const rushLeft = leftMetrics?.rushing_yards_per_game;
    const rushRight = rightMetrics?.rushing_yards_per_game;
    const ptsLeft = leftMetrics?.points_per_game;
    const ptsRight = rightMetrics?.points_per_game;
    return [
      { label: 'Pass YPG', a: passLeft, b: passRight },
      { label: 'Rush YPG', a: rushLeft, b: rushRight },
      { label: 'Pts/G', a: ptsLeft, b: ptsRight },
    ];
  }, [leftEntity, rightEntity, mode, leftMetrics, rightMetrics]);

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
        {mode === "players" ? (
          <>
            {/* Player-vs-Player search inputs.  Each search input fires onSelect with the selected player's full name. */}
            <PlayerSearchInput onSelect={setLeft} />
            <PlayerSearchInput onSelect={setRight} />
          </>
        ) : (
          <>
            {/* Team-vs-Team dropdowns.  Use the full list of team names for both sides. */}
            <Selector
              label="Team 1"
              options={TEAM_OPTIONS.map((t) => t.name)}
              value={left || TEAM_OPTIONS[0]?.name}
              onChange={(val) => setLeft(val)}
            />
            <Selector
              label="Team 2"
              options={TEAM_OPTIONS.map((t) => t.name)}
              value={right || TEAM_OPTIONS[1]?.name}
              onChange={(val) => setRight(val)}
            />
          </>
        )}
      </div>

      <div className="matchGrid">
        <div className="matchCard">
          <p className="muted">{mode === "players" ? leftEntity?.position : "Offense/Defense"}</p>
          <h3>{leftEntity?.name}</h3>
          <p className="pill">{mode === "players" ? leftEntity?.team : leftEntity?.abbr}</p>
          <div className="scoreRow">
            {primaryMetrics.map((m) => (
              <ScorePill
                key={m.label}
                label={m.label}
                value={m.a}
                loading={mode === 'teams' && leftLoading}
              />
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
              <ScorePill
                key={m.label}
                label={m.label}
                value={m.b}
                loading={mode === 'teams' && rightLoading}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
