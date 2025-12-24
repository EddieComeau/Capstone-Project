// frontend/admin/src/components/SyncControls.js
import React, { useState } from 'react';
import { triggerSyncGames, triggerSyncPlayers, triggerComputeDerived } from '../api';

export default function SyncControls() {
  // Games state
  const [seasons, setSeasons] = useState('');
  const [perPageGames, setPerPageGames] = useState(100);
  const [historical, setHistorical] = useState(false);
  const [dryRunGames, setDryRunGames] = useState(true);
  const [maxPagesGames, setMaxPagesGames] = useState(500);
  const [gamesResult, setGamesResult] = useState(null);
  const [runningGames, setRunningGames] = useState(false);

  // Players state
  const [perPagePlayers, setPerPagePlayers] = useState(100);
  const [dryRunPlayers, setDryRunPlayers] = useState(true);
  const [playersResult, setPlayersResult] = useState(null);
  const [runningPlayers, setRunningPlayers] = useState(false);

  // Derived
  const [derivedSeason, setDerivedSeason] = useState('');
  const [derivedPerPage, setDerivedPerPage] = useState(100);
  const [dryRunDerived, setDryRunDerived] = useState(true);
  const [derivedResult, setDerivedResult] = useState(null);
  const [runningDerived, setRunningDerived] = useState(false);

  function parseSeasonsInput(str) {
    if (!str) return undefined;
    return str.split(',').map(s => s.trim()).filter(Boolean);
  }

  async function onSyncGames() {
    // If historical requested and not dryRun, ask a browser confirm
    if (historical && !dryRunGames) {
      // require explicit confirmation in UI
      const ok = window.confirm(
        'You are about to run a FULL historical sync which may fetch many pages and write lots of data. Type OK to proceed.'
      );
      if (!ok) return;
    }

    setRunningGames(true);
    setGamesResult(null);

    try {
      const payload = {
        seasons: parseSeasonsInput(seasons),
        per_page: Number(perPageGames || 100),
        historical: Boolean(historical),
        dryRun: Boolean(dryRunGames),
        maxPages: Number(maxPagesGames || 500)
      };
      const res = await triggerSyncGames(payload);
      setGamesResult(res);
    } catch (err) {
      console.error(err);
      setGamesResult({ ok: false, error: err.message || String(err) });
    } finally {
      setRunningGames(false);
    }
  }

  async function onSyncPlayers() {
    setRunningPlayers(true);
    setPlayersResult(null);
    try {
      const payload = { per_page: Number(perPagePlayers || 100), dryRun: Boolean(dryRunPlayers) };
      const res = await triggerSyncPlayers(payload);
      setPlayersResult(res);
    } catch (err) {
      console.error(err);
      setPlayersResult({ ok: false, error: err.message || String(err) });
    } finally {
      setRunningPlayers(false);
    }
  }

  async function onComputeDerived() {
    setRunningDerived(true);
    setDerivedResult(null);
    try {
      const payload = { season: derivedSeason ? Number(derivedSeason) : undefined, per_page: Number(derivedPerPage || 100), dryRun: Boolean(dryRunDerived) };
      const res = await triggerComputeDerived(payload);
      setDerivedResult(res);
    } catch (err) {
      console.error(err);
      setDerivedResult({ ok: false, error: err.message || String(err) });
    } finally {
      setRunningDerived(false);
    }
  }

  return (
    <div>
      <h2>Sync Controls</h2>

      <div style={{marginBottom:16}}>
        <div className="card">
          <h3>Games Sync</h3>

          <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
            <label>Seasons (comma separated, blank => last 2):</label>
            <input value={seasons} onChange={e => setSeasons(e.target.value)} style={{width:200}} />
            <label>Per page:</label>
            <input type="number" value={perPageGames} onChange={e => setPerPageGames(e.target.value)} style={{width:80}} />
            <label>Max pages:</label>
            <input type="number" value={maxPagesGames} onChange={e => setMaxPagesGames(e.target.value)} style={{width:80}} />
          </div>

          <div style={{marginTop:8, display:'flex', alignItems:'center', gap:12}}>
            <label><input type="checkbox" checked={historical} onChange={e => setHistorical(e.target.checked)} /> Historical</label>
            <label><input type="checkbox" checked={dryRunGames} onChange={e => setDryRunGames(e.target.checked)} /> Dry run</label>
            <button onClick={onSyncGames} disabled={runningGames}>{runningGames ? 'Running...' : 'Run Games Sync'}</button>
          </div>

          <div style={{marginTop:12}}>
            <strong>Result:</strong>
            <pre style={{whiteSpace:'pre-wrap', maxHeight:260, overflow:'auto', background:'#f7f9fc', padding:10}}>{gamesResult ? JSON.stringify(gamesResult, null, 2) : 'No result yet'}</pre>
          </div>
        </div>
      </div>

      <div style={{marginBottom:16}}>
        <div className="card">
          <h3>Players Sync</h3>

          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <label>Per page:</label>
            <input type="number" value={perPagePlayers} onChange={e => setPerPagePlayers(e.target.value)} style={{width:80}} />
            <label><input type="checkbox" checked={dryRunPlayers} onChange={e => setDryRunPlayers(e.target.checked)} /> Dry run</label>
            <button onClick={onSyncPlayers} disabled={runningPlayers}>{runningPlayers ? 'Running...' : 'Run Players Sync'}</button>
          </div>

          <div style={{marginTop:12}}>
            <strong>Result:</strong>
            <pre style={{whiteSpace:'pre-wrap', maxHeight:160, overflow:'auto', background:'#f7f9fc', padding:10}}>{playersResult ? JSON.stringify(playersResult, null, 2) : 'No result yet'}</pre>
          </div>
        </div>
      </div>

      <div style={{marginBottom:16}}>
        <div className="card">
          <h3>Derived Compute</h3>

          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <label>Season (optional):</label>
            <input value={derivedSeason} onChange={e => setDerivedSeason(e.target.value)} style={{width:120}} />
            <label>Per page:</label>
            <input type="number" value={derivedPerPage} onChange={e => setDerivedPerPage(e.target.value)} style={{width:80}} />
            <label><input type="checkbox" checked={dryRunDerived} onChange={e => setDryRunDerived(e.target.checked)} /> Dry run</label>
            <button onClick={onComputeDerived} disabled={runningDerived}>{runningDerived ? 'Running...' : 'Run Derived Compute'}</button>
          </div>

          <div style={{marginTop:12}}>
            <strong>Result:</strong>
            <pre style={{whiteSpace:'pre-wrap', maxHeight:200, overflow:'auto', background:'#f7f9fc', padding:10}}>{derivedResult ? JSON.stringify(derivedResult, null, 2) : 'No result yet'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
