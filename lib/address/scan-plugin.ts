// lib/address/scan-plugin.ts
// ═══ Address Extraction Scan Plugin ═══
// Integrates the address extraction engine into the existing scan engine
// (checks/engine.ts). Runs as part of each scan cycle and writes results
// to provider_sites and practice_providers tables.
//
// Two usage modes:
//   1. As a scan engine plugin (called from engine.ts context)
//   2. Standalone (called directly for batch extraction jobs)

import {
  extractAddressFromSite,
  extractAddressFromHtml,
  type ExtractionSummary,
  type AddressExtractionResult,
} from './index';

// ── Supabase helpers ─────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function supabaseRequest(path: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${path} failed: ${response.status} ${errorText}`);
  }

  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) return response.json();
  return null;
}

// ── Provider Sites Update ────────────────────────────────

/**
 * Write address extraction results to the provider_sites table.
 * Updates the columns added in the Sprint 1 migration addendum.
 */
export async function saveExtractionToProviderSites(
  npi: string,
  url: string,
  extraction: ExtractionSummary,
): Promise<void> {
  const best = extraction.best_address;

  const updatePayload: Record<string, any> = {
    last_extracted_at: new Date().toISOString(),
    extraction_method: best?.method || null,
    updated_at: new Date().toISOString(),
  };

  if (best?.address) {
    updatePayload.extracted_address = best.address.address_line_1;
    updatePayload.extracted_city = best.address.city;
    updatePayload.extracted_state = best.address.state;
    updatePayload.extracted_zip = best.address.zip_code;
    updatePayload.address_source = best.method;
    updatePayload.address_confidence = best.confidence;
  }

  if (extraction.phone) {
    updatePayload.extracted_phone = extraction.phone.phone;
  }

  if (extraction.specialty) {
    updatePayload.extracted_specialty = extraction.specialty;
  }

  if (extraction.schema_org_data) {
    updatePayload.schema_org_data = extraction.schema_org_data;
  }

  // Upsert: update existing row matching npi + url
  await supabaseRequest(
    `provider_sites?npi=eq.${npi}&url=eq.${encodeURIComponent(url)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updatePayload),
    },
  );
}

// ── Practice Providers Update ────────────────────────────

/**
 * Write extracted web values to practice_providers for delta comparison.
 * The delta engine uses these web-detected values to compare against NPPES.
 */
export async function saveExtractionToPracticeProviders(
  npi: string,
  practiceWebsiteId: string,
  extraction: ExtractionSummary,
): Promise<void> {
  const best = extraction.best_address;
  if (!best?.address) return;

  const updatePayload: Record<string, any> = {
    web_address: best.address.full_address,
    updated_at: new Date().toISOString(),
  };

  if (extraction.phone) {
    updatePayload.web_phone = extraction.phone.phone;
  }

  if (extraction.specialty) {
    updatePayload.web_specialty = extraction.specialty;
  }

  await supabaseRequest(
    `practice_providers?npi=eq.${npi}&practice_website_id=eq.${practiceWebsiteId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updatePayload),
    },
  );
}

// ── Scan Engine Integration ──────────────────────────────

export interface AddressCheckResult {
  status: 'pass' | 'fail' | 'warn' | 'inconclusive';
  score: number;
  title: string;
  detail: string;
  evidence: {
    site_address?: string;
    npi_address?: string;
    extraction_method?: string;
    confidence?: number;
    corroborated?: boolean;
    provider_names?: string[];
  };
  extraction: ExtractionSummary;
}

/**
 * Run address extraction as part of the scan engine.
 * Called from engine.ts with the existing CheckContext.
 *
 * This replaces the old NPI-01 address comparison with a multi-method,
 * confidence-scored extraction that feeds the delta engine.
 *
 * @param npi - Provider NPI
 * @param url - Practice website URL
 * @param html - Crawled HTML (from siteSnapshot in engine context)
 * @param text - Stripped text
 * @param npiAddress - NPPES address of record (from npiOrgData cache)
 */
