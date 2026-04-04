import { NextRequest, NextResponse } from 'next/server';
import { withAuth, API_ERRORS, escapeHtml, parseBody } from '@/lib/api/with-auth';
import type { AuthContext } from '@/lib/api/with-auth';
import { feedbackSchema } from '@/lib/api/validation-schemas';

// Amazon SES SMTP Configuration (same as contact route)
const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_PORT = parseInt(process.env.SES_SMTP_PORT || '587');
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.net';
const SES_FROM_NAME = process.env.SES_FROM_NAME || 'KairoLogic Sentry';

// Routing: issues → issue@, features → feature@
const DESTINATIONS: Record<string, string> = {
  issue: 'issue@kairologic.net',
  feature: 'feature@kairologic.net',
};

/**
 * POST /api/feedback
 * Submit feedback (issues or feature requests) from authenticated users.
 *
 * Secured with withAuth: requires authenticated user.
 */
const POST_HANDLER = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  try {
    // Validate request body
    const parsed = await parseBody(request, feedbackSchema);
    if ('error' in parsed) return parsed.error;
    const {
      type,
      category,
      urgency,
      subject,
      description,
      contactEmail,
      userName,
      practiceId,
      practiceName,
    } = parsed.data;

    // Validate required context fields
    if (!userName || !practiceId || !practiceName) {
      return API_ERRORS.badRequest(
        'Missing submitter context (userName, practiceId, practiceName)',
      );
    }

    const toEmail = DESTINATIONS[type];
    const isIssue = type === 'issue';
    const typeLabel = isIssue ? 'Issue Report' : 'Feature Request';
    const urgencyLabel = isIssue && urgency ? ` [${urgency.toUpperCase()}]` : '';
    const emailSubject = `[${typeLabel}]${urgencyLabel} ${subject}`;

    // ── Plain text ──
    const textBody = `
${typeLabel}
${'─'.repeat(40)}

Subject: ${subject}
Category: ${category}${isIssue && urgency ? `\nUrgency: ${urgency}` : ''}

Submitted by: ${userName}
Practice: ${practiceName}
Practice ID: ${practiceId}
Contact email: ${contactEmail || 'Not provided'}

Description:
${description}

${'─'.repeat(40)}
Submitted via KairoLogic Sentry Dashboard
${new Date().toISOString()}
`.trim();

    // ── HTML ──
    const accentColor = isIssue ? '#DC3545' : '#C8973F';
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: ${accentColor}; color: white; padding: 20px 24px; }
    .header h2 { margin: 0; font-size: 18px; }
    .header .sub { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .context { background: #F5F6F7; padding: 16px 24px; border-bottom: 1px solid #E8EAED; display: flex; flex-wrap: wrap; gap: 20px; }
    .context-item { font-size: 13px; }
    .context-item .lbl { font-weight: 700; color: #0B1E3D; }
    .body { padding: 24px; }
    .field { margin-bottom: 16px; }
    .field .lbl { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9AA3AE; margin-bottom: 4px; }
    .field .val { font-size: 14px; color: #0B1E3D; }
    .description { white-space: pre-wrap; background: #FAFAFA; border: 1px solid #E8EAED; border-radius: 8px; padding: 16px; font-size: 14px; color: #0B1E3D; line-height: 1.6; }
    .urgency-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; color: white; }
    .urgency-low { background: #17A2B8; }
    .urgency-medium { background: #C8973F; }
    .urgency-high { background: #DC3545; }
    .footer { text-align: center; padding: 16px 24px; color: #9AA3AE; font-size: 11px; border-top: 1px solid #E8EAED; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${isIssue ? '🐛' : '💡'} ${typeLabel}</h2>
      <div class="sub">${escapeHtml(subject)}</div>
    </div>
    <div class="context">
      <div class="context-item"><span class="lbl">From:</span> ${escapeHtml(userName)}</div>
      <div class="context-item"><span class="lbl">Practice:</span> ${escapeHtml(practiceName)}</div>
      <div class="context-item"><span class="lbl">Email:</span> ${contactEmail ? escapeHtml(contactEmail) : 'N/A'}</div>
    </div>
    <div class="body">
      <div class="field">
        <div class="lbl">Category</div>
        <div class="val">${escapeHtml(category || 'General')}</div>
      </div>
      ${
        isIssue && urgency
          ? `<div class="field">
              <div class="lbl">Urgency</div>
              <div class="val"><span class="urgency-badge urgency-${escapeHtml(urgency)}">${escapeHtml(urgency).toUpperCase()}</span></div>
            </div>`
          : ''
      }
      <div class="field">
        <div class="lbl">Description</div>
        <div class="description">${escapeHtml(description)}</div>
      </div>
      <div class="field">
        <div class="lbl">Practice ID</div>
        <div class="val" style="font-family: monospace; font-size: 12px; color: #9AA3AE;">${escapeHtml(practiceId)}</div>
      </div>
    </div>
    <div class="footer">
      Submitted via KairoLogic Sentry Dashboard &middot; ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`.trim();

    // ── Send via SES ──
    if (!SES_SMTP_USER || !SES_SMTP_PASS) {
      console.error('[Feedback] SES SMTP credentials not configured');
      return API_ERRORS.internal('Email service not configured');
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: SES_SMTP_HOST,
      port: SES_SMTP_PORT,
      secure: false,
      auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"${SES_FROM_NAME}" <${SES_FROM_EMAIL}>`,
      to: toEmail,
      replyTo: contactEmail || undefined,
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
    });

    console.log(
      `[Feedback] ${typeLabel} sent to ${toEmail} — practice: ${practiceName}, user: ${userName}`,
    );

    return NextResponse.json({ success: true, message: `${typeLabel} submitted successfully` });
  } catch (error) {
    console.error('[Feedback] Error:', error);
    return API_ERRORS.internal('Failed to submit feedback');
  }
});

export { POST_HANDLER as POST };
