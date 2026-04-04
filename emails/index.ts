/**
 * emails/index.ts — Barrel export for all email templates.
 */

export { WelcomeEmail, type WelcomeEmailProps } from './welcome';
export { InviteTeamEmail, type InviteTeamEmailProps } from './invite-team';
export { WeeklyDigestEmail, type WeeklyDigestEmailProps } from './weekly-digest';
export { AlertNotificationEmail, type AlertNotificationEmailProps } from './alert-notification';
export { ScanCompleteEmail, type ScanCompleteEmailProps } from './scan-complete';
export { ContactReceivedEmail, type ContactReceivedEmailProps } from './contact-received';
export { PreviewReportEmail, type PreviewReportEmailProps } from './preview-report';
export { PasswordResetEmail, type PasswordResetEmailProps } from './password-reset';

// Subscription / billing emails
export {
  SubscriptionConfirmedEmail,
  type SubscriptionConfirmedEmailProps,
} from './subscription-confirmed';
export { PaymentFailedEmail, type PaymentFailedEmailProps } from './payment-failed';
export { RenewalReminderEmail, type RenewalReminderEmailProps } from './renewal-reminder';

// Re-export layout components for custom compositions
export {
  EmailLayout,
  CtaButton,
  SecondaryButton,
  InfoCard,
  StatPill,
  brand,
  DASHBOARD_URL,
} from './components/layout';
