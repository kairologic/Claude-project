import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

/**
 * Pre-Scan Validation API
 * POST /api/validate-scan
 * 
 * Validates scan inputs BEFORE running the actual scan:
 * 1. NPI lookup against CMS NPPES registry (is this a real provider?)
 * 2. Email domain matches website URL domain
 * 3. MX record check (can the email domain receive mail?)
 * 
 * Returns: { valid, npiData, errors[] }
 * 
 * Performance: ~300-500ms total (NPI + MX run in parallel)
 */

const resolveMx = promisify(dns.resolveMx);

// ─── NPI Verification ───
async function verifyNPI(npi: string): Promise<{
  valid: boolean;
  name?: string;
  type?: string;
  specialty?: string;
  state?: string;
  error?: string;
}> {
  try {
    const res = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { valid: false, error: 'NPI registry unavailable' };

    const data = await res.json();
    if (!data.result_count || data.result_count === 0) {
      return { valid: false, error: 'NPI not found in CMS registry' };
    }

    const r = data.results[0];
    const b = r.basic || {};
    const addr = (r.addresses || []).find(
      (a: { address_purpose: string }) => a.address_purpose === 'LOCATION'
    ) || (r.addresses || [])[0] || {};
    const tax = (r.taxonomies || []).find(
      (t: { primary: boolean }) => t.primary
    ) || (r.taxonomies || [])[0] || {};

    // Check if this is a healthcare provider (not deactivated)
    if (b.status === 'D') {
      return { valid: false, error: 'This NPI has been deactivated' };
    }

    return {
      valid: true,
      name: b.organization_name || `${b.first_name || ''} ${b.last_name || ''}`.trim(),
      type: r.enumeration_type === 'NPI-2' ? 'Organization' : 'Individual',
      specialty: tax.desc || '',
      state: addr.state || '',
    };
  } catch (e) {
    // If NPPES is down, don't block the scan — just warn
    return { valid: true, error: 'NPI registry timeout — skipping verification' };
  }
}

// ─── MX Record Check ───
async function checkMX(domain: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const records = await resolveMx(domain);
    if (records && records.length > 0) {
      return { valid: true };
    }
    return { valid: false, error: `No mail server found for ${domain}` };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      return { valid: false, error: `Domain "${domain}" does not exist or has no mail configuration` };
    }
    // DNS timeout — don't block
    return { valid: true, error: 'MX lookup timeout — skipping check' };
  }
}

// ─── Domain Extraction ───
function extractDomain(input: string): string {
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return input.replace(/^www\./, '');
  }
}

// ─── Main Handler ───
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { npi, url, email } = body;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic format checks (instant)
    if (!npi || !/^\d{10}$/.test(npi)) {
      return NextResponse.json({
        valid: false,
        errors: ['Please enter a valid 10-digit NPI number'],
      }, { status: 400 });
    }

    if (!url) {
      return NextResponse.json({
        valid: false,
        errors: ['Website URL is required'],
      }, { status: 400 });
    }

    const websiteDomain = extractDomain(url);

    // Run NPI + MX checks in parallel for speed
    const [npiResult, mxResult] = await Promise.all([
      verifyNPI(npi),
      email && email.includes('@')
        ? checkMX(email.split('@')[1]?.toLowerCase() || '')
        : Promise.resolve({ valid: true } as { valid: boolean; error?: string }),
    ]);

    // NPI validation
    if (!npiResult.valid) {
      errors.push(npiResult.error || 'This NPI is not registered with the CMS National Provider Registry');
    } else if (npiResult.error) {
      warnings.push(npiResult.error);
    }

    // Email domain match (if email provided)
    if (email && email.includes('@')) {
      const emailDomain = email.split('@')[1]?.toLowerCase();

      // Block free email providers
      const freeProviders = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
        'live.com', 'msn.com', 'ymail.com', 'zoho.com',
      ];
      if (freeProviders.includes(emailDomain)) {
        errors.push(
          `Please use your practice email (e.g., you@${websiteDomain}) — free email providers are not accepted for compliance verification`
        );
      }
      // Check domain match
      else if (emailDomain !== websiteDomain && !websiteDomain.endsWith('.' + emailDomain) && !emailDomain.endsWith('.' + websiteDomain)) {
        warnings.push(
          `Email domain (${emailDomain}) doesn't match website (${websiteDomain}). For best results, use your practice email.`
        );
      }

      // MX check
      if (!mxResult.valid) {
        errors.push(mxResult.error || `Email domain "${emailDomain}" cannot receive email`);
      } else if (mxResult.error) {
        warnings.push(mxResult.error);
      }
    }

    const duration = Date.now() - startTime;

    if (errors.length > 0) {
      return NextResponse.json({
        valid: false,
        errors,
        warnings,
        npiData: npiResult.valid ? {
          name: npiResult.name,
          type: npiResult.type,
          specialty: npiResult.specialty,
          state: npiResult.state,
        } : null,
        duration: `${duration}ms`,
      }, { status: 422 });
    }

    return NextResponse.json({
      valid: true,
      errors: [],
      warnings,
      npiData: {
        name: npiResult.name,
        type: npiResult.type,
        specialty: npiResult.specialty,
        state: npiResult.state,
      },
      duration: `${duration}ms`,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      valid: false,
      errors: ['Validation failed: ' + msg],
    }, { status: 500 });
  }
}
