import { useMemo, useState, useEffect } from "react";
import { apiGet } from "../lib/api";
import "./InjuriesPage.css";
import { TEAM_LIST } from "../data/teamOptions";
import WeekPicker from "../components/WeekPicker";
import { getDefaultSeason } from "../utils/season";

export default function InjuriesPage() {
  const [current, setCurrent] = useState([]);
  const [form, setForm] = useState({
    player: "",
    team: "",
    status: "Questionable",
    detail: "",
  });
  const [loading, setLoading] = useState(false);
  const [season] = useState(getDefaultSeason());
  const [teamFilter, setTeamFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState(null);
  const seasonStart = `${season}-09-01`;

  // Load injuries from the API on first render.  This uses the new
  // `/api/injuries` endpoint implemented on the backend.  You can provide
  // optional query params (e.g. team, playerId) via search inputs or
  // filters; for now we fetch all injuries and sort them client‑side.
  const loadInjuries = async () => {
    try {
      setLoading(true);
      const injuries = await apiGet('/injuries');
      const mapped = (injuries || []).map((inj, idx) => ({
        id: inj._id || `${inj.bdlId}-${inj.date}-${idx}`,
        sourceId: inj.bdlId || inj._id || null,
        player: inj.player?.full_name || `${inj.player?.first_name || ''} ${inj.player?.last_name || ''}`.trim(),
        team: inj.player?.team?.abbreviation || '',
        status: inj.status || '',
        detail: inj.comment || '',
        date: inj.date ? String(inj.date).slice(0, 10) : '',
      }));

      setCurrent(mapped);
    } catch (err) {
      console.warn('Failed to load injuries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInjuries();
    const interval = setInterval(loadInjuries, 5 * 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadInjuries();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const currentSorted = useMemo(
    () => [...current].sort((a, b) => (a.player || "").localeCompare(b.player || "")),
    [current]
  );

  const currentWeek = useMemo(() => {
    const start = new Date(seasonStart);
    const now = new Date();
    if (now < start) return 1;
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, 23));
  }, [seasonStart]);

  const effectiveWeek = weekFilter || currentWeek;

  const latestEntries = useMemo(() => {
    const byPlayer = new Map();
    currentSorted.forEach((row) => {
      const key = row.sourceId || `${row.player}-${row.team}`;
      if (!key) return;
      const existing = byPlayer.get(key);
      if (!existing || (row.date || "") > (existing.date || "")) {
        byPlayer.set(key, row);
      }
    });
    const start = new Date(seasonStart);
    return Array.from(byPlayer.values()).map((row) => {
      if (!row.date) return { ...row, week: null };
      const date = new Date(row.date);
      const diffDays = Math.floor((date - start) / (1000 * 60 * 60 * 24));
      if (Number.isNaN(diffDays) || diffDays < 0) return { ...row, week: null };
      return { ...row, week: Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, 23)) };
    });
  }, [currentSorted, seasonStart]);

  const currentActive = useMemo(() => {
    return latestEntries.filter((row) => {
      if (teamFilter && row.team !== teamFilter) return false;
      if (!row.week) return true;
      if (row.week > effectiveWeek) return false;
      const statusText = `${row.status || ""} ${row.detail || ""}`.toLowerCase();
      if (statusText.includes("recovered") || statusText.includes("cleared")) return false;
      if (statusText.includes("ir") || statusText.includes("pup") || statusText.includes("out for season")) {
        return true;
      }
      return row.week >= Math.max(1, effectiveWeek - 4);
    });
  }, [latestEntries, teamFilter, effectiveWeek]);

  const currentRecovered = useMemo(() => {
    const activeKeys = new Set(currentActive.map((row) => row.id));
    return latestEntries.filter((row) => !activeKeys.has(row.id));
  }, [latestEntries, currentActive]);

  const estimateOut = (status, detail) => {
    const text = `${status || ''} ${detail || ''}`.toLowerCase();
    if (text.includes('out for season') || text.includes('season-ending')) return 'Out for season';
    if (text.includes('injured reserve') || text.includes('ir')) return 'Likely 4+ weeks';
    if (text.includes('pup')) return 'Likely 6+ weeks';
    if (text.includes('doubtful')) return 'Likely 1-2 weeks';
    if (text.includes('questionable')) return 'Day-to-day';
    if (text.includes('out')) return 'Likely 1-3 weeks';
    return 'TBD';
  };

  const addInjury = () => {
    if (!form.player || !form.team) return;
    const entry = {
      id: crypto.randomUUID(),
      ...form,
      date: new Date().toISOString().slice(0, 10),
    };
    setCurrent((prev) => [...prev, entry]);
    setForm({ player: "", team: "", status: "Questionable", detail: "" });
  };

  return (
    <div className="injuryWrap">
      <header className="injuryHead">
        <div>
          <h1>Injuries</h1>
          <p>Update player availability, then reference historical timelines.</p>
        </div>
        <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
          Auto-refreshes every 5 minutes.
        </div>
        <div className="injuryForm">
          <input
            type="text"
            name="injury-player"
            placeholder="Player name"
            value={form.player}
            onChange={(e) => setForm({ ...form, player: e.target.value })}
          />
          <select
            name="injury-team"
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
          >
            <option value="">Team</option>
            {TEAM_LIST.map((t) => (
              <option key={t.abbr} value={t.abbr}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            name="injury-status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option>Questionable</option>
            <option>Doubtful</option>
            <option>Out</option>
            <option>PUP</option>
            <option>IR</option>
          </select>
          <input
            type="text"
            name="injury-detail"
            placeholder="Detail (ankle, concussion, etc.)"
            value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
          />
          <button type="button" onClick={addInjury}>
            Update injury
          </button>
        </div>
      </header>

      <section className="injurySection">
        <div className="sectionHead">
          <h2>Injuries</h2>
          <span className="count">{currentActive.length}</span>
        </div>
        <div className="injuryFilters">
          <label>
            Team
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">All Teams</option>
              {TEAM_LIST.map((t) => (
                <option key={t.abbr} value={t.abbr}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Week
            <WeekPicker
              seasonStart={seasonStart}
              value={effectiveWeek}
              onChange={(val) => setWeekFilter(val)}
              name="injury-week"
            />
          </label>
          <div className="injuryWeekNote">Default: current week</div>
        </div>
        <div className="injuryList">
          {currentActive.map((i) => (
            <div key={i.id} className="injuryCard">
              <div>
                <div className="player">{i.player}</div>
                <div className="meta">
                  {i.team} • {i.status}
                </div>
                <div className="detail">{i.detail}</div>
                <div className="meta">
                  Occurred: {i.date || "Unknown"} • ETA: {estimateOut(i.status, i.detail)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="injurySection">
        <div className="sectionHead">
          <h2>Recovered</h2>
          <span className="count">{currentRecovered.length}</span>
        </div>
        <div className="injuryList">
          {currentRecovered.map((i) => (
            <div key={`recovered-${i.id}`} className="injuryCard">
              <div>
                <div className="player">{i.player}</div>
                <div className="meta">
                  {i.team} • {i.status}
                </div>
                <div className="detail">{i.detail}</div>
                <div className="meta">
                  Occurred: {i.date || "Unknown"} • Status: Recovered
                </div>
              </div>
              <button type="button" className="resolveBtn" disabled>
                Recovered
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
