import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { getDefaultSeason } from "../utils/season";

const STAT_FIELDS = [
  { key: "passing_yards", label: "Pass Yards" },
  { key: "passing_tds", label: "Pass TDs" },
  { key: "interceptions", label: "INTs" },
  { key: "rushing_yards", label: "Rush Yards" },
  { key: "rushing_tds", label: "Rush TDs" },
  { key: "receiving_yards", label: "Rec Yards" },
  { key: "receiving_tds", label: "Rec TDs" },
  { key: "receptions", label: "Receptions" },
  { key: "tackles", label: "Tackles" },
  { key: "sacks", label: "Sacks" },
];

const ADVANCED_FIELDS = {
  qb: [
    { key: "passer_rating", label: "Passer Rating" },
    { key: "qbr", label: "QBR" },
    { key: "completion_pct", label: "Completion %" },
    { key: "yards_per_attempt", label: "Yds/Att" },
    { key: "passing_yards_per_game", label: "Pass Yds/G" },
    { key: "passing_attempts", label: "Pass Att" },
    { key: "rushing_attempts", label: "Rush Att" },
    { key: "yards_per_carry", label: "Rush Yds/Att" },
  ],
  rb: [
    { key: "rushing_attempts", label: "Rush Att" },
    { key: "yards_per_carry", label: "Yds/Carry" },
    { key: "rushing_yards_per_game", label: "Rush Yds/G" },
    { key: "catch_rate", label: "Catch %" },
    { key: "receiving_targets", label: "Targets" },
  ],
  wr: [
    { key: "receiving_targets", label: "Targets" },
    { key: "catch_rate", label: "Catch %" },
    { key: "yards_per_target", label: "Yds/Target" },
    { key: "yards_per_reception", label: "Yds/Rec" },
    { key: "receiving_yards_per_game", label: "Rec Yds/G" },
  ],
  def: [
    { key: "tackles_per_game", label: "Tackles/G" },
    { key: "sacks_per_game", label: "Sacks/G" },
    { key: "interceptions_per_game", label: "INT/G" },
    { key: "qb_hits", label: "QB Hits" },
    { key: "tackles_for_loss", label: "TFL" },
    { key: "passes_defended", label: "Passes Def" },
    { key: "forced_fumbles", label: "Forced Fumbles" },
    { key: "fumbles_recovered", label: "Fum Rec" },
  ],
  ol: [
    { key: "sacks_allowed", label: "Sacks Allowed" },
    { key: "pressures_allowed", label: "Pressures" },
    { key: "ol_rating", label: "OL Rating" },
  ],
  other: [
    { key: "yards_per_carry", label: "Yds/Carry" },
    { key: "yards_per_target", label: "Yds/Target" },
    { key: "catch_rate", label: "Catch %" },
  ],
};

