// checks/types.ts
// ═══ KairoLogic Check Engine v2 — Type Definitions ═══

export interface CheckModule {
  id: string;
  category: 'data-residency' | 'ai-transparency' | 'clinical-integrity' | 'npi-integrity';
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tier: 'free' | 'report' | 'shield';
  statuteRef?: string;
  run(context: CheckContext): Promise<CheckResult>;
}

export interface CheckContext {
  npi: string;
  url: string;
  cache: {
    npiOrgData?: NpiOrgRecord | null;
    npiProviders?: NpiProviderRecord[];
    siteSnapshot?: SiteSnapshot | null;
  };
}

export interface CheckResult {
  status: 'pass' | 'fail' | 'warn' | 'inconclusive';
  score: number;
  title: string;
  detail: string;
  evidence?: Record<string, any>;
  remediationSteps?: string[];
}

export interface NpiOrgRecord {
  npi: string;
  org_name: string;
  prac_line1: string;
  prac_line2: string;
  prac_city: string;
  prac_state: string;
  prac_zip: string;
  prac_phone: string;
  tax_code: string;
  tax_classification: string;
  enumeration_date: string;
  last_update_date: string;
  addresses_secondary: Array<{
    line1: string;
    city: string;
    state: string;
    zip: string;
  }>;
}

export interface NpiProviderRecord {
  npi: string;
  name_full: string;
  name_first: string;
  name_last: string;
  prac_line1: string;
  prac_city: string;
  prac_state: string;
  prac_zip: string;
  tax_code: string;
  tax_classification: string;
  last_update_date: string;
}

export interface SiteSnapshot {
  url: string;
  scrape_time: string;
  addr_line1: string;
  addr_line2: string;
  addr_city: string;
  addr_state: string;
  addr_zip: string;
  phone: string;
  specialty_labels: string[];
  provider_names: string[];
  provider_count: number;
  source_hash: string;
  raw_data?: Record<string, any>;
}

// Scan session
export interface ScanSession {
  id: string;
  npi: string;
  url: string;
  tier: 'free' | 'report' | 'shield';
  composite_score: number;
  risk_level: string;
  checks_total: number;
  checks_passed: number;
  checks_failed: number;
  checks_warned: number;
  results: CheckResultWithId[];
  started_at: string;
  completed_at: string;
}

export interface CheckResultWithId extends CheckResult {
  id: string;
  category: string;
  tier: string;
  severity: string;
  statuteRef?: string;
  name: string;
}
