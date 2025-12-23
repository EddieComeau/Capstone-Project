import React, { useEffect, useState } from 'react';
import { fetchSyncStates, resetSyncState } from '../api';

export default function SyncState() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchSyncStates();
      if (res.ok) setStates(res.states || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load sync states');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onReset(key) {
    if (!window.confirm(`Reset cursor for ${key}?`)) return;
    await resetSyncState(key, null);
    load();
  }

  return (
    <div>
      <h2>SyncState Dashboard</h2>
      <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      <table>
        <thead><tr><th>Key</th><th>Cursor</th><th>Meta</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>
          {states.map(s => (
            <tr key={s.key}>
              <td>{s.key}</td>
              <td>{String(s.cursor)}</td>
              <td><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(s.meta || {}, null, 2)}</pre></td>
              <td>{new Date(s.updatedAt).toLocaleString()}</td>
              <td><button onClick={() => onReset(s.key)}>Reset</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
