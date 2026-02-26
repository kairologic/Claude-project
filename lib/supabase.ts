import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization - client is only created when getSupabase() is called at RUNTIME
// This prevents the "supabaseUrl is required" error during Vercel's build phase
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel.'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// Types
export type Registry = {
  id: string;
  name: string;
  npi: string;
  url: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  risk_score?: number;
  risk_level?: string;
  risk_meter_level?: string;
  status_label?: string;
  widget_status?: 'active' | 'warning' | 'hidden';
  widget_id?: string;
  subscription_status?: 'trial' | 'active' | 'inactive';
  is_paid?: boolean;
  is_visible?: boolean;
  is_featured?: boolean;
  report_status?: 'none' | 'generated' | 'sent' | 'subscriber';
  latest_report_url?: string;
  scan_count?: number;
  lastScanTimestamp?: number;
  last_scan_timestamp?: string;
  last_scan_result?: any;
  stripe_customer_id?: string;
  // v13: Dashboard access tracking
  dashboard_token?: string;
  dashboard_token_expires_at?: string;
  dashboard_last_accessed_at?: string;
  dashboard_link_sent_at?: string;
  dashboard_link_sent_to?: string;
  // v13: Certification tracking (V2)
  certification_status?: 'none' | 'in_progress' | 'certified' | 'expired' | 'revoked';
  consecutive_compliant_months?: number;
  certification_awarded_at?: string;
  certification_expires_at?: string;
  last_monthly_scan_at?: string;
  // v13: Shield trial management (V2.5)
  subscription_tier?: 'none' | 'watch' | 'shield';
  shield_trial_start?: string;
  shield_trial_end?: string;
  shield_activated_at?: string;
  shield_downgraded_at?: string;
  trial_expiry_notified_day80?: boolean;
  trial_expiry_notified_day90?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ViolationEvidence = {
  id?: string;
  registry_id: string;
  violation_id: string;
  violation_name: string;
  violation_clause: string;
  technical_finding: string;
  recommended_fix: string;
  fix_priority: 'Critical' | 'High' | 'Medium' | 'Low';
  fix_complexity: 'Low' | 'Medium' | 'High';
  captured_at?: string;
};

export type ScanHistory = {
  id?: string;
  registry_id: string;
  npi: string;
  url: string;
  scan_date?: string;
  risk_score: number;
  risk_level: string;
  violations: any;
  critical_violations: any;
  scan_type: 'manual' | 'auto' | 'global';
};

export type EmailTemplate = {
  id?: string;
  slug: string;
  name: string;
  subject: string;
  html_body: string;
  text_body?: string;
  event_type: string;
  trigger_event: string;
  recipient_type?: 'provider' | 'internal';
  variables?: any;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Purchase = {
  id?: string;
  registry_id: string;
  product_type: 'pdf_report' | 'consultation' | 'full_service';
  amount: number;
  stripe_payment_id?: string;
  status: 'pending' | 'completed' | 'failed';
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  created_at?: string;
};

export type CalendarSlot = {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  booked_by?: string;
  booking_type?: 'consultation' | 'briefing';
  google_meet_link?: string;
  created_at?: string;
};

// --- v13 Migration Types ---

export type ScanSchedule = {
  id?: string;
  npi: string;
  registry_id?: string;
  state?: string;
  schedule_type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  cron_expression?: string;
  is_active?: boolean;
  last_run_at?: string;
  next_run_at?: string;
  run_count?: number;
  last_run_status?: 'pending' | 'running' | 'success' | 'failed';
  last_error?: string;
  scan_depth?: 'standard' | 'deep' | 'forensic';
  include_checks?: string[];
  created_at?: string;
  updated_at?: string;
};

export type ScheduledReport = {
  id?: string;
  npi: string;
  registry_id?: string;
  state?: string;
  report_type: 'monthly_compliance' | 'quarterly_forensic' | 'annual_certification';
  schedule_type: 'monthly' | 'quarterly' | 'annual';
  is_active?: boolean;
  last_generated_at?: string;
  next_generation_at?: string;
  generation_count?: number;
  last_report_id?: string;
  auto_email?: boolean;
  delivery_email?: string;
  last_delivered_at?: string;
  delivery_status?: 'pending' | 'generated' | 'delivered' | 'failed';
  created_at?: string;
  updated_at?: string;
};

export type CertificationHistory = {
  id?: string;
  npi: string;
  registry_id?: string;
  state?: string;
  month_date: string;  // DATE: always 1st of month, e.g. '2026-02-01'
  sovereignty_score: number;
  compliance_status: 'Sovereign' | 'Drift' | 'Violation';
  is_compliant?: boolean;
  scan_report_id?: string;
  data_sovereignty_score?: number;
  ai_transparency_score?: number;
  clinical_integrity_score?: number;
  npi_integrity_score?: number;
  total_findings?: number;
  critical_findings?: number;
  high_findings?: number;
  created_at?: string;
};

export type Notification = {
  id?: string;
  npi: string;
  registry_id?: string;
  state?: string;
  notification_type: 'drift_alert' | 'scan_complete' | 'trial_expiry_warning' | 'trial_expired' | 'certification_earned' | 'certification_expiring' | 'report_ready' | 'payment_received' | 'dashboard_link' | 'system';
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical' | 'success';
  channel?: 'email' | 'in_app' | 'sms' | 'webhook';
  recipient_email?: string;
  delivered_at?: string;
  delivery_status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped';
  delivery_error?: string;
  retry_count?: number;
  related_scan_id?: string;
  related_template_slug?: string;
  is_read?: boolean;
  read_at?: string;
  metadata?: Record<string, any>;
  created_at?: string;
};

export type NotificationPreference = {
  id?: string;
  npi: string;
  registry_id?: string;
  email_drift_alerts?: boolean;
  email_scan_complete?: boolean;
  email_monthly_report?: boolean;
  email_certification_updates?: boolean;
  email_trial_reminders?: boolean;
  email_marketing?: boolean;
  drift_alert_frequency?: 'immediate' | 'daily_digest' | 'weekly_digest';
  report_delivery_frequency?: 'monthly' | 'quarterly';
  preferred_email?: string;
  preferred_name?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
};

export type ComplianceFramework = {
  id?: string;
  framework_id: string;
  name: string;
  description?: string;
  jurisdiction?: string;
  industry?: string;
  category: string;
  is_active?: boolean;
  statute_reference?: string;
  effective_date?: string;
  penalty_description?: string;
  check_plugins?: string[];
  weight?: number;
  compliance_threshold?: number;
  created_at?: string;
  updated_at?: string;
};

export type FrameworkDisplayConfig = {
  id?: string;
  framework_id: string;
  banner_text: string;
  banner_color?: string;
  badge_icon?: string;
  badge_label: string;
  trust_rows: Array<{
    icon: string;
    label: string;
    description: string;
    status: string;
  }>;
  legal_refs?: Array<{
    statute: string;
    title: string;
    url?: string;
  }>;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ProviderFramework = {
  id?: string;
  npi: string;
  registry_id?: string;
  framework_id: string;
  is_active?: boolean;
  assigned_at?: string;
  last_checked_at?: string;
  current_score?: number;
  compliance_status?: 'compliant' | 'non_compliant' | 'unknown' | 'exempt';
};

export type ProviderSite = {
  id?: string;
  npi: string;
  registry_id?: string;
  url: string;
  site_label?: string;
  site_type?: 'website' | 'patient_portal' | 'booking' | 'telehealth' | 'blog';
  is_primary?: boolean;
  is_active?: boolean;
  last_scan_at?: string;
  last_score?: number;
  scan_count?: number;
  created_at?: string;
  updated_at?: string;
};

// --- v13 Multi-State Content Model Types ---

export type StateConfig = {
  id?: string;
  state_code: string;
  state_name: string;
  slug: string;
  headline: string;
  subheadline?: string;
  hero_stat?: string;
  hero_stat_label?: string;
  urgency_message?: string;
  provider_count?: number;
  regulation_count?: number;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  geo_lat?: number;
  geo_lng?: number;
  geo_hint_message?: string;
  display_order?: number;
  is_active?: boolean;
  is_featured?: boolean;
  accent_color?: string;
  state_icon?: string;
  created_at?: string;
  updated_at?: string;
};

export type Regulation = {
  id?: string;
  state_code: string;
  framework_id?: string;
  law_code: string;
  slug: string;
  display_name: string;
  short_name?: string;
  effective_date?: string;
  enforcement_date?: string;
  enforcement_body?: string;
  legislative_session?: string;
  penalty_description?: string;
  penalty_amount_max?: string;
  penalty_type?: string;
  summary_short?: string;
  summary_long?: string;
  body_html?: string;
  key_requirements?: Array<{ title: string; description: string; icon?: string }>;
  who_it_affects?: string;
  who_it_affects_details?: Array<{ group: string; description: string }>;
  compliance_steps?: Array<{ step_number: number; title: string; description: string }>;
  faq?: Array<{ question: string; answer: string }>;
  related_resources?: Array<{ title: string; url: string; type?: string }>;
  meta_title?: string;
  meta_description?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type StateProduct = {
  id?: string;
  state_code: string;
  product_key: string;
  display_name: string;
  tagline?: string;
  description: string;
  features?: Array<{ feature: string; included: boolean }>;
  includes?: Array<{ item: string; description: string }>;
  price_cents: number;
  price_display: string;
  price_type?: 'one_time' | 'monthly' | 'annual';
  original_price_cents?: number;
  original_price_display?: string;
  stripe_price_id?: string;
  stripe_product_id?: string;
  stripe_buy_button_id?: string;
  stripe_payment_link?: string;
  regulations_covered?: string[];
  checks_included?: string[];
  tier_level?: number;
  is_popular?: boolean;
  is_available?: boolean;
  cta_text?: string;
  cta_url?: string;
  meta_title?: string;
  meta_description?: string;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type ProviderComplianceCurrent = {
  npi: string;
  registry_id?: string;
  state?: string;
  latest_scan_id?: string;
  latest_scan_date?: string;
  latest_scan_type?: 'manual' | 'auto' | 'global';
  composite_score?: number;
  risk_level?: 'Sovereign' | 'Drift' | 'Violation' | 'unknown';
  frameworks_status?: Record<string, {
    score: number;
    status: string;
    last_checked: string;
  }>;
  data_sovereignty_score?: number;
  ai_transparency_score?: number;
  clinical_integrity_score?: number;
  npi_integrity_score?: number;
  sanctions_status?: 'unchecked' | 'clear' | 'flagged' | 'excluded';
  license_status?: 'unchecked' | 'active' | 'expired' | 'revoked' | 'not_found';
  has_active_alerts?: boolean;
  alert_count?: number;
  critical_alert_count?: number;
  total_findings?: number;
  critical_findings?: number;
  high_findings?: number;
  medium_findings?: number;
  low_findings?: number;
  certification_status?: string;
  consecutive_compliant_months?: number;
  updated_at?: string;
};