function safeDivide(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function computePasserRating(stats) {
  if (!stats) return 0;
  const attempts = stats.passing_attempts || 0;
  const completions = stats.passing_completions || 0;
  const passingYards = stats.passing_yards || 0;
  const passingTds = stats.passing_tds || 0;
  const interceptions = stats.interceptions || 0;
  if (!attempts) return 0;
  const completionRatio = completions / attempts;
  const a = Math.min(Math.max(((completionRatio * 100) - 30) / 20, 0), 2.375);
  const b = Math.min(Math.max(((passingYards / attempts) - 3) / 4, 0), 2.375);
  const c = Math.min(Math.max(((passingTds / attempts) * 20), 0), 2.375);
  const d = Math.min(Math.max(2.375 - ((interceptions / attempts) * 25), 0), 2.375);
  return Number((((a + b + c + d) / 6) * 100).toFixed(1));
}

function computeQbrApprox(stats, passerRating) {
  if (!stats) return 0;
  const passYds = stats.passing_yards || 0;
  const rushYds = stats.rushing_yards || 0;
  const passTds = stats.passing_tds || 0;
  const rushTds = stats.rushing_tds || 0;
  const ints = stats.interceptions || 0;
  const base = passerRating ? (passerRating / 158.3) * 100 : 0;
  const volume = passYds / 25 + rushYds / 10 + (passTds + rushTds) * 2.5 - ints * 3;
  const blended = base * 0.7 + volume * 0.3;
  return Math.max(0, Math.min(100, Math.round(blended)));
}

function buildDerivedAdvanced(position, totals, weeklyCount) {
  if (!totals) return {};
  const fallbackGames =
    totals.passing_yards || totals.rushing_yards || totals.receiving_yards ? 17 : 0;
  const games = totals.games || weeklyCount || fallbackGames;
  const passingAttempts = totals.passing_attempts || 0;
  const passingCompletions = totals.passing_completions || 0;
  const rushingAttempts = totals.rushing_attempts || 0;
  const receivingTargets = totals.receiving_targets || 0;
  const passerRating = computePasserRating(totals);

  return {
    passer_rating: totals.passer_rating || totals.qb_rating || passerRating || 0,
    qbr: totals.qbr || computeQbrApprox(totals, passerRating) || 0,
    completion_pct: safeDivide(passingCompletions, passingAttempts) * 100,
    yards_per_attempt: safeDivide(totals.passing_yards || 0, passingAttempts),
    passing_yards_per_game: safeDivide(totals.passing_yards || 0, games),
    rushing_yards_per_game: safeDivide(totals.rushing_yards || 0, games),
    yards_per_carry: safeDivide(totals.rushing_yards || 0, rushingAttempts),
    rushing_attempts: totals.rushing_attempts || 0,
    catch_rate: safeDivide(totals.receptions || 0, receivingTargets) * 100,
    yards_per_target: safeDivide(totals.receiving_yards || 0, receivingTargets),
    yards_per_reception: safeDivide(totals.receiving_yards || 0, totals.receptions || 0),
    receiving_yards_per_game: safeDivide(totals.receiving_yards || 0, games),
    tackles_per_game: safeDivide(totals.tackles || 0, games),
    sacks_per_game: safeDivide(totals.sacks || 0, games),
    interceptions_per_game: safeDivide(totals.interceptions || 0, games),
    qb_hits: totals.qb_hits || 0,
    tackles_for_loss: totals.tackles_for_loss || 0,
    passes_defended: totals.passes_defended || 0,
    forced_fumbles: totals.forced_fumbles || 0,
    fumbles_recovered: totals.fumbles_recovered || 0,
    sacks_allowed: totals.sacks_allowed || 0,
    pressures_allowed: totals.pressures_allowed || 0,
    ol_rating: totals.ol_rating || 0,
    passing_attempts: totals.passing_attempts || 0,
    receiving_targets: totals.receiving_targets || 0,
  };
}

function resolveAdvancedFields(position) {
  const pos = String(position || "").toUpperCase();
  if (pos.includes("QB") || pos.includes("QUARTERBACK")) return ADVANCED_FIELDS.qb;
  if (
    ["RB", "HB", "FB", "RUNNING BACK", "FULLBACK", "HALFBACK"].some((p) =>
      pos.includes(p)
    )
  )
    return ADVANCED_FIELDS.rb;
  if (["WR", "TE", "WIDE RECEIVER", "TIGHT END"].some((p) => pos.includes(p)))
    return ADVANCED_FIELDS.wr;
  if (
    ["OT", "OG", "C", "G", "T", "CENTER", "GUARD", "TACKLE", "OFFENSIVE LINE"].some(
      (p) => pos.includes(p)
    )
  )
    return ADVANCED_FIELDS.ol;
  if (["CB", "FS", "SS", "DB", "LB", "DE", "DT", "DL", "S"].some((p) => pos.includes(p)))
    return ADVANCED_FIELDS.def;
  return ADVANCED_FIELDS.other;
}

function resolvePrimaryStat(position) {
  const pos = String(position || "").toUpperCase();
  if (pos.includes("QB") || pos.includes("QUARTERBACK")) return "passing_yards";
  if (
    ["RB", "HB", "FB", "RUNNING BACK", "FULLBACK", "HALFBACK"].some((p) =>
      pos.includes(p)
    )
  )
    return "rushing_yards";
  if (["WR", "TE", "WIDE RECEIVER", "TIGHT END"].some((p) => pos.includes(p)))
    return "receiving_yards";
  return "tackles";
}

function formatStatValue(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  if (Number.isInteger(num)) return `${num}`;
  return num.toFixed(1);
}

export default function PlayerPage() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [season, setSeason] = useState(getDefaultSeason());
  const [totals, setTotals] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [advanced, setAdvanced] = useState(null);
  const [grade, setGrade] = useState(null);
  const [seasonRequested, setSeasonRequested] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const json = await apiGet(`/players/${id}`);
        if (json.ok) setPlayer(json.player);
      } catch (e) {
        console.warn("Error loading player", e);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    async function loadStats() {
      if (!id) return;
      try {
        setLoadingStats(true);
        const data = await apiGet(`/stats/player/${id}`, { season });
        setTotals(data?.totals || null);
        setWeekly(data?.weekly || []);
        const derived = buildDerivedAdvanced(
          player?.position || data?.player?.position,
          data?.totals || null,
          Array.isArray(data?.weekly) ? data.weekly.length : 0
        );
        const merged = { ...(derived || {}) };
        Object.entries(data?.advanced || {}).forEach(([key, value]) => {
          if (value == null || Number.isNaN(Number(value))) return;
          if (merged[key] == null || Number.isNaN(Number(merged[key])) || (merged[key] === 0 && value > 0)) {
            merged[key] = value;
          }
        });
        setAdvanced(merged);
        setGrade(data?.grade || null);
        setSeasonRequested(data?.season_requested ?? null);
        if (data?.season && data.season !== season) {
          setSeason(data.season);
        }
      } catch (e) {
        console.warn("Error loading player stats", e);
        setTotals(null);
        setWeekly([]);
        setAdvanced(null);
        setGrade(null);
        setSeasonRequested(null);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, [id, season]);

  const primaryKey = useMemo(
    () => resolvePrimaryStat(player?.position),
    [player?.position]
  );
  const graphData = useMemo(() => {
    const slice = weekly.slice(-6);
    const values = slice.map((row) => row[primaryKey] || 0);
    const maxVal = Math.max(...values, 1);
    return values.map((v, idx) => ({
      id: `${primaryKey}-${idx}`,
      value: v,
      pct: Math.round((v / maxVal) * 100),
      week: slice[idx]?.week ?? idx + 1,
    }));
  }, [weekly, primaryKey]);

  const advancedFields = useMemo(
    () => resolveAdvancedFields(player?.position),
    [player?.position]
  );

  return (
    <div style={{ padding: 16 }}>
      {player ? (
        <>
          <h2>
            {player.full_name} ({player.team_abbr})
          </h2>
          <p>Position: {player.position}</p>
          <p>Jersey: {player.jersey_number || "—"}</p>
          {grade?.value != null ? (
            <p>Position Grade: {Math.round(grade.value)} / 100</p>
          ) : null}
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              Season
              <input
                name="player-season"
                type="number"
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                style={{ width: 90 }}
              />
            </label>
            {seasonRequested != null && seasonRequested !== season ? (
              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                No regular-season data for {seasonRequested}; showing {season}.
              </div>
            ) : null}
          </div>
          <div style={{ marginTop: 16 }}>
            <h3>Season Stats</h3>
            {loadingStats ? (
              <div>Loading stats…</div>
            ) : totals ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                {STAT_FIELDS.map((field) => (
                  <div key={field.key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 12, color: "#666" }}>{field.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {formatStatValue(totals[field.key])}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>No stats available for this season.</div>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <h3>Advanced Metrics</h3>
            {loadingStats ? (
              <div>Loading advanced metrics…</div>
            ) : advanced ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                }}
              >
                {advancedFields.map((field) => (
                  <div key={field.key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 12, color: "#666" }}>{field.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {formatStatValue(advanced?.[field.key])}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>No advanced metrics available.</div>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <h3>Recent Weeks</h3>
            {graphData.length ? (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
                {graphData.map((bar) => (
                  <div key={bar.id} style={{ textAlign: "center", width: 40 }}>
                    <div
                      style={{
                        height: `${bar.pct}%`,
                        background: "#2b6cb0",
                        borderRadius: 6,
                      }}
                      title={`Week ${bar.week}: ${bar.value}`}
                    />
                    <div style={{ fontSize: 11, marginTop: 4 }}>W{bar.week}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>No weekly stats available.</div>
            )}
          </div>
        </>
      ) : (
        <p>Loading player...</p>
      )}
    </div>
  );
}
