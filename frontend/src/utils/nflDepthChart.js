// FRONTEND (React/Vite) — Convert BALLDONTLIE roster rows -> your simplified depth chart slots

function safeInt(v) {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  
  export function normalizeRosterRow(row, fallbackTeamAbbr) {
    const p = row?.player || {};
    const teamAbbr = p?.team?.abbreviation || fallbackTeamAbbr || "";
  
    return {
      id: p.id ?? row?.player_id ?? null,
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      pos: p.position_abbreviation || row?.position || "",
      team: teamAbbr,
      number: safeInt(p.jersey_number),
      // NOTE: BALLDONTLIE NFL player objects shown in docs do NOT include a headshot field :contentReference[oaicite:2]{index=2}
      // We still support these keys if they ever appear or if you enrich server-side later:
      headshotUrl: p.headshot_url || p.image_url || p.headshotUrl || null,
    };
  }
  
  function pick(rows, position, depth = 1) {
    return rows.find((r) => r.position === position && r.depth === depth);
  }
  
  function pickFirst(rows, positions) {
    for (const pos of positions) {
      const r = rows.find((x) => x.position === pos && x.depth === 1);
      if (r) return r;
    }
    return null;
  }
  
  function pickMany(rows, position, depths) {
    return depths.map((d) => pick(rows, position, d)).filter(Boolean);
  }
  
  export function buildDepthChartsFromRoster(rosterRows, teamAbbr) {
    // roster rows include: position, depth, player { first_name, last_name, position_abbreviation, jersey_number, ... } :contentReference[oaicite:3]{index=3}
    const rows = (rosterRows || [])
      .map((r) => ({
        ...r,
        position: r.position || r.player?.position_abbreviation || "",
        depth: Number(r.depth || 0),
        _n: normalizeRosterRow(r, teamAbbr),
      }))
      .filter((r) => r.position && r.depth);
  
    const offense = {};
    offense.LT = pick(rows, "LT", 1)?._n || null;
    offense.LG = pick(rows, "LG", 1)?._n || null;
    offense.C = pickFirst(rows, ["C"])?._n || null;
    offense.RG = pick(rows, "RG", 1)?._n || null;
    offense.RT = pick(rows, "RT", 1)?._n || null;
    offense.TE = pick(rows, "TE", 1)?._n || null;
  
    offense.QB = pick(rows, "QB", 1)?._n || null;
    offense.HB = pickFirst(rows, ["HB", "RB"])?._n || null;
    offense.FB = pick(rows, "FB", 1)?._n || null;
  
    const wrs = pickMany(rows, "WR", [1, 2]).map((x) => x._n);
    offense.WR1 = wrs[0] || null;
    offense.WR2 = wrs[1] || null;
  
    const defense = {};
    const cbs = pickMany(rows, "CB", [1, 2]).map((x) => x._n);
    defense.CB1 = cbs[0] || null;
    defense.CB2 = cbs[1] || null;
  
    defense.FS = pickFirst(rows, ["FS"])?._n || null;
    defense.SS = pickFirst(rows, ["SS"])?._n || null;
  
    // LBs can be OLB/MLB/ILB or just LB depending on depth chart formatting
    defense.OLB = pickFirst(rows, ["OLB", "LB"])?._n || null;
    defense.MLB = pickFirst(rows, ["MLB", "LB"])?._n || null;
    defense.ILB = pickFirst(rows, ["ILB", "LB"])?._n || null;
  
    const des = pickMany(rows, "DE", [1, 2]).map((x) => x._n);
    defense.DE1 = des[0] || null;
    defense.DE2 = des[1] || null;
  
    const dts = pickMany(rows, "DT", [1, 2]).map((x) => x._n);
    defense.DT1 = dts[0] || null;
    defense.DT2 = dts[1] || null;
  
    const specialTeams = {};
    specialTeams.K = pick(rows, "K", 1)?._n || null;
    specialTeams.P = pick(rows, "P", 1)?._n || null;
    specialTeams.LS = pick(rows, "LS", 1)?._n || null;
    specialTeams.KR = pick(rows, "KR", 1)?._n || null;
    specialTeams.PR = pick(rows, "PR", 1)?._n || null;
  
    return { offense, defense, specialTeams };
  }
  