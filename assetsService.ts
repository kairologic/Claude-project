/**
 * KairoLogic Assets Management Service
 * Manages images, code snippets, and documents
 * Version: 11.0.0
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'code' | 'document';
  category: string;
  description?: string;
  url?: string;           // For uploaded files
  content?: string;       // For code snippets
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_at: string;
  updated_at: string;
}

const TABLE_NAME = 'assets';

/**
 * Get all assets
 */
export const getAllAssets = async (): Promise<Asset[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (!error && data) {
        return data as Asset[];
      }
    } catch (e) {
      console.error('[ASSETS] Failed to fetch assets:', e);
    }
  }
  return [];
};

/**
 * Get assets by type
 */
export const getAssetsByType = async (type: 'image' | 'code' | 'document'): Promise<Asset[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('type', type)
        .order('uploaded_at', { ascending: false });
      
      if (!error && data) {
        return data as Asset[];
      }
    } catch (e) {
      console.error(`[ASSETS] Failed to fetch ${type} assets:`, e);
    }
  }
  return [];
};

/**
 * Get assets by category
 */
export const getAssetsByCategory = async (category: string): Promise<Asset[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('category', category)
        .order('uploaded_at', { ascending: false });
      
      if (!error && data) {
        return data as Asset[];
      }
    } catch (e) {
      console.error(`[ASSETS] Failed to fetch ${category} assets:`, e);
    }
  }
  return [];
};

/**
 * Get single asset by ID
 */
export const getAsset = async (id: string): Promise<Asset | null> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!error && data) {
        return data as Asset;
      }
    } catch (e) {
      console.error('[ASSETS] Failed to fetch asset:', e);
    }
  }
  return null;
};

/**
 * Create new asset
 */
export const createAsset = async (
  asset: Partial<Asset>
): Promise<{ success: boolean; error?: string; id?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const id = `AST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { error } = await supabase
      .from(TABLE_NAME)
      .insert({
        id,
        name: asset.name,
        type: asset.type,
        category: asset.category || 'General',
        description: asset.description,
        url: asset.url,
        content: asset.content,
        file_size: asset.file_size || 0,
        mime_type: asset.mime_type,
        uploaded_by: asset.uploaded_by || 'admin',
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/**
 * Update asset
 */
export const updateAsset = async (
  id: string,
  updates: Partial<Asset>
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/**
 * Delete asset
 */
export const deleteAsset = async (id: string): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/**
 * Get unique categories
 */
export const getCategories = async (): Promise<string[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('category');
      
      if (!error && data) {
        const uniqueCategories = [...new Set(data.map(d => d.category))];
        return uniqueCategories.filter(Boolean);
      }
    } catch (e) {
      console.error('[ASSETS] Failed to fetch categories:', e);
    }
  }
  return [];
};

/**
 * Search assets
 */
export const searchAssets = async (searchTerm: string): Promise<Asset[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  
  if (!searchTerm || searchTerm.trim().length < 2) {
    return getAllAssets();
  }

  try {
    const term = searchTerm.trim();
    const pattern = `%${term}%`;
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`)
      .order('uploaded_at', { ascending: false });
    
    if (!error && data) {
      return data as Asset[];
    }
  } catch (e) {
    console.error('[ASSETS] Search failed:', e);
  }
  
  return [];
};

/**
 * Get asset statistics
 */
export const getAssetStats = async (): Promise<{
  total: number;
  images: number;
  code: number;
  documents: number;
  totalSize: number;
}> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('type, file_size');
      
      if (!error && data) {
        const stats = {
          total: data.length,
          images: data.filter(a => a.type === 'image').length,
          code: data.filter(a => a.type === 'code').length,
          documents: data.filter(a => a.type === 'document').length,
          totalSize: data.reduce((sum, a) => sum + (a.file_size || 0), 0)
        };
        return stats;
      }
    } catch (e) {
      console.error('[ASSETS] Failed to fetch stats:', e);
    }
  }
  
  return { total: 0, images: 0, code: 0, documents: 0, totalSize: 0 };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
