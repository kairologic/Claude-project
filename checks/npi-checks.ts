// checks/npi/checks.ts
// ═══ NPI Integrity Check Modules ═══

import type { CheckModule } from '../types';
import {
  normalizeAddress, addressesMatch,
  normalizePhone, phonesMatch,
  specialtyMatches
} from '../utils';

/**
 * NPI-01: Address Mismatch
 * Compares website address to NPI registry practice address(es).
 * Tier: free (show pass/fail in free scan)
 */
export const npiAddressCheck: CheckModule = {
  id: 'NPI-01',
  category: 'npi-integrity',
  name: 'NPI Address Verification',
  description: 'Compares website address to NPI registry practice address',
  severity: 'high',
  tier: 'free',
  statuteRef: 'NPPES Accuracy Requirement',

  async run(ctx) {
    const org = ctx.cache.npiOrgData;
    const site = ctx.cache.siteSnapshot;

    if (!org) {
      return {
        status: 'inconclusive', score: 0,
        title: 'NPI organization data unavailable',
        detail: 'Could not retrieve NPI registry data for this provider',
      };
    }

    if (!site?.addr_line1) {
      return {
        status: 'inconclusive', score: 0,
        title: 'Website address not detected',
        detail: 'Could not extract a street address from the website. Check that your address is visible on the page.',
      };
    }

    const npiAddr = normalizeAddress(org.prac_line1, org.prac_city, org.prac_state, org.prac_zip);
    const siteAddr = normalizeAddress(site.addr_line1, site.addr_city, site.addr_state, site.addr_zip);

    // Check primary address
    if (addressesMatch(npiAddr, siteAddr)) {
      return {
        status: 'pass', score: 100,
        title: 'Address matches NPI record',
        detail: `Website address matches NPI practice address in ${org.prac_city}, ${org.prac_state}`,
        evidence: { npi_address: `${org.prac_line1}, ${org.prac_city}, ${org.prac_state} ${org.prac_zip}`, site_address: `${site.addr_line1}, ${site.addr_city}, ${site.addr_state} ${site.addr_zip}` },
      };
    }

    // Check secondary addresses (multi-site)
    const secondaries = org.addresses_secondary || [];
    for (const sec of secondaries) {
      const secAddr = normalizeAddress(sec.line1, sec.city, sec.state, sec.zip);
      if (addressesMatch(secAddr, siteAddr)) {
        return {
          status: 'pass', score: 100,
          title: 'Address matches NPI secondary location',
          detail: `Website address matches a registered secondary practice location`,
          evidence: { matched_secondary: `${sec.line1}, ${sec.city}, ${sec.state} ${sec.zip}` },
        };
      }
    }

    // Mismatch
    return {
      status: 'fail', score: 25,
      title: 'Address mismatch detected',
      detail: `Website shows "${site.addr_line1}, ${site.addr_city}" but NPI record shows "${org.prac_line1}, ${org.prac_city}"`,
      evidence: {
        npi_address: `${org.prac_line1}, ${org.prac_city}, ${org.prac_state} ${org.prac_zip}`,
        site_address: `${site.addr_line1}, ${site.addr_city}, ${site.addr_state} ${site.addr_zip}`,
        npi_last_updated: org.last_update_date,
        secondary_addresses: secondaries.length,
      },
      remediationSteps: [
        'Verify your current practice address is correct',
        'If you recently moved, update NPPES at https://nppes.cms.hhs.gov',
        'If the NPI record is correct, update your website',
        'If multi-site, register all locations with NPPES as secondary practice addresses',
      ],
    };
  },
};

/**
 * NPI-02: Phone Mismatch
 * Compares website phone number to NPI registry phone.
 * Tier: free
 */
export const npiPhoneCheck: CheckModule = {
  id: 'NPI-02',
  category: 'npi-integrity',
  name: 'NPI Phone Verification',
  description: 'Compares website phone number to NPI registry phone',
  severity: 'medium',
  tier: 'free',
  statuteRef: 'NPPES Accuracy Requirement',

  async run(ctx) {
    const org = ctx.cache.npiOrgData;
    const site = ctx.cache.siteSnapshot;

    if (!org?.prac_phone) {
      return {
        status: 'inconclusive', score: 0,
        title: 'NPI phone data unavailable',
        detail: 'No phone number found in the NPI registry for this provider',
      };
    }

    if (!site?.phone) {
      return {
        status: 'inconclusive', score: 0,
        title: 'Website phone not detected',
        detail: 'Could not extract a phone number from the website',
      };
    }

    if (phonesMatch(org.prac_phone, site.phone)) {
      return {
        status: 'pass', score: 100,
        title: 'Phone matches NPI record',
        detail: `Website phone matches NPI registry: ${org.prac_phone}`,
        evidence: { npi_phone: org.prac_phone, site_phone: site.phone },
      };
    }

    return {
      status: 'fail', score: 40,
      title: 'Phone number mismatch',
      detail: `Website: ${site.phone} | NPI Record: ${org.prac_phone}`,
      evidence: {
        npi_phone: org.prac_phone,
        site_phone: site.phone,
        npi_last_updated: org.last_update_date,
      },
      remediationSteps: [
        'Verify which phone number is current',
        'Update NPPES if the website number is the active line',
        'Update your website if the NPI record is correct',
        'Note: call-tracking numbers (e.g., from Google Ads) may trigger this alert',
      ],
    };
  },
};

/**
 * NPI-03: Taxonomy / Specialty Mismatch
 * Compares website specialty claims to NPI taxonomy classification.
 * Tier: report (teaser in free, full detail in report)
 */
export const npiTaxonomyCheck: CheckModule = {
  id: 'NPI-03',
  category: 'npi-integrity',
  name: 'Specialty / Taxonomy Verification',
  description: 'Compares website specialty labels to NPI taxonomy classification',
  severity: 'medium',
  tier: 'report',
  statuteRef: 'NPPES Taxonomy Requirements',

  async run(ctx) {
    const org = ctx.cache.npiOrgData;
    const site = ctx.cache.siteSnapshot;

    if (!org?.tax_classification) {
      return {
        status: 'inconclusive', score: 0,
        title: 'NPI taxonomy data unavailable',
        detail: 'No taxonomy classification found in the NPI registry',
      };
    }

    if (!site?.specialty_labels?.length) {
      return {
        status: 'inconclusive', score: 0,
        title: 'Website specialties not detected',
        detail: 'Could not extract specialty or service labels from the website',
      };
    }

    if (specialtyMatches(org.tax_classification, site.specialty_labels)) {
      return {
        status: 'pass', score: 100,
        title: 'Specialty matches NPI taxonomy',
        detail: `Website specialty aligns with NPI classification: ${org.tax_classification}`,
        evidence: {
          npi_taxonomy_code: org.tax_code,
          npi_classification: org.tax_classification,
          site_specialties: site.specialty_labels,
        },
      };
    }

    return {
      status: 'warn', score: 60,
      title: 'Specialty discrepancy detected',
      detail: `NPI classification: "${org.tax_classification}" | Website claims: "${site.specialty_labels.join(', ')}"`,
      evidence: {
        npi_taxonomy_code: org.tax_code,
        npi_classification: org.tax_classification,
        site_specialties: site.specialty_labels,
      },
      remediationSteps: [
        'Verify your primary taxonomy code with NPPES',
        'Ensure website specialty labels align with your NPI classification',
        'Umbrella terms like "Primary Care" are generally acceptable',
        'If you offer multiple specialties, consider adding secondary taxonomy codes to NPPES',
      ],
    };
  },
};
