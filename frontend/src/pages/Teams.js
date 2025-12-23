import React, { useEffect, useState } from 'react';
import { fetchTeams } from '../api';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchTeams();
      const data = res.data || res.teams || res;
      const arr = Array.isArray(data) ? data : (data.data || []);
      setTeams(arr);
    } catch (err) {
      console.error(err);
      alert('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h2>Teams</h2>
      <div className="card">
        <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Reload'}</button>
        <table style={{marginTop:12}}>
          <thead><tr><th>ID</th><th>Name</th><th>Abbrev</th></tr></thead>
          <tbody>
            {teams.map(t => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.full_name || t.name}</td>
                <td>{t.abbreviation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
