// src/pages/TeamCardsPage.jsx
import React, { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000/api";

async function fetchTeamCards(team, season, week) {
  const res = await fetch(
    `${API_BASE}/cards/team/${team}?season=${season}&week=${week}`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch team cards: ${res.status} ${text}`);
  }
  return res.json();
}

function CardGrid({ title, cards, renderCard }) {
  if (!cards || cards.length === 0) return null;

  return (
    <>
      <h2>{title}</h2>
      <div className="card-grid">
        {cards.map((card, idx) => (
          <div key={`${title}-${card.playerId || idx}`}>{renderCard(card)}</div>
        ))}
      </div>
    </>
  );
}

// If you’re already using CardWrapper, you can import and reuse it instead:
import CardWrapper from "../components/cards/CardWrapper";

export default function TeamCardsPage({
  defaultTeam = "BUF",
  defaultSeason = 2024,
  defaultWeek = 1,
}) {
  const [team, setTeam] = useState(defaultTeam);
  const [season, setSeason] = useState(defaultSeason);
  const [week, setWeek] = useState(defaultWeek);

  const [oline, setOline] = useState([]);
  const [olineAdv, setOlineAdv] = useState([]);
  const [specialTeams, setSpecialTeams] = useState([]);
  const [defense, setDefense] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function loadAll() {
    try {
      setLoading(true);
      setErr(null);

      const payload = await fetchTeamCards(team, season, week);

      setOline(payload.oline || []);
      setOlineAdv(payload.olineAdvanced || []);
      setSpecialTeams(payload.specialTeams || []);
      setDefense(payload.defense || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, season, week]);

  return (
    <div className="team-cards-page">
      <h1>
        Team Cards: {team} — Season {season}, Week {week}
      </h1>

      <div className="filters">
        <input
          value={team}
          onChange={(e) => setTeam(e.target.value.toUpperCase())}
          placeholder="Team (BUF)"
        />
        <input
          type="number"
          value={season}
          onChange={(e) => setSeason(Number(e.target.value) || "")}
          placeholder="Season"
        />
        <input
          type="number"
          value={week}
          onChange={(e) => setWeek(Number(e.target.value) || "")}
          placeholder="Week"
        />
        <button onClick={loadAll} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {err && <p style={{ color: "salmon" }}>{err}</p>}

      <CardGrid
        title="Offensive Line"
        cards={oline}
        renderCard={(card) => <CardWrapper card={card} />}
      />

      <CardGrid
        title="Advanced Offensive Line"
        cards={olineAdv}
        renderCard={(card) => <CardWrapper card={card} />}
      />

      <CardGrid
        title="Special Teams"
        cards={specialTeams}
        renderCard={(card) => <CardWrapper card={card} />}
      />

      <CardGrid
        title="Defense"
        cards={defense}
        renderCard={(card) => <CardWrapper card={card} />}
      />
    </div>
  );
}
