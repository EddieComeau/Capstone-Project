// frontend/admin/src/App.js
import React, { useState } from 'react';
import SyncState from './components/SyncState';
import SyncControls from './components/SyncControls';
import Webhooks from './components/Webhooks';
import Alerts from './components/Alerts';
import './index.css';

export default function App() {
  const [tab, setTab] = useState('syncstate');

  return (
    <div className="container">
      <div className="header">
        <h1>Admin Dashboard</h1>
        <div>
          <button onClick={() => setTab('syncstate')} style={{marginRight:8}}>SyncState</button>
          <button onClick={() => setTab('synccontrols')} style={{marginRight:8}}>Sync Controls</button>
          <button onClick={() => setTab('webhooks')} style={{marginRight:8}}>Webhooks</button>
          <button onClick={() => setTab('alerts')}>Alerts</button>
        </div>
      </div>

      <div className="card">
        {tab === 'syncstate' && <SyncState />}
        {tab === 'synccontrols' && <SyncControls />}
        {tab === 'webhooks' && <Webhooks />}
        {tab === 'alerts' && <Alerts />}
      </div>
    </div>
  );
}
