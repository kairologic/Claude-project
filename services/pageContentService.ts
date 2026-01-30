/**
 * KairoLogic Page Content CMS Service
 * Manages dynamic website text content without code deployment
 * Version: 11.0.0-FIXED
 */

import { getSupabase } from '@/lib/supabase';

export interface PageContent {
  id: string;
  page: string;
  section: string;
  content: string;
  content_type: 'text' | 'html' | 'json' | 'markdown' | 'image_url';
  description?: string;
  last_updated: string;
  updated_by?: string;
}

const TABLE_NAME = 'page_content';

/**
 * Get all content for a specific page
 */
export const getPageContent = async (page: string): Promise<PageContent[]> => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('page', page)
      .order('section');
    
    if (!error && data) {
      return data as PageContent[];
    }
  } catch (e) {
    console.error('[CMS] Failed to fetch page content:', e);
  }
  return [];
};

/**
 * Get specific content section
 */
export const getContentSection = async (
  page: string, 
  section: string
): Promise<string> => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('content')
      .eq('page', page)
      .eq('section', section)
      .maybeSingle();
    
    if (!error && data) {
      return data.content;
    }
  } catch (e) {
    console.error('[CMS] Failed to fetch content section:', e);
  }
  return '';
};

/**
 * Get all pages with their content
 */
export const getAllPageContent = async (): Promise<PageContent[]> => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('page')
      .order('section');
    
    if (!error && data) {
      return data as PageContent[];
    }
  } catch (e) {
    console.error('[CMS] Failed to fetch all content:', e);
  }
  return [];
};

/**
 * Update content section
 */
export const updateContentSection = async (
  page: string,
  section: string,
  content: string,
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert({
        page,
        section,
        content,
        updated_by: updatedBy || 'admin',
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'page,section'
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/**
 * Create new content section
 */
export const createContentSection = async (
  data: Partial<PageContent>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(TABLE_NAME)
      .insert({
        id: `PG-${Date.now()}`,
        page: data.page,
        section: data.section,
        content: data.content || '',
        content_type: data.content_type || 'text',
        description: data.description,
        last_updated: new Date().toISOString(),
        updated_by: data.updated_by || 'admin'
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/**
 * Delete content section
 */
export const deleteContentSection = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = getSupabase();
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
 * Get pages list (unique page names)
 */
export const getPagesList = async (): Promise<string[]> => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('page');
    
    if (!error && data) {
      const uniquePages = [...new Set(data.map(d => d.page))];
      return uniquePages;
    }
  } catch (e) {
    console.error('[CMS] Failed to fetch pages list:', e);
  }
  return [];
};

/**
 * Bulk update content sections
 */
export const bulkUpdateContent = async (
  updates: Array<{ page: string; section: string; content: string }>,
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = getSupabase();
    const timestamp = new Date().toISOString();
    const records = updates.map(u => ({
      page: u.page,
      section: u.section,
      content: u.content,
      updated_by: updatedBy || 'admin',
      last_updated: timestamp
    }));

    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(records, {
        onConflict: 'page,section'
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
