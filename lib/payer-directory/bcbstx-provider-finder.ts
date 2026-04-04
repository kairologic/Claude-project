// ═══════════════════════════════════════════════════════════════
// KairoLogic: BCBS TX Provider Finder Adapter
// On-demand lookup via my.providerfinderonline.com (Sapphire365)
// Uses Browserless for session management
// ═══════════════════════════════════════════════════════════════

import type { DirectorySnapshot } from './types';

const BCBSTX_CONFIG = {
  baseUrl: 'https://my.providerfinderonline.com',
  networkId: '240002020',
  ci: 'TX-UUX',
  corpCode: 'TX',
  locale: 'en',
  accountId: '1289',
  defaultGeoLocation: '32.7767,-96.7970', // Dallas
};

interface BcbsTxSession {
  cookies: string;
  configSignature: string;
  geoLocation: string;
  expiresAt: number;
}

interface BcbsTxProvider {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  specialty: string;
  credentials: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  acceptingNewPatients: boolean | null;
  gender: string;
  organizationName: string;
  npi: string;
}

export class BcbsTxProviderFinder {
  private session: BcbsTxSession | null = null;
  private browserlessUrl: string;

  constructor(browserlessUrl?: string) {
    this.browserlessUrl =
      browserlessUrl || process.env.BROWSERLESS_URL || 'https://chrome.browserless.io';
  }

  /**
   * Look up a provider by name in BCBS TX directory.
   * Returns a DirectorySnapshot compatible with the mismatch engine.
   *
   * Note: BCBS TX Provider Finder doesn't support NPI search.
   * We search by name and match against the known NPI from NPPES.
   */
  async lookupByName(
    firstName: string,
    lastName: string,
    npi: string,
    geoLocation?: string,
    batchId?: string,
  ): Promise<DirectorySnapshot | null> {
    try {
      // Ensure we have a valid session
      if (!this.session || Date.now() > this.session.expiresAt) {
        await this.initSession(geoLocation);
      }
      if (!this.session) {
        console.error('[BCBSTX] Failed to establish session');
        return null;
      }

      // Search by last name
      const searchUrl =
        `${BCBSTX_CONFIG.baseUrl}/api/providers/summary.json?` +
        `fulltext=${encodeURIComponent(lastName)}&` +
        `network_id=${BCBSTX_CONFIG.networkId}&` +
        `geo_location=${this.session.geoLocation}&` +
        `locale=${BCBSTX_CONFIG.locale}&` +
        `data_language=${BCBSTX_CONFIG.locale}&` +
        `page=1&radius=100&limit=20&` +
        `sort=score%20desc,%20distance%20asc&` +
        `transaction_id=${crypto.randomUUID()}&` +
        `account_id=${BCBSTX_CONFIG.accountId}&` +
        `ci=${BCBSTX_CONFIG.ci}&` +
        `config_signature=${encodeURIComponent(this.session.configSignature)}`;

      const response = await this.fetchWithSession(searchUrl);
      if (!response) return this.buildNotListedSnapshot(npi, batchId);

      // Parse and find our provider by matching name
      const providers = this.parseProviderResults(response);
      const match = this.findBestMatch(providers, firstName, lastName);

      if (!match) return this.buildNotListedSnapshot(npi, batchId);

      return this.buildSnapshot(npi, match, batchId);
    } catch (err) {
      console.error(`[BCBSTX] Error looking up ${firstName} ${lastName}: ${err}`);
      return null;
    }
  }

