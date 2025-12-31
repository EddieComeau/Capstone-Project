import { useMemo, useState, useEffect } from "react";
import { apiGet } from "../lib/api";
import "./InjuriesPage.css";

export default function InjuriesPage() {
  // Current injuries fetched from the backend.  We initialise with an empty array
  // and load data on mount.  Past injuries are currently not separated from the
  // API response; if you wish to track recovered injuries separately, filter
  // accordingly (e.g. by status or date).
  const [current, setCurrent] = useState([]);
  // History is reserved for recovered injuries added locally via the UI.  When
  // injuries sync is implemented fully on the server (e.g. with a `status`
  // property of "Recovered"), you could populate this from the API as well.
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    player: "",
    team: "",
    status: "Questionable",
    detail: "",
  });

  // Load injuries from the API on first render.  This uses the new
  // `/api/injuries` endpoint implemented on the backend.  You can provide
  // optional query params (e.g. team, playerId) via search inputs or
  // filters; for now we fetch all injuries and sort them client‑side.
  useEffect(() => {
    async function loadInjuries() {
      try {
        const injuries = await apiGet('/injuries');
        // injuries array contains objects with { player, status, comment, date, bdlId }
        // Map into our local format: id (bdlId + date), player full name,
        // team abbreviation, status, and comment/detail.  If any fields
        // are missing, provide sensible defaults.
        const mapped = (injuries || []).map((inj) => ({
          id: `${inj.bdlId}-${inj.date}`,
          player: inj.player?.full_name || `${inj.player?.first_name || ''} ${inj.player?.last_name || ''}`.trim(),
          team: inj.player?.team?.abbreviation || '',
          status: inj.status || '',
          detail: inj.comment || '',
          date: inj.date ? String(inj.date).slice(0, 10) : '',
        }));
        // You could split into current/history here based on status or date
        setCurrent(mapped);
      } catch (err) {
        console.warn('Failed to load injuries', err);
      }
    }
    loadInjuries();
  }, []);

  const currentSorted = useMemo(
    () => [...current].sort((a, b) => a.player.localeCompare(b.player)),
    [current]
  );

  const historySorted = useMemo(
    () => [...history].sort((a, b) => b.date.localeCompare(a.date)),
    [history]
  );

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

  const resolveInjury = (id) => {
    setCurrent((prev) => {
      const hit = prev.find((p) => p.id === id);
      const rest = prev.filter((p) => p.id !== id);
      if (hit) setHistory((hist) => [{ ...hit, status: "Recovered" }, ...hist]);
      return rest;
    });
  };

  return (
    <div className="injuryWrap">
      <header className="injuryHead">
        <div>
          <h1>Injuries</h1>
          <p>Update player availability, then reference historical timelines.</p>
        </div>
        <div className="injuryForm">
          <input
            type="text"
            placeholder="Player name"
            value={form.player}
            onChange={(e) => setForm({ ...form, player: e.target.value })}
          />
          <input
            type="text"
            placeholder="Team"
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
          />
          <select
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
          <h2>Current injuries</h2>
          <span className="count">{current.length}</span>
        </div>
        <div className="injuryList">
          {currentSorted.map((i) => (
            <div key={i.id} className="injuryCard">
              <div>
                <div className="player">{i.player}</div>
                <div className="meta">
                  {i.team} • {i.status}
                </div>
                <div className="detail">{i.detail}</div>
              </div>
              <button className="resolveBtn" type="button" onClick={() => resolveInjury(i.id)}>
                Mark recovered
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="injurySection">
        <div className="sectionHead">
          <h2>Past injuries</h2>
          <span className="count">{history.length}</span>
        </div>
        <div className="injuryList past">
          {historySorted.map((i) => (
            <div key={i.id} className="injuryCard">
              <div>
                <div className="player">{i.player}</div>
                <div className="meta">
                  {i.team} • {i.status} • {i.date}
                </div>
                <div className="detail">{i.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Removed sample injuries; data now comes from the backend via apiGet