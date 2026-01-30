/**
 * useCMSContent Hook
 * Easily fetch and use CMS content in React components
 * Version: 11.0.0
 */

import { useState, useEffect } from 'react';
import { getContentSection, getPageContent, PageContent } from '@/services/pageContentService';

/**
 * Hook to fetch a single content section
 * @param page - Page name (e.g., 'Homepage')
 * @param section - Section identifier (e.g., 'hero_title')
 * @param fallback - Default text if content not found
 */
export const useCMSContent = (
  page: string, 
  section: string, 
  fallback: string = ''
): string => {
  const [content, setContent] = useState<string>(fallback);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        const result = await getContentSection(page, section);
        setContent(result || fallback);
      } catch (e) {
        console.error(`[CMS] Failed to fetch ${page}.${section}:`, e);
        setContent(fallback);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [page, section, fallback]);

  return content;
};

/**
 * Hook to fetch all content for a page
 * @param page - Page name (e.g., 'Homepage')
 */
export const usePageCMS = (page: string): {
  content: Record<string, string>;
  isLoading: boolean;
  refresh: () => void;
} => {
  const [content, setContent] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchPageContent = async () => {
    setIsLoading(true);
    try {
      const results = await getPageContent(page);
      const contentMap = results.reduce((acc, item) => {
        acc[item.section] = item.content;
        return acc;
      }, {} as Record<string, string>);
      setContent(contentMap);
    } catch (e) {
      console.error(`[CMS] Failed to fetch page ${page}:`, e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageContent();
  }, [page]);

  return {
    content,
    isLoading,
    refresh: fetchPageContent
  };
};

/**
 * Hook for getting content with support for multiple formats
 */
export const useCMSSection = (
  page: string,
  section: string
): {
  content: string;
  isLoading: boolean;
  contentType: 'text' | 'html' | 'json' | 'markdown' | 'image_url';
} => {
  const [data, setData] = useState<{
    content: string;
    contentType: 'text' | 'html' | 'json' | 'markdown' | 'image_url';
    isLoading: boolean;
  }>({
    content: '',
    contentType: 'text',
    isLoading: true
  });

  useEffect(() => {
    const fetchSection = async () => {
      try {
        const results = await getPageContent(page);
        const item = results.find(r => r.section === section);
        
        if (item) {
          setData({
            content: item.content,
            contentType: item.content_type,
            isLoading: false
          });
        } else {
          setData(prev => ({ ...prev, isLoading: false }));
        }
      } catch (e) {
        console.error(`[CMS] Failed to fetch ${page}.${section}:`, e);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchSection();
  }, [page, section]);

  return data;
};

/**
 * Helper component to render CMS content
 */
export const CMSText: React.FC<{
  page: string;
  section: string;
  fallback?: string;
  className?: string;
}> = ({ page, section, fallback = '', className = '' }) => {
  const content = useCMSContent(page, section, fallback);
  return <span className={className}>{content}</span>;
};

/**
 * Helper component to render HTML CMS content
 */
export const CMSHtml: React.FC<{
  page: string;
  section: string;
  fallback?: string;
  className?: string;
}> = ({ page, section, fallback = '', className = '' }) => {
  const content = useCMSContent(page, section, fallback);
  return <div className={className} dangerouslySetInnerHTML={{ __html: content }} />;
};
