// server/services/notificationService.js
const axios = require('axios');
const mongoose = require('mongoose');

const WebhookSubscription = require('../models/WebhookSubscription');
const Alert = require('../models/Alert');
const Injury = require('../models/Injury');
const AdvancedMetric = require('../models/AdvancedMetric');
const SyncState = require('../models/SyncState');

const DEFAULT_POLL_INTERVAL_MS = Number(process.env.NOTIFY_POLL_INTERVAL_MS || 15000);
const REQUEST_TIMEOUT_MS = 7000;

async function postJson(url, payload, timeout = REQUEST_TIMEOUT_MS) {
  try {
    const res = await axios.post(url, payload, { timeout });
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/* ----------------- webhook subscription helpers ----------------- */

async function getActiveWebhooksForEvent(event) {
  // event equals 'injury.update' or 'metric.threshold' etc.
  return WebhookSubscription.find({ active: true, events: event }).lean();
}

/* ----------------- notify helpers ----------------- */

async function notifyWebhooks(event, payload) {
  const subs = await WebhookSubscription.find({ active: true, events: event }).lean();
  for (const sub of subs) {
    (async () => {
      const result = await postJson(sub.url, { event, payload });
      try {
        await WebhookSubscription.updateOne({ _id: sub._id }, { $set: { lastStatus: { ts: new Date(), result } } });
      } catch (err) {
        console.warn('Failed to update webhook status', err && err.message ? err.message : err);
      }
    })();
  }
}

/* ----------------- Alerts evaluation ----------------- */

function evaluateOperator(op, a, b) {
  if (a === undefined || a === null) return false;
  switch (op) {
    case 'gt': return a > b;
    case 'gte': return a >= b;
    case 'lt': return a < b;
    case 'lte': return a <= b;
    case 'eq': return a === b;
    default: return false;
  }
}

async function evaluateAlertsForMetricChange(doc) {
  // doc is AdvancedMetric full document (with metrics)
  const entityType = doc.entityType;
  const entityId = doc.entityId;
  const season = doc.season;
  const scope = doc.scope || 'season';
  const metrics = doc.metrics || {};

  const alerts = await Alert.find({ active: true, entityType, entityId, season, scope }).populate('webhook').lean();
  for (const alert of alerts) {
    const metricValue = metrics[alert.metric];
    const meets = evaluateOperator(alert.operator, metricValue, alert.value);
    if (meets) {
      const payload = { alert, metricValue, doc };
      // send to alert's webhook
      try {
        const res = await postJson(alert.webhook.url, { event: 'metric.threshold', payload });
        await Alert.updateOne({ _id: alert._id }, { $set: { lastFiredAt: new Date() } });
        await WebhookSubscription.updateOne({ _id: alert.webhook._id }, { $set: { lastStatus: { ts: new Date(), result: res } } });
      } catch (err) {
        console.warn('Alert notify failed', err && err.message ? err.message : err);
      }
    }
  }
}

/* ----------------- change stream handlers ----------------- */

async function handleInjuryChange(change) {
  try {
    const full = change.fullDocument || change;
    // Compose event payload
    const event = 'injury.update';
    const payload = { operation: change.operationType || 'unknown', injury: full };
    await notifyWebhooks(event, payload);
  } catch (err) {
    console.error('handleInjuryChange error', err && err.message ? err.message : err);
  }
}

async function handleMetricChange(change) {
  try {
    const full = change.fullDocument || change;
    // Evaluate alerts for thresholds
    await evaluateAlertsForMetricChange(full);
    // also notify generic metric update webhooks
    await notifyWebhooks('metric.update', { operation: change.operationType || 'unknown', metricDoc: full });
  } catch (err) {
    console.error('handleMetricChange error', err && err.message ? err.message : err);
  }
}

/* ----------------- Polling fallback helpers ----------------- */

async function getLastTimestampKey(key) {
  const doc = await SyncState.findOne({ key }).lean();
  return doc && doc.meta && doc.meta.lastTs ? new Date(doc.meta.lastTs) : null;
}

async function setLastTimestampKey(key, dt) {
  await SyncState.updateOne({ key }, { $set: { key, cursor: null, meta: { lastTs: dt }, updatedAt: new Date() } }, { upsert: true });
}

async function pollInjuriesLoop(intervalMs = DEFAULT_POLL_INTERVAL_MS) {
  const key = 'notify:injuries:ts';
  let lastTs = await getLastTimestampKey(key) || new Date(0);
  setInterval(async () => {
    try {
      const docs = await Injury.find({ updatedAt: { $gt: lastTs } }).lean();
      for (const d of docs) {
        await handleInjuryChange({ fullDocument: d, operationType: 'update' });
        if (d.updatedAt && d.updatedAt > lastTs) lastTs = d.updatedAt;
      }
      await setLastTimestampKey(key, lastTs);
    } catch (err) {
      console.warn('pollInjuriesLoop error', err && err.message ? err.message : err);
    }
  }, intervalMs);
}

async function pollMetricsLoop(intervalMs = DEFAULT_POLL_INTERVAL_MS) {
  const key = 'notify:metrics:ts';
  let lastTs = await getLastTimestampKey(key) || new Date(0);
  setInterval(async () => {
    try {
      const docs = await AdvancedMetric.find({ updatedAt: { $gt: lastTs } }).lean();
      for (const d of docs) {
        await handleMetricChange({ fullDocument: d, operationType: 'update' });
        if (d.updatedAt && d.updatedAt > lastTs) lastTs = d.updatedAt;
      }
      await setLastTimestampKey(key, lastTs);
    } catch (err) {
      console.warn('pollMetricsLoop error', err && err.message ? err.message : err);
    }
  }, intervalMs);
}

/* ----------------- public start/stop ----------------- */

let streams = [];
let polling = false;

async function start() {
  // try change streams
  try {
    if (typeof Injury.watch === 'function' && typeof AdvancedMetric.watch === 'function') {
      const injuryStream = Injury.watch([], { fullDocument: 'updateLookup' });
      injuryStream.on('change', handleInjuryChange);
      streams.push(injuryStream);

      const metricStream = AdvancedMetric.watch([], { fullDocument: 'updateLookup' });
      metricStream.on('change', handleMetricChange);
      streams.push(metricStream);

      console.log('🔔 notificationService: change streams established for Injury and AdvancedMetric');
      return;
    }
  } catch (err) {
    console.warn('Change streams unavailable or error starting them:', err && err.message ? err.message : err);
  }

  // fallback to polling
  if (!polling) {
    console.warn('🔔 notificationService: falling back to polling mode (no change stream)');
    polling = true;
    pollInjuriesLoop();
    pollMetricsLoop();
  }
}

async function stop() {
  for (const s of streams) {
    try { await s.close(); } catch (e) { /* noop */ }
  }
  streams = [];
  polling = false;
}

module.exports = {
  start,
  stop,
  notifyWebhooks,
  evaluateAlertsForMetricChange,
};
