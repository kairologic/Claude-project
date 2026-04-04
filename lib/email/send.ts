/**
 * lib/email/send.ts
 *
 * Unified email sending utility for KairoLogic system emails.
 * Uses Resend SDK with React Email components for type-safe,
 * branded transactional emails.
 *
 * Usage:
 *   import { sendEmail } from '@/lib/email/send';
 *   import { WelcomeEmail } from '@/emails/welcome';
 *
 *   await sendEmail({
 *     to: 'manager@practice.com',
 *     subject: 'Welcome to KairoLogic',
 *     react: WelcomeEmail({ practiceName: 'Brushy Creek', ... }),
 *   });
 *
 * Or use the typed helper functions:
 *   import { sendWelcomeEmail } from '@/lib/email/send';
 *   await sendWelcomeEmail('manager@practice.com', { practiceName: '...' });
 */

import { Resend } from 'resend';
import type { ReactElement } from 'react';

// ── Template imports ───────────────────────────────────────
import { WelcomeEmail, type WelcomeEmailProps } from '@/emails/welcome';
import { InviteTeamEmail, type InviteTeamEmailProps } from '@/emails/invite-team';
import { WeeklyDigestEmail, type WeeklyDigestEmailProps } from '@/emails/weekly-digest';
import {
  AlertNotificationEmail,
  type AlertNotificationEmailProps,
} from '@/emails/alert-notification';
import { ScanCompleteEmail, type ScanCompleteEmailProps } from '@/emails/scan-complete';
import { ContactReceivedEmail, type ContactReceivedEmailProps } from '@/emails/contact-received';
import { PreviewReportEmail, type PreviewReportEmailProps } from '@/emails/preview-report';
import { PasswordResetEmail, type PasswordResetEmailProps } from '@/emails/password-reset';
import {
  SubscriptionConfirmedEmail,
  type SubscriptionConfirmedEmailProps,
} from '@/emails/subscription-confirmed';
import { PaymentFailedEmail, type PaymentFailedEmailProps } from '@/emails/payment-failed';
import { RenewalReminderEmail, type RenewalReminderEmailProps } from '@/emails/renewal-reminder';

// ── Config ─────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'KairoLogic <notifications@kairologic.net>';
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'support@kairologic.net';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error('[email] RESEND_API_KEY not configured. Set it in your environment.');
    }
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

// ── Types ──────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  /** Override from address (default: FROM_EMAIL env var) */
  from?: string;
  /** Override reply-to (default: support@kairologic.net) */
  replyTo?: string;
  /** Custom tags for analytics/filtering in Resend dashboard */
  tags?: Array<{ name: string; value: string }>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ── Core send function ─────────────────────────────────────

