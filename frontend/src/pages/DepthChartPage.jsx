// src/pages/DepthChartPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { mockDepthCharts } from "../data/mockDepthCharts";
import TeamBadge from "../components/common/TeamBadge";
import PlayerAvatar from "../components/common/avatar";
import "./DepthChartPage.css";

function SlotCard({ player, onSelect, active }) {
  return (
    <button
      className={`dcCard ${active ? "active" : ""}`}
      type="button"
      onClick={() => onSelect(player)}
    >
      <div className="dcTop">
        <div className="dcPos">{player.position}</div>
        <TeamBadge abbr={player.team} size={22} />
      </div>
      <div className="dcName">{player.name}</div>
      <div className="dcMeta">#{player.number} • {player.depthLabel}</div>
      <div className="dcAvatar">
        <PlayerAvatar seed={`${player.team}-${player.name}`} size={48} />
      </div>
    </button>
  );
}

const ADVANCED_PRESETS = {
  QB: {
    title: "QB Efficiency",
    metrics: [
      { label: "Deep Accuracy", value: 86 },
      { label: "Pocket Time", value: 78 },
      { label: "Play Action", value: 82 },
      { label: "Scramble", value: 74 },
    ],
  },
  RB: {
    title: "RB Advanced",
    metrics: [
      { label: "Yards After Contact", value: 84 },
      { label: "Breakaway Rate", value: 79 },
      { label: "Pass Pro", value: 72 },
      { label: "Explosive Runs", value: 81 },
    ],
  },
  WR: {
    title: "WR Route Wins",
    metrics: [
      { label: "Release vs Press", value: 83 },
      { label: "Separation", value: 88 },
      { label: "Contested", value: 76 },
      { label: "YAC", value: 80 },
    ],
  },
  TE: {
    title: "TE Usage",
    metrics: [
      { label: "Chip + Block", value: 74 },
      { label: "Seam Threat", value: 85 },
      { label: "Red Zone", value: 82 },
      { label: "Inline Pass Pro", value: 71 },
    ],
  },
  OL: {
    title: "OL Grades",
    metrics: [
      { label: "Run Blocking", value: 82 },
      { label: "Pass Sets", value: 80 },
      { label: "Stunts", value: 77 },
      { label: "Penalty Rate", value: 73 },
    ],
  },
  LB: {
    title: "LB Range",
    metrics: [
      { label: "Sideline Range", value: 85 },
      { label: "Blitz Win", value: 78 },
      { label: "Coverage", value: 72 },
      { label: "Run Fits", value: 80 },
    ],
  },
  DB: {
    title: "DB Coverage",
    metrics: [
      { label: "Man", value: 84 },
      { label: "Zone", value: 81 },
      { label: "Ball Skills", value: 79 },
      { label: "Tackle", value: 76 },
    ],
  },
  DL: {
    title: "DL Pressure",
    metrics: [
      { label: "Pass Rush Win", value: 86 },
      { label: "Double-Team", value: 74 },
      { label: "Shed Rate", value: 80 },
      { label: "Run Stop", value: 78 },
    ],
  },
  DEFAULT: {
    title: "Position Benchmarks",
    metrics: [
      { label: "Awareness", value: 75 },
      { label: "Consistency", value: 76 },
      { label: "Agility", value: 74 },
      { label: "Impact", value: 78 },
    ],
  },
};

const TEAM_COMPARISON = [
  { label: "Run Defense", left: 82, right: 76 },
  { label: "Pass Rush", left: 79, right: 84 },
  { label: "Pass Blocking", left: 74, right: 81 },
  { label: "Red Zone", left: 77, right: 75 },
];

