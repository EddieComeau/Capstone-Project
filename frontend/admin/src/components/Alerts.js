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
