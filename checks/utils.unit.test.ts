import { describe, it, expect } from 'vitest';
import {
  normalizeAddress,
  addressesMatch,
  normalizePhone,
  phonesMatch,
  normalizeName,
  fuzzyNameMatch,
  specialtyMatches,
  levenshtein,
} from './utils';

// ── normalizeAddress ──────────────────────────────────

describe('normalizeAddress', () => {
  it('returns empty string for empty line1', () => {
    expect(normalizeAddress('', 'Austin', 'TX', '78701')).toBe('');
  });

  it('lowercases and joins parts', () => {
    const result = normalizeAddress('123 Main St', 'Austin', 'TX', '78701');
    // Punctuation (commas) is stripped during normalization
    expect(result).toBe('123 main street austin tx 78701');
  });

  it('expands common abbreviations', () => {
    const result = normalizeAddress('456 Oak Blvd Ste 200', 'Dallas', 'TX', '75201');
    expect(result).toContain('boulevard');
    expect(result).toContain('suite');
  });

  it('strips punctuation', () => {
    const result = normalizeAddress('789 Elm Ave.', 'Houston', 'TX', '77001');
    expect(result).not.toContain('.');
  });

  it('handles missing city/state/zip gracefully', () => {
    const result = normalizeAddress('100 First St', '', '', '');
    expect(result).toBe('100 first street');
  });

  it('expands directional abbreviations', () => {
    const result = normalizeAddress('100 N Main St', 'Austin', 'TX', '78701');
    expect(result).toContain('north');
    expect(result).toContain('main');
  });

  it('normalizes multiple spaces', () => {
    const result = normalizeAddress('100  Main   St', 'Austin', 'TX', '78701');
    expect(result).not.toContain('  ');
  });
});

// ── addressesMatch ────────────────────────────────────

describe('addressesMatch', () => {
  it('returns false for empty addresses', () => {
    expect(addressesMatch('', '123 main street')).toBe(false);
    expect(addressesMatch('123 main street', '')).toBe(false);
  });

  it('matches identical addresses', () => {
    expect(addressesMatch('123 main street, austin, tx, 78701', '123 main street, austin, tx, 78701')).toBe(true);
  });

  it('rejects different zip codes quickly', () => {
    expect(addressesMatch('123 main street, austin, tx, 78701', '123 main street, austin, tx, 78702')).toBe(false);
  });

  it('matches when suite info differs', () => {
    const a = normalizeAddress('123 Main St Suite 100', 'Austin', 'TX', '78701');
    const b = normalizeAddress('123 Main St Suite 200', 'Austin', 'TX', '78701');
    expect(addressesMatch(a, b)).toBe(true);
  });

  it('matches with minor typo (levenshtein <= 3)', () => {
    const a = normalizeAddress('123 Main Street', 'Austin', 'TX', '78701');
    const b = normalizeAddress('123 Main Stret', 'Austin', 'TX', '78701');
    // "stret" => after normalization differs by <=3 chars from "street"
    expect(addressesMatch(a, b)).toBe(true);
  });
});

// ── normalizePhone ────────────────────────────────────

describe('normalizePhone', () => {
  it('returns empty string for empty input', () => {
    expect(normalizePhone('')).toBe('');
  });

  it('strips non-digit characters', () => {
    expect(normalizePhone('(512) 402-2237')).toBe('5124022237');
  });

  it('strips country code 1 from 11-digit numbers', () => {
    expect(normalizePhone('+1 (512) 402-2237')).toBe('5124022237');
    expect(normalizePhone('15124022237')).toBe('5124022237');
  });

  it('preserves 10-digit numbers', () => {
    expect(normalizePhone('5124022237')).toBe('5124022237');
  });
});

// ── phonesMatch ───────────────────────────────────────

describe('phonesMatch', () => {
  it('returns false for empty phones', () => {
    expect(phonesMatch('', '5124022237')).toBe(false);
    expect(phonesMatch('5124022237', '')).toBe(false);
  });

  it('matches identical phones', () => {
    expect(phonesMatch('(512) 402-2237', '512-402-2237')).toBe(true);
  });

  it('matches with country code difference', () => {
    expect(phonesMatch('+15124022237', '(512) 402-2237')).toBe(true);
  });

  it('rejects different phone numbers', () => {
    expect(phonesMatch('(512) 402-2237', '(512) 402-2238')).toBe(false);
  });
});

// ── normalizeName ─────────────────────────────────────

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('John Smith')).toBe('john smith');
  });

  it('strips medical credentials', () => {
    expect(normalizeName('John Smith MD')).toBe('john smith');
    expect(normalizeName('Jane Doe, DO')).toBe('jane doe');
    expect(normalizeName('Bob Jones NP')).toBe('bob jones');
  });

  it('strips honorifics', () => {
    expect(normalizeName('Dr. John Smith')).toBe('john smith');
    expect(normalizeName('Mr. John Smith Jr.')).toBe('john smith');
  });

  it('strips punctuation', () => {
    expect(normalizeName("Mary O'Brien")).toBe('mary o brien');
  });

  it('normalizes whitespace', () => {
    expect(normalizeName('  John   Smith  ')).toBe('john smith');
  });
});

// ── fuzzyNameMatch ────────────────────────────────────

describe('fuzzyNameMatch', () => {
  it('returns false for empty names', () => {
    expect(fuzzyNameMatch('', 'john smith')).toBe(false);
    expect(fuzzyNameMatch('john smith', '')).toBe(false);
  });

  it('matches identical names', () => {
    expect(fuzzyNameMatch('john smith', 'john smith')).toBe(true);
  });

  it('matches when last name and first initial match', () => {
    expect(fuzzyNameMatch('john smith', 'j smith')).toBe(true);
  });

  it('rejects different last names', () => {
    expect(fuzzyNameMatch('john smith', 'john jones')).toBe(false);
  });

  it('rejects different first initials', () => {
    expect(fuzzyNameMatch('john smith', 'mary smith')).toBe(false);
  });

  it('allows close last-name typos (levenshtein <= 1)', () => {
    expect(fuzzyNameMatch('john smith', 'john smyth')).toBe(true);
  });
});

// ── specialtyMatches ──────────────────────────────────

describe('specialtyMatches', () => {
  it('matches direct inclusion', () => {
    expect(specialtyMatches('Family Medicine', ['family medicine'])).toBe(true);
  });

  it('matches synonym', () => {
    expect(specialtyMatches('family medicine', ['primary care'])).toBe(true);
  });

  it('matches via reverse synonym check', () => {
    expect(specialtyMatches('internal medicine', ['general medicine'])).toBe(true);
  });

  it('matches when site says primary care (catch-all)', () => {
    expect(specialtyMatches('Cardiology', ['primary care'])).toBe(true);
  });

  it('returns false for unrelated specialties', () => {
    expect(specialtyMatches('Cardiology', ['dentistry', 'optometry'])).toBe(false);
  });

  it('handles OB/GYN synonyms', () => {
    expect(specialtyMatches('obstetrics & gynecology', ['obgyn'])).toBe(true);
  });

  it('handles nurse practitioner synonyms', () => {
    expect(specialtyMatches('nurse practitioner', ['advanced practice nurse'])).toBe(true);
  });
});

// ── levenshtein ───────────────────────────────────────

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('returns length of non-empty string when other is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('calculates single-char edit distances', () => {
    expect(levenshtein('cat', 'hat')).toBe(1);  // substitution
    expect(levenshtein('cat', 'cats')).toBe(1);  // insertion
    expect(levenshtein('cats', 'cat')).toBe(1);  // deletion
  });

  it('calculates multi-char distances', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0);
  });
});
