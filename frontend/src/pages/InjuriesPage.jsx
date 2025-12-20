import { useMemo, useState } from "react";
import "./InjuriesPage.css";

export default function InjuriesPage() {
  const [current, setCurrent] = useState(sampleCurrentInjuries);
  const [history, setHistory] = useState(samplePastInjuries);
  const [form, setForm] = useState({
    player: "",
    team: "",
    status: "Questionable",
    detail: "",
  });

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

const sampleCurrentInjuries = [
  {
    id: "c1",
    player: "Devon Hart",
    team: "Meteors",
    status: "Questionable",
    detail: "Hamstring tightness (day-to-day)",
    date: "2024-08-12",
  },
  {
    id: "c2",
    player: "Miles Rowan",
    team: "Hawks",
    status: "Out",
    detail: "Concussion protocol",
    date: "2024-08-10",
  },
];

const samplePastInjuries = [
  {
    id: "p1",
    player: "Keenan Vale",
    team: "Stallions",
    status: "Recovered",
    detail: "AC joint sprain",
    date: "2024-07-21",
  },
  {
    id: "p2",
    player: "Andre Marsh",
    team: "Armada",
    status: "Recovered",
    detail: "High ankle sprain",
    date: "2024-07-02",
  },
];