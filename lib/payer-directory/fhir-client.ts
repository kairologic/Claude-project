// ═══════════════════════════════════════════════════════════════
// KairoLogic: FHIR PDex Plan-Net Client
// Queries payer Provider Directory APIs by NPI
// Adapter pattern: one client, per-payer config
// ═══════════════════════════════════════════════════════════════

import type {
  PayerEndpoint,
  DirectorySnapshot,
  FhirBundle,
  FhirBundleEntry,
  FhirPractitioner,
  FhirPractitionerRole,
  FhirLocation,
  FhirOrganization,
  FhirIdentifier,
  FhirHumanName,
  FhirContactPoint,
  FhirAddress,
  FhirCodeableConcept,
  FhirExtension,
} from './types';

const NPI_SYSTEM = 'http://hl7.org/fhir/sid/us-npi';
const NUCC_SYSTEM_PATTERNS = [
  'nucc.org',
  'taxonomy',
  'provider-taxonomy',
];

// ── Rate limiter ──────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  constructor(private rpm: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60_000;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);

    if (this.timestamps.length >= this.rpm) {
      const waitUntil = this.timestamps[0] + 60_000;
      const delay = waitUntil - now;
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    this.timestamps.push(Date.now());
  }
}

// ── FHIR Client ───────────────────────────────────────────────

export class FhirDirectoryClient {
  private rateLimiters = new Map<string, RateLimiter>();
  private authTokens = new Map<string, { token: string; expires: number }>();

  /**
   * Look up a provider by NPI across a single payer directory.
   * Returns a flattened DirectorySnapshot or null if not found.
   */
  async lookupByNpi(
    npi: string,
    endpoint: PayerEndpoint,
    batchId?: string
  ): Promise<DirectorySnapshot | null> {
    if (!endpoint.is_active || endpoint.fhir_base_url === 'TBD') {
      return null;
    }

    const limiter = this.getRateLimiter(endpoint);
    const today = new Date().toISOString().split('T')[0];

    try {
      // ── Step 1: Find Practitioner by NPI ──
      await limiter.wait();
      const practitionerBundle = await this.fhirGet<FhirBundle>(
        endpoint,
        `/Practitioner?identifier=${NPI_SYSTEM}|${npi}`
      );

      const practitioner = this.findResourceInBundle<FhirPractitioner>(
        practitionerBundle,
        'Practitioner'
      );

      if (!practitioner) {
        // Provider not listed in this payer directory
        return this.buildNotListedSnapshot(npi, endpoint.payer_code, today, practitionerBundle, batchId);
      }

      // ── Step 2: Find PractitionerRole (links to Location, Org, Network) ──
      await limiter.wait();
      const roleBundle = await this.fhirGet<FhirBundle>(
        endpoint,
        `/PractitionerRole?practitioner.identifier=${NPI_SYSTEM}|${npi}` +
          `&_include=PractitionerRole:location` +
          `&_include=PractitionerRole:organization` +
          `&_include=PractitionerRole:network`
      );

      const role = this.findResourceInBundle<FhirPractitionerRole>(
        roleBundle,
        'PractitionerRole'
      );

      // Extract included resources from the role bundle
      const location = this.findResourceInBundle<FhirLocation>(
        roleBundle,
        'Location'
      );
      const organization = this.findResourceInBundle<FhirOrganization>(
        roleBundle,
        'Organization'
      );

      // Also check contained resources inside PractitionerRole
      const containedPractitioner = this.findContained<FhirPractitioner>(
        role as unknown as Record<string, unknown>,
        'Practitioner'
      );
      const containedOrg = this.findContained<FhirOrganization>(
        role as unknown as Record<string, unknown>,
        'Organization'
      );

      // Merge: prefer top-level, fall back to contained
      const finalPractitioner = practitioner || containedPractitioner;
      const finalOrg = organization || containedOrg;

      // ── Step 3: Build snapshot ──
      const snapshot = this.buildSnapshot(
        npi,
        endpoint.payer_code,
        today,
        finalPractitioner,
        role,
        location,
        finalOrg,
        { practitioner: practitionerBundle, role: roleBundle },
        batchId
      );

      return snapshot;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [${endpoint.payer_code}] Error looking up NPI ${npi}: ${msg}`);
      return null;
    }
  }

  /**
   * Look up a provider across ALL active payer endpoints.
   */
  async lookupAllPayers(
    npi: string,
    endpoints: PayerEndpoint[],
    batchId?: string
  ): Promise<DirectorySnapshot[]> {
    const results: DirectorySnapshot[] = [];

    for (const endpoint of endpoints) {
      if (!endpoint.is_active || endpoint.fhir_base_url === 'TBD') {
        console.log(`  [${endpoint.payer_code}] Skipped (inactive or TBD endpoint)`);
        continue;
      }

      console.log(`  [${endpoint.payer_code}] Querying ${endpoint.payer_name}...`);
      const snapshot = await this.lookupByNpi(npi, endpoint, batchId);

      if (snapshot) {
        results.push(snapshot);
        const listed = snapshot.listed_name_full || snapshot.listed_name_last || '(no name)';
        const addr = snapshot.listed_city
          ? `${snapshot.listed_city}, ${snapshot.listed_state}`
          : '(no address)';
        console.log(`    → Found: ${listed} at ${addr}`);
      } else {
        console.log(`    → Not found or endpoint unavailable`);
      }
    }

    return results;
  }

  // ── FHIR HTTP ─────────────────────────────────────────────

  private async fhirGet<T>(endpoint: PayerEndpoint, path: string): Promise<T> {
    const url = `${endpoint.fhir_base_url}${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/fhir+json',
    };

    // Add auth headers if needed
    if (endpoint.auth_type === 'api_key' && endpoint.auth_config?.api_key) {
      headers['x-api-key'] = endpoint.auth_config.api_key;
    } else if (endpoint.auth_type === 'oauth2_client_credentials') {
      const token = await this.getOAuthToken(endpoint);
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`FHIR ${res.status}: ${res.statusText} — ${url}`);
    }

    return res.json() as Promise<T>;
  }