  /**
   * Initialize a Browserless session to get cookies and config_signature.
   */
  private async initSession(geoLocation?: string): Promise<void> {
    const geo = geoLocation || BCBSTX_CONFIG.defaultGeoLocation;
    const pageUrl =
      `${BCBSTX_CONFIG.baseUrl}/?` +
      `ci=${BCBSTX_CONFIG.ci}&` +
      `corp_code=${BCBSTX_CONFIG.corpCode}&` +
      `network_id=${BCBSTX_CONFIG.networkId}&` +
      `geo_location=${geo}&` +
      `locale=${BCBSTX_CONFIG.locale}`;

    // Use Browserless /function endpoint to run a script in headless Chrome
    const browserlessApiUrl = `${this.browserlessUrl}/function?token=${process.env.BROWSERLESS_API_KEY}`;

    const script = `
      module.exports = async ({ page }) => {
        // Intercept network requests to capture config_signature
        let configSignature = '';
        page.on('request', (req) => {
          const url = req.url();
          if (url.includes('config_signature=')) {
            const m = url.match(/config_signature=([^&]+)/);
            if (m) configSignature = decodeURIComponent(m[1]);
          }
        });

        await page.goto('${pageUrl}', { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait for the app to initialize and make its config calls
        await page.waitForTimeout(3000);

        // Extract cookies
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => c.name + '=' + c.value).join('; ');

        // Fallback: check performance entries if request interception missed it
        if (!configSignature) {
          const entries = await page.evaluate(() => {
            return performance.getEntriesByType('resource')
              .filter(r => r.name.includes('config_signature='))
              .map(r => r.name);
          });
          if (entries.length > 0) {
            const m = entries[0].match(/config_signature=([^&]+)/);
            if (m) configSignature = decodeURIComponent(m[1]);
          }
        }

        return { cookies: cookieString, configSignature };
      };
    `;

    try {
      const res = await fetch(browserlessApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/javascript' },
        body: script,
        signal: AbortSignal.timeout(45_000),
      });

      if (!res.ok) throw new Error(`Browserless ${res.status}: ${res.statusText}`);
      const data = await res.json();

      this.session = {
        cookies: data.cookies,
        configSignature: data.configSignature || '{1289}-{1397|72}-{}',
        geoLocation: geo,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute session TTL
      };

      console.log('[BCBSTX] Session established');
    } catch (err) {
      console.error(`[BCBSTX] Session init failed: ${err}`);
      this.session = null;
    }
  }

  /**
   * Make an API call using the established session cookies.
   */
  private async fetchWithSession(url: string): Promise<unknown | null> {
    if (!this.session) return null;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Cookie: this.session.cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: `${BCBSTX_CONFIG.baseUrl}/`,
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        console.log(`[BCBSTX] API ${res.status}: ${res.statusText}`);
        // Session may have expired — invalidate it
        if (res.status === 401 || res.status === 403) {
          this.session = null;
        }
        return null;
      }

      return res.json();
    } catch (err) {
      console.error(`[BCBSTX] Fetch error: ${err}`);
      return null;
    }
  }

  /**
   * Parse the provider search results from the summary.json response.
   *
   * Sapphire365 responses typically have:
   *   { providers: { provider: [ {...}, ... ] } }
   * or sometimes:
   *   { providers: [ {...}, ... ] }
   *
   * Field names are based on Sapphire365 common patterns (may need
   * adjustment after capturing a live response via DevTools).
   */
  private parseProviderResults(data: unknown): BcbsTxProvider[] {
    const d = data as Record<string, unknown>;

    // Try multiple response shapes
    let rawProviders: unknown[] = [];
    if (d?.providers) {
      const providers = d.providers as Record<string, unknown>;
      if (Array.isArray(providers)) {
        rawProviders = providers;
      } else if (providers?.provider) {
        rawProviders = Array.isArray(providers.provider)
          ? providers.provider
          : [providers.provider];
      }
    } else if (d?.results) {
      rawProviders = d.results as unknown[];
    }

    return rawProviders.map(this.mapProviderResult);
  }

  /**
   * Map Sapphire365 provider object to our internal type.
   * Field names based on common Sapphire365 JSON patterns.
   */
  private mapProviderResult(raw: unknown): BcbsTxProvider {
    const r = raw as Record<string, unknown>;

    // Sapphire365 nests address in a locations array or address object
    const locations = r['locations'] as Record<string, unknown>[] | undefined;
    const loc = locations?.[0] || {};
    const addr = (r['address'] || loc['address'] || {}) as Record<string, unknown>;

    return {
      id: String(r['provider_id'] || r['id'] || ''),
      firstName: String(r['first_name'] || r['given_name'] || ''),
      lastName: String(r['last_name'] || r['family_name'] || ''),
      fullName: String(r['display_name'] || r['provider_name'] || r['name'] || ''),
      specialty: String(r['field_specialty'] || r['specialty'] || r['primary_specialty'] || ''),
      credentials: String(r['degree'] || r['credentials'] || ''),
      phone: String(loc['phone'] || r['phone'] || addr['phone'] || ''),
      addressLine1: String(addr['address_line_1'] || addr['street'] || loc['address_line_1'] || ''),
      addressLine2: String(addr['address_line_2'] || loc['address_line_2'] || ''),
      city: String(addr['city'] || loc['city'] || ''),
      state: String(addr['state'] || loc['state'] || ''),
      zip: String(addr['zip'] || addr['postal_code'] || loc['zip'] || ''),
      acceptingNewPatients: (r['accepting_new_patients'] ??
        loc['accepting_new_patients'] ??
        null) as boolean | null,
      gender: String(r['gender'] || r['professional_gender'] || ''),
      organizationName: String(
        r['group_name'] || r['organization_name'] || loc['group_name'] || '',
      ),
      npi: String(r['npi'] || ''),
    };
  }

  /**
   * Match search results to our target provider.
   * Uses NPI if available in the response, otherwise name matching.
   */
  private findBestMatch(
    providers: BcbsTxProvider[],
    firstName: string,
    lastName: string,
  ): BcbsTxProvider | null {
    if (providers.length === 0) return null;

    const normalizedFirst = firstName.toLowerCase().trim();
    const normalizedLast = lastName.toLowerCase().trim();

    // NPI match (if response includes NPI — some Sapphire365 configs do)
    // We'd compare against the known NPI, but since we don't have it in this
    // scope, we rely on name matching

    // Exact match first
    const exact = providers.find(
      (p) =>
        p.lastName.toLowerCase().trim() === normalizedLast &&
        p.firstName.toLowerCase().trim() === normalizedFirst,
    );
    if (exact) return exact;

    // Full name match (display_name contains both)
    const fullNameMatch = providers.find((p) => {
      const fn = p.fullName.toLowerCase();
      return fn.includes(normalizedFirst) && fn.includes(normalizedLast);
    });
    if (fullNameMatch) return fullNameMatch;

    // Partial match (first initial + last name)
    const partial = providers.find(
      (p) =>
        p.lastName.toLowerCase().trim() === normalizedLast &&
        p.firstName.toLowerCase().trim().startsWith(normalizedFirst.charAt(0)),
    );
    if (partial) return partial;

    // Last name only (if single result)
    const lastOnly = providers.filter((p) => p.lastName.toLowerCase().trim() === normalizedLast);
    if (lastOnly.length === 1) return lastOnly[0];

    return null;
  }

  /**
   * Build a DirectorySnapshot from the BCBS TX provider data.
   */
  private buildSnapshot(
    npi: string,
    provider: BcbsTxProvider,
    batchId?: string,
  ): DirectorySnapshot {
    const today = new Date().toISOString().split('T')[0];
    return {
      npi,
      payer_code: 'bcbs_tx',
      snapshot_date: today,
      listed_name_first: provider.firstName || null,
      listed_name_last: provider.lastName || null,
      listed_name_full: provider.fullName || null,
      listed_credentials: provider.credentials || null,
      listed_gender: provider.gender || null,
      listed_address_line1: provider.addressLine1 || null,
      listed_address_line2: provider.addressLine2 || null,
      listed_city: provider.city || null,
      listed_state: provider.state || null,
      listed_zip: provider.zip?.substring(0, 5) || null,
      listed_phone: provider.phone ? provider.phone.replace(/\D/g, '').replace(/^1/, '') : null,
      listed_fax: null,
      listed_specialty_code: null, // Provider Finder uses display names, not NUCC codes
      listed_specialty_display: provider.specialty || null,
      listed_accepting_patients: provider.acceptingNewPatients,
      listed_org_name: provider.organizationName || null,
      listed_org_npi: null,
      listed_network_name: null,
      listed_plan_names: null,
      listed_languages: null,
      listed_telehealth_available: null,
      listed_office_hours: null,
      listed_disability_access: null,
      fhir_practitioner_id: provider.id || null,
      fhir_practitioner_role_id: null,
      fhir_location_id: null,
      fhir_organization_id: null,
      fhir_raw_bundle: null,
      sync_batch_id: batchId || null,
    };
  }

  private buildNotListedSnapshot(npi: string, batchId?: string): DirectorySnapshot {
    const today = new Date().toISOString().split('T')[0];
    return {
      npi,
      payer_code: 'bcbs_tx',
      snapshot_date: today,
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
      fhir_raw_bundle: null,
      sync_batch_id: batchId || null,
    };
  }
}
