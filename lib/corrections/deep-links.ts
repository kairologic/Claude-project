/**
 * lib/corrections/deep-links.ts
 *
 * Query helper for the correction_deep_links table.
 * Provides functions to retrieve deep links, resolve URL templates with variables,
 * and manage active correction links across systems.
 */

import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

// Re-export pure utility functions and types from the client-safe module
export { resolveUrl, getMissingPlaceholders } from './deep-link-utils';
export type { DeepLink, ResolvedDeepLink } from './deep-link-utils';

// Import types locally for use in this file
import type { DeepLink, ResolvedDeepLink } from './deep-link-utils';
import { resolveUrl, getMissingPlaceholders } from './deep-link-utils';

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
