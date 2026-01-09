import { useEffect, useState } from "react";

export default function PlayerSearchInput({ onSelect }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/players/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.ok) {
            setSuggestions(json.results || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div style={{ position: "relative", width: 220 }}>
      <input
        placeholder="Search Player..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "6px 10px" }}
      />

      {loading && <div style={{ fontSize: 12 }}>Loading...</div>}

      {suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            border: "1px solid #ccc",
            background: "white",
            zIndex: 10,
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          {suggestions.map((p) => (
            <div
              key={p.player_id}
              onClick={() => {
                setQuery(`${p.full_name} (${p.team_abbr})`);
                setSuggestions([]);
                onSelect(p);
              }}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {p.full_name} <span style={{ opacity: 0.6 }}>({p.team_abbr})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
