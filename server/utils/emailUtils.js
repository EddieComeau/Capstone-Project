const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendSyncNotification(subject, text) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: process.env.NOTIFY_EMAIL,
    subject,
    text
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Sync notification sent');
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
  }
}

module.exports = { sendSyncNotification };
