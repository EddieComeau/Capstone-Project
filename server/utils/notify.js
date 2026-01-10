// server/utils/notify.js

/*
 * Provides a simple abstraction over sending notifications to Slack,
 * Discord, or email when a sync operation completes. Notification
 * channels are configured via environment variables. If a channel is
 * not configured it will be silently skipped.
 */

const axios = require('axios');

let nodemailer;
try {
  // Lazy‑load nodemailer only if email notifications are configured.
  nodemailer = require('nodemailer');
} catch (err) {
  nodemailer = null;
}

/**
 * Send a notification message to any configured channels (Slack,
 * Discord, email). Each channel is optional and will only be used if
 * its corresponding environment variables are set. Errors from one
 * channel do not prevent attempts on other channels; they are logged
 * to the console for debugging.
 *
 * @param {string} message The message to send.
 */
async function sendNotification(message) {
  // Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await axios.post(process.env.SLACK_WEBHOOK_URL, { text: message });
    } catch (err) {
      console.error('[notify] Slack notification failed:', err.message);
    }
  }

  // Discord webhook
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await axios.post(process.env.DISCORD_WEBHOOK_URL, { content: message });
    } catch (err) {
      console.error('[notify] Discord notification failed:', err.message);
    }
  }

  // Email via nodemailer
  if (
    nodemailer &&
    process.env.NOTIFY_EMAIL &&
    process.env.EMAIL_SERVICE &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  ) {
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: process.env.NOTIFY_EMAIL,
        subject: 'NFL Betting Sync Notification',
        text: message,
      };
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error('[notify] Email notification failed:', err.message);
    }
  }
}

module.exports = { sendNotification };
