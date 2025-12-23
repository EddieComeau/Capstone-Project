#!/usr/bin/env bash
set -euo pipefail

# Change this to your branch if necessary. If the branch doesn't exist, script will create it.
BRANCH="${1:-full-updated-project}"

echo "Using branch: $BRANCH"

# Ensure repo root
ROOT_DIR="$(pwd)"
echo "Repo root: $ROOT_DIR"

# Checkout or create branch
git fetch origin
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
fi

# Create directories
mkdir -p frontend/public frontend/src/components frontend/src/pages
mkdir -p frontend/admin/public frontend/admin/src/components

########################################
# PUBLIC FRONTEND - package and HTML
########################################

cat > frontend/package.json <<'JSON'
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "axios": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.1",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --env=jsdom",
    "eject": "react-scripts eject"
  }
}
JSON

cat > frontend/public/index.html <<'HTML'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>NFL Cards - Client</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
HTML

########################################
# PUBLIC FRONTEND - src files
########################################

cat > frontend/src/index.js <<'JS'
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
JS

cat > frontend/src/index.css <<'CSS'
body { font-family: Arial, sans-serif; margin: 0; background:#f5f7fb; color:#222; }
.header { background:#0b3d91; color:#fff; padding:16px; }
.container { max-width:1100px; margin:20px auto; padding:16px; }
nav a { margin-right:12px; color:#fff; text-decoration:none; }
.card { background:#fff; padding:12px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.06); margin-bottom:12px; }
table { width:100%; border-collapse:collapse; }
th, td { text-align:left; padding:8px; border-bottom:1px solid #eee; }
button { padding:6px 10px; background:#0b3d91; color:#fff; border:none; border-radius:4px; cursor:pointer; }
CSS

cat > frontend/src/api.js <<'JS'
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '';

export async function fetchPlayers(params = {}) {
  const res = await axios.get(`${API_BASE}/api/players`, { params });
  return res.data;
}

export async function fetchTeams() {
  const res = await axios.get(`${API_BASE}/api/teams`);
  return res.data;
}

export async function fetchMetrics(entityType, entityId, season) {
  const params = {};
  if (season) params.season = season;
  const res = await axios.get(`${API_BASE}/api/metrics/${entityType}/${entityId}`, { params });
  return res.data;
}

export async function fetchPlayer(playerId) {
  const res = await axios.get(`${API_BASE}/api/players/${playerId}`);
  return res.data;
}
JS

cat > frontend/src/components/Nav.js <<'JS'
import React from 'react';
import { Link } from 'react-router-dom';

export default function Nav() {
  return (
    <div className="header">
      <div className="container" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <Link to="/" style={{color:'#fff', fontWeight:700, textDecoration:'none'}}>NFL Cards</Link>
        </div>
        <nav>
          <Link to="/" style={{color:'#fff', marginRight:12}}>Home</Link>
          <Link to="/players" style={{color:'#fff', marginRight:12}}>Players</Link>
          <Link to="/teams" style={{color:'#fff', marginRight:12}}>Teams</Link>
          <Link to="/metrics" style={{color:'#fff'}}>Metrics</Link>
        </nav>
      </div>
    </div>
  );
}
JS

########################################
# PUBLIC PAGES
########################################

cat > frontend/src/pages/Home.js <<'JS'
import React from 'react';

export default function Home() {
  return (
    <div>
      <h2>Welcome to NFL Cards</h2>
      <p>Use the navigation to explore players, teams, and metrics.</p>
    </div>
  );
}
JS

cat > frontend/src/pages/Players.js <<'JS'
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
JS

cat > frontend/src/pages/Teams.js <<'JS'
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
JS

cat > frontend/src/pages/Metrics.js <<'JS'
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
JS

cat > frontend/src/App.js <<'JS'
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Home from './pages/Home';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Metrics from './pages/Metrics';

export default function App() {
  return (
    <>
      <Nav />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<Players />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/metrics" element={<Metrics />} />
        </Routes>
      </div>
    </>
  );
}
JS

########################################
# ADMIN FRONTEND
########################################

cat > frontend/admin/package.json <<'JSON'
{
  "name": "client-admin",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "axios": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --env=jsdom",
    "eject": "react-scripts eject"
  }
}
JSON

cat > frontend/admin/public/index.html <<'HTML'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Admin - SyncState & Notifications</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
HTML

cat > frontend/admin/src/index.js <<'JS'
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
JS

cat > frontend/admin/src/index.css <<'CSS'
body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background:#f4f6fb; }
.container { max-width:1100px; margin:16px auto; padding:16px; }
.header { display:flex; justify-content:space-between; align-items:center; background:#0b3d91; color:#fff; padding:12px 16px; border-radius:6px; }
.card { background:#fff; padding:12px; border-radius:6px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-top:12px; }
table { width:100%; border-collapse: collapse; }
th,td { border:1px solid #eee; padding:8px; text-align:left; }
button { padding:6px 10px; margin-left:6px; background:#0b3d91; color:#fff; border:none; border-radius:4px; cursor:pointer; }
CSS

cat > frontend/admin/src/api.js <<'JS'
import axios from 'axios';
const API_BASE = process.env.REACT_APP_API_BASE || '';

export function fetchSyncStates() {
  return axios.get(`${API_BASE}/api/syncstate`).then(r => r.data);
}
export function resetSyncState(key, cursor = null) {
  return axios.post(`${API_BASE}/api/syncstate/reset`, { key, cursor }).then(r => r.data);
}
export function listWebhooks() { return axios.get(`${API_BASE}/api/notifications/webhooks`).then(r => r.data); }
export function createWebhook(payload) { return axios.post(`${API_BASE}/api/notifications/webhooks`, payload).then(r => r.data); }
export function deleteWebhook(id) { return axios.delete(`${API_BASE}/api/notifications/webhooks/${id}`).then(r => r.data); }
export function listAlerts() { return axios.get(`${API_BASE}/api/notifications/alerts`).then(r => r.data); }
export function createAlert(payload) { return axios.post(`${API_BASE}/api/notifications/alerts`, payload).then(r => r.data); }
export function deleteAlert(id) { return axios.delete(`${API_BASE}/api/notifications/alerts/${id}`).then(r => r.data); }
JS

cat > frontend/admin/src/App.js <<'JS'
import React, { useState } from 'react';
import SyncState from './components/SyncState';
import Webhooks from './components/Webhooks';
import Alerts from './components/Alerts';

export default function App() {
  const [tab, setTab] = useState('syncstate');

  return (
    <div className="container">
      <div className="header">
        <h1>Admin Dashboard</h1>
        <div>
          <button onClick={() => setTab('syncstate')}>SyncState</button>
          <button onClick={() => setTab('webhooks')}>Webhooks</button>
          <button onClick={() => setTab('alerts')}>Alerts</button>
        </div>
      </div>

      <div className="card">
        {tab === 'syncstate' && <SyncState />}
        {tab === 'webhooks' && <Webhooks />}
        {tab === 'alerts' && <Alerts />}
      </div>
    </div>
  );
}
JS

cat > frontend/admin/src/components/SyncState.js <<'JS'
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
JS

cat > frontend/admin/src/components/Webhooks.js <<'JS'
import React, { useEffect, useState } from 'react';
import { listWebhooks, createWebhook, deleteWebhook } from '../api';

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('injury.update,metric.update');

  async function load() {
    try {
      const res = await listWebhooks();
      if (res.ok) setWebhooks(res.webhooks || []);
    } catch (err) { console.error(err); alert('Failed to fetch webhooks'); }
  }
  useEffect(() => { load(); }, []);

  async function onCreate() {
    if (!url) return alert('url required');
    const ev = events.split(',').map(e => e.trim()).filter(Boolean);
    const res = await createWebhook({ url, events: ev });
    if (res.ok) { setUrl(''); setEvents('injury.update,metric.update'); load(); }
  }

  async function onDelete(id) {
    if (!confirm('Delete webhook?')) return;
    await deleteWebhook(id);
    load();
  }

  return (
    <div>
      <h2>Webhooks</h2>
      <div>
        <input placeholder="Webhook URL" value={url} onChange={e=>setUrl(e.target.value)} style={{width:'400px'}} />
        <input placeholder="events (comma)" value={events} onChange={e=>setEvents(e.target.value)} style={{width:'300px', marginLeft:8}} />
        <button onClick={onCreate}>Create</button>
      </div>
      <table>
        <thead><tr><th>URL</th><th>Events</th><th>Active</th><th>LastStatus</th><th>Actions</th></tr></thead>
        <tbody>
          {webhooks.map(w => (
            <tr key={w._id}>
              <td>{w.url}</td>
              <td>{(w.events||[]).join(', ')}</td>
              <td>{String(w.active)}</td>
              <td><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(w.lastStatus || {}, null, 2)}</pre></td>
              <td><button onClick={()=>onDelete(w._id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
JS

cat > frontend/admin/src/components/Alerts.js <<'JS'
import React, { useEffect, useState } from 'react';
import { listAlerts, createAlert, deleteAlert } from '../api';
import { listWebhooks } from '../api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [form, setForm] = useState({ name:'', entityType:'player', entityId:'', metric:'passer_rating', operator:'gt', value:'95', webhookId:'' });

  async function load() {
    try {
      const [a, w] = await Promise.all([listAlerts(), listWebhooks()]);
      if (a.ok) setAlerts(a.alerts || []);
      if (w.ok) setWebhooks(w.webhooks || []);
    } catch (err) { console.error(err); alert('Failed to load alerts'); }
  }

  useEffect(() => { load(); }, []);

  async function onCreate() {
    const payload = { ...form, value: Number(form.value) };
    const res = await createAlert(payload);
    if (res.ok) { setForm({ name:'', entityType:'player', entityId:'', metric:'passer_rating', operator:'gt', value:'95', webhookId:'' }); load(); }
  }

  async function onDelete(id) {
    if (!confirm('Delete alert?')) return;
    await deleteAlert(id);
    load();
  }

  return (
    <div>
      <h2>Alerts</h2>
      <div style={{marginBottom:12}}>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <select value={form.entityType} onChange={e=>setForm({...form, entityType:e.target.value})} style={{marginLeft:8}}>
          <option value="player">player</option><option value="team">team</option>
        </select>
        <input placeholder="entityId" value={form.entityId} onChange={e=>setForm({...form, entityId:e.target.value})} style={{width:80, marginLeft:8}} />
        <input placeholder="metric" value={form.metric} onChange={e=>setForm({...form, metric:e.target.value})} style={{marginLeft:8}} />
        <select value={form.operator} onChange={e=>setForm({...form, operator:e.target.value})} style={{marginLeft:8}}>
          <option value="gt">gt</option><option value="gte">gte</option><option value="lt">lt</option><option value="lte">lte</option><option value="eq">eq</option>
        </select>
        <input placeholder="value" value={form.value} onChange={e=>setForm({...form, value:e.target.value})} style={{width:80, marginLeft:8}} />
        <select value={form.webhookId} onChange={e=>setForm({...form, webhookId:e.target.value})} style={{marginLeft:8}}>
          <option value="">select webhook</option>
          {webhooks.map(w => <option key={w._id} value={w._id}>{w.url}</option>)}
        </select>
        <button onClick={onCreate} style={{marginLeft:8}}>Create</button>
      </div>

      <table>
        <thead><tr><th>Name</th><th>Entity</th><th>Metric</th><th>Op</th><th>Value</th><th>Webhook</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          {alerts.map(a => (
            <tr key={a._id}>
              <td>{a.name}</td>
              <td>{a.entityType}:{a.entityId}</td>
              <td>{a.metric}</td>
              <td>{a.operator}</td>
              <td>{a.value}</td>
              <td>{a.webhook?.url || a.webhook}</td>
              <td>{String(a.active)}</td>
              <td><button onClick={()=>onDelete(a._id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
JS

echo "Staging frontend files..."
git add -A frontend

echo "Committing..."
git commit -m "Add frontend public and admin apps (public client and admin UI)"

echo "Pushing branch $BRANCH to origin..."
git push -u origin "$BRANCH"

echo "Done - files created, committed and pushed."
