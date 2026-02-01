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
  widget_status?: 'active' | 'warning' | 'hidden';
  widget_id?: string;
  subscription_status?: 'trial' | 'active' | 'inactive';
  is_paid?: boolean;
  is_visible?: boolean;
  scan_count?: number;
  lastScanTimestamp?: number;
  last_scan_result?: any;
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
  name: string;
  subject: string;
  html_body: string;
  text_body?: string;
  event_type: 'scan_complete' | 'purchase_success' | 'consultation_booked' | 'contact_form';
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
