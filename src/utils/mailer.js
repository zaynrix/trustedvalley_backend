const nodemailer = require('nodemailer');

// Send reset email. If SMTP env not configured, fall back to console.log for dev.
// Accepts optional third parameter { subject, text } to override defaults.
async function sendResetEmail(to, tempPassword, opts = {}) {
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const subject = opts.subject || 'Password reset - temporary password';
  const text = opts.text || `Your password has been reset. Your temporary password is: ${tempPassword}\nPlease log in and change it as soon as possible.`;

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : undefined,
      secure: port == 465, // true for 465, false for other ports
      auth: { user, pass }
    });

    const info = await transporter.sendMail({ from, to, subject, text });
    return { sent: true, info };
  }

  // fallback: just log
  console.log('--- RESET EMAIL (DEV) ---');
  console.log('to:', to);
  console.log('from:', from);
  console.log('subject:', subject);
  console.log(text);
  console.log('--- END RESET EMAIL ---');
  return { sent: false, info: 'logged-to-console' };
}

module.exports = { sendResetEmail };
