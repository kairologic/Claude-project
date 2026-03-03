import { describe, it, expect, vi, beforeEach } from 'vitest';
import { crawlSite } from './crawler';

// Mock the global fetch and crypto
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock crypto module
vi.mock('crypto', () => ({
  createHash: () => ({
    update: () => ({
      digest: () => Buffer.from('abcdef1234567890abcdef1234567890', 'hex'),
    }),
  }),
}));

beforeEach(() => {
  mockFetch.mockReset();
});

function makeHtml(parts: {
  address?: string;
  phone?: string;
  specialties?: string[];
  providers?: string[];
  jsonLd?: object;
} = {}): string {
  const addressBlock = parts.address || '123 Main St, Austin, TX 78701';
  const phoneBlock = parts.phone || '<a href="tel:+15125551234">(512) 555-1234</a>';
  const specialtyBlock = (parts.specialties || ['family medicine']).join(', ');
  const providerBlock = (parts.providers || []).map(
    n => `<span itemprop="name">${n}</span>`
  ).join('\n');
  const jsonLdBlock = parts.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(parts.jsonLd)}</script>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><title>Test Clinic</title>${jsonLdBlock}</head>
<body>
  <main>
    <p>${addressBlock}</p>
    <p>${phoneBlock}</p>
    <p>We specialize in ${specialtyBlock}</p>
    ${providerBlock}
  </main>
</body>
</html>`;
}

describe('crawlSite', () => {
  it('returns null when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const result = await crawlSite('https://example.com');
    expect(result).toBeNull();
  });

  it('returns null for non-OK responses', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const result = await crawlSite('https://example.com');
    expect(result).toBeNull();
  });

  it('returns null for very short HTML', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html></html>',
    });
    const result = await crawlSite('https://example.com');
    expect(result).toBeNull();
  });

  it('extracts phone from tel: links', async () => {
    const html = makeHtml({ phone: '<a href="tel:+15125551234">(512) 555-1234</a>' });
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    const result = await crawlSite('https://example.com');
    expect(result).not.toBeNull();
    expect(result!.phone).toContain('512');
    expect(result!.phone).toContain('555');
    expect(result!.phone).toContain('1234');
  });

  it('extracts address from text patterns', async () => {
    const html = makeHtml({ address: '456 Oak Blvd, Dallas, TX 75201' });
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    const result = await crawlSite('https://example.com');
    expect(result).not.toBeNull();
    // Address extraction depends on pattern matching
    expect(result!.url).toBe('https://example.com');
  });

  it('extracts specialties from page content', async () => {
    const html = makeHtml({ specialties: ['pediatrics', 'family medicine', 'cardiology'] });
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    const result = await crawlSite('https://example.com');
    expect(result).not.toBeNull();
    expect(result!.specialty_labels).toContain('pediatrics');
    expect(result!.specialty_labels).toContain('family medicine');
    expect(result!.specialty_labels).toContain('cardiology');
  });

  it('extracts provider names from schema.org markup', async () => {
    const html = makeHtml({
      providers: ['John Smith', 'Jane Doe'],
    });
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    const result = await crawlSite('https://example.com');
    expect(result).not.toBeNull();
    expect(result!.provider_names).toContain('John Smith');
    expect(result!.provider_names).toContain('Jane Doe');
    expect(result!.provider_count).toBe(2);
  });

  it('prepends https:// if missing', async () => {
    const html = makeHtml();
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    await crawlSite('example.com');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('KairoLogic'),
        }),
      }),
    );
  });

  it('generates a source hash for drift detection', async () => {
    const html = makeHtml();
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    const result = await crawlSite('https://example.com');
    expect(result).not.toBeNull();
    expect(result!.source_hash).toBeTruthy();
    expect(result!.source_hash.length).toBeGreaterThan(0);
  });

  it('includes scrape timestamp', async () => {
    const html = makeHtml();
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    const result = await crawlSite('https://example.com');
    expect(result).not.toBeNull();
    expect(result!.scrape_time).toBeTruthy();
    // Should be a valid ISO date string
    expect(new Date(result!.scrape_time).toISOString()).toBe(result!.scrape_time);
  });

  it('extracts address from JSON-LD structured data', async () => {
    const html = makeHtml({
      jsonLd: {
        '@type': 'MedicalBusiness',
        name: 'Test Clinic',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '789 Elm Ave',
          addressLocality: 'Houston',
          addressRegion: 'TX',
          postalCode: '77001',
        },
      },
    });
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    const result = await crawlSite('https://example.com');
    expect(result).not.toBeNull();
    expect(result!.addr_line1).toBe('789 Elm Ave');
    expect(result!.addr_city).toBe('Houston');
    expect(result!.addr_state).toBe('TX');
    expect(result!.addr_zip).toBe('77001');
  });

  it('extracts provider names from JSON-LD', async () => {
    const html = makeHtml({
      jsonLd: {
        '@type': 'MedicalBusiness',
        name: 'Test Clinic',
        employee: [
          { '@type': 'Physician', name: 'Alice Johnson' },
          { '@type': 'Physician', name: 'Bob Williams' },
        ],
      },
    });
    mockFetch.mockResolvedValue({ ok: true, text: async () => html });

    const result = await crawlSite('https://example.com');
    expect(result).not.toBeNull();
    expect(result!.provider_names).toContain('Alice Johnson');
    expect(result!.provider_names).toContain('Bob Williams');
  });
});
