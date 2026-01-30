/**
 * KairoLogic Page Content CMS Tab
 * Admin interface for editing website text without deployment
 * Version: 12.0.0 - Fixed dropdown, added default pages
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Edit2, Trash2, Save, X, Search, Globe, Home,
  Briefcase, Shield, Mail, Database, AlertCircle, CheckCircle, RefreshCw, Image
} from 'lucide-react';
import {
  getAllPageContent,
  getPagesList,
  updateContentSection,
  createContentSection,
  deleteContentSection,
  PageContent
} from '@/services/pageContentService';

interface PageContentTabProps {
  showNotification: (msg: string, type?: string) => void;
}

// Default pages that should always be available
const DEFAULT_PAGES = ['Homepage', 'Header', 'Footer', 'Services', 'Compliance', 'Contact', 'Registry'];

export const PageContentTab: React.FC<PageContentTabProps> = ({ showNotification }) => {
  const [content, setContent] = useState<PageContent[]>([]);
  const [pages, setPages] = useState<string[]>(DEFAULT_PAGES);
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<PageContent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<{
    page: string;
    section: string;
    content: string;
    content_type: 'text' | 'html' | 'json' | 'markdown' | 'image_url';
    description: string;
  }>({
    page: 'Homepage',
    section: '',
    content: '',
    content_type: 'text',
    description: ''
  });

  useEffect(() => {
    loadContent();
    loadPages();
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const data = await getAllPageContent();
      setContent(data);
    } catch (e) {
      console.error('Failed to load content:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPages = async () => {
    try {
      const pagesList = await getPagesList();
      // Merge default pages with pages from DB
      const allPages = [...new Set([...DEFAULT_PAGES, ...pagesList])];
      setPages(allPages.sort());
    } catch (e) {
      // Use default pages if fetch fails
      setPages(DEFAULT_PAGES);
    }
  };

  const handleEdit = (item: PageContent) => {
    setEditingItem(item);
    setFormData({
      page: item.page,
      section: item.section,
      content: item.content,
      content_type: item.content_type,
      description: item.description || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!formData.page || !formData.section || !formData.content) {
      showNotification('Page, section, and content are required', 'error');
      return;
    }

    const result = await updateContentSection(
      formData.page,
      formData.section,
      formData.content,
      'admin'
    );

    if (result.success) {
      showNotification('Content updated successfully');
      setIsEditing(false);
      setEditingItem(null);
      loadContent();
      loadPages();
      resetForm();
    } else {
      showNotification(`Update failed: ${result.error}`, 'error');
    }
  };

  const handleCreate = async () => {
    if (!formData.page || !formData.section || !formData.content) {
      showNotification('Page, section, and content are required', 'error');
      return;
    }

    const result = await createContentSection({
      page: formData.page,
      section: formData.section,
      content: formData.content,
      content_type: formData.content_type,
      description: formData.description
    });

    if (result.success) {
      showNotification('Content section created');
      setIsCreating(false);
      loadContent();
      loadPages();
      resetForm();
    } else {
      showNotification(`Creation failed: ${result.error}`, 'error');
    }
  };

  const handleDelete = async (id: string, section: string) => {
    if (!confirm(`Delete "${section}"? This cannot be undone.`)) return;

    const result = await deleteContentSection(id);
    
    if (result.success) {
      showNotification('Content section deleted');
      loadContent();
    } else {
      showNotification(`Delete failed: ${result.error}`, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      page: 'Homepage',
      section: '',
      content: '',
      content_type: 'text',
      description: ''
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditingItem(null);
    resetForm();
  };

  // Filter content based on selected page and search
  const filteredContent = content.filter(item => {
    const matchesPage = selectedPage === 'all' || item.page === selectedPage;
    const matchesSearch = 
      searchTerm === '' ||
      item.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.page.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesPage && matchesSearch;
  });

  // Group by page
  const groupedContent = filteredContent.reduce((acc, item) => {
    if (!acc[item.page]) acc[item.page] = [];
    acc[item.page].push(item);
    return acc;
  }, {} as Record<string, PageContent[]>);

  const getPageIcon = (page: string) => {
    switch (page) {
      case 'Homepage': return <Home size={16} />;
      case 'Services': return <Briefcase size={16} />;
      case 'Compliance': return <Shield size={16} />;
      case 'Contact': return <Mail size={16} />;
      case 'Registry': return <Database size={16} />;
      case 'Header': return <FileText size={16} />;
      case 'Footer': return <FileText size={16} />;
      default: return <Globe size={16} />;
    }
  };

  // Stats
  const totalSections = content.length;
  const activePages = [...new Set(content.map(c => c.page))].length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Page Content CMS</h2>
          <p className="text-xs text-slate-500">Edit website text without code deployment</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreating(true); }}
          className="bg-[#00234E] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#C5A059]"
        >
          <Plus size={16} /> New Section
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Pages</option>
              {pages.map(page => (
                <option key={page} value={page}>{page}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sections or content..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <button onClick={loadContent} className="p-2 bg-white border rounded-lg hover:bg-slate-50">
          <RefreshCw size={16} className={`text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xl font-bold text-slate-700">{totalSections}</div>
          <div className="text-[9px] font-bold text-slate-400 uppercase">Total Sections</div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xl font-bold text-blue-600">{activePages}</div>
          <div className="text-[9px] font-bold text-slate-400 uppercase">Active Pages</div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xl font-bold text-slate-500">{filteredContent.length}</div>
          <div className="text-[9px] font-bold text-slate-400 uppercase">Filtered Results</div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-sm font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> Live</div>
          <div className="text-[9px] font-bold text-slate-400 uppercase">Last Sync</div>
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-[#C5A059]" size={24} />
          <span className="ml-2 text-sm text-slate-500">Loading content...</span>
        </div>
      ) : content.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-2" size={32} />
          <h3 className="font-bold text-amber-800 mb-1">No Content Found</h3>
          <p className="text-sm text-amber-600 mb-3">
            The page_content table is empty. Create your first content section or run the database migration.
          </p>
          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Create First Section
          </button>
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="bg-slate-50 border rounded-lg p-8 text-center">
          <Search className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-sm text-slate-500">No content matches your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedContent).map(([page, items]) => (
            <div key={page} className="bg-white rounded-lg border overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b flex items-center gap-2">
                {getPageIcon(page)}
                <span className="font-bold text-sm text-slate-700">{page}</span>
                <span className="text-xs text-slate-400">({items.length} sections)</span>
              </div>
              <div className="divide-y">
                {items.map(item => (
                  <div key={item.id} className="px-4 py-3 hover:bg-slate-50 group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{item.section}</code>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                            item.content_type === 'html' ? 'bg-purple-100 text-purple-700' :
                            item.content_type === 'image_url' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {item.content_type === 'image_url' && <Image size={8} className="inline mr-0.5" />}
                            {item.content_type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 truncate">{item.content}</p>
                        {item.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 hover:bg-blue-100 rounded"
                        >
                          <Edit2 size={14} className="text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.section)}
                          className="p-1.5 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {(isEditing || isCreating) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-[#00234E] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C5A059]/20 rounded-lg flex items-center justify-center">
                  {isEditing ? <Edit2 size={20} className="text-[#C5A059]" /> : <Plus size={20} className="text-[#C5A059]" />}
                </div>
                <div>
                  <h3 className="font-bold">{isEditing ? 'Edit Content Section' : 'Create Content Section'}</h3>
                  <p className="text-xs text-slate-300">{isEditing ? 'Update existing content' : 'Add new content section'}</p>
                </div>
              </div>
              <button onClick={handleCancel} className="p-2 hover:bg-white/10 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Page *</label>
                  <select
                    value={formData.page}
                    onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm"
                    disabled={isEditing}
                  >
                    {pages.map(page => (
                      <option key={page} value={page}>{page}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Section Identifier * <span className="text-slate-400 normal-case">(e.g., hero_title)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="hero_title"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm font-mono"
                    disabled={isEditing}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Content Type</label>
                <select
                  value={formData.content_type}
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm"
                >
                  <option value="text">Plain Text</option>
                  <option value="html">HTML</option>
                  <option value="markdown">Markdown</option>
                  <option value="image_url">Image URL</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={formData.content_type === 'image_url' ? 'https://example.com/image.jpg' : 'Enter your content here...'}
                  rows={formData.content_type === 'html' || formData.content_type === 'json' ? 8 : 4}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm ${formData.content_type === 'html' || formData.content_type === 'json' ? 'font-mono text-xs' : ''}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this content section"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm"
                />
              </div>

              {/* Usage hint */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-xs font-bold text-blue-800 mb-1">💡 How this content appears on the site:</h4>
                <p className="text-[10px] text-blue-700">
                  The page code reads content using: <code className="bg-blue-100 px-1 rounded">{formData.page}.{formData.section || 'section_name'}</code>
                </p>
                <p className="text-[10px] text-blue-600 mt-1">
                  Design/layout is controlled in code. You control the text, images, and content here.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3">
              <button onClick={handleCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button
                onClick={isEditing ? handleSave : handleCreate}
                className="px-5 py-2 bg-[#00234E] text-white text-sm font-bold rounded-lg hover:bg-[#C5A059] flex items-center gap-2"
              >
                <Save size={16} />
                {isEditing ? 'Save Changes' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
