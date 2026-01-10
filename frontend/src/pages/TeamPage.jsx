import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function TeamPage() {
  const { abbr } = useParams();
  const [roster, setRoster] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/roster/${abbr}`);
        const json = await res.json();
        setRoster(json || []);
      } catch (e) {
        console.warn("Error loading team roster", e);
        setRoster([]);
      }
    }
    load();
  }, [abbr]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Team: {abbr}</h2>
      {roster === null ? (
        <p>Loading roster...</p>
      ) : roster.length === 0 ? (
        <p>No roster found.</p>
      ) : (
        roster.map((p, idx) => (
          <div key={`${p.player_id || idx}`}>
            {p.full_name || `${p.first_name || ""} ${p.last_name || ""}`} — {p.position}
          </div>
        ))
      )}
    </div>
  );
}
