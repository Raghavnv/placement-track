const env = require('../config/env');

// Transactional email through Brevo (free tier: 300 emails a day): https://developers.brevo.com/reference/sendtransacemail
// Optional: without BREVO_API_KEY and EMAIL_FROM, nothing is sent and the in-app bell still works.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const BATCH = 1000; // Brevo's limit on message versions per request

const isConfigured = () => Boolean(env.brevoApiKey && env.emailFrom);

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function html({ title, body, link }) {
  const url = link && env.appUrl ? `${env.appUrl}${link}` : null;
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#101828">
  <p style="margin:0 0 16px;font-weight:600;color:#4f46e5">PlacementTrack</p>
  <h1 style="margin:0 0 8px;font-size:18px">${escapeHtml(title)}</h1>
  ${body ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475467;white-space:pre-wrap">${escapeHtml(body)}</p>` : ''}
  ${url ? `<a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600">Open PlacementTrack</a>` : ''}
  <p style="margin:24px 0 0;font-size:12px;color:#667085">You can turn these emails off on your profile.</p>
</div>`;
}

// Sends one message to many recipients ([{ email, name }]).
async function sendEmail(recipients, message) {
  if (!isConfigured() || !recipients.length) return;
  const [, name = 'PlacementTrack', address = env.emailFrom] = /^(.*?)\s*<(.+)>$/.exec(env.emailFrom) || [];
  for (let i = 0; i < recipients.length; i += BATCH) {
    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': env.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name, email: address },
        subject: message.title,
        htmlContent: html(message),
        textContent: [message.title, message.body, message.link && env.appUrl ? `${env.appUrl}${message.link}` : ''].filter(Boolean).join('\n\n'),
        messageVersions: recipients.slice(i, i + BATCH).map((r) => ({ to: [{ email: r.email, name: r.name }] })),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Brevo responded ${response.status}`);
  }
}

module.exports = { isConfigured, sendEmail };
