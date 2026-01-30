/**
 * KairoLogic Assets Service v1.0
 * Manages widget code snippets, seals, and verification assets
 */

import { Asset } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const ASSETS_TABLE = 'assets';

export interface AssetWithMetadata extends Asset {
  fileSize?: number;
  mimeType?: string;
  version?: string;
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Retrieve all assets
 */
export const getAssets = async (): Promise<Asset[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[ASSETS] Supabase not configured, returning empty assets');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .select('*')
      .order('lastUpdated', { ascending: false });

    if (error) {
      console.error('[ASSETS] Fetch error:', error.message);
      return [];
    }

    return data || [];
  } catch (e: any) {
    console.error('[ASSETS] Service error:', e.message);
    return [];
  }
};

/**
 * Get a single asset by ID
 */
export const getAssetById = async (id: string): Promise<Asset | null> => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[ASSETS] Get by ID error:', error.message);
      return null;
    }

    return data || null;
  } catch (e: any) {
    console.error('[ASSETS] Service error:', e.message);
    return null;
  }
};

/**
 * Create or update an asset
 */
export const upsertAsset = async (asset: Partial<Asset> & { id: string }): Promise<Asset | null> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[ASSETS] Supabase not configured, asset not persisted');
    return null;
  }

  try {
    const payload = {
      ...asset,
      lastUpdated: Date.now(),
    };

    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[ASSETS] Upsert error:', error.message);
      return null;
    }

    console.log('[ASSETS] Asset persisted:', asset.id);
    return data || null;
  } catch (e: any) {
    console.error('[ASSETS] Service error:', e.message);
    return null;
  }
};

/**
 * Delete an asset
 */
export const deleteAsset = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[ASSETS] Supabase not configured, asset not deleted');
    return false;
  }

  try {
    const { error } = await supabase
      .from(ASSETS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ASSETS] Delete error:', error.message);
      return false;
    }

    console.log('[ASSETS] Asset deleted:', id);
    return true;
  } catch (e: any) {
    console.error('[ASSETS] Service error:', e.message);
    return false;
  }
};

/**
 * Batch delete multiple assets
 */
export const deleteAssets = async (ids: string[]): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[ASSETS] Supabase not configured, assets not deleted');
    return false;
  }

  if (ids.length === 0) return true;

  try {
    const { error } = await supabase
      .from(ASSETS_TABLE)
      .delete()
      .in('id', ids);

    if (error) {
      console.error('[ASSETS] Batch delete error:', error.message);
      return false;
    }

    console.log('[ASSETS] Batch delete completed:', ids.length, 'assets');
    return true;
  } catch (e: any) {
    console.error('[ASSETS] Service error:', e.message);
    return false;
  }
};

/**
 * Search assets by name or type
 */
export const searchAssets = async (
  searchTerm: string = '',
  assetType?: string
): Promise<Asset[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[ASSETS] Supabase not configured, returning empty results');
    return [];
  }

  try {
    let query = supabase.from(ASSETS_TABLE).select('*');

    if (searchTerm.trim().length >= 2) {
      const pattern = `%${searchTerm.trim()}%`;
      query = query.or(`name.ilike.${pattern},type.ilike.${pattern}`);
    }

    if (assetType) {
      query = query.eq('type', assetType);
    }

    const { data, error } = await query.order('lastUpdated', { ascending: false });

    if (error) {
      console.error('[ASSETS] Search error:', error.message);
      return [];
    }

    return data || [];
  } catch (e: any) {
    console.error('[ASSETS] Service error:', e.message);
    return [];
  }
};

/**
 * Get assets by type
 */
export const getAssetsByType = async (type: string): Promise<Asset[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[ASSETS] Supabase not configured, returning empty results');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .select('*')
      .eq('type', type)
      .order('lastUpdated', { ascending: false });

    if (error) {
      console.error('[ASSETS] Get by type error:', error.message);
      return [];
    }

    return data || [];
  } catch (e: any) {
    console.error('[ASSETS] Service error:', e.message);
    return [];
  }
};

/**
 * Generate floating widget snippet for a seal
 */
export const generateFloatingSnippet = (sealId: string): string => {
  return `<script src="https://vanguard.kairologic.com/sentry-floating.js" data-seal-id="${sealId}"></script>`;
};

/**
 * Generate static widget snippet for a seal
 */
export const generateStaticSnippet = (sealId: string): string => {
  return `<!-- KairoLogic Sentry Verification Seal -->
<div id="kl-seal-${sealId}" class="kl-sentry-seal" data-seal-id="${sealId}"></div>
<script src="https://vanguard.kairologic.com/sentry-static.js"></script>`;
};

/**
 * Generate comprehensive verification bridge snippet
 */
export const generateVerificationBridge = (sealId: string): string => {
  return `<!-- KairoLogic Sentry Verification Bridge v1.0 -->
<script>
  window.kairoLogicConfig = {
    sealId: '${sealId}',
    endpoint: 'https://vanguard.kairologic.com/api',
    checkInterval: 3600000 // 1 hour
  };
</script>
<script src="https://vanguard.kairologic.com/sentry-bridge.js"></script>`;
};

/**
 * Get sample/default assets for new installations
 */
export const getDefaultAssets = (): Asset[] => {
  const timestamp = Date.now();
  return [
    {
      id: 'AST-001',
      name: 'Sentry Floating Seal',
      type: 'Widget Code',
      url: 'https://vanguard.kairologic.com/sentry-floating.js',
      lastUpdated: timestamp,
    },
    {
      id: 'AST-002',
      name: 'Sentry Static Seal',
      type: 'Widget Code',
      url: 'https://vanguard.kairologic.com/sentry-static.js',
      lastUpdated: timestamp,
    },
    {
      id: 'AST-003',
      name: 'Verification Bridge',
      type: 'Widget Code',
      url: 'https://vanguard.kairologic.com/sentry-bridge.js',
      lastUpdated: timestamp,
    },
    {
      id: 'AST-004',
      name: 'SB 1188 Compliance Badge',
      type: 'Graphics Asset',
      url: 'https://vanguard.kairologic.com/assets/sb1188-badge.svg',
      lastUpdated: timestamp,
    },
    {
      id: 'AST-005',
      name: 'HB 149 Disclosure Banner',
      type: 'HTML Component',
      url: 'https://vanguard.kairologic.com/assets/hb149-banner.html',
      lastUpdated: timestamp,
    },
  ];
};

/**
 * Initialize default assets if none exist
 */
export const initializeDefaultAssets = async (): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[ASSETS] Supabase not configured, skipping initialization');
    return;
  }

  try {
    const existing = await getAssets();
    if (existing.length > 0) {
      console.log('[ASSETS] Assets already exist, skipping initialization');
      return;
    }

    const defaults = getDefaultAssets();
    const { error } = await supabase
      .from(ASSETS_TABLE)
      .insert(defaults);

    if (error) {
      console.error('[ASSETS] Initialization error:', error.message);
      return;
    }

    console.log('[ASSETS] Default assets initialized:', defaults.length, 'assets created');
  } catch (e: any) {
    console.error('[ASSETS] Service error:', e.message);
  }
};
