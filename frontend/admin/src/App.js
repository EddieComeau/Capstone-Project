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
