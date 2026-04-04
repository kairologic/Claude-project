/**
 * lib/corrections/deep-links.ts
 *
 * Query helper for the correction_deep_links table.
 * Provides functions to retrieve deep links, resolve URL templates with variables,
 * and manage active correction links across systems.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

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
    // Replace {{key}} with the value, URI-encoded
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

// ─────────────────────────────────────────────────────────────────────────────
// Query functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves a single deep link by system name and correction type.
 */
export async function getDeepLink(
  systemName: string,
  correctionType: string,
): Promise<DeepLink | null> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('correction_deep_links')
      .select('*')
      .eq('system_name', systemName)
      .eq('correction_type', correctionType)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data as DeepLink;
  } catch (error) {
    console.error('[getDeepLink] Error:', error);
    return null;
  }
}

/**
 * Retrieves all active deep links for a specific system.
 */
export async function getDeepLinksForSystem(systemName: string): Promise<DeepLink[]> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('correction_deep_links')
      .select('*')
      .eq('system_name', systemName)
      .eq('is_active', true)
      .order('correction_type', { ascending: true });

    if (error) throw error;

    return (data || []) as DeepLink[];
  } catch (error) {
    console.error('[getDeepLinksForSystem] Error:', error);
    return [];
  }
}

/**
 * Retrieves all active deep links across all systems.
 * Useful for admin pages and link management.
 */
export async function getAllActiveLinks(): Promise<DeepLink[]> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('correction_deep_links')
      .select('*')
      .eq('is_active', true)
      .order('system_name', { ascending: true })
      .order('correction_type', { ascending: true });

    if (error) throw error;

    return (data || []) as DeepLink[];
  } catch (error) {
    console.error('[getAllActiveLinks] Error:', error);
    return [];
  }
}

/**
 * Retrieves a deep link and resolves its URL template with provided variables.
 *
 * @returns Resolved deep link object with resolved_url property, or null if not found
 */
export async function getResolvedDeepLink(
  systemName: string,
  correctionType: string,
  vars: Record<string, string>,
): Promise<ResolvedDeepLink | null> {
  try {
    const link = await getDeepLink(systemName, correctionType);
    if (!link) return null;

    // Check for missing placeholders
    const missing = getMissingPlaceholders(link.url_template, vars);
    if (missing.length > 0) {
      console.warn(
        `[getResolvedDeepLink] Missing variables for ${systemName}/${correctionType}:`,
        missing,
      );
      // Continue anyway, but URL may have unreplaced placeholders
    }

    const resolved_url = resolveUrl(link.url_template, vars);

    return {
      ...link,
      resolved_url,
    };
  } catch (error) {
    console.error('[getResolvedDeepLink] Error:', error);
    return null;
  }
}

/**
 * Checks if a deep link exists and is active.
 */
export async function hasDeepLink(systemName: string, correctionType: string): Promise<boolean> {
  const link = await getDeepLink(systemName, correctionType);
  return link !== null;
}
