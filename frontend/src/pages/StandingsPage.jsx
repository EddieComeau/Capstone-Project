import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import "./StandingsPage.css";

export default function StandingsPage() {
  const thisYear = new Date().getFullYear();
  const [season, setSeason] = useState(thisYear);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet(`/standings/${season}`);
        if (cancelled) return;
        const list = data?.data || data?.standings || [];
        setRows(list);
        setSelectedTeam(list[0] || null);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError("Unable to load standings. Using sample data.");
          const fallback = sampleStandings(season);
          setRows(fallback);
          setSelectedTeam(fallback[0] || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [season]);

  const grouped = useMemo(() => {
    const divs = {};
    rows.forEach((r) => {
      const key = r.division || r.conference || "League";
      if (!divs[key]) divs[key] = [];
      divs[key].push(r);
    });
    return divs;
  }, [rows]);

  return (
    <div className="standingsWrap">
      <div className="standingsHeader">
        <div>
          <h1>Standings</h1>
          <p>Tap a team to inspect team-wide stats and rankings.</p>
        </div>
        <label className="seasonPicker">
          Season
          <input
            type="number"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            min={2010}
            max={thisYear + 1}
          />
        </label>
      </div>

      {loading ? <div className="standingsNotice">Loading standings…</div> : null}
      {error ? <div className="standingsError">{error}</div> : null}

      <div className="standingsGrid">
        {Object.entries(grouped).map(([group, teams]) => (
          <div key={group} className="standingsCard">
            <div className="standingsCardHead">{group}</div>
            <div className="standingsTable" role="list">
              {teams.map((t) => (
                <button
                  key={`${t.team_id || t.team?.id || t.name}`}
                  className={`standingsRow ${
                    selectedTeam?.team_id === t.team_id ||
                    selectedTeam?.team?.id === t.team?.id ||
                    selectedTeam?.name === t.name
                      ? "active"
                      : ""
                  }`}
                  onClick={() => setSelectedTeam(t)}
                  type="button"
                >
                  <span className="teamName">
                    {t.team?.full_name || t.team?.name || t.name || "Team"}
                  </span>
                  <span className="record">{t.record || formatRecord(t)}</span>
                  <span className="rank">#{t.rank ?? t.standing ?? "-"}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedTeam ? (
        <div className="teamDetail">
          <div className="teamDetailHead">
            <div>
              <div className="muted">Selected team</div>
              <h2>{selectedTeam.team?.full_name || selectedTeam.name}</h2>
            </div>
            <div className="pill">{selectedTeam.conference || selectedTeam.division}</div>
          </div>
          <div className="teamMetrics">
            <Metric label="Record" value={selectedTeam.record || formatRecord(selectedTeam)} />
            <Metric label="Point Diff" value={selectedTeam.point_diff ?? selectedTeam.point_differential ?? "N/A"} />
            <Metric label="Streak" value={selectedTeam.streak || selectedTeam.streak_description || "-"} />
            <Metric label="Home" value={selectedTeam.home_record || selectedTeam.home || "-"} />
            <Metric label="Away" value={selectedTeam.away_record || selectedTeam.away || "-"} />
            <Metric label="Last 5" value={selectedTeam.last_five || selectedTeam.last_ten || "-"} />
          </div>
          <div className="teamStatsPanel">
            <h3>Team stats</h3>
            <div className="statRow">
              <span>Run Defense vs Pass Blocking</span>
              <Bar value={selectedTeam.run_defense_rating ?? 72} />
            </div>
            <div className="statRow">
              <span>Explosive Plays Allowed</span>
              <Bar value={selectedTeam.explosiveness_rating ?? 64} color="var(--amber)" />
            </div>
            <div className="statRow">
              <span>Red Zone Efficiency</span>
              <Bar value={selectedTeam.redzone_efficiency ?? 58} color="var(--mint)" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div className="muted">{label}</div>
      <div className="metricValue">{value}</div>
    </div>
  );
}

function Bar({ value = 0, color }) {
  return (
    <div className="bar">
      <div className="barFill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      <span className="barValue">{Math.round(value)}%</span>
    </div>
  );
}

function formatRecord(r) {
  if (!r) return "-";
  if (typeof r === "string") return r;
  const wins = r.wins ?? r.win ?? r.w ?? 0;
  const losses = r.losses ?? r.loss ?? r.l ?? 0;
  const ties = r.ties ?? r.t ?? 0;
  return `${wins}-${losses}${ties ? `-${ties}` : ""}`;
}

function sampleStandings(season) {
  return [
    {
      team_id: 1,
      name: "Metro Meteors",
      conference: "East",
      division: "East",
      record: "10-3",
      rank: 1,
      point_diff: 76,
      streak: "W3",
      home: "6-1",
      away: "4-2",
      last_five: "4-1",
      run_defense_rating: 74,
      explosiveness_rating: 63,
      redzone_efficiency: 61,
    },
    {
      team_id: 2,
      name: "Harbor Hawks",
      conference: "East",
      division: "East",
      record: "8-5",
      rank: 2,
      point_diff: 12,
      streak: "L1",
      home: "5-2",
      away: "3-3",
      last_five: "3-2",
      run_defense_rating: 68,
      explosiveness_rating: 56,
      redzone_efficiency: 59,
    },
    {
      team_id: 3,
      name: "Summit Stallions",
      conference: "West",
      division: "West",
      record: "9-4",
      rank: 1,
      point_diff: 45,
      streak: "W2",
      home: "5-2",
      away: "4-2",
      last_five: "3-2",
      run_defense_rating: 70,
      explosiveness_rating: 67,
      redzone_efficiency: 64,
    },
  ];
}