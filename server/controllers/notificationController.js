// server/controllers/notificationController.js
const WebhookSubscription = require('../models/WebhookSubscription');
const Alert = require('../models/Alert');

/* Webhooks */
async function createWebhook(req, res) {
  try {
    const { url, events, secret } = req.body;
    if (!url || !Array.isArray(events) || events.length === 0) return res.status(400).json({ ok: false, error: 'url and events[] required' });
    const sub = await WebhookSubscription.create({ url, events, secret: secret || null });
    return res.json({ ok: true, webhook: sub });
  } catch (err) {
    console.error('createWebhook error', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: err.message || 'internal error' });
  }
}

async function listWebhooks(req, res) {
  try {
    const subs = await WebhookSubscription.find({}).lean();
    return res.json({ ok: true, webhooks: subs });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'internal error' });
  }
}

async function deleteWebhook(req, res) {
  try {
    const id = req.params.id;
    await WebhookSubscription.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'internal error' });
  }
}

/* Alerts */
async function createAlert(req, res) {
  try {
    const { name, entityType, entityId, season, scope, metric, operator, value, webhookId } = req.body;
    if (!name || !entityType || !entityId || !metric || !operator || value === undefined || !webhookId) {
      return res.status(400).json({ ok: false, error: 'missing required fields' });
    }
    const a = await Alert.create({ name, entityType, entityId, season: season || null, scope: scope || 'season', metric, operator, value: Number(value), webhook: webhookId, active: true });
    return res.json({ ok: true, alert: a });
  } catch (err) {
    console.error('createAlert error', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: err.message || 'internal error' });
  }
}

async function listAlerts(req, res) {
  try {
    const alerts = await Alert.find({}).populate('webhook').lean();
    return res.json({ ok: true, alerts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'internal error' });
  }
}

async function deleteAlert(req, res) {
  try {
    const id = req.params.id;
    await Alert.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'internal error' });
  }
}

module.exports = {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  createAlert,
  listAlerts,
  deleteAlert
};
