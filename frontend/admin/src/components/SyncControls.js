// frontend/admin/src/components/SyncControls.js
import React, { useState, useRef } from 'react';
import { triggerSyncGames, triggerSyncPlayers, triggerComputeDerived } from '../api';

export default function SyncControls() {
  const [seasons, setSeasons] = useState('');
  const [perPageGames, setPerPageGames] = useState(100);
  const [historical, setHistorical] = useState(false);
  const [background, setBackground] = useState(false);
  const [dryRunGames, setDryRunGames] = useState(true);
  const [maxPagesGames, setMaxPagesGames] = useState(500);
  const [gamesResult, setGamesResult] = useState(null);
  const [runningGames, setRunningGames] = useState(false);

  const eventSourceRef = useRef(null);
  const [events, setEvents] = useState([]);

  const [perPagePlayers, setPerPagePlayers] = useState(100);
  const [dryRunPlayers, setDryRunPlayers] = useState(true);
  const [playersResult, setPlayersResult] = useState(null);
  const [runningPlayers, setRunningPlayers] = useState(false);

  const [derivedSeason, setDerivedSeason] = useState('');
  const [derivedPerPage, setDerivedPerPage] = useState(100);
  const [dryRunDerived, setDryRunDerived] = useState(true);
  const [derivedResult, setDerivedResult] = useState(null);
  const [runningDerived, setRunningDerived] = useState(false);

  function addEvent(ev) {
    setEvents(prev => {
      const next = [...prev, ev];
      return next.slice(-200); // keep last 200
    });
  }

  function openStream(jobId) {
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch (e) {}
      eventSourceRef.current = null;
    }
    const url = `${process.env.REACT_APP_API_BASE || ''}/api/sync/stream/${jobId}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    es.addEventListener('progress', (e) => {
      const d = JSON.parse(e.data);
      addEvent({ type: 'progress', payload: d });
    });
    es.addEventListener('complete', (e) => {
      const d = JSON.parse(e.data);
      addEvent({ type: 'complete', payload: d });
      setGamesResult({ ok: true, result: d });
      es.close();
      eventSourceRef.current = null;
      setRunningGames(false);
    });
    es.addEventListener('error', (e) => {
      // e.data may not be present
      try {
        const d = JSON.parse(e.data || '{}');
        addEvent({ type: 'error', payload: d });
      } catch(_) {
        addEvent({ type: 'error', payload: { msg: 'Unknown error' }});
      }
      es.close();
      eventSourceRef.current = null;
      setRunningGames(false);
    });
    es.addEventListener('done', (e) => {
      addEvent({ type: 'done' });
      try { es.close(); } catch(_) {}
      eventSourceRef.current = null;
      setRunningGames(false);
    });
  }

  async function onSyncGames() {
    if (historical && !dryRunGames) {
      const ok = window.confirm('You are about to run a FULL historical sync. Are you sure?');
      if (!ok) return;
    }
    setRunningGames(true);
    setGamesResult(null);
    setEvents([]);

    const payload = {
      seasons: seasons ? seasons.split(',').map(s=> s.trim()) : undefined,
      per_page: Number(perPageGames || 100),
      historical: Boolean(historical),
      dryRun: Boolean(dryRunGames),
      maxPages: Number(maxPagesGames || 500),
      background: Boolean(background)
    };

    try {
      const res = await triggerSyncGames(payload);
      if (background) {
        if (res && res.jobId) {
          addEvent({ type: 'jobStarted', payload: { jobId: res.jobId }});
          openStream(res.jobId);
        } else {
          addEvent({ type: 'error', payload: { msg: 'No jobId returned' }});
          setRunningGames(false);
        }
      } else {
        setGamesResult(res);
        setRunningGames(false);
      }
    } catch (err) {
      console.error(err);
      addEvent({ type: 'error', payload: { msg: err.message || String(err) }});
      setRunningGames(false);
    }
  }

  async function onSyncPlayers() {
    setRunningPlayers(true);
    setPlayersResult(null);
    try {
      const payload = { per_page: Number(perPagePlayers || 100), dryRun: Boolean(dryRunPlayers), background: false };
      const res = await triggerSyncPlayers(payload);
      setPlayersResult(res);
    } catch (err) {
      console.error(err);
      setPlayersResult({ ok:false, error: err.message || String(err) });
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
      setDerivedResult({ ok:false, error: err.message || String(err) });
    } finally {
      setRunningDerived(false);
    }
  }

  return (
    <div>
      <h2>Sync Controls</h2>

      <div className="card" style={{marginBottom:12}}>
        <h3>Games Sync</h3>
        <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'}}>
          <label>Seasons:</label>
          <input value={seasons} onChange={e=>setSeasons(e.target.value)} style={{width:180}} placeholder="2023,2024" />
          <label>Per page:</label>
          <input type="number" value={perPageGames} onChange={e=>setPerPageGames(e.target.value)} style={{width:80}} />
          <label>Max pages:</label>
          <input type="number" value={maxPagesGames} onChange={e=>setMaxPagesGames(e.target.value)} style={{width:80}} />
          <label><input type="checkbox" checked={historical} onChange={e=>setHistorical(e.target.checked)} /> Historical</label>
          <label><input type="checkbox" checked={background} onChange={e=>setBackground(e.target.checked)} /> Background</label>
          <label><input type="checkbox" checked={dryRunGames} onChange={e=>setDryRunGames(e.target.checked)} /> Dry run</label>
          <button onClick={onSyncGames} disabled={runningGames}>{runningGames ? 'Running...' : 'Run Games Sync'}</button>
        </div>

        <div style={{marginTop:12}}>
          <strong>Events:</strong>
          <div style={{maxHeight:260, overflow:'auto', background:'#f7f9fc', padding:8}}>
            {events.length === 0 ? <div>No events yet</div> : events.map((ev,i) => <div key={i} style={{fontFamily:'monospace', fontSize:13}}>[{ev.type}] {JSON.stringify(ev.payload)}</div>)}
          </div>
        </div>

        <div style={{marginTop:8}}>
          <strong>Result:</strong>
          <pre style={{whiteSpace:'pre-wrap', background:'#fff', padding:8, maxHeight:200, overflow:'auto'}}>{gamesResult ? JSON.stringify(gamesResult, null, 2) : 'No synchronous result yet'}</pre>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3>Players Sync</h3>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <label>Per page:</label>
          <input type="number" value={perPagePlayers} onChange={e => setPerPagePlayers(e.target.value)} style={{width:80}} />
          <label><input type="checkbox" checked={dryRunPlayers} onChange={e => setDryRunPlayers(e.target.checked)} /> Dry run</label>
          <button onClick={onSyncPlayers} disabled={runningPlayers}>{runningPlayers ? 'Running...' : 'Run Players Sync'}</button>
        </div>
        <div style={{marginTop:8}}>
          <pre style={{whiteSpace:'pre-wrap', maxHeight:160, overflow:'auto', background:'#f7f9fc', padding:8}}>{playersResult ? JSON.stringify(playersResult, null, 2) : 'No result yet'}</pre>
        </div>
      </div>

      <div className="card">
        <h3>Derived Compute</h3>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <label>Season:</label>
          <input value={derivedSeason} onChange={e => setDerivedSeason(e.target.value)} style={{width:120}} />
          <label>Per page:</label>
          <input type="number" value={derivedPerPage} onChange={e => setDerivedPerPage(e.target.value)} style={{width:80}} />
          <label><input type="checkbox" checked={dryRunDerived} onChange={e => setDryRunDerived(e.target.checked)} /> Dry run</label>
          <button onClick={onComputeDerived} disabled={runningDerived}>{runningDerived ? 'Running...' : 'Run Derived Compute'}</button>
        </div>
        <div style={{marginTop:8}}>
          <pre style={{whiteSpace:'pre-wrap', maxHeight:160, overflow:'auto', background:'#f7f9fc', padding:8}}>{derivedResult ? JSON.stringify(derivedResult, null, 2) : 'No result yet'}</pre>
        </div>
      </div>
    </div>
  );
}
