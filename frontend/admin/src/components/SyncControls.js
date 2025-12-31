import React, { useState, useEffect } from 'react';
// Import the API helpers.  If your project places api.js in a different
// directory, adjust the import accordingly.  These helpers must export
// triggerSyncGames, triggerSyncPlayers, triggerComputeDerived,
// fetchSyncStates and resetSyncState.
import {
  triggerSyncGames,
  triggerSyncPlayers,
  triggerComputeDerived,
  fetchSyncStates,
  resetSyncState,
  triggerSyncInjuries,
} from '../api';

/**
 * SyncControls provides a simple UI for running back‑end sync jobs and
 * monitoring their progress.  It exposes buttons to sync games and
 * players, compute derived metrics, and reset the sync state.  It also
 * fetches the current sync states every 5 seconds and displays them.
 */
function SyncControls() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Load sync states from the server.  This is run on mount and on an
  // interval so that the UI stays up to date while jobs are running.
  const loadStates = async () => {
    try {
      setLoading(true);
      const data = await fetchSyncStates();
      // The API may return an object or array.  Normalize to array if needed.
      const list = Array.isArray(data) ? data : data.states || [];
      setStates(list);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch sync states');
    } finally {
      setLoading(false);
    }
  };

  // On mount, load states and set up polling.
  useEffect(() => {
    loadStates();
    const interval = setInterval(loadStates, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generic handler for triggering a sync job.  Accepts an API function
  // and a friendly name for display.  Runs the API call, updates the
  // message on success, and reloads the sync states.
  const runJob = async (apiFn, name, opts = {}) => {
    try {
      setLoading(true);
      setMessage(`Starting ${name}…`);
      await apiFn(opts);
      setMessage(`${name} started successfully.`);
      // Wait a moment to allow the job to register before reloading states
      setTimeout(loadStates, 1000);
    } catch (err) {
      setError(err.message || `Failed to start ${name}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Sync Controls</h2>
      {/* Buttons to trigger various sync operations */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => runJob(triggerSyncPlayers, 'Players sync', { per_page: 100 })}
          disabled={loading}
        >
          Sync Players
        </button>
        <button
          onClick={() => runJob(triggerSyncGames, 'Games sync', { per_page: 100 })}
          disabled={loading}
          style={{ marginLeft: '0.5rem' }}
        >
          Sync Games
        </button>
        <button
          onClick={() => runJob(triggerSyncInjuries, 'Injuries sync', { per_page: 100 })}
          disabled={loading}
          style={{ marginLeft: '0.5rem' }}
        >
          Sync Injuries
        </button>
        <button
          onClick={() => runJob(triggerComputeDerived, 'Derived metrics')}
          disabled={loading}
          style={{ marginLeft: '0.5rem' }}
        >
          Compute Derived
        </button>
        <button
          onClick={async () => runJob(resetSyncState, 'Reset sync state')}
          disabled={loading}
          style={{ marginLeft: '0.5rem' }}
        >
          Reset Sync State
        </button>
      </div>
      {/* Display message and errors */}
      {message && <div style={{ color: 'green' }}>{message}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {/* Display current sync states */}
      <h3>Current Sync States</h3>
      {loading && !states.length ? (
        <p>Loading…</p>
      ) : states.length === 0 ? (
        <p>No sync jobs running.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {states.map((state) => (
            <li key={state.id || state._id || JSON.stringify(state)}>
              <strong>{state.name || state.type || 'Job'}</strong>{' '}
              – {state.status || state.state}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SyncControls;