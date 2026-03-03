import { describe, it, expect } from 'vitest';
import { npiAddressCheck, npiPhoneCheck, npiTaxonomyCheck } from './npi-checks';
import type { CheckContext } from './types';

function makeCtx(overrides: Partial<CheckContext['cache']> = {}): CheckContext {
  return {
    npi: '1234567890',
    url: 'https://example-clinic.com',
    cache: {
      npiOrgData: {
        npi: '1234567890',
        org_name: 'Example Clinic',
        prac_line1: '123 Main St',
        prac_line2: '',
        prac_city: 'Austin',
        prac_state: 'TX',
        prac_zip: '78701',
        prac_phone: '(512) 555-1234',
        tax_code: '207Q00000X',
        tax_classification: 'Family Medicine',
        enumeration_date: '2010-01-15',
        last_update_date: '2024-06-01',
        addresses_secondary: [],
      },
      siteSnapshot: {
        url: 'https://example-clinic.com',
        scrape_time: new Date().toISOString(),
        addr_line1: '123 Main St',
        addr_line2: '',
        addr_city: 'Austin',
        addr_state: 'TX',
        addr_zip: '78701',
        phone: '(512) 555-1234',
        specialty_labels: ['family medicine'],
        provider_names: ['John Smith'],
        provider_count: 1,
        source_hash: 'abc123',
      },
      ...overrides,
    },
  };
}

// ── NPI-01: Address Check ─────────────────────────────

describe('npiAddressCheck', () => {
  it('has correct module metadata', () => {
    expect(npiAddressCheck.id).toBe('NPI-01');
    expect(npiAddressCheck.category).toBe('npi-integrity');
    expect(npiAddressCheck.tier).toBe('free');
    expect(npiAddressCheck.severity).toBe('high');
  });

  it('passes when addresses match', async () => {
    const ctx = makeCtx();
    const result = await npiAddressCheck.run(ctx);
    expect(result.status).toBe('pass');
    expect(result.score).toBe(100);
  });

  it('fails when addresses differ', async () => {
    const ctx = makeCtx();
    ctx.cache.siteSnapshot!.addr_line1 = '999 Different Ave';
    ctx.cache.siteSnapshot!.addr_city = 'Houston';
    ctx.cache.siteSnapshot!.addr_zip = '77001';
    const result = await npiAddressCheck.run(ctx);
    expect(result.status).toBe('fail');
    expect(result.score).toBeLessThan(100);
    expect(result.remediationSteps).toBeDefined();
    expect(result.remediationSteps!.length).toBeGreaterThan(0);
  });

  it('returns inconclusive when NPI org data is missing', async () => {
    const ctx = makeCtx({ npiOrgData: null });
    const result = await npiAddressCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
    expect(result.score).toBe(0);
  });

  it('returns inconclusive when site address is missing', async () => {
    const ctx = makeCtx();
    ctx.cache.siteSnapshot!.addr_line1 = '';
    const result = await npiAddressCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });

  it('passes when secondary address matches', async () => {
    const ctx = makeCtx();
    ctx.cache.siteSnapshot!.addr_line1 = '456 Second St';
    ctx.cache.siteSnapshot!.addr_city = 'Austin';
    ctx.cache.siteSnapshot!.addr_zip = '78702';
    ctx.cache.npiOrgData!.addresses_secondary = [
      { line1: '456 Second St', city: 'Austin', state: 'TX', zip: '78702' },
    ];
    const result = await npiAddressCheck.run(ctx);
    expect(result.status).toBe('pass');
    expect(result.score).toBe(100);
  });
});

// ── NPI-02: Phone Check ───────────────────────────────

describe('npiPhoneCheck', () => {
  it('has correct module metadata', () => {
    expect(npiPhoneCheck.id).toBe('NPI-02');
    expect(npiPhoneCheck.category).toBe('npi-integrity');
    expect(npiPhoneCheck.tier).toBe('free');
    expect(npiPhoneCheck.severity).toBe('medium');
  });

  it('passes when phones match', async () => {
    const ctx = makeCtx();
    const result = await npiPhoneCheck.run(ctx);
    expect(result.status).toBe('pass');
    expect(result.score).toBe(100);
  });

  it('fails when phones differ', async () => {
    const ctx = makeCtx();
    ctx.cache.siteSnapshot!.phone = '(713) 555-9999';
    const result = await npiPhoneCheck.run(ctx);
    expect(result.status).toBe('fail');
    expect(result.score).toBe(40);
    expect(result.remediationSteps).toBeDefined();
  });

  it('returns inconclusive when NPI phone is missing', async () => {
    const ctx = makeCtx();
    ctx.cache.npiOrgData!.prac_phone = '';
    const result = await npiPhoneCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });

  it('returns inconclusive when site phone is missing', async () => {
    const ctx = makeCtx();
    ctx.cache.siteSnapshot!.phone = '';
    const result = await npiPhoneCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });

  it('matches phone with different formatting', async () => {
    const ctx = makeCtx();
    ctx.cache.npiOrgData!.prac_phone = '5125551234';
    ctx.cache.siteSnapshot!.phone = '(512) 555-1234';
    const result = await npiPhoneCheck.run(ctx);
    expect(result.status).toBe('pass');
  });
});

// ── NPI-03: Taxonomy Check ────────────────────────────

describe('npiTaxonomyCheck', () => {
  it('has correct module metadata', () => {
    expect(npiTaxonomyCheck.id).toBe('NPI-03');
    expect(npiTaxonomyCheck.category).toBe('npi-integrity');
    expect(npiTaxonomyCheck.tier).toBe('report');
    expect(npiTaxonomyCheck.severity).toBe('medium');
  });

  it('passes when specialties match', async () => {
    const ctx = makeCtx();
    const result = await npiTaxonomyCheck.run(ctx);
    expect(result.status).toBe('pass');
    expect(result.score).toBe(100);
  });

  it('warns when specialties diverge', async () => {
    const ctx = makeCtx();
    ctx.cache.siteSnapshot!.specialty_labels = ['orthopedic surgery'];
    const result = await npiTaxonomyCheck.run(ctx);
    expect(result.status).toBe('warn');
    expect(result.score).toBe(60);
    expect(result.remediationSteps).toBeDefined();
  });

  it('returns inconclusive when NPI taxonomy is missing', async () => {
    const ctx = makeCtx();
    ctx.cache.npiOrgData!.tax_classification = '';
    const result = await npiTaxonomyCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });

  it('returns inconclusive when site specialties are empty', async () => {
    const ctx = makeCtx();
    ctx.cache.siteSnapshot!.specialty_labels = [];
    const result = await npiTaxonomyCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });

  it('passes with synonym match', async () => {
    const ctx = makeCtx();
    ctx.cache.siteSnapshot!.specialty_labels = ['primary care'];
    const result = await npiTaxonomyCheck.run(ctx);
    expect(result.status).toBe('pass');
  });
});
