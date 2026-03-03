import { describe, it, expect } from 'vitest';
import { rosterCountCheck, rosterNameCheck } from './roster-checks';
import type { CheckContext, NpiProviderRecord, SiteSnapshot } from './types';

function makeProvider(name: string, npi: string = '1234567890'): NpiProviderRecord {
  return {
    npi,
    name_full: name,
    name_first: name.split(' ')[0],
    name_last: name.split(' ').slice(-1)[0],
    prac_line1: '123 Main St',
    prac_city: 'Austin',
    prac_state: 'TX',
    prac_zip: '78701',
    tax_code: '207Q00000X',
    tax_classification: 'Family Medicine',
    last_update_date: '2024-01-01',
  };
}

function makeSnapshot(providers: string[], count?: number): SiteSnapshot {
  return {
    url: 'https://example.com',
    scrape_time: new Date().toISOString(),
    addr_line1: '123 Main St',
    addr_line2: '',
    addr_city: 'Austin',
    addr_state: 'TX',
    addr_zip: '78701',
    phone: '(512) 555-1234',
    specialty_labels: ['family medicine'],
    provider_names: providers,
    provider_count: count ?? providers.length,
    source_hash: 'abc123',
  };
}

function makeCtx(
  siteProviders: string[],
  npiProviders: NpiProviderRecord[],
  siteCount?: number,
): CheckContext {
  return {
    npi: '1234567890',
    url: 'https://example.com',
    cache: {
      siteSnapshot: makeSnapshot(siteProviders, siteCount),
      npiProviders,
    },
  };
}

// ── RST-01: Roster Count ──────────────────────────────

describe('rosterCountCheck', () => {
  it('has correct module metadata', () => {
    expect(rosterCountCheck.id).toBe('RST-01');
    expect(rosterCountCheck.category).toBe('npi-integrity');
    expect(rosterCountCheck.tier).toBe('report');
  });

  it('passes when counts are within 10%', async () => {
    const ctx = makeCtx(
      ['Dr. A', 'Dr. B', 'Dr. C', 'Dr. D', 'Dr. E', 'Dr. F', 'Dr. G', 'Dr. H', 'Dr. I', 'Dr. J'],
      Array.from({ length: 10 }, (_, i) => makeProvider(`Provider ${i}`, `100000000${i}`)),
    );
    const result = await rosterCountCheck.run(ctx);
    expect(result.status).toBe('pass');
    expect(result.score).toBe(100);
  });

  it('warns when variance is 11-30%', async () => {
    // 10 on site, 7 in NPI => 30% variance
    const ctx = makeCtx(
      Array.from({ length: 10 }, (_, i) => `Dr. ${i}`),
      Array.from({ length: 7 }, (_, i) => makeProvider(`Provider ${i}`, `100000000${i}`)),
    );
    const result = await rosterCountCheck.run(ctx);
    expect(result.status).toBe('warn');
    expect(result.score).toBe(60);
  });

  it('fails when variance exceeds 30%', async () => {
    // 10 on site, 4 in NPI => 60% variance
    const ctx = makeCtx(
      Array.from({ length: 10 }, (_, i) => `Dr. ${i}`),
      Array.from({ length: 4 }, (_, i) => makeProvider(`Provider ${i}`, `100000000${i}`)),
    );
    const result = await rosterCountCheck.run(ctx);
    expect(result.status).toBe('fail');
    expect(result.score).toBeLessThan(60);
  });

  it('returns inconclusive when site provider count is 0', async () => {
    const ctx = makeCtx([], [makeProvider('Dr. A')], 0);
    const result = await rosterCountCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });

  it('returns inconclusive when NPI providers are empty', async () => {
    const ctx = makeCtx(['Dr. A'], []);
    const result = await rosterCountCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });
});

// ── RST-02: Roster Name Matching ──────────────────────

describe('rosterNameCheck', () => {
  it('has correct module metadata', () => {
    expect(rosterNameCheck.id).toBe('RST-02');
    expect(rosterNameCheck.category).toBe('npi-integrity');
    expect(rosterNameCheck.tier).toBe('shield');
    expect(rosterNameCheck.severity).toBe('high');
  });

  it('passes when all names match', async () => {
    const names = ['John Smith', 'Jane Doe', 'Bob Johnson'];
    const npiProviders = names.map((n, i) => makeProvider(n, `100000000${i}`));
    const ctx = makeCtx(names, npiProviders);
    const result = await rosterNameCheck.run(ctx);
    expect(result.status).toBe('pass');
    expect(result.score).toBe(100);
  });

  it('warns when 1-2 names mismatch', async () => {
    const siteNames = ['John Smith', 'Jane Doe', 'Unknown Person'];
    const npiProviders = [
      makeProvider('John Smith', '1000000001'),
      makeProvider('Jane Doe', '1000000002'),
      makeProvider('Alice Williams', '1000000003'),
    ];
    const ctx = makeCtx(siteNames, npiProviders);
    const result = await rosterNameCheck.run(ctx);
    expect(['warn', 'fail']).toContain(result.status);
  });

  it('fails when many names mismatch', async () => {
    const siteNames = ['Alpha One', 'Beta Two', 'Gamma Three', 'Delta Four'];
    const npiProviders = [
      makeProvider('Epsilon Five', '1000000001'),
      makeProvider('Zeta Six', '1000000002'),
      makeProvider('Eta Seven', '1000000003'),
      makeProvider('Theta Eight', '1000000004'),
    ];
    const ctx = makeCtx(siteNames, npiProviders);
    const result = await rosterNameCheck.run(ctx);
    expect(result.status).toBe('fail');
  });

  it('returns inconclusive when site names are empty', async () => {
    const ctx = makeCtx([], [makeProvider('John Smith')]);
    const result = await rosterNameCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });

  it('returns inconclusive when NPI providers are empty', async () => {
    const ctx = makeCtx(['John Smith'], []);
    const result = await rosterNameCheck.run(ctx);
    expect(result.status).toBe('inconclusive');
  });

  it('includes evidence with match details', async () => {
    const siteNames = ['John Smith', 'Unknown'];
    const npiProviders = [
      makeProvider('John Smith', '1000000001'),
      makeProvider('Jane Doe', '1000000002'),
    ];
    const ctx = makeCtx(siteNames, npiProviders);
    const result = await rosterNameCheck.run(ctx);
    expect(result.evidence).toBeDefined();
    expect(result.evidence!.matched_count).toBeDefined();
    expect(result.evidence!.match_rate).toBeDefined();
  });
});
