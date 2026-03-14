// ═══════════════════════════════════════════════════════════════
// KairoLogic: Payer Directory Types
// ═══════════════════════════════════════════════════════════════

/** Payer endpoint config (mirrors payer_directory_endpoints table) */
export interface PayerEndpoint {
  payer_code: string;
  payer_name: string;
  fhir_base_url: string;
  auth_type: 'none' | 'api_key' | 'oauth2_client_credentials';
  auth_config?: {
    client_id?: string;
    client_secret?: string;
    token_url?: string;
    api_key?: string;
  };
  rate_limit_rpm: number;
  coverage_type: string;
  state_scope: string | null;
  is_active: boolean;
}

/** Flattened provider directory data extracted from FHIR resources */
export interface DirectorySnapshot {
  npi: string;
  payer_code: string;
  snapshot_date: string; // YYYY-MM-DD

  // Provider identity
  listed_name_first: string | null;
  listed_name_last: string | null;
  listed_name_full: string | null;
  listed_credentials: string | null;
  listed_gender: string | null;

  // Practice location
  listed_address_line1: string | null;
  listed_address_line2: string | null;
  listed_city: string | null;
  listed_state: string | null;
  listed_zip: string | null;

  // Contact
  listed_phone: string | null;
  listed_fax: string | null;

  // Clinical
  listed_specialty_code: string | null;
  listed_specialty_display: string | null;
  listed_accepting_patients: boolean | null;

  // Organization
  listed_org_name: string | null;
  listed_org_npi: string | null;

  // Network
  listed_network_name: string | null;
  listed_plan_names: string[] | null;

  // Enhanced directory fields (CAA 2023)
  listed_languages: string[] | null;
  listed_telehealth_available: boolean | null;
  listed_office_hours: Record<string, unknown> | null;
  listed_disability_access: string | null;

  // FHIR references
  fhir_practitioner_id: string | null;
  fhir_practitioner_role_id: string | null;
  fhir_location_id: string | null;
  fhir_organization_id: string | null;
  fhir_raw_bundle: Record<string, unknown> | null;

  // Metadata
  sync_batch_id: string | null;
}

/** NPPES provider data for comparison (from providers + provider_pecos tables) */
export interface NppesProviderData {
  npi: string;
  provider_name: string | null;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  taxonomy_code: string | null;
  taxonomy_desc: string | null;
  gender: string | null;
}

/** Website scan data for comparison */
export interface WebsiteProviderData {
  practice_website_id: string;
  url: string;
  extracted_address: string | null;
  extracted_phone: string | null;
  extracted_providers: string[] | null;
}

/** A single detected mismatch */
export interface DirectoryMismatch {
  npi: string;
  payer_code: string;
  practice_website_id: string | null;
  snapshot_id: string | null;
  field_name: string;
  mismatch_type: 'value_differs' | 'not_listed' | 'wrong_location' | 'specialty_mismatch';
  nppes_value: string | null;
  website_value: string | null;
  payer_value: string | null;
  recommended_value: string | null;
  fix_via_caqh: boolean;
  fix_instructions: string | null;
  priority: number; // 1=critical, 2=high, 3=medium, 4=low
}

/** Correction action in a correction packet */
export interface CorrectionAction {
  step: number;
  action: string;
  target: 'caqh' | 'nppes' | 'payer_direct';
  fixes: string[]; // e.g. ["uhc_address", "aetna_address"]
  effort: string;  // e.g. "5 min"
  details?: string;
}

/** FHIR resource types we care about */
export interface FhirBundle {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: FhirBundleEntry[];
}

export interface FhirBundleEntry {
  fullUrl?: string;
  resource: FhirResource;
  search?: { mode: string };
}

export type FhirResource =
  | FhirPractitioner
  | FhirPractitionerRole
  | FhirLocation
  | FhirOrganization
  | Record<string, unknown>;

export interface FhirPractitioner {
  resourceType: 'Practitioner';
  id: string;
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  gender?: string;
  communication?: FhirCodeableConcept[];
}

export interface FhirPractitionerRole {
  resourceType: 'PractitionerRole';
  id: string;
  practitioner?: FhirReference;
  organization?: FhirReference;
  location?: FhirReference[];
  specialty?: FhirCodeableConcept[];
  extension?: FhirExtension[];
  network?: FhirReference[];
}

export interface FhirLocation {
  resourceType: 'Location';
  id: string;
  name?: string;
  address?: FhirAddress;
  telecom?: FhirContactPoint[];
  hoursOfOperation?: Record<string, unknown>[];
  extension?: FhirExtension[];
}

export interface FhirOrganization {
  resourceType: 'Organization';
  id: string;
  identifier?: FhirIdentifier[];
  name?: string;
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
}

// FHIR primitives
export interface FhirIdentifier {
  system?: string;
  value?: string;
  period?: { start?: string; end?: string };
}

export interface FhirHumanName {
  use?: string;
  text?: string;
  family?: string;
  given?: string[];
  suffix?: string[];
  prefix?: string[];
}

export interface FhirContactPoint {
  system?: string; // 'phone' | 'fax' | 'email'
  value?: string;
  use?: string;    // 'work' | 'home' | 'mobile'
}

export interface FhirAddress {
  use?: string;
  type?: string;
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface FhirCodeableConcept {
  coding?: { system?: string; code?: string; display?: string }[];
  text?: string;
}

export interface FhirReference {
  reference?: string;
  type?: string;
  display?: string;
}

export interface FhirExtension {
  url?: string;
  valueBoolean?: boolean;
  valueString?: string;
  valueReference?: FhirReference;
  extension?: FhirExtension[];
}
