/**
 * lib/corrections/deep-link-utils.ts
 *
 * Pure utility functions for URL template resolution.
 * Safe to import from client components (no server-only dependencies).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface DeepLink {
  id: string;
  system_name: string;
  correction_type: string;
  url_template: string;
  display_label: string;
  instructions: string[];
  icon: string;
  last_verified_at: string | null;
  is_active: boolean;
}

export interface ResolvedDeepLink extends DeepLink {
  resolved_url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a URL template by replacing {{placeholder}} with provided variables.
 *
 * @example
 * resolveUrl('https://example.com?npi={{npi}}&name={{name}}', { npi: '1234567890', name: 'John' })
 * // Returns: 'https://example.com?npi=1234567890&name=John'
 */
export function resolveUrl(urlTemplate: string, vars: Record<string, string>): string {
  let resolved = urlTemplate;
  Object.entries(vars).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const encodedValue = encodeURIComponent(value);
    resolved = resolved.replace(new RegExp(placeholder, 'g'), encodedValue);
  });
  return resolved;
}

/**
 * Validates that all required placeholders in a URL template are provided.
 *
 * @returns Array of missing placeholder names, empty if all provided
 */
export function getMissingPlaceholders(
  urlTemplate: string,
  vars: Record<string, string>,
): string[] {
  const placeholders = (urlTemplate.match(/{{(\w+)}}/g) || []).map((p) => p.slice(2, -2));
  return placeholders.filter((p) => !vars[p]);
}
