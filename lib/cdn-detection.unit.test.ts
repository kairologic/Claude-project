import { describe, it, expect } from 'vitest';
import {
  detectCDNByIP,
  detectCDNByHeaders,
  isKnownUSSaaS,
  isKnownUSMailProvider,
} from './cdn-detection';

// ── detectCDNByIP ─────────────────────────────────────

describe('detectCDNByIP', () => {
  it('detects Cloudflare IPs', () => {
    // 104.16.0.0/13 is Cloudflare
    const result = detectCDNByIP('104.16.1.1');
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('Cloudflare');
    expect(result.method).toBe('ip_range');
  });

  it('detects CloudFront IPs', () => {
    // 13.32.0.0/15 is CloudFront
    const result = detectCDNByIP('13.32.1.1');
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('CloudFront');
  });

  it('detects Fastly IPs', () => {
    // 151.101.0.0/16 is Fastly
    const result = detectCDNByIP('151.101.1.1');
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('Fastly');
  });

  it('detects Vercel IPs', () => {
    // 76.76.21.0/24 is Vercel
    const result = detectCDNByIP('76.76.21.100');
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('Vercel');
  });

  it('returns not detected for unknown IPs', () => {
    const result = detectCDNByIP('8.8.8.8');
    expect(result.detected).toBe(false);
    expect(result.provider).toBe('');
  });

  it('handles invalid IPs gracefully', () => {
    const result = detectCDNByIP('invalid');
    expect(result.detected).toBe(false);
  });

  it('handles empty string', () => {
    const result = detectCDNByIP('');
    expect(result.detected).toBe(false);
  });
});

// ── detectCDNByHeaders ────────────────────────────────

describe('detectCDNByHeaders', () => {
  it('detects Cloudflare via cf-ray header', () => {
    const result = detectCDNByHeaders({ 'cf-ray': '12345-DFW' });
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('Cloudflare');
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('detects Cloudflare via server header', () => {
    const result = detectCDNByHeaders({ 'server': 'cloudflare' });
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('Cloudflare');
  });

  it('detects CloudFront via x-amz-cf-id', () => {
    const result = detectCDNByHeaders({ 'x-amz-cf-id': 'some-id' });
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('CloudFront');
  });

  it('detects Vercel via x-vercel-id', () => {
    const result = detectCDNByHeaders({ 'x-vercel-id': 'some-id' });
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('Vercel');
  });

  it('detects Fastly via x-served-by', () => {
    const result = detectCDNByHeaders({ 'x-served-by': 'cache-dfw1234' });
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('Fastly');
  });

  it('detects Netlify via x-nf-request-id', () => {
    const result = detectCDNByHeaders({ 'x-nf-request-id': 'id123' });
    expect(result.detected).toBe(true);
    expect(result.provider).toBe('Netlify');
  });

  it('returns not detected for generic headers', () => {
    const result = detectCDNByHeaders({ 'server': 'nginx', 'content-type': 'text/html' });
    expect(result.detected).toBe(false);
    expect(result.provider).toBe('');
  });

  it('returns empty evidence when not detected', () => {
    const result = detectCDNByHeaders({});
    expect(result.detected).toBe(false);
    expect(result.evidence).toEqual([]);
  });
});

// ── isKnownUSSaaS ─────────────────────────────────────

describe('isKnownUSSaaS', () => {
  it('recognizes google-analytics.com', () => {
    const result = isKnownUSSaaS('google-analytics.com');
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('Google');
    expect(result!.category).toBe('analytics');
  });

  it('recognizes subdomains of known providers', () => {
    const result = isKnownUSSaaS('www.stripe.com');
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('Stripe');
  });

  it('recognizes healthcare-specific providers', () => {
    const result = isKnownUSSaaS('zocdoc.com');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('scheduling');
  });

  it('recognizes font providers', () => {
    const result = isKnownUSSaaS('use.fontawesome.com');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('fonts');
  });

  it('returns null for unknown domains', () => {
    expect(isKnownUSSaaS('unknown-random-domain.xyz')).toBeNull();
  });

  it('is case insensitive', () => {
    const result = isKnownUSSaaS('Google-Analytics.COM');
    expect(result).not.toBeNull();
  });
});

// ── isKnownUSMailProvider ─────────────────────────────

describe('isKnownUSMailProvider', () => {
  it('recognizes Google Workspace MX', () => {
    const result = isKnownUSMailProvider('aspmx.l.google.com');
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('Google Workspace');
  });

  it('recognizes Microsoft 365 MX', () => {
    const result = isKnownUSMailProvider('mail.protection.outlook.com');
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('Microsoft 365');
  });

  it('recognizes Amazon SES', () => {
    const result = isKnownUSMailProvider('inbound-smtp.us-east-1.amazonaws.com');
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('Amazon SES');
  });

  it('recognizes HIPAA-compliant providers', () => {
    expect(isKnownUSMailProvider('paubox.com')!.provider).toBe('Paubox (HIPAA)');
    expect(isKnownUSMailProvider('zixcorp.com')!.provider).toBe('Zix (HIPAA)');
  });

  it('recognizes subdomain matches', () => {
    const result = isKnownUSMailProvider('mx1.emailsrvr.com');
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('Rackspace');
  });

  it('returns null for unknown mail servers', () => {
    expect(isKnownUSMailProvider('mail.unknown-server.xyz')).toBeNull();
  });
});
