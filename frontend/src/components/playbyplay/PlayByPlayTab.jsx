// src/components/playbyplay/PlayByPlayTab.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../../lib/api";
import { sampleGames, samplePlays } from "../../data/playSamples";
import HelmetButton from "./HelmetButton";
import RetroField from "./RetroField";
import PlayEventFXLayer from "./eventFx/PlayEventFXLayer";
import { usePlayEventFX } from "./eventFx/usePlayEventFx";
import "./playbyplay.css";

const SFX_MAP = {
  first_down: "/sfx/first_down.wav",
  interception: "/sfx/interception.wav",
  fumble: "/sfx/fumble.wav",
  touchdown: "/sfx/touchdown.wav",
};

const LOTTIE_MAP = {
  first_down: "/lottie/fx/first_down.json",
  interception: "/lottie/fx/interception.json",
  fumble: "/lottie/fx/fumble.json",
  touchdown: "/lottie/fx/touchdown.json",
};

const EVENT_MATCHERS = [
  {
    type: "touchdown",
    test: (p, text) => p.scoring_play === true || text.includes("touchdown"),
  },
  {
    type: "interception",
    test: (p, text) => text.includes("interception") || text.includes("intercepted"),
  },
  {
    type: "fumble",
    test: (p, text) => text.includes("fumble") || text.includes("turnover"),
  },
  {
    type: "first_down",
    test: (p, text) =>
      text.includes("first down") || p.start_down === 1 || p.end_down === 1,
  },
];

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
  const [bigPlayCursor, setBigPlayCursor] = useState(-1);
  const [bigPlayFilter, setBigPlayFilter] = useState("all");
  const [toastPlay, setToastPlay] = useState(null);
  const pollRef = useRef(null);
  const lastTriggeredRef = useRef(null);

  const fx = usePlayEventFX({ sfxMap: SFX_MAP, lottieMap: LOTTIE_MAP });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await apiGet("/games", { season, week, per_page: 100 });
        if (cancelled) return;
        setGames(data.data || []);
        if ((data.data || []).length === 0) {
          const fallback = sampleGames(season, week);
          setGames(fallback);
        }
      } catch (e) {
        console.error(e);
        setGames(sampleGames(season, week));
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
    lastTriggeredRef.current = null;
  }

  useEffect(() => {
    if (selectedGame || !games.length) return;
    startGame(games[0]);
  }, [games, selectedGame]);

  async function fetchNextPage() {
    if (!gameId) return;
    if (cursor === undefined) return; // undefined means “no more pages right now”

    try {
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
    } catch (e) {
      console.error(e);
      const fallback = samplePlays(gameId);
      setPlays(fallback);
      setCursor(undefined);
    }
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
  const homeScore =
    selectedGame?.home_team_score ?? selectedGame?.home_score ?? selectedGame?.home_points ?? selectedGame?.home_points_total ?? 0;
  const awayScore =
    selectedGame?.visitor_team_score ?? selectedGame?.away_score ?? selectedGame?.visitor_points ?? selectedGame?.away_points_total ?? 0;

  const sortedPlays = useMemo(() => {
    return [...plays].sort((a, b) => {
      const ta = new Date(a.wallclock || 0).getTime();
      const tb = new Date(b.wallclock || 0).getTime();
      return ta - tb;
    });
  }, [plays]);

  const bigPlays = useMemo(() => {
    return sortedPlays
      .map((p) => {
        const text = (p.short_text || p.text || "").toLowerCase();
        const match = EVENT_MATCHERS.find((m) => m.test(p, text));
        if (!match) return null;
        return { id: p.id, type: match.type, play: p };
      })
      .filter(Boolean);
  }, [sortedPlays]);

  const filteredBigPlays = useMemo(() => {
    if (bigPlayFilter === "all") return bigPlays;
    return bigPlays.filter((p) => p.type === bigPlayFilter);
  }, [bigPlayFilter, bigPlays]);

  const activeBigPlay = bigPlayCursor >= 0 ? filteredBigPlays[bigPlayCursor] : null;

  const focusPlay = useMemo(() => {
    if (activeBigPlay?.play) return activeBigPlay.play;
    if (!sortedPlays.length) return null;
    return sortedPlays[sortedPlays.length - 1];
  }, [activeBigPlay?.play, sortedPlays]);

  const ballSpot = useMemo(() => {
    if (!focusPlay) return 50;
    const val = Number(
      focusPlay.end_yard_line ?? focusPlay.start_yard_line ?? focusPlay.yard_line
    );
    if (Number.isNaN(val)) return 50;
    return Math.max(0, Math.min(100, val));
  }, [focusPlay]);

  const currentDown = useMemo(() => {
    if (!focusPlay) return 1;
    return (
      focusPlay.start_down ||
      focusPlay.end_down ||
      focusPlay.down ||
      focusPlay.series ||
      1
    );
  }, [focusPlay]);

  const hasPenalty = useMemo(() => {
    if (!focusPlay) return false;
    const text = (focusPlay.short_text || focusPlay.text || "").toLowerCase();
    return text.includes("penalty");
  }, [focusPlay]);

  function stepBigPlay(delta) {
    if (!filteredBigPlays.length) return;
    setBigPlayCursor((idx) => {
      const next = (idx + delta + filteredBigPlays.length) % filteredBigPlays.length;
      const chosen = filteredBigPlays[next];
      if (chosen) {
        setToastPlay({ type: chosen.type, play: chosen.play });
        fx.trigger(chosen.type).catch(() => {});
      }
      return next;
    });
  }

  useEffect(() => {
    if (!sortedPlays.length) return;
    const latest = sortedPlays[sortedPlays.length - 1];
    if (!latest) return;
    if (latest.id === lastTriggeredRef.current) return;

    const text = (latest.short_text || latest.text || "").toLowerCase();
    const matched = EVENT_MATCHERS.find((m) => m.test(latest, text));

    if (matched) {
      fx.trigger(matched.type).catch(() => {});
      setToastPlay({ type: matched.type, play: latest });
    }
    lastTriggeredRef.current = latest.id;
  }, [sortedPlays, fx]);

  useEffect(() => {
    if (!filteredBigPlays.length) {
      setBigPlayCursor(-1);
      return;
    }
    setBigPlayCursor(filteredBigPlays.length - 1);
  }, [filteredBigPlays.length]);

  useEffect(() => {
    if (!toastPlay) return;
    const t = setTimeout(() => setToastPlay(null), 2400);
    return () => clearTimeout(t);
  }, [toastPlay]);

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

        <div className="pbpFxRow">
          <label className="toggle">
            <input
              type="checkbox"
              checked={fx.enabled}
              onChange={(e) => fx.setEnabled(e.target.checked)}
            />
            <span>FX On</span>
          </label>
          <button
            className="pbpBtn"
            onClick={() => fx.unlockAudio()}
            type="button"
            disabled={fx.audioUnlocked}
          >
            {fx.audioUnlocked ? "Audio Ready" : "Tap to Arm Audio"}
          </button>
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
          <PlayEventFXLayer
            activeFx={fx.activeFx}
            message={toastPlay?.play?.short_text || toastPlay?.play?.text}
            tag={toastPlay?.type}
          />
          <div className="bigPlayReel">
            <div>
              <div className="label">Big play reel</div>
              <select
                value={bigPlayFilter}
                onChange={(e) => setBigPlayFilter(e.target.value)}
              >
                <option value="all">All types</option>
                {EVENT_MATCHERS.map((m) => (
                  <option key={m.type} value={m.type}>
                    {m.type.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="reelControls">
              <button type="button" onClick={() => stepBigPlay(-1)} disabled={!filteredBigPlays.length}>
                ◀ Prev
              </button>
              <div className="reelNow">
                {activeBigPlay ? (
                  <>
                    <span className="chip">{activeBigPlay.type}</span>
                    <span className="clipText">
                      {activeBigPlay.play.short_text || activeBigPlay.play.text}
                    </span>
                  </>
                ) : (
                  <span className="clipText">No big plays yet</span>
                )}
              </div>
              <button type="button" onClick={() => stepBigPlay(1)} disabled={!filteredBigPlays.length}>
                Next ▶
              </button>
            </div>
          </div>
          <div className="pbpFieldPanel">
            <div className="scoreBox">
              <div className="scoreTeam">
                <div className="scoreName">{awayAbbr}</div>
                <div className="scoreValue">{awayScore}</div>
              </div>
              <div className="scoreMeta">
                <div className="scoreLabel">Retro Scoreboard</div>
                <div className="scoreDetail">
                  Week {selectedGame.week} • {selectedGame.status}
                </div>
              </div>
              <div className="scoreTeam home">
                <div className="scoreName">{homeAbbr}</div>
                <div className="scoreValue">{homeScore}</div>
              </div>
            </div>

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
              ballSpot={ballSpot}
              currentDown={currentDown}
              hasPenalty={hasPenalty}
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