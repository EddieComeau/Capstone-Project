import { useEffect, useState } from "react";

/**
 * Shows a small betting block for a single player.
 * You pass in: playerId
 * It fetches player name + props/odds and shows inline.
 */

export default function PlayerBettingWidget({ playerId }) {
  const [player, setPlayer] = useState(null);
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;

    async function fetchData() {
      setLoading(true);

      try {
        const [playerRes, propsRes] = await Promise.all([
          fetch(`/api/players/${playerId}`),
          fetch(`/api/betting/props?playerId=${playerId}&limit=5`),
        ]);

        const playerJson = await playerRes.json();
        const propsJson = await propsRes.json();

        if (playerJson.ok && propsJson.ok) {
          setPlayer(playerJson.player);
          setProps(propsJson.props || []);
        }
      } catch (e) {
        console.error("Error loading player props", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [playerId]);

  if (!playerId) return null;

  return (
    <div style={{ padding: 12, border: "1px solid #ccc", borderRadius: 8 }}>
      {loading && <p>Loading betting data...</p>}

      {player && (
        <h4>
          Betting Lines for {player.full_name} ({player.team_abbr})
        </h4>
      )}

      {props.map((p, i) => (
        <div key={p._id || i} style={{ marginBottom: 8 }}>
          <div>
            <b>{p.prop_type ?? p.market ?? p.stat_type ?? "Prop"}:</b>{" "}
            {p.line ?? "-"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Book: {p.sportsbook ?? p.book_key ?? "N/A"}
          </div>
        </div>
      ))}

      {!loading && props.length === 0 && <p>No props found.</p>}
    </div>
  );
}