const GRAPH_SERIES = {
  QB: [
    { label: "Drive Efficiency", values: [64, 68, 72, 78, 81, 86], color: "#a5f3fc" },
    { label: "Air Yards", values: [52, 60, 69, 74, 78, 82], color: "#fef08a" },
  ],
  RB: [
    { label: "Yards After Contact", values: [55, 63, 70, 76, 79, 84], color: "#86efac" },
    { label: "Explosive Runs", values: [48, 54, 61, 67, 74, 80], color: "#fca5a5" },
  ],
  WR: [
    { label: "Separation", values: [60, 66, 74, 80, 88, 92], color: "#c084fc" },
    { label: "YAC", values: [50, 58, 66, 73, 78, 84], color: "#fef08a" },
  ],
  TE: [
    { label: "Red Zone Index", values: [44, 51, 58, 66, 72, 80], color: "#fcd34d" },
    { label: "Chip & Release", values: [52, 60, 64, 70, 76, 82], color: "#93c5fd" },
  ],
  OL: [
    { label: "Pass Set Timing", values: [55, 60, 66, 71, 77, 82], color: "#bfdbfe" },
    { label: "Run Lane Wins", values: [50, 58, 64, 70, 75, 80], color: "#a7f3d0" },
  ],
  DB: [
    { label: "Coverage Denials", values: [58, 62, 68, 73, 79, 85], color: "#93c5fd" },
    { label: "Ball Skills", values: [52, 56, 64, 70, 76, 82], color: "#fca5a5" },
  ],
  LB: [
    { label: "Range", values: [54, 60, 66, 72, 78, 83], color: "#fde68a" },
    { label: "Blitz Win", values: [48, 55, 63, 70, 76, 81], color: "#a5b4fc" },
  ],
  DL: [
    { label: "Pass Rush", values: [60, 66, 72, 78, 82, 88], color: "#fda4af" },
    { label: "Run Stops", values: [52, 58, 65, 70, 75, 80], color: "#bbf7d0" },
  ],
  DEFAULT: [
    { label: "Usage", values: [48, 54, 60, 64, 70, 76], color: "#bae6fd" },
    { label: "Efficiency", values: [50, 55, 60, 66, 72, 78], color: "#a5f3fc" },
  ],
};

