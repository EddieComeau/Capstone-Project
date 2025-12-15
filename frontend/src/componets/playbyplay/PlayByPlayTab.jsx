// src/components/playbyplay/PlayByPlayTab.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../../lib/api";
import HelmetButton from "./HelmetButton";
import RetroField from "./RetroField";
import "./playbyplay.css";

export default function PlayByPlayTab() {
  const [season, setSeason] = useState(new Date().getFullYear());
  const [week, setWeek] = useState(1);

  const [games, setGames] = useState([]);
  const [gameId, setGameId] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const [plays, setPlays] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await apiGet("/games", { season, week, per_page: 100 });
        if (cancelled) return;
        setGames(data.data || []);
      } catch (e) {
        console.error(e);
        setGames([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [season, week]);

  async function startGame(g) {
    setSelectedGame(g);
    setGameId(g.id);
    setPlays([]);
    setCursor(null);
  }

  async function fetchNextPage() {
    if (!gameId) return;
    if (cursor === undefined) return; // undefined means “no more pages right now”

    const data = await apiGet("/playbyplay", {
      gameId,
      per_page: 100,
      cursor: cursor ?? undefined,
    });

    const next = data?.meta?.next_cursor;
    const newPlays = data?.data || [];

    setPlays((prev) => {
      const seen = new Set(prev.map((x) => x.id));
      const merged = [...prev];
      for (const p of newPlays) if (!seen.has(p.id)) merged.push(p);
      return merged;
    });

    setCursor(next == null ? undefined : next);
  }

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setCursor(null);
        setPlays([]);
        if (!cancelled) await fetchNextPage();
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!live || !gameId) return;

    pollRef.current = setInterval(() => {
      fetchNextPage().catch(() => {});
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, gameId, cursor]);

  const homeAbbr = selectedGame?.home_team?.abbreviation || "HOME";
  const awayAbbr = selectedGame?.visitor_team?.abbreviation || "AWAY";

  const sortedPlays = useMemo(() => {
    return [...plays].sort((a, b) => {
      const ta = new Date(a.wallclock || 0).getTime();
      const tb = new Date(b.wallclock || 0).getTime();
      return ta - tb;
    });
  }, [plays]);

  return (
    <div className="pbpWrap">
      <div className="pbpTop">
        <div className="pbpControls">
          <label>
            Season
            <input
              type="number"
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
            />
          </label>

          <label>
            Week
            <input
              type="number"
              min={1}
              max={22}
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            />
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
            />
            <span>LIVE</span>
          </label>

          <button
            className="pbpBtn"
            onClick={() => fetchNextPage()}
            disabled={!gameId}
            type="button"
          >
            Load More
          </button>

          {loading ? <span className="pbpLoading">Loading…</span> : null}
        </div>
      </div>

      <div className="pbpGameRow">
        {games.map((g) => {
          const ha = g.home_team?.abbreviation;
          const va = g.visitor_team?.abbreviation;
          const active = g.id === gameId;

          return (
            <div key={g.id} className={`gamePick ${active ? "active" : ""}`}>
              <HelmetButton
                abbr={va}
                label={va}
                active={active}
                onClick={() => startGame(g)}
              />
              <div className="vs">VS</div>
              <HelmetButton
                abbr={ha}
                label={ha}
                active={active}
                onClick={() => startGame(g)}
              />
            </div>
          );
        })}
      </div>

      {selectedGame ? (
        <div className="pbpMain">
          <div className="pbpFieldPanel">
            <div className="pbpTitle">
              <span className="teamTag">{awayAbbr}</span>
              <span className="at">@</span>
              <span className="teamTag">{homeAbbr}</span>
              <span className="meta">
                Week {selectedGame.week} • {selectedGame.status}
              </span>
            </div>

            <RetroField
              plays={sortedPlays}
              homeAbbr={homeAbbr}
              awayAbbr={awayAbbr}
            />
          </div>

          <div className="pbpListPanel">
            <div className="pbpListHeader">Play-By-Play</div>
            <div className="pbpList">
              {sortedPlays
                .slice()
                .reverse()
                .map((p) => (
                  <div key={p.id} className="pbpItem">
                    <div className="pbpItemTop">
                      <span className="chip">{p.clock_display ?? "--:--"}</span>
                      <span className="chip">Q{p.period ?? "?"}</span>
                      <span className="chip">{p.team?.abbreviation ?? "—"}</span>
                      <span className="chip">
                        {p.end_short_down_distance_text ?? ""}
                      </span>
                    </div>
                    <div className="pbpText">{p.short_text || p.text}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="pbpEmpty">Pick a game to show the retro play diagram.</div>
      )}
    </div>
  );
}
