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
