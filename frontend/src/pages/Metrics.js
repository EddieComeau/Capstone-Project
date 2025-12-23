import React, { useState } from 'react';
import { fetchMetrics } from '../api';

export default function Metrics() {
  const [entityType, setEntityType] = useState('team');
  const [entityId, setEntityId] = useState('');
  const [season, setSeason] = useState('');
  const [result, setResult] = useState(null);

  async function load() {
    if (!entityId) return alert('Provide entityId');
    try {
      const res = await fetchMetrics(entityType, entityId, season || undefined);
      setResult(res);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch metrics');
    }
  }

  return (
    <div>
      <h2>Metrics Explorer</h2>
      <div className="card">
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <select value={entityType} onChange={e => setEntityType(e.target.value)}>
            <option value="team">Team</option>
            <option value="player">Player</option>
          </select>
          <input placeholder="entityId" value={entityId} onChange={e => setEntityId(e.target.value)} />
          <input placeholder="season (optional)" value={season} onChange={e => setSeason(e.target.value)} />
          <button onClick={load}>Load</button>
        </div>
        <div style={{marginTop:12}}>
          {result ? <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(result, null, 2)}</pre> : <div>Metrics will appear here</div>}
        </div>
      </div>
    </div>
  );
}