export async function runAddressExtractionCheck(
  npi: string,
  url: string,
  html: string,
  text: string,
  npiAddress?: {
    address_line_1?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  },
): Promise<AddressCheckResult> {
  // Run extraction
  let extraction: ExtractionSummary;

  try {
    extraction = await extractAddressFromSite(url, html, text, {
      maxSubPages: 3,
    });
  } catch (err) {
    return {
      status: 'inconclusive',
      score: 0,
      title: 'Address Extraction — check failed',
      detail: `Could not extract address from website: ${err instanceof Error ? err.message : 'unknown error'}`,
      evidence: {},
      extraction: emptyExtractionSummary(),
    };
  }

  const best = extraction.best_address;

  // No address found on website
  if (!best?.address) {
    return {
      status: 'warn',
      score: 50,
      title: 'No practice address found on website',
      detail: `Scanned ${extraction.page_urls_scanned.length} page(s) using ${extraction.extraction_methods_tried.length} methods. No valid US address detected. This may indicate the website lacks structured address information or uses an unsupported format.`,
      evidence: {
        extraction_method: 'none',
        provider_names: extraction.provider_names,
      },
      extraction,
    };
  }

  // Address found but no NPPES data to compare
  if (!npiAddress?.address_line_1) {
    return {
      status: 'pass',
      score: 75,
      title: 'Website address detected (NPPES comparison pending)',
      detail: `Detected address: ${best.address.full_address} (${best.method}, confidence: ${(best.confidence * 100).toFixed(0)}%). NPPES address not available for comparison.`,
      evidence: {
        site_address: best.address.full_address,
        extraction_method: best.method,
        confidence: best.confidence,
        corroborated: extraction.corroborated,
        provider_names: extraction.provider_names,
      },
      extraction,
    };
  }

  // Compare website address against NPPES
  const npiFullAddress = [
    npiAddress.address_line_1,
    npiAddress.city,
    npiAddress.state,
    npiAddress.zip_code,
  ].filter(Boolean).join(', ');

  const isMatch = addressesMatchLoose(best.address, npiAddress);

  if (isMatch) {
    return {
      status: 'pass',
      score: 100,
      title: 'Practice address matches NPPES',
      detail: `Website address matches NPPES record. Method: ${best.method}, confidence: ${(best.confidence * 100).toFixed(0)}%${extraction.corroborated ? ', corroborated by multiple methods' : ''}.`,
      evidence: {
        site_address: best.address.full_address,
        npi_address: npiFullAddress,
        extraction_method: best.method,
        confidence: best.confidence,
        corroborated: extraction.corroborated,
      },
      extraction,
    };
  }

  // Mismatch detected
  return {
    status: 'fail',
    score: 0,
    title: 'Practice address mismatch with NPPES',
    detail: `Website shows "${best.address.full_address}" but NPPES has "${npiFullAddress}". Extraction method: ${best.method}, confidence: ${(best.confidence * 100).toFixed(0)}%${extraction.corroborated ? ' (corroborated)' : ''}. This mismatch may cause claim denials and credentialing delays.`,
    evidence: {
      site_address: best.address.full_address,
      npi_address: npiFullAddress,
      extraction_method: best.method,
      confidence: best.confidence,
      corroborated: extraction.corroborated,
      provider_names: extraction.provider_names,
    },
    extraction,
  };
}

// ── Loose Address Comparison ─────────────────────────────

/**
 * Compare extracted address against NPPES address with normalization.
 * More forgiving than exact match: handles abbreviations, missing suite numbers, etc.
 */
function addressesMatchLoose(
  extracted: { address_line_1: string; city: string; state: string; zip_code: string },
  nppes: { address_line_1?: string; city?: string; state?: string; zip_code?: string },
): boolean {
  const norm = (s?: string) => (s || '').toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/street/g, 'st')
    .replace(/avenue/g, 'ave')
    .replace(/boulevard/g, 'blvd')
    .replace(/drive/g, 'dr')
    .replace(/lane/g, 'ln')
    .replace(/road/g, 'rd')
    .replace(/court/g, 'ct')
    .replace(/place/g, 'pl')
    .replace(/suite/g, 'ste')
    .replace(/building/g, 'bldg')
    .replace(/floor/g, 'fl')
    .replace(/apartment/g, 'apt')
    .replace(/north/g, 'n')
    .replace(/south/g, 's')
    .replace(/east/g, 'e')
    .replace(/west/g, 'w');

  const streetMatch = norm(extracted.address_line_1) === norm(nppes.address_line_1);
  const cityMatch = norm(extracted.city) === norm(nppes.city);
  const stateMatch = extracted.state.toUpperCase() === (nppes.state || '').toUpperCase();

  // Street + city + state must all match
  // Zip is optional (NPPES sometimes has zip+4, website has zip-5)
  return streetMatch && cityMatch && stateMatch;
}

function emptyExtractionSummary(): ExtractionSummary {
  return {
    best_address: null,
    all_addresses: [],
    phone: null,
    specialty: null,
    provider_names: [],
    schema_org_data: null,
    corroborated: false,
    corroboration_count: 0,
    extraction_methods_tried: [],
    page_urls_scanned: [],
  };
}
