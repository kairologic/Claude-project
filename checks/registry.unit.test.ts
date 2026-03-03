import { describe, it, expect } from 'vitest';
import {
  CHECK_REGISTRY,
  getChecksForTier,
  getChecksByCategory,
  getCheckById,
  CATEGORY_META,
} from './registry';

describe('CHECK_REGISTRY', () => {
  it('contains at least 5 checks', () => {
    expect(CHECK_REGISTRY.length).toBeGreaterThanOrEqual(5);
  });

  it('all checks have required fields', () => {
    for (const check of CHECK_REGISTRY) {
      expect(check.id).toBeTruthy();
      expect(check.category).toBeTruthy();
      expect(check.name).toBeTruthy();
      expect(check.description).toBeTruthy();
      expect(['critical', 'high', 'medium', 'low']).toContain(check.severity);
      expect(['free', 'report', 'shield']).toContain(check.tier);
      expect(typeof check.run).toBe('function');
    }
  });

  it('has unique check IDs', () => {
    const ids = CHECK_REGISTRY.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getChecksForTier', () => {
  it('free tier returns only free checks', () => {
    const checks = getChecksForTier('free');
    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      expect(check.tier).toBe('free');
    }
  });

  it('report tier includes free + report checks', () => {
    const freeChecks = getChecksForTier('free');
    const reportChecks = getChecksForTier('report');
    expect(reportChecks.length).toBeGreaterThanOrEqual(freeChecks.length);

    const tiers = new Set(reportChecks.map(c => c.tier));
    expect(tiers.has('shield')).toBe(false);
  });

  it('shield tier includes all checks', () => {
    const shieldChecks = getChecksForTier('shield');
    expect(shieldChecks.length).toBe(CHECK_REGISTRY.length);
  });

  it('tiers are properly ordered: free < report < shield', () => {
    const free = getChecksForTier('free').length;
    const report = getChecksForTier('report').length;
    const shield = getChecksForTier('shield').length;
    expect(free).toBeLessThanOrEqual(report);
    expect(report).toBeLessThanOrEqual(shield);
  });
});

describe('getChecksByCategory', () => {
  it('returns grouped checks', () => {
    const grouped = getChecksByCategory();
    expect(Object.keys(grouped).length).toBeGreaterThan(0);
  });

  it('includes npi-integrity category', () => {
    const grouped = getChecksByCategory();
    expect(grouped['npi-integrity']).toBeDefined();
    expect(grouped['npi-integrity'].length).toBeGreaterThanOrEqual(3);
  });

  it('total checks across groups equals registry length', () => {
    const grouped = getChecksByCategory();
    const totalGrouped = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
    expect(totalGrouped).toBe(CHECK_REGISTRY.length);
  });
});

describe('getCheckById', () => {
  it('finds existing checks', () => {
    expect(getCheckById('NPI-01')).toBeDefined();
    expect(getCheckById('NPI-01')!.name).toBe('NPI Address Verification');
  });

  it('returns undefined for non-existent check', () => {
    expect(getCheckById('NONEXISTENT-99')).toBeUndefined();
  });

  it('finds all registered check IDs', () => {
    for (const check of CHECK_REGISTRY) {
      expect(getCheckById(check.id)).toBeDefined();
    }
  });
});

describe('CATEGORY_META', () => {
  it('has entries for known categories', () => {
    expect(CATEGORY_META['data-residency']).toBeDefined();
    expect(CATEGORY_META['ai-transparency']).toBeDefined();
    expect(CATEGORY_META['clinical-integrity']).toBeDefined();
    expect(CATEGORY_META['npi-integrity']).toBeDefined();
  });

  it('each meta has name, icon, and color', () => {
    for (const [, meta] of Object.entries(CATEGORY_META)) {
      expect(meta.name).toBeTruthy();
      expect(meta.icon).toBeTruthy();
      expect(meta.color).toBeTruthy();
    }
  });
});
