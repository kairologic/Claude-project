import { describe, it, expect, beforeAll } from 'vitest';

// Set the env var BEFORE the module is imported and caches it
process.env.REPORT_CODE_SECRET = 'test-secret-key-for-unit-tests';

// Now import — the module-level `const SECRET` will pick up the env var
import { generateReportCode, findNpiByCode } from './report-code';

describe('generateReportCode', () => {
  it('returns an 8-character string', () => {
    const code = generateReportCode('1234567890');
    expect(code.length).toBe(8);
  });

  it('returns only alphanumeric characters', () => {
    const code = generateReportCode('1234567890');
    expect(code).toMatch(/^[0-9A-Za-z]{8}$/);
  });

  it('is deterministic — same NPI produces same code', () => {
    const code1 = generateReportCode('1234567890');
    const code2 = generateReportCode('1234567890');
    expect(code1).toBe(code2);
  });

  it('produces different codes for different NPIs', () => {
    const code1 = generateReportCode('1234567890');
    const code2 = generateReportCode('0987654321');
    expect(code1).not.toBe(code2);
  });

  it('handles short NPI strings', () => {
    const code = generateReportCode('123');
    expect(code.length).toBe(8);
    expect(code).toMatch(/^[0-9A-Za-z]{8}$/);
  });
});

describe('findNpiByCode', () => {
  it('finds the matching NPI from a list', () => {
    const npi = '1234567890';
    const code = generateReportCode(npi);
    const candidates = ['0000000001', '1234567890', '9999999999'];

    const result = findNpiByCode(code, candidates);
    expect(result).toBe(npi);
  });

  it('returns null when no NPI matches', () => {
    const result = findNpiByCode('ZZZZZZZZ', ['1234567890', '0987654321']);
    expect(result).toBeNull();
  });

  it('returns null for empty candidate list', () => {
    const result = findNpiByCode('abcdefgh', []);
    expect(result).toBeNull();
  });

  it('finds the correct NPI among many candidates', () => {
    const targetNpi = '5555555555';
    const code = generateReportCode(targetNpi);
    const candidates = Array.from({ length: 100 }, (_, i) =>
      String(1000000000 + i)
    );
    candidates.push(targetNpi);

    const result = findNpiByCode(code, candidates);
    expect(result).toBe(targetNpi);
  });
});
