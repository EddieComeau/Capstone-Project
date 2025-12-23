// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');

// Webhooks
router.post('/webhooks', ctrl.createWebhook);     // create webhook
router.get('/webhooks', ctrl.listWebhooks);       // list webhooks
router.delete('/webhooks/:id', ctrl.deleteWebhook);

// Alerts
router.post('/alerts', ctrl.createAlert);         // create alert
router.get('/alerts', ctrl.listAlerts);           // list alerts
router.delete('/alerts/:id', ctrl.deleteAlert);

module.exports = router;
