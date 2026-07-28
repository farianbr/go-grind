import nodemailer from "nodemailer";

/**
 * Outbound email over Gmail.
 *
 * GMAIL_PASS must be a Google "app password", not the account password —
 * Google rejects plain passwords for SMTP. If either variable is missing the
 * app keeps working and invites simply fall back to their shareable link, so a
 * missing mail config can never block a team from being built.
 */
const { GMAIL_USER, GMAIL_PASS, FRONTEND_URL } = process.env;

let transporter = null;

export const mailEnabled = Boolean(GMAIL_USER && GMAIL_PASS);

function getTransporter() {
  if (!mailEnabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
  }
  return transporter;
}

const appUrl = () => (FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function shell({ heading, body, ctaLabel, ctaUrl, footer }) {
  // Inline styles only: every serious mail client strips <style> blocks.
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e4e6eb;">
        <tr><td style="padding:28px 28px 0;">
          <span style="font:700 20px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#4f46e5;letter-spacing:.04em;">Kendro</span>
        </td></tr>
        <tr><td style="padding:20px 28px 0;">
          <h1 style="margin:0;font:700 22px/1.3 -apple-system,Segoe UI,Roboto,sans-serif;color:#16181d;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:12px 28px 0;">
          <p style="margin:0;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#4b5262;">${body}</p>
        </td></tr>
        <tr><td style="padding:24px 28px 0;">
          <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font:600 15px/1 -apple-system,Segoe UI,Roboto,sans-serif;padding:13px 22px;border-radius:8px;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:20px 28px 28px;">
          <p style="margin:0;font:400 13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#8b93a3;">
            ${footer}<br>
            Or paste this into your browser:<br>
            <span style="color:#4f46e5;word-break:break-all;">${ctaUrl}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function send({ to, subject, html, text }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(`Email skipped (GMAIL_USER/GMAIL_PASS not set): "${subject}" to ${to}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    await mailer.sendMail({
      from: `"Kendro" <${GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    // Never let a mail failure fail the request that triggered it — the invite
    // still exists and its link still works.
    console.error("Email send failed:", error.message);
    return { sent: false, reason: "send_failed" };
  }
}

export function sendTeamInviteEmail({ to, teamName, inviterName, token, role, hasAccount }) {
  const url = `${appUrl()}/invite/${token}`;
  const team = escapeHtml(teamName);
  const inviter = escapeHtml(inviterName);

  return send({
    to,
    subject: `${inviterName} invited you to ${teamName} on Kendro`,
    text: `${inviterName} invited you to join ${teamName} on Kendro as a ${role}.\n\nAccept the invite: ${url}\n\nKendro is a virtual co-working space. Joining a team is free.`,
    html: shell({
      heading: `Join ${team} on Kendro`,
      body: `<strong>${inviter}</strong> invited you to ${team} as a ${escapeHtml(
        role
      )}. Kendro is a virtual co-working space. Take a desk, say what you're working on, and work the block alongside your team.`,
      ctaLabel: hasAccount ? "Accept invite" : "Create your account",
      ctaUrl: url,
      footer: hasAccount
        ? "Joining a team is free."
        : "You'll be asked to create a free account first. Joining a team is free.",
    }),
  });
}
