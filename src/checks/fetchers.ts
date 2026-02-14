// checks/fetchers.ts
// ═══ External API Data Fetchers ═══
// All free, no API keys required

import type { NpiOrgRecord, NpiProviderRecord, SiteSnapshot } from './types';

/**
 * Fetch organization NPI data from NLM Clinical Tables API.
 * Free, no auth, fast response.
 * 
 * API: https://clinicaltables.nlm.nih.gov/api/npi_org/v3/search
 */
export async function fetchNpiOrg(npi: string): Promise<NpiOrgRecord | null> {
  try {
    const url = `https://clinicaltables.nlm.nih.gov/api/npi_org/v3/search?terms=${npi}&maxList=1&df=NPI,name.full,provider_type,prac_addr.full,prac_addr.phone,tax.code,tax.classification,enumeration_date,last_updated`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const data = await res.json();
    // Response format: [count, [npi_list], null, [[field_values]]]
    if (!data || data[0] === 0 || !data[3]?.[0]) return null;

    const fields = data[3][0];
    // fields order: NPI, name, type, address, phone, tax_code, tax_class, enum_date, last_updated

    // Parse the full address string
    const addrParts = parseAddressString(fields[3] || '');

    return {
      npi: fields[0] || npi,
      org_name: fields[1] || '',
      prac_line1: addrParts.line1,
      prac_line2: addrParts.line2,
      prac_city: addrParts.city,
      prac_state: addrParts.state,
      prac_zip: addrParts.zip,
      prac_phone: fields[4] || '',
      tax_code: fields[5] || '',
      tax_classification: fields[6] || '',
      enumeration_date: fields[7] || '',
      last_update_date: fields[8] || '',
      addresses_secondary: [],
    };
  } catch (err) {
    console.error(`[Fetcher] NLM API error for NPI ${npi}:`, err);
    return null;
  }
}

/**
 * Also fetch from NPPES directly for more complete data (secondary addresses).
 */
export async function fetchNpiFromNppes(npi: string): Promise<NpiOrgRecord | null> {
  try {
    const url = `https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results?.length) return null;

    const r = data.results[0];
    const basic = r.basic || {};
    const practiceAddr = r.addresses?.find((a: any) => a.address_purpose === 'LOCATION') || r.addresses?.[0] || {};
    const taxonomy = r.taxonomies?.find((t: any) => t.primary) || r.taxonomies?.[0] || {};

    // Get secondary addresses
    const secondaryAddrs = (r.practiceLocations || []).map((loc: any) => ({
      line1: loc.address_1 || '',
      city: loc.city || '',
      state: loc.state || '',
      zip: (loc.postal_code || '').slice(0, 5),
    }));

    return {
      npi: r.number || npi,
      org_name: basic.organization_name || `${basic.first_name || ''} ${basic.last_name || ''}`.trim(),
      prac_line1: practiceAddr.address_1 || '',
      prac_line2: practiceAddr.address_2 || '',
      prac_city: practiceAddr.city || '',
      prac_state: practiceAddr.state || '',
      prac_zip: (practiceAddr.postal_code || '').slice(0, 5),
      prac_phone: practiceAddr.telephone_number || '',
      tax_code: taxonomy.code || '',
      tax_classification: taxonomy.desc || '',
      enumeration_date: basic.enumeration_date || '',
      last_update_date: basic.last_updated || '',
      addresses_secondary: secondaryAddrs,
    };
  } catch (err) {
    console.error(`[Fetcher] NPPES API error for NPI ${npi}:`, err);
    return null;
  }
}

/**
 * Fetch the best available org data — try NLM first (faster), fall back to NPPES.
 * Merge secondary addresses from NPPES.
 */
export async function fetchNpiOrgBest(npi: string): Promise<NpiOrgRecord | null> {
  // Run both in parallel
  const [nlm, nppes] = await Promise.allSettled([
    fetchNpiOrg(npi),
    fetchNpiFromNppes(npi),
  ]);

  const nlmData = nlm.status === 'fulfilled' ? nlm.value : null;
  const nppesData = nppes.status === 'fulfilled' ? nppes.value : null;

  if (!nlmData && !nppesData) return null;

  // Prefer NPPES for completeness (has secondary addresses)
  const primary = nppesData || nlmData;
  if (!primary) return null;

  // Merge secondary addresses from NPPES if NLM was primary
  if (nlmData && nppesData) {
    primary.addresses_secondary = nppesData.addresses_secondary || [];
  }

  return primary;
}

/**
 * Fetch Type-1 (individual) providers by geographic area.
 * Uses NPPES API v2.1 with batching (200 per call, skip up to 1000).
 */
export async function fetchNpiProvidersByGeo(
  city: string,
  state: string,
  zip: string
): Promise<NpiProviderRecord[]> {
  const providers: NpiProviderRecord[] = [];

  try {
    // Try ZIP first (more precise)
    const zip5 = (zip || '').slice(0, 5);
    let baseUrl = `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-1&limit=200`;

    if (zip5) {
      baseUrl += `&postal_code=${zip5}`;
    } else if (city && state) {
      baseUrl += `&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
    } else {
      return [];
    }

    // Batch fetch (up to 3 pages = 600 providers)
    for (let skip = 0; skip <= 400; skip += 200) {
      const url = `${baseUrl}&skip=${skip}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) break;

      const data = await res.json();
      if (!data.results?.length) break;

      for (const r of data.results) {
        const basic = r.basic || {};
        const addr = r.addresses?.find((a: any) => a.address_purpose === 'LOCATION') || r.addresses?.[0] || {};
        const tax = r.taxonomies?.find((t: any) => t.primary) || r.taxonomies?.[0] || {};

        providers.push({
          npi: r.number || '',
          name_full: `${basic.first_name || ''} ${basic.last_name || ''}`.trim(),
          name_first: basic.first_name || '',
          name_last: basic.last_name || '',
          prac_line1: addr.address_1 || '',
          prac_city: addr.city || '',
          prac_state: addr.state || '',
          prac_zip: (addr.postal_code || '').slice(0, 5),
          tax_code: tax.code || '',
          tax_classification: tax.desc || '',
          last_update_date: basic.last_updated || '',
        });
      }

      // If we got fewer than 200, we've reached the end
      if (data.results.length < 200) break;
    }
  } catch (err) {
    console.error(`[Fetcher] NPPES geo query error for ${city}, ${state} ${zip}:`, err);
  }

  return providers;
}

/**
 * Parse a combined address string into components.
 * NLM returns addresses like: "123 Main St, Suite 100, Austin, TX 78701"
 */
function parseAddressString(addr: string): {
  line1: string; line2: string; city: string; state: string; zip: string;
} {
  if (!addr) return { line1: '', line2: '', city: '', state: '', zip: '' };

  const parts = addr.split(',').map(s => s.trim());

  // Try to extract zip from last part
  const lastPart = parts[parts.length - 1] || '';
  const zipMatch = lastPart.match(/(\d{5})(-\d{4})?/);
  const zip = zipMatch ? zipMatch[1] : '';

  // State is usually 2-letter code before or near the zip
  const stateMatch = lastPart.match(/\b([A-Z]{2})\b/);
  const state = stateMatch ? stateMatch[1] : '';

  if (parts.length >= 4) {
    return { line1: parts[0], line2: parts[1], city: parts[2], state, zip };
  } else if (parts.length === 3) {
    return { line1: parts[0], line2: '', city: parts[1], state, zip };
  } else if (parts.length === 2) {
    return { line1: parts[0], line2: '', city: '', state, zip };
  }

  return { line1: addr, line2: '', city: '', state, zip };
}