  private async getOAuthToken(endpoint: PayerEndpoint): Promise<string | null> {
    const cached = this.authTokens.get(endpoint.payer_code);
    if (cached && cached.expires > Date.now()) return cached.token;

    const config = endpoint.auth_config;
    if (!config?.token_url || !config.client_id || !config.client_secret) return null;

    const res = await fetch(config.token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.client_id,
        client_secret: config.client_secret,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };

    this.authTokens.set(endpoint.payer_code, {
      token: data.access_token,
      expires: Date.now() + (data.expires_in - 60) * 1000,
    });

    return data.access_token;
  }

  // ── Resource extraction ───────────────────────────────────

  private findResourceInBundle<T extends { resourceType: string }>(
    bundle: FhirBundle | null,
    resourceType: string
  ): T | null {
    if (!bundle?.entry) return null;
    const entry = bundle.entry.find(
      (e: FhirBundleEntry) => e.resource?.resourceType === resourceType
    );
    return (entry?.resource as T) || null;
  }

  private findContained<T extends { resourceType: string }>(
    resource: Record<string, unknown> | null,
    resourceType: string
  ): T | null {
    if (!resource) return null;
    const contained = resource['contained'] as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(contained)) return null;
    return (contained.find((c) => c.resourceType === resourceType) as T) || null;
  }

  // ── Field extraction helpers ──────────────────────────────

  private extractNpi(identifiers?: FhirIdentifier[]): string | null {
    if (!identifiers) return null;
    const npiId = identifiers.find((id) => id.system === NPI_SYSTEM);
    return npiId?.value || null;
  }

  private extractName(names?: FhirHumanName[]): {
    first: string | null;
    last: string | null;
    full: string | null;
    credentials: string | null;
  } {
    if (!names || names.length === 0)
      return { first: null, last: null, full: null, credentials: null };

    // Prefer 'usual' or 'official', fall back to first entry
    const name =
      names.find((n) => n.use === 'usual') ||
      names.find((n) => n.use === 'official') ||
      names[0];

    return {
      first: name.given?.[0] || null,
      last: name.family || null,
      full: name.text || [name.given?.join(' '), name.family].filter(Boolean).join(' ') || null,
      credentials: name.suffix?.join(', ') || null,
    };
  }

  private extractPhone(telecoms?: FhirContactPoint[]): string | null {
    if (!telecoms) return null;
    const phone = telecoms.find((t) => t.system === 'phone');
    return phone?.value ? this.normalizePhone(phone.value) : null;
  }

  private extractFax(telecoms?: FhirContactPoint[]): string | null {
    if (!telecoms) return null;
    const fax = telecoms.find((t) => t.system === 'fax');
    return fax?.value ? this.normalizePhone(fax.value) : null;
  }

  private extractAddress(address?: FhirAddress | FhirAddress[]): {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } {
    const addr = Array.isArray(address) ? address[0] : address;
    if (!addr) return { line1: null, line2: null, city: null, state: null, zip: null };

    return {
      line1: addr.line?.[0] || null,
      line2: addr.line?.[1] || null,
      city: addr.city || null,
      state: addr.state || null,
      zip: addr.postalCode?.substring(0, 5) || null,
    };
  }

  private extractSpecialty(specialties?: FhirCodeableConcept[]): {
    code: string | null;
    display: string | null;
  } {
    if (!specialties || specialties.length === 0) return { code: null, display: null };

    const spec = specialties[0];
    // Try to find NUCC taxonomy coding
    const nuccCoding = spec.coding?.find((c) =>
      NUCC_SYSTEM_PATTERNS.some((p) => c.system?.toLowerCase().includes(p))
    );
    const anyCoding = nuccCoding || spec.coding?.[0];

    return {
      code: anyCoding?.code || null,
      display: anyCoding?.display || spec.text || null,
    };
  }

  private extractAcceptingPatients(extensions?: FhirExtension[]): boolean | null {
    if (!extensions) return null;

    // PDex Plan-Net newpatients extension
    const npExt = extensions.find(
      (e) => e.url?.includes('newpatients') || e.url?.includes('new-patients')
    );
    if (!npExt) return null;

    // The extension has sub-extensions: acceptingPatients (boolean), fromNetwork (reference)
    if (npExt.valueBoolean !== undefined) return npExt.valueBoolean;

    const subExt = npExt.extension?.find(
      (e) => e.url === 'acceptingPatients' || e.url?.endsWith('/acceptingPatients')
    );
    return subExt?.valueBoolean ?? null;
  }

  private extractLanguages(communication?: FhirCodeableConcept[]): string[] | null {
    if (!communication || communication.length === 0) return null;
    return communication
      .map((c) => c.coding?.[0]?.display || c.text || null)
      .filter(Boolean) as string[];
  }

  private normalizePhone(phone: string): string {
    // Strip to digits only
    const digits = phone.replace(/\D/g, '');
    // Remove leading 1 for US numbers
    if (digits.length === 11 && digits.startsWith('1')) return digits.substring(1);
    return digits;
  }

  // ── Snapshot builders ─────────────────────────────────────

  private buildSnapshot(
    npi: string,
    payerCode: string,
    date: string,
    practitioner: FhirPractitioner | null,
    role: FhirPractitionerRole | null,
    location: FhirLocation | null,
    organization: FhirOrganization | null,
    rawBundles: Record<string, unknown>,
    batchId?: string
  ): DirectorySnapshot {
    const name = this.extractName(practitioner?.name);
    const addr = this.extractAddress(
      location?.address || practitioner?.address
    );
    const phone =
      this.extractPhone(location?.telecom) ||
      this.extractPhone(practitioner?.telecom);
    const fax =
      this.extractFax(location?.telecom) ||
      this.extractFax(practitioner?.telecom);
    const specialty = this.extractSpecialty(role?.specialty);
    const accepting = this.extractAcceptingPatients(role?.extension);
    const languages = this.extractLanguages(practitioner?.communication);
    const orgNpi = this.extractNpi(organization?.identifier);

    // Network name from role.network reference display
    const networkName = role?.network?.[0]?.display || null;

    return {
      npi,
      payer_code: payerCode,
      snapshot_date: date,

      listed_name_first: name.first,
      listed_name_last: name.last,
      listed_name_full: name.full,
      listed_credentials: name.credentials,
      listed_gender: practitioner?.gender || null,

      listed_address_line1: addr.line1,
      listed_address_line2: addr.line2,
      listed_city: addr.city,
      listed_state: addr.state,
      listed_zip: addr.zip,

      listed_phone: phone,
      listed_fax: fax,

      listed_specialty_code: specialty.code,
      listed_specialty_display: specialty.display,
      listed_accepting_patients: accepting,

      listed_org_name: organization?.name || null,
      listed_org_npi: orgNpi,

      listed_network_name: networkName,
      listed_plan_names: null, // Requires separate InsurancePlan query

      listed_languages: languages,
      listed_telehealth_available: null, // Requires HealthcareService query
      listed_office_hours: location?.hoursOfOperation?.[0] as Record<string, unknown> || null,
      listed_disability_access: null, // Requires Location.extension parse

      fhir_practitioner_id: practitioner?.id || null,
      fhir_practitioner_role_id: role?.id || null,
      fhir_location_id: location?.id || null,
      fhir_organization_id: organization?.id || null,
      fhir_raw_bundle: rawBundles,

      sync_batch_id: batchId || null,
    };
  }

  private buildNotListedSnapshot(
    npi: string,
    payerCode: string,
    date: string,
    rawBundle: FhirBundle | null,
    batchId?: string
  ): DirectorySnapshot {
    // Return a snapshot with all nulls (provider not found in directory)
    // The mismatch engine will detect this as 'not_listed'
    return {
      npi,
      payer_code: payerCode,
      snapshot_date: date,
      listed_name_first: null,
      listed_name_last: null,
      listed_name_full: null,
      listed_credentials: null,
      listed_gender: null,
      listed_address_line1: null,
      listed_address_line2: null,
      listed_city: null,
      listed_state: null,
      listed_zip: null,
      listed_phone: null,
      listed_fax: null,
      listed_specialty_code: null,
      listed_specialty_display: null,
      listed_accepting_patients: null,
      listed_org_name: null,
      listed_org_npi: null,
      listed_network_name: null,
      listed_plan_names: null,
      listed_languages: null,
      listed_telehealth_available: null,
      listed_office_hours: null,
      listed_disability_access: null,
      fhir_practitioner_id: null,
      fhir_practitioner_role_id: null,
      fhir_location_id: null,
      fhir_organization_id: null,
      fhir_raw_bundle: rawBundle as unknown as Record<string, unknown>,
      sync_batch_id: batchId || null,
    };
  }

  // ── Rate limiter helper ───────────────────────────────────

  private getRateLimiter(endpoint: PayerEndpoint): RateLimiter {
    if (!this.rateLimiters.has(endpoint.payer_code)) {
      this.rateLimiters.set(
        endpoint.payer_code,
        new RateLimiter(endpoint.rate_limit_rpm)
      );
    }
    return this.rateLimiters.get(endpoint.payer_code)!;
  }
}
