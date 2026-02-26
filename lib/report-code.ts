import { createHmac } from 'crypto';

const SECRET = process.env.REPORT_CODE_SECRET!;
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate an 8-character alphanumeric report code from an NPI.
 * Uses HMAC-SHA256 to produce a deterministic, non-guessable token.
 */
export function generateReportCode(npi: string): string {
  const hash = createHmac('sha256', SECRET).update(npi).digest();
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += BASE62[hash[i] % 62];
  }
  return code;
}

/**
 * Find the NPI that matches a given report code by checking against
 * a list of candidate NPIs. Returns null if no match found.
 */
export function findNpiByCode(code: string, npis: string[]): string | null {
  for (const npi of npis) {
    if (generateReportCode(npi) === code) return npi;
  }
  return null;
}