export default function DepthChartPage() {
  const [tab, setTab] = useState("OFF");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [compareTargetId, setCompareTargetId] = useState(null);

  // Currently selected team abbreviation.  Defaults to Kansas City (KC).  The
  // user can select a different team from a dropdown of available teams.
  const [teamAbbr, setTeamAbbr] = useState("KC");
  // List of teams loaded from the backend to populate the dropdown
  const [teams, setTeams] = useState([]);
  // Roster data keyed by OFF/DEF/ST; will be populated from the backend
  const [roster, setRoster] = useState({ OFF: [], DEF: [], ST: [] });

  // Fetch list of teams on mount
  useEffect(() => {
    async function loadTeams() {
      try {
        const teamList = await apiGet('/teams/db');
        setTeams(teamList || []);
      } catch (err) {
        console.warn('Failed to load teams', err);
      }
    }
    loadTeams();
  }, []);

  // Fetch roster when team abbreviation changes
  useEffect(() => {
    async function loadRoster() {
      if (!teamAbbr) return;
      try {
        const players = await apiGet(`/roster/${teamAbbr}`);
        // Transform players into depth chart slots.  Players returned from
        // `/roster/:abbr` contain at least { first_name, last_name, full_name,
        // position, team } from the Player model.  We categorise by
        // offensive, defensive and special teams positions.
        const off = {};
        const def = {};
        const st = {};
        // helper to push into bucket object keyed by position
        function pushTo(bucket, pos, player) {
          if (!bucket[pos]) bucket[pos] = [];
          bucket[pos].push(player);
        }
        (players || []).forEach((p) => {
          const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
          const pos = (p.position || '').toUpperCase();
          const base = pos.replace(/[0-9]/g, '');
          const entry = {
            position: '',
            name,
            number: p.raw?.jersey_number || p.jersey_number || '',
            team: teamAbbr,
            depthLabel: '',
          };
          // Offense
          if (['QB', 'RB', 'HB', 'WR', 'TE', 'FB', 'C', 'G', 'T', 'OL'].includes(base)) {
            pushTo(off, base || pos, entry);
          } else if (['DL', 'DE', 'DT', 'LB', 'OLB', 'ILB', 'MLB', 'DB', 'CB', 'FS', 'SS'].includes(base)) {
            pushTo(def, base || pos, entry);
          } else if (['K', 'P', 'LS', 'KR', 'PR'].includes(base)) {
            pushTo(st, base || pos, entry);
          }
        });
        // Build arrays with position codes like QB1, WR1, etc.  We'll assign
        // depth labels (Starter/Backup) based on index.
        const offSlots = [];
        // QB, RB/HB, WR, TE, OL (C,G,T).  Use index to number
        if (off.QB) off.QB.forEach((p, idx) => offSlots.push({ ...p, position: `QB${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `QB${idx + 1}` }));
        if (off.RB) off.RB.forEach((p, idx) => offSlots.push({ ...p, position: `RB${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `RB${idx + 1}` }));
        if (off.HB && !off.RB) off.HB.forEach((p, idx) => offSlots.push({ ...p, position: `HB${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `HB${idx + 1}` }));
        if (off.WR) off.WR.forEach((p, idx) => offSlots.push({ ...p, position: `WR${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `WR${idx + 1}` }));
        if (off.TE) off.TE.forEach((p, idx) => offSlots.push({ ...p, position: `TE${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `TE${idx + 1}` }));
        // Offensive line: C,G,T: treat them as single entries
        if (off.C) off.C.forEach((p) => offSlots.push({ ...p, position: 'C', depthLabel: 'Starter' }));
        if (off.G) off.G.forEach((p, idx) => offSlots.push({ ...p, position: idx === 0 ? 'LG' : 'RG', depthLabel: idx === 0 ? 'Starter' : 'Starter' }));
        if (off.T) off.T.forEach((p, idx) => offSlots.push({ ...p, position: idx === 0 ? 'LT' : 'RT', depthLabel: idx === 0 ? 'Starter' : 'Starter' }));

        const defSlots = [];
        // Cornerbacks (CB), Safeties (FS,SS), Linebackers (LB/MLB/ILB/OLB), Defensive line (DL, DE, DT)
        if (def.CB) def.CB.forEach((p, idx) => defSlots.push({ ...p, position: `CB${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `CB${idx + 1}` }));
        if (def.FS) def.FS.forEach((p) => defSlots.push({ ...p, position: 'FS', depthLabel: 'Starter' }));
        if (def.SS) def.SS.forEach((p) => defSlots.push({ ...p, position: 'SS', depthLabel: 'Starter' }));
        // LB: prefer specific keys; unify other LB types
        const lbBuckets = [].concat(def.OLB || [], def.ILB || [], def.MLB || [], def.LB || []);
        lbBuckets.forEach((p, idx) => defSlots.push({ ...p, position: ['OLB','ILB','MLB','LB'][idx] || 'LB', depthLabel: idx === 0 ? 'Starter' : `LB${idx + 1}` }));
        if (def.DL) def.DL.forEach((p, idx) => defSlots.push({ ...p, position: `DL${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `DL${idx + 1}` }));
        if (def.DE) def.DE.forEach((p, idx) => defSlots.push({ ...p, position: `DE${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `DE${idx + 1}` }));
        if (def.DT) def.DT.forEach((p, idx) => defSlots.push({ ...p, position: `DT${idx + 1}`, depthLabel: idx === 0 ? 'Starter' : `DT${idx + 1}` }));

        const stSlots = [];
        if (st.K) st.K.forEach((p, idx) => stSlots.push({ ...p, position: 'K', depthLabel: idx === 0 ? 'Starter' : `K${idx + 1}` }));
        if (st.P) st.P.forEach((p, idx) => stSlots.push({ ...p, position: 'P', depthLabel: idx === 0 ? 'Starter' : `P${idx + 1}` }));
        if (st.LS) st.LS.forEach((p) => stSlots.push({ ...p, position: 'LS', depthLabel: 'Starter' }));
        if (st.KR) st.KR.forEach((p) => stSlots.push({ ...p, position: 'KR', depthLabel: 'Return' }));
        if (st.PR) st.PR.forEach((p) => stSlots.push({ ...p, position: 'PR', depthLabel: 'Return' }));

        // If no players were found for any unit (likely because the DB is empty or
        // syncing hasn’t been performed), fall back to a mock depth chart.  The
        // mock dataset mirrors the shape of our depth chart structure and
        // provides generic players for demonstration.  Otherwise use the
        // computed slots.
        if (offSlots.length === 0 && defSlots.length === 0 && stSlots.length === 0) {
          const fallbackOff = Object.entries(mockDepthCharts.offense).map(([pos, p]) => ({
            position: pos,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            number: p.jersey_number || '',
            team: p.team || teamAbbr,
            depthLabel: 'Starter',
          }));
          const fallbackDef = Object.entries(mockDepthCharts.defense).map(([pos, p]) => ({
            position: pos,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            number: p.jersey_number || '',
            team: p.team || teamAbbr,
            depthLabel: 'Starter',
          }));
          const fallbackST = Object.entries(mockDepthCharts.specialTeams).map(([pos, p]) => ({
            position: pos,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            number: p.jersey_number || '',
            team: p.team || teamAbbr,
            depthLabel: pos === 'KR' || pos === 'PR' ? 'Return' : 'Starter',
          }));
          setRoster({ OFF: fallbackOff, DEF: fallbackDef, ST: fallbackST });
        } else {
          setRoster({ OFF: offSlots, DEF: defSlots, ST: stSlots });
        }
      } catch (err) {
        console.warn('Failed to load roster', err);
        // If the API call fails (e.g. network error, missing data), fall back
        // to the mock depth chart so the UI doesn’t remain empty.  This ensures
        // that the depth chart page always displays something meaningful even
        // when the backend isn’t populated or reachable.  The teamAbbr is
        // passed through so players appear with the selected team acronym.
        const fallbackOff = Object.entries(mockDepthCharts.offense).map(([pos, p]) => ({
          position: pos,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          number: p.jersey_number || '',
          team: p.team || teamAbbr,
          depthLabel: 'Starter',
        }));
        const fallbackDef = Object.entries(mockDepthCharts.defense).map(([pos, p]) => ({
          position: pos,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          number: p.jersey_number || '',
          team: p.team || teamAbbr,
          depthLabel: 'Starter',
        }));
        const fallbackST = Object.entries(mockDepthCharts.specialTeams).map(([pos, p]) => ({
          position: pos,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          number: p.jersey_number || '',
          team: p.team || teamAbbr,
          depthLabel: pos === 'KR' || pos === 'PR' ? 'Return' : 'Starter',
        }));
        setRoster({ OFF: fallbackOff, DEF: fallbackDef, ST: fallbackST });
      }
    }
    loadRoster();
  }, [teamAbbr]);

  const tabs = [
    { key: "OFF", label: "Offense" },
    { key: "DEF", label: "Defense" },
    { key: "ST", label: "Special Teams" },
  ];

  useEffect(() => {
    const first = roster[tab]?.[0];
    if (first) {
      setSelectedPlayer(first);
      setCompareTargetId(roster[tab]?.[1]?.position || first.position);
      setDetailTab("overview");
    }
  }, [tab, roster]);

  const compareTarget = useMemo(() => {
    if (!compareTargetId) return null;
    return roster[tab]?.find((p) => p.position === compareTargetId) || null;
  }, [compareTargetId, roster, tab]);

  function derivePreset(position) {
    if (!position) return ADVANCED_PRESETS.DEFAULT;
    const base = position.replace(/[0-9]/g, "");
    const mapKey = ["QB", "RB", "WR", "TE", "C", "G", "T"].includes(base)
      ? base === "C" || base === "G" || base === "T"
        ? "OL"
        : base
      : ["LB"].includes(base)
      ? "LB"
      : ["CB", "FS", "SS"].includes(base)
      ? "DB"
      : ["DE", "DT"].includes(base)
      ? "DL"
      : "DEFAULT";
    return ADVANCED_PRESETS[mapKey] || ADVANCED_PRESETS.DEFAULT;
  }

  const preset = derivePreset(selectedPlayer?.position);
  const graphSeries = useMemo(() => {
    if (!selectedPlayer?.position) return GRAPH_SERIES.DEFAULT;
    const base = selectedPlayer.position.replace(/[0-9]/g, "");
    if (["C", "G", "T"].includes(base)) return GRAPH_SERIES.OL;
    return GRAPH_SERIES[base] || GRAPH_SERIES.DEFAULT;
  }, [selectedPlayer]);

  return (
    <div className="dcPage">
      <div className="dcHeader">
        <h2 className="dcTitle">Depth Chart</h2>
        {/* Team selection dropdown allows the user to choose a roster. */}
        <div className="teamSelect">
          <label htmlFor="team-select" style={{ marginRight: '0.5rem' }}>Team:</label>
          <select
            id="team-select"
            value={teamAbbr}
            onChange={(e) => setTeamAbbr(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px' }}
          >
            {teams.map((t) => (
              <option key={t.abbreviation} value={t.abbreviation}>
                {t.abbreviation}
              </option>
            ))}
          </select>
        </div>
        <div className="dcTabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`dcTab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dcLayout">
        <div className="dcLeft">
          <div className="dcGrid">
            {roster[tab].map((p) => (
              <SlotCard
                key={p.position}
                player={p}
                onSelect={setSelectedPlayer}
                active={selectedPlayer?.position === p.position}
              />
            ))}
          </div>

          <div className="dcGraphRail" aria-live="polite">
            <div className="graphHeader">Graphs follow your selection</div>
            <div className="graphSub">Click any player card and scroll — trend bars update for that position.</div>
            <div className="sparkGrid">
              {graphSeries.map((series) => (
                <div key={series.label} className="sparkCard">
                  <div className="sparkTitle">{series.label}</div>
                  <div className="sparkline" role="img" aria-label={`${series.label} trend for ${selectedPlayer?.name || "player"}`}>
                    {series.values.map((v, idx) => (
                      <div key={`${series.label}-${idx}`} className="sparkBar" style={{ height: `${v}%`, background: series.color }} />
                    ))}
                  </div>
                  <div className="sparkMeta">Last {series.values.length} games • Peak {Math.max(...series.values)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedPlayer ? (
          <aside className="dcInspector">
            <div className="inspectorTop">
              <div>
                <div className="pill">{selectedPlayer.team}</div>
                <h3 className="inspectorName">{selectedPlayer.name}</h3>
                <div className="inspectorMeta">#{selectedPlayer.number} • {selectedPlayer.position}</div>
              </div>
              <div className="inspectorAvatar">
                <PlayerAvatar seed={`${selectedPlayer.team}-${selectedPlayer.name}-hero`} size={88} />
              </div>
            </div>

            <div className="detailTabs">
              <button
                className={detailTab === "overview" ? "active" : ""}
                onClick={() => setDetailTab("overview")}
                type="button"
              >
                Overview
              </button>
              <button
                className={detailTab === "advanced" ? "active" : ""}
                onClick={() => setDetailTab("advanced")}
                type="button"
              >
                Advanced Stats
              </button>
              <button
                className={detailTab === "pvp" ? "active" : ""}
                onClick={() => setDetailTab("pvp")}
                type="button"
              >
                Player vs Player
              </button>
              <button
                className={detailTab === "teams" ? "active" : ""}
                onClick={() => setDetailTab("teams")}
                type="button"
              >
                Team vs Team
              </button>
            </div>

            {detailTab === "overview" && (
              <div className="inspectorCard">
                <div className="inspectorNote">Scroll for stats/graphs. Player tabs stay pinned above the analytics stack.</div>
                <div className="inspectorGrid">
                  <div>
                    <div className="miniTitle">Depth Label</div>
                    <div className="miniBody">{selectedPlayer.depthLabel}</div>
                  </div>
                  <div>
                    <div className="miniTitle">Team</div>
                    <div className="miniBody">{selectedPlayer.team}</div>
                  </div>
                  <div>
                    <div className="miniTitle">Jersey</div>
                    <div className="miniBody">#{selectedPlayer.number}</div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "advanced" && (
              <div className="inspectorCard">
                <div className="inspectorCardHeader">
                  <div>
                    <div className="miniTitle">Advanced</div>
                    <div className="miniBody">{preset.title} • scaled to position</div>
                  </div>
                  <div className="radialBadge">
                    <span className="radialValue">
                      {Math.round(
                        preset.metrics.reduce((sum, m) => sum + m.value, 0) / preset.metrics.length
                      )}
                    </span>
                    <span className="radialLabel">Index</span>
                  </div>
                </div>
                <div className="advancedGrid">
                  {preset.metrics.map((m) => (
                    <div key={m.label} className="advancedRow">
                      <div className="advancedMeta">
                        <span>{m.label}</span>
                        <span>{m.value}</span>
                      </div>
                      <div className="advancedBar">
                        <div className="advancedFill" style={{ width: `${m.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === "pvp" && (
              <div className="inspectorCard">
                <div className="inspectorCardHeader">
                  <div className="miniTitle">Player vs Player</div>
                  <div className="miniBody">Head-to-head for quick scouting</div>
                </div>
                <div className="pvpSelectRow">
                  <label>
                    Compare with
                    <select
                      value={compareTargetId || ""}
                      onChange={(e) => setCompareTargetId(e.target.value)}
                    >
                      {roster[tab].map((p) => (
                        <option key={p.position} value={p.position}>
                          {p.position} – {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {compareTarget ? (
                  <div className="pvpGrid">
                    {[selectedPlayer, compareTarget].map((p) => (
                      <div key={p.position} className="pvpCard">
                        <div className="pvpHeader">
                          <span className="chip">{p.position}</span>
                          <span className="chip">{p.team}</span>
                        </div>
                        <div className="pvpName">{p.name}</div>
                        <div className="pvpMeta">#{p.number} • {p.depthLabel}</div>
                        <div className="pvpStatRow">
                          <span>Explosiveness</span>
                          <div className="statBar"><div style={{ width: `${70 + (p.number % 10)}%` }} /></div>
                        </div>
                        <div className="pvpStatRow">
                          <span>Consistency</span>
                          <div className="statBar"><div style={{ width: `${64 + (p.number % 12)}%` }} /></div>
                        </div>
                        <div className="pvpStatRow">
                          <span>Scheme Fit</span>
                          <div className="statBar"><div style={{ width: `${60 + (p.number % 14)}%` }} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {detailTab === "teams" && (
              <div className="inspectorCard">
                <div className="inspectorCardHeader">
                  <div className="miniTitle">Team vs Team</div>
                  <div className="miniBody">Run defense vs pass blocking, rush vs coverage, and more.</div>
                </div>
                <div className="teamCompare">
                  {TEAM_COMPARISON.map((m) => (
                    <div key={m.label} className="teamCompareRow">
                      <div className="teamCompareLabel">{m.label}</div>
                      <div className="teamMeter">
                        <div className="teamMeterFill left" style={{ width: `${m.left}%` }} />
                        <div className="teamMeterFill right" style={{ width: `${m.right}%` }} />
                        <div className="teamMeterCenter" />
                      </div>
                      <div className="teamCompareValues">
                        <span>{selectedPlayer.team}: {m.left}</span>
                        <span>Opponent: {m.right}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
