/**
 * lib/format-helpers.ts
 *
 * Shared formatting helpers for display across the dashboard.
 * NPPES stores data in ALL CAPS — these convert to readable format.
 */

export function titleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bPa\b/g, 'PA')
    .replace(/\bTx\b/g, 'TX')
    .replace(/\bCa\b/g, 'CA')
    .replace(/\bNy\b/g, 'NY')
    .replace(/\bFl\b/g, 'FL')
    .replace(/\bIl\b/g, 'IL')
    .replace(/\bOh\b/g, 'OH')
    .replace(/\bNj\b/g, 'NJ')
    .replace(/\bNc\b/g, 'NC')
    .replace(/\bVa\b/g, 'VA')
    .replace(/\bMd\b/g, 'MD')
    .replace(/\bMn\b/g, 'MN')
    .replace(/\bWi\b/g, 'WI')
    .replace(/\bCo\b/g, 'CO')
    .replace(/\bAz\b/g, 'AZ')
    .replace(/\bOr\b/g, 'OR')
    .replace(/\bWa\b/g, 'WA')
    .replace(/\bTn\b/g, 'TN')
    .replace(/\bIn\b/g, 'IN')
    .replace(/\bMo\b/g, 'MO')
    .replace(/\bSc\b/g, 'SC')
    .replace(/\bAl\b/g, 'AL')
    .replace(/\bLa\b/g, 'LA')
    .replace(/\bKy\b/g, 'KY')
    .replace(/\bOk\b/g, 'OK')
    .replace(/\bCt\b/g, 'CT')
    .replace(/\bIa\b/g, 'IA')
    .replace(/\bMs\b/g, 'MS')
    .replace(/\bAr\b/g, 'AR')
    .replace(/\bKs\b/g, 'KS')
    .replace(/\bUt\b/g, 'UT')
    .replace(/\bNv\b/g, 'NV')
    .replace(/\bNe\b/g, 'NE')
    .replace(/\bNm\b/g, 'NM')
    .replace(/\bDc\b/g, 'DC');
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