export async function sendEmail(opts: SendEmailOptions): Promise<SendResult> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: opts.from || FROM_EMAIL,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      react: opts.react,
      replyTo: opts.replyTo || REPLY_TO,
      tags: opts.tags,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] Send failed: ${message}`);
    return { success: false, error: message };
  }
}

// ── Typed helper functions for each email type ─────────────
// These provide a clean API surface and handle subject line generation.

/**
 * Send welcome/claim confirmation email.
 * Trigger: Practice claim flow (organization_id set).
 */
export async function sendWelcomeEmail(to: string, props: WelcomeEmailProps): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `Welcome to KairoLogic — ${props.practiceName} is now live`,
    react: WelcomeEmail(props),
    tags: [
      { name: 'email_type', value: 'welcome' },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

/**
 * Send team invitation email.
 * Trigger: Admin invites a user in practice settings.
 */
export async function sendInviteEmail(
  to: string,
  props: InviteTeamEmailProps,
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `${props.inviterName} invited you to join ${props.practiceName} on KairoLogic`,
    react: InviteTeamEmail(props),
    tags: [
      { name: 'email_type', value: 'invite' },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

/**
 * Send weekly data digest email.
 * Trigger: Monday morning cron / scheduled task.
 */
export async function sendWeeklyDigestEmail(
  to: string | string[],
  props: WeeklyDigestEmailProps,
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `Weekly Digest: ${props.practiceName} — ${props.activeAlerts} alerts, ${props.deltaEvents} changes`,
    react: WeeklyDigestEmail(props),
    tags: [
      { name: 'email_type', value: 'weekly_digest' },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

/**
 * Send high-severity alert notification.
 * Trigger: Alert inserted with severity = 'action' or 'warning'.
 */
export async function sendAlertEmail(
  to: string | string[],
  props: AlertNotificationEmailProps,
): Promise<SendResult> {
  const severityPrefix =
    props.severity === 'action' ? '🚨 ' : props.severity === 'warning' ? '⚠️ ' : '';

  return sendEmail({
    to,
    subject: `${severityPrefix}${props.alertTitle} — ${props.practiceName}`,
    react: AlertNotificationEmail(props),
    tags: [
      { name: 'email_type', value: 'alert' },
      { name: 'severity', value: props.severity },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

/**
 * Send scan complete notification.
 * Trigger: Scan job finishes with results.
 */
export async function sendScanCompleteEmail(
  to: string | string[],
  props: ScanCompleteEmailProps,
): Promise<SendResult> {
  const label =
    props.scanType === 'manual' ? 'Manual' : props.scanType === 'weekly' ? 'Weekly' : 'Monthly';

  return sendEmail({
    to,
    subject: `${label} Scan Complete: ${props.practiceName} — ${props.newDeltaEvents} new changes`,
    react: ScanCompleteEmail(props),
    tags: [
      { name: 'email_type', value: 'scan_complete' },
      { name: 'scan_type', value: props.scanType },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

/**
 * Send contact form acknowledgment.
 * Trigger: Contact form submission.
 */
export async function sendContactReceivedEmail(
  to: string,
  props: ContactReceivedEmailProps,
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `We received your message — KairoLogic`,
    react: ContactReceivedEmail(props),
    tags: [{ name: 'email_type', value: 'contact_received' }],
  });
}

/**
 * Send preview report to unclaimed practice (outreach).
 * Trigger: Admin sends from practices page, or scheduled outreach.
 */
export async function sendPreviewReportEmail(
  to: string,
  props: PreviewReportEmailProps,
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `${props.totalIssues} data discrepancies found — ${props.practiceName}`,
    react: PreviewReportEmail(props),
    from: 'KairoLogic <reports@kairologic.net>',
    tags: [
      { name: 'email_type', value: 'preview_report' },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

/**
 * Send password reset email.
 * Trigger: Password reset request.
 */
export async function sendPasswordResetEmail(
  to: string,
  props: PasswordResetEmailProps,
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: 'Reset your KairoLogic password',
    react: PasswordResetEmail(props),
    tags: [{ name: 'email_type', value: 'password_reset' }],
  });
}

// ── Subscription / billing helpers ─────────────────────────

/**
 * Send subscription confirmation email.
 * Trigger: Stripe checkout.session.completed / subscription.created webhook.
 */
export async function sendSubscriptionConfirmedEmail(
  to: string,
  props: SubscriptionConfirmedEmailProps,
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `Subscription confirmed — ${props.productName} for ${props.practiceName}`,
    react: SubscriptionConfirmedEmail(props),
    tags: [
      { name: 'email_type', value: 'subscription_confirmed' },
      { name: 'product', value: props.productName },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

/**
 * Send payment failed email.
 * Trigger: Stripe invoice.payment_failed webhook.
 */
export async function sendPaymentFailedEmail(
  to: string | string[],
  props: PaymentFailedEmailProps,
): Promise<SendResult> {
  const isLastAttempt = props.retryAttempt >= props.maxRetries;
  const urgencyPrefix = isLastAttempt ? '🚨 Final Notice: ' : '';

  return sendEmail({
    to,
    subject: `${urgencyPrefix}Payment failed for ${props.practiceName} — update your payment method`,
    react: PaymentFailedEmail(props),
    tags: [
      { name: 'email_type', value: 'payment_failed' },
      { name: 'retry_attempt', value: String(props.retryAttempt) },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

/**
 * Send renewal reminder email (7 days before renewal).
 * Trigger: Scheduled cron checks upcoming invoices.
 */
export async function sendRenewalReminderEmail(
  to: string | string[],
  props: RenewalReminderEmailProps,
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `Upcoming renewal: ${props.productName} for ${props.practiceName} on ${props.renewalDate}`,
    react: RenewalReminderEmail(props),
    tags: [
      { name: 'email_type', value: 'renewal_reminder' },
      { name: 'product', value: props.productName },
      { name: 'practice', value: props.practiceName },
    ],
  });
}

// ── Email type registry (for admin tooling / audit) ────────

export const EMAIL_TYPES = {
  welcome: {
    name: 'Welcome / Claim Confirmed',
    trigger: 'Practice claims profile (organization_id set)',
    category: 'onboarding',
  },
  invite: {
    name: 'Team Invitation',
    trigger: 'Admin invites team member',
    category: 'onboarding',
  },
  weekly_digest: {
    name: 'Weekly Data Digest',
    trigger: 'Monday morning cron',
    category: 'operational',
  },
  alert: {
    name: 'Alert Notification',
    trigger: 'High-severity alert created',
    category: 'operational',
  },
  scan_complete: {
    name: 'Scan Complete',
    trigger: 'Scan job finishes',
    category: 'operational',
  },
  contact_received: {
    name: 'Contact Form Received',
    trigger: 'Contact form submission',
    category: 'engagement',
  },
  preview_report: {
    name: 'Preview Report (Outreach)',
    trigger: 'Admin triggers or scheduled outreach',
    category: 'engagement',
  },
  password_reset: {
    name: 'Password Reset',
    trigger: 'User requests password reset',
    category: 'account',
  },
  subscription_confirmed: {
    name: 'Subscription Confirmed',
    trigger: 'Stripe checkout.session.completed webhook',
    category: 'billing',
  },
  payment_failed: {
    name: 'Payment Failed',
    trigger: 'Stripe invoice.payment_failed webhook',
    category: 'billing',
  },
  renewal_reminder: {
    name: 'Renewal Reminder',
    trigger: '7 days before subscription renewal (cron)',
    category: 'billing',
  },
} as const;
