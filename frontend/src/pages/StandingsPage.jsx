import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { getDefaultSeason } from "../utils/season";
import "./StandingsPage.css";

export default function StandingsPage() {
  const [season, setSeason] = useState(getDefaultSeason());
  const currentYear = new Date().getFullYear();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [loadingTeamStats, setLoadingTeamStats] = useState(false);
  const [seasonRequested, setSeasonRequested] = useState(null);
  const [teamRanks, setTeamRanks] = useState(null);
  const [defenseStatsByTeam, setDefenseStatsByTeam] = useState({});
  const [defenseRanksByTeam, setDefenseRanksByTeam] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet(`/standings/${season}`);
        if (cancelled) return;
        const list = normalizeStandings(data);
        setRows(list);
        setSelectedTeam(list[0] || null);
        setSeasonRequested(data?.season_requested ?? null);
        if (data?.season && data.season !== season) {
          setSeason(data.season);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError("Unable to load standings from the database.");
          setRows([]);
          setSelectedTeam(null);
          setSeasonRequested(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [season]);

  useEffect(() => {
    let cancelled = false;
    async function loadTeamStats() {
      const abbr =
        selectedTeam?.team?.abbreviation ||
        selectedTeam?.team?.abbr ||
        selectedTeam?.abbreviation;
      if (!abbr) {
        setTeamStats(null);
        return;
      }
      try {
        setLoadingTeamStats(true);
        const stats = await apiGet(`/stats/team/${abbr}`, { season });
        if (!cancelled) {
          setTeamStats(stats);
        }
      } catch (e) {
        if (!cancelled) {
          setTeamStats(null);
        }
      } finally {
        if (!cancelled) setLoadingTeamStats(false);
      }
    }
    loadTeamStats();
    return () => {
      cancelled = true;
    };
  }, [selectedTeam, season]);

  useEffect(() => {
    let cancelled = false;
    async function loadTeamRanks() {
      try {
        const teams = await apiGet("/teams/db");
        const results = await Promise.all(
          (teams || []).map(async (team) => {
            try {
              const data = await apiGet(`/stats/team/${team.abbreviation}`, { season });
              return {
                abbr: team.abbreviation,
                points: data?.per_game?.points ?? null,
                passing_yards: data?.per_game?.passing_yards ?? null,
                rushing_yards: data?.per_game?.rushing_yards ?? null,
                total_yards: data?.per_game?.total_yards ?? null,
                total_tds: data?.per_game?.total_tds ?? null,
              };
            } catch (err) {
              return {
                abbr: team.abbreviation,
                points: null,
                passing_yards: null,
                rushing_yards: null,
                total_yards: null,
                total_tds: null,
              };
            }
          })
        );

        const buildRankMap = (key) => {
          const list = results
            .filter((row) => row[key] != null && row.abbr)
            .sort((a, b) => (b[key] || 0) - (a[key] || 0));
          const map = new Map();
          list.forEach((row, idx) => {
            map.set(row.abbr, idx + 1);
          });
          return map;
        };

        if (!cancelled) {
          setTeamRanks({
            points: buildRankMap("points"),
            passing_yards: buildRankMap("passing_yards"),
            rushing_yards: buildRankMap("rushing_yards"),
            total_yards: buildRankMap("total_yards"),
            total_tds: buildRankMap("total_tds"),
          });
        }
      } catch (err) {
        if (!cancelled) setTeamRanks(null);
      }
    }
    loadTeamRanks();
    return () => {
      cancelled = true;
    };
  }, [season]);

  useEffect(() => {
    let cancelled = false;
    async function loadDefenseStats() {
      try {
        const data = await apiGet("/stats/teams/defense", { season });
        const list = Array.isArray(data?.results) ? data.results : [];
        const byTeam = {};
        const ranks = {};
        list.forEach((row) => {
          if (!row?.team_abbr) return;
          byTeam[row.team_abbr] = row.defense_per_game || {};
          ranks[row.team_abbr] = row.defense_ranks || {};
        });
        if (!cancelled) {
          setDefenseStatsByTeam(byTeam);
          setDefenseRanksByTeam(ranks);
        }
      } catch (err) {
        if (!cancelled) {
          setDefenseStatsByTeam({});
          setDefenseRanksByTeam({});
        }
      }
    }
    loadDefenseStats();
    return () => {
      cancelled = true;
    };
  }, [season]);

  const playoffSeeds = useMemo(() => buildPlayoffSeeds(rows), [rows]);

  const nonPlayoffRanks = useMemo(() => buildNonPlayoffRanks(rows, playoffSeeds), [rows, playoffSeeds]);

  const grouped = useMemo(() => {
    const divs = {};
    rows.forEach((r) => {
      const key = formatDivisionLabel(r) || r.conference || "League";
      if (!divs[key]) divs[key] = [];
      divs[key].push(r);
    });
    Object.keys(divs).forEach((key) => {
      divs[key] = divs[key].slice().sort((a, b) => {
        const aSeed = playoffSeeds.get(getTeamAbbr(a));
        const bSeed = playoffSeeds.get(getTeamAbbr(b));
        if (aSeed && bSeed) return aSeed - bSeed;
        if (aSeed && !bSeed) return -1;
        if (!aSeed && bSeed) return 1;
        const aRank = nonPlayoffRanks.get(getTeamAbbr(a));
        const bRank = nonPlayoffRanks.get(getTeamAbbr(b));
        if (aRank && bRank) return aRank - bRank;
        return compareTeams(a, b);
      });
    });
    return divs;
  }, [rows, playoffSeeds, nonPlayoffRanks]);

  const playoffTeams = useMemo(() => {
    const qualifiers = new Set();
    playoffSeeds.forEach((seed, abbr) => {
      if (seed >= 1 && seed <= 7) qualifiers.add(abbr);
    });
    return qualifiers;
  }, [playoffSeeds]);

  const pointsPerGame = useMemo(() => {
    if (!selectedTeam) return null;
    const games =
      (selectedTeam.wins || 0) +
      (selectedTeam.losses || 0) +
      (selectedTeam.ties || 0);
    const pointsFor =
      selectedTeam.points_for ??
      selectedTeam.pointsFor ??
      selectedTeam.points_for_total ??
      null;
    if (pointsFor != null && games > 0) {
      return pointsFor / games;
    }
    return teamStats?.per_game?.points ?? null;
  }, [selectedTeam, teamStats]);

  const passYardsPerGame = teamStats?.per_game?.passing_yards ?? null;
  const rushYardsPerGame = teamStats?.per_game?.rushing_yards ?? null;
  const selectedAbbr =
    selectedTeam?.team?.abbreviation ||
    selectedTeam?.team?.abbr ||
    selectedTeam?.abbreviation ||
    null;
  const pointsRank = selectedAbbr ? teamRanks?.points?.get(selectedAbbr) : null;
  const passRank = selectedAbbr ? teamRanks?.passing_yards?.get(selectedAbbr) : null;
  const rushRank = selectedAbbr ? teamRanks?.rushing_yards?.get(selectedAbbr) : null;
  const totalRank = selectedAbbr ? teamRanks?.total_yards?.get(selectedAbbr) : null;
  const totalTdsRank = selectedAbbr ? teamRanks?.total_tds?.get(selectedAbbr) : null;
  const defenseStats = selectedAbbr ? defenseStatsByTeam[selectedAbbr] : null;
  const defenseRanks = selectedAbbr ? defenseRanksByTeam[selectedAbbr] : null;
  const pointsAllowedPerGame = defenseStats?.points_allowed ?? null;
  const passYardsAllowedPerGame = defenseStats?.pass_yards_against ?? null;
  const rushYardsAllowedPerGame = defenseStats?.rush_yards_against ?? null;
  const totalYardsAllowedPerGame = defenseStats?.total_yards_against ?? null;
  const touchdownsAllowedPerGame = defenseStats?.touchdowns_allowed ?? null;
  const totalYardsPerGame = teamStats?.per_game?.total_yards ?? null;
  const totalTdsPerGame = teamStats?.per_game?.total_tds ?? null;
  const pointsAllowedRank = defenseRanks?.points_allowed ?? null;
  const passAllowedRank = defenseRanks?.pass_yards_against ?? null;
  const rushAllowedRank = defenseRanks?.rush_yards_against ?? null;
  const totalAllowedRank = defenseRanks?.total_yards_against ?? null;
  const tdsAllowedRank = defenseRanks?.touchdowns_allowed ?? null;

  return (
    <div className="standingsWrap">
      <div className="standingsHeader">
        <div>
          <h1>Standings</h1>
          <p>Tap a team to inspect team-wide stats and rankings.</p>
        </div>
        <label className="seasonPicker">
          Season
          <input
            name="standings-season"
            type="number"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            min={2010}
            max={currentYear + 1}
          />
        </label>
      </div>

      {loading ? <div className="standingsNotice">Loading standings…</div> : null}
      {error ? <div className="standingsError">{error}</div> : null}
      {seasonRequested != null && seasonRequested !== season ? (
        <div className="standingsNotice">
          No standings for {seasonRequested}; showing {season}.
        </div>
      ) : null}

      <div className="standingsGrid">
        {Object.entries(grouped).map(([group, teams]) => (
          <div key={group} className="standingsCard">
            <div className="standingsCardHead">{group}</div>
            <div className="standingsTable" role="list">
              {teams.map((t) => (
                <button
                  key={`${t.team_id || t.team?.id || t.name}`}
                  className={`standingsRow ${
                    selectedTeam?.team_id === t.team_id ||
                    selectedTeam?.team?.id === t.team?.id ||
                    selectedTeam?.name === t.name
                      ? "active"
                      : ""
                  }`}
                  onClick={() => setSelectedTeam(t)}
                  type="button"
                >
                  <span className="teamName">
                    {t.team?.full_name || t.team?.name || t.name || "Team"}
                  </span>
                  <span className="record">{t.record || formatRecord(t)}</span>
                  <span className="rank">{formatSeedLabel(t, playoffSeeds, nonPlayoffRanks)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedTeam ? (
        <div className="teamDetail">
          <div className="teamDetailHead">
            <div>
              <div className="muted">Selected team</div>
              <h2>{selectedTeam.team?.full_name || selectedTeam.name}</h2>
            </div>
            <div className="pill">{formatDivisionLabel(selectedTeam) || selectedTeam.conference || selectedTeam.division}</div>
          </div>
          {selectedTeam ? (
            playoffTeams.has(selectedTeam.team?.abbreviation || selectedTeam.abbreviation) ? (
              <div className="standingsNotice">Playoffs: Qualified.</div>
            ) : (
              <div className="standingsNotice">Playoffs: Did not qualify.</div>
            )
          ) : null}
          <div className="teamMetrics">
            <Metric label="Record" value={selectedTeam.record || formatRecord(selectedTeam)} />
            <Metric label="Point Diff" value={selectedTeam.point_diff ?? selectedTeam.point_differential ?? "N/A"} />
            <Metric
              label="Streak"
              value={
                teamStats?.streak ||
                selectedTeam.streak ||
                selectedTeam.streak_description ||
                "-"
              }
            />
            <Metric
              label="Home"
              value={
                teamStats?.home_record ||
                selectedTeam.home_record ||
                selectedTeam.home ||
                "-"
              }
            />
            <Metric
              label="Away"
              value={
                teamStats?.away_record ||
                selectedTeam.away_record ||
                selectedTeam.away ||
                "-"
              }
            />
            <Metric
              label="Last 5"
              value={
                teamStats?.last_five ||
                selectedTeam.last_five ||
                selectedTeam.last_ten ||
                "-"
              }
            />
          </div>
          <div className="teamStatsPanel">
            <h3>Team stats</h3>
            {loadingTeamStats ? (
              <div className="standingsNotice">Loading team stats…</div>
            ) : teamStats?.totals ? (
              <>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Points per Game</span>
                    {pointsRank ? <span className="statRank">#{pointsRank}/32</span> : null}
                  </div>
                  <Bar value={pointsPerGame != null ? pointsPerGame * 2 : 0} display={pointsPerGame} />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Pass Yards per Game</span>
                    {passRank ? <span className="statRank">#{passRank}/32</span> : null}
                  </div>
                  <Bar
                    value={passYardsPerGame != null ? passYardsPerGame / 6 : 0}
                    color="var(--amber)"
                    display={passYardsPerGame}
                  />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Rush Yards per Game</span>
                    {rushRank ? <span className="statRank">#{rushRank}/32</span> : null}
                  </div>
                  <Bar
                    value={rushYardsPerGame != null ? rushYardsPerGame / 6 : 0}
                    color="var(--mint)"
                    display={rushYardsPerGame}
                  />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Total Yards per Game</span>
                    {totalRank ? <span className="statRank">#{totalRank}/32</span> : null}
                  </div>
                  <Bar
                    value={totalYardsPerGame != null ? totalYardsPerGame / 8 : 0}
                    color="var(--teal)"
                    display={totalYardsPerGame}
                  />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Touchdowns per Game</span>
                    {totalTdsRank ? <span className="statRank">#{totalTdsRank}/32</span> : null}
                  </div>
                  <Bar
                    value={totalTdsPerGame != null ? totalTdsPerGame * 10 : 0}
                    color="var(--amber)"
                    display={totalTdsPerGame}
                  />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Points Allowed per Game</span>
                    {pointsAllowedRank ? <span className="statRank">#{pointsAllowedRank}/32</span> : null}
                  </div>
                  <Bar
                    value={pointsAllowedPerGame != null ? pointsAllowedPerGame * 2 : 0}
                    color="var(--violet)"
                    display={pointsAllowedPerGame}
                  />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Pass Yards Allowed per Game</span>
                    {passAllowedRank ? <span className="statRank">#{passAllowedRank}/32</span> : null}
                  </div>
                  <Bar
                    value={passYardsAllowedPerGame != null ? passYardsAllowedPerGame / 6 : 0}
                    color="var(--amber)"
                    display={passYardsAllowedPerGame}
                  />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Rush Yards Allowed per Game</span>
                    {rushAllowedRank ? <span className="statRank">#{rushAllowedRank}/32</span> : null}
                  </div>
                  <Bar
                    value={rushYardsAllowedPerGame != null ? rushYardsAllowedPerGame / 6 : 0}
                    color="var(--mint)"
                    display={rushYardsAllowedPerGame}
                  />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Total Yards Allowed per Game</span>
                    {totalAllowedRank ? <span className="statRank">#{totalAllowedRank}/32</span> : null}
                  </div>
                  <Bar
                    value={totalYardsAllowedPerGame != null ? totalYardsAllowedPerGame / 8 : 0}
                    color="var(--teal)"
                    display={totalYardsAllowedPerGame}
                  />
                </div>
                <div className="statRow">
                  <div className="statLabel">
                    <span>Touchdowns Allowed per Game</span>
                    {tdsAllowedRank ? <span className="statRank">#{tdsAllowedRank}/32</span> : null}
                  </div>
                  <Bar
                    value={touchdownsAllowedPerGame != null ? touchdownsAllowedPerGame * 10 : 0}
                    color="var(--violet)"
                    display={touchdownsAllowedPerGame}
                  />
                </div>
              </>
            ) : (
              <div className="standingsNotice">No team stats available for this season.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div className="muted">{label}</div>
      <div className="metricValue">{value}</div>
    </div>
  );
}

function Bar({ value = 0, color, display, suffix }) {
  return (
    <div className="bar">
      <div className="barFill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      <span className="barValue">
        {display != null
          ? `${Math.round(display * 10) / 10}${suffix || ""}`
          : `${Math.round(value)}%`}
      </span>
    </div>
  );
}

function formatRecord(r) {
  if (!r) return "-";
  if (typeof r === "string") return r;
  const wins = r.wins ?? r.win ?? r.w ?? 0;
  const losses = r.losses ?? r.loss ?? r.l ?? 0;
  const ties = r.ties ?? r.t ?? 0;
  return `${wins}-${losses}${ties ? `-${ties}` : ""}`;
}

function normalizeStandings(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.standings)) return payload.standings;
  if (payload.standings && typeof payload.standings === "object") {
    return Object.values(payload.standings).flat();
  }
  return [];
}

function formatDivisionLabel(row) {
  if (!row) return null;
  const division = row.division || row.team?.division || null;
  const conference = row.conference || row.team?.conference || null;
  if (!division) return conference || null;
  const upper = String(division).toUpperCase();
  if (upper.includes("AFC") || upper.includes("NFC")) return division;
  if (conference) return `${conference} ${division}`;
  return division;
}

function getTeamAbbr(row) {
  return row?.team?.abbreviation || row?.team?.abbr || row?.abbreviation || null;
}

function compareTeams(a, b) {
  const aPct = a.win_pct ?? winPctFromRecord(a);
  const bPct = b.win_pct ?? winPctFromRecord(b);
  if (bPct !== aPct) return bPct - aPct;
  const aDiff = a.point_diff ?? a.point_differential ?? 0;
  const bDiff = b.point_diff ?? b.point_differential ?? 0;
  return bDiff - aDiff;
}

function winPctFromRecord(row) {
  const wins = row.wins ?? row.win ?? row.w ?? 0;
  const losses = row.losses ?? row.loss ?? row.l ?? 0;
  const ties = row.ties ?? row.t ?? 0;
  const total = wins + losses + ties;
  if (!total) return 0;
  return (wins + ties * 0.5) / total;
}

function buildPlayoffSeeds(rows) {
  const byConference = new Map();
  rows.forEach((row) => {
    const conf = row.conference || row.team?.conference || "League";
    if (!byConference.has(conf)) byConference.set(conf, []);
    byConference.get(conf).push(row);
  });

  const seeds = new Map();
  byConference.forEach((teams, conf) => {
    if (conf === "League") return;
    const byDivision = new Map();
    teams.forEach((team) => {
      const div = team.division || team.team?.division || "Division";
      if (!byDivision.has(div)) byDivision.set(div, []);
      byDivision.get(div).push(team);
    });

    const divisionWinners = [];
    byDivision.forEach((divTeams) => {
      const sorted = divTeams.slice().sort(compareTeams);
      if (sorted[0]) divisionWinners.push(sorted[0]);
    });

    divisionWinners
      .slice()
      .sort(compareTeams)
      .forEach((team, idx) => {
        const abbr = getTeamAbbr(team);
        if (abbr) seeds.set(abbr, idx + 1);
      });

    const remaining = teams.filter((team) => !seeds.has(getTeamAbbr(team)));
    remaining
      .slice()
      .sort(compareTeams)
      .slice(0, 3)
      .forEach((team, idx) => {
        const abbr = getTeamAbbr(team);
        if (abbr) seeds.set(abbr, idx + 5);
      });
  });

  return seeds;
}

function buildNonPlayoffRanks(rows, playoffSeeds) {
  const ranked = rows
    .filter((row) => !playoffSeeds.has(getTeamAbbr(row)))
    .slice()
    .sort(compareTeams);
  const map = new Map();
  ranked.forEach((team, idx) => {
    const abbr = getTeamAbbr(team);
    if (abbr) map.set(abbr, idx + 8);
  });
  return map;
}

function formatSeedLabel(team, playoffSeeds, nonPlayoffRanks) {
  const abbr = getTeamAbbr(team);
  if (!abbr) return "#-";
  const seed = playoffSeeds.get(abbr);
  if (seed) {
    const label = seed <= 4 ? "DIV" : "WC";
    return `#${seed} ${label}`;
  }
  const missSeed = nonPlayoffRanks.get(abbr);
  if (missSeed) return `#${missSeed} ELIM`;
  return "#-";
}
