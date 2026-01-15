// server/services/emailService.js

const nodemailer = require("nodemailer");

/**
 * Create a reusable transporter object using SMTP.  Configuration values are
 * pulled from environment variables.  You could extend this to support
 * OAuth2 or other transport mechanisms as needed.
 */
function createTransporter() {
  const service = process.env.EMAIL_SERVICE;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!service || !user || !pass) {
    throw new Error("Missing EMAIL_SERVICE, EMAIL_USER or EMAIL_PASS in environment");
  }
  return nodemailer.createTransport({
    service,
    auth: { user, pass },
  });
}

/**
 * Send an email with the given subject and text.  The recipient defaults
 * to NOTIFY_EMAIL if provided.  Additional mail options may be passed via
 * the second argument.
 *
 * @param {string} subject Email subject
 * @param {string} text Email body (plain text)
 * @param {object} [opts] Extra Nodemailer options (e.g. html)
 */
async function sendMail(subject, text, opts = {}) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) throw new Error("Missing NOTIFY_EMAIL environment variable");
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    ...opts,
  };
  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendMail,
};
