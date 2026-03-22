// ═══════════════════════════════════════════════════════════════
// KairoLogic: Unified Payer Directory Lookup
// Routes to FHIR client or scraper adapters based on endpoint config
// ═══════════════════════════════════════════════════════════════

import { FhirDirectoryClient } from './fhir-client';
import { BcbsTxProviderFinder } from './bcbstx-provider-finder';
import type { PayerEndpoint, DirectorySnapshot } from './types';

export class PayerDirectoryLookup {
  private fhirClient = new FhirDirectoryClient();
  private bcbstxFinder = new BcbsTxProviderFinder();

  /**
   * Look up a provider across a single payer.
   * Automatically routes to the correct adapter based on endpoint config.
   */
  async lookup(
    npi: string,
    providerFirstName: string,
    providerLastName: string,
    endpoint: PayerEndpoint,
    geoLocation?: string,
    batchId?: string
  ): Promise<DirectorySnapshot | null> {
    // Skip inactive endpoints
    if (!endpoint.is_active) return null;

    // Route to BCBS TX scraper if endpoint URL starts with SCRAPE:
    if (endpoint.fhir_base_url.startsWith('SCRAPE:')) {
      if (endpoint.payer_code === 'bcbs_tx' || endpoint.payer_code === 'bcbstx') {
        return this.bcbstxFinder.lookupByName(
          providerFirstName,
          providerLastName,
          npi,
          geoLocation,
          batchId
        );
      }
      // Future scrapers for other payers would go here
      console.warn(`[PayerLookup] No scraper for ${endpoint.payer_code}`);
      return null;
    }

    // Standard FHIR lookup
    return this.fhirClient.lookupByNpi(npi, endpoint, batchId);
  }

  /**
   * Look up a provider across ALL active payer endpoints.
   * FHIR endpoints run in parallel; scrape endpoints run sequentially
   * (to respect rate limits and session management).
   */
  async lookupAllPayers(
    npi: string,
    providerFirstName: string,
    providerLastName: string,
    endpoints: PayerEndpoint[],
    geoLocation?: string,
    batchId?: string
  ): Promise<DirectorySnapshot[]> {
    const fhirEndpoints = endpoints.filter(
      e => e.is_active && !e.fhir_base_url.startsWith('SCRAPE:')
    );
    const scrapeEndpoints = endpoints.filter(
      e => e.is_active && e.fhir_base_url.startsWith('SCRAPE:')
    );

    // Run FHIR lookups in parallel
    const fhirResults = await Promise.allSettled(
      fhirEndpoints.map(async (endpoint) => {
        console.log(`  [${endpoint.payer_code}] Querying ${endpoint.payer_name} (FHIR)...`);
        return this.fhirClient.lookupByNpi(npi, endpoint, batchId);
      })
    );

    const results: DirectorySnapshot[] = [];
    for (const r of fhirResults) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }

    // Run scrape lookups sequentially (rate limit / session management)
    for (const endpoint of scrapeEndpoints) {
      console.log(`  [${endpoint.payer_code}] Querying ${endpoint.payer_name} (scrape)...`);
      try {
        const snapshot = await this.lookup(
          npi, providerFirstName, providerLastName, endpoint, geoLocation, batchId
        );
        if (snapshot) results.push(snapshot);

        // Rate limit: 2 second delay between scrape calls
        if (scrapeEndpoints.indexOf(endpoint) < scrapeEndpoints.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        console.error(`  [${endpoint.payer_code}] Scrape error: ${err}`);
      }
    }

    return results;
  }

  /**
   * FHIR-only lookup for batch scanning.
   * Excludes scrape endpoints — use for weekly cron, not on-demand.
   */
  async lookupAllFhirOnly(
    npi: string,
    endpoints: PayerEndpoint[],
    batchId?: string
  ): Promise<DirectorySnapshot[]> {
    const fhirEndpoints = endpoints.filter(
      e => e.is_active && !e.fhir_base_url.startsWith('SCRAPE:')
    );
    return this.fhirClient.lookupAllPayers(npi, fhirEndpoints, batchId);
  }
}
