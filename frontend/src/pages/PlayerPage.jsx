import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import PlayerBettingWidget from "../components/PlayerBettingWidget";

export default function PlayerPage() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/players/${id}`);
        const json = await res.json();
        if (json.ok) setPlayer(json.player);
      } catch (e) {
        console.warn("Error loading player", e);
      }
    }
    load();
  }, [id]);

  return (
    <div style={{ padding: 16 }}>
      {player ? (
        <>
          <h2>
            {player.full_name} ({player.team_abbr})
          </h2>
          <p>Position: {player.position}</p>
          <PlayerBettingWidget playerId={parseInt(id, 10)} />
        </>
      ) : (
        <p>Loading player...</p>
      )}
    </div>
  );
}
