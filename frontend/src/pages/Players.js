import React, { useEffect, useState } from 'react';
import { fetchPlayers } from '../api';

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchPlayers({ per_page: 100 });
      const data = res.data || res.rows || res.players || res;
      const arr = Array.isArray(data) ? data : (data.data || []);
      setPlayers(arr);
    } catch (err) {
      console.error(err);
      alert('Failed to load players');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>Players</h2>
      <div className="card">
        <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Reload'}</button>
        <table style={{marginTop:12}}>
          <thead><tr><th>ID</th><th>Name</th><th>Position</th><th>Team</th></tr></thead>
          <tbody>
            {players.map(p => (
              <tr key={p.PlayerID || p.bdlId || p.id}>
                <td>{p.PlayerID || p.bdlId || p.id}</td>
                <td>{p.full_name || `${p.first_name} ${p.last_name}`}</td>
                <td>{p.position}</td>
                <td>{p.team?.abbreviation || p.team}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
