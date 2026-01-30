/**
 * KairoLogic Page Content CMS Tab
 * Admin interface for editing website text without deployment
 * Version: 11.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Search,
  Globe,
  Home,
  Briefcase,
  Shield,
  Mail,
  Database,
  AlertCircle,
  CheckCircle,
  RefreshCw
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
  showNotification: (msg: string) => void;
}

export const PageContentTab: React.FC<PageContentTabProps> = ({ showNotification }) => {
  const [content, setContent] = useState<PageContent[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<PageContent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for editing/creating
  const [formData, setFormData] = useState({
    page: '',
    section: '',
    content: '',
    content_type: 'text' as const,
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
      showNotification('Failed to load page content');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPages = async () => {
    const pagesList = await getPagesList();
    setPages(pagesList);
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
      showNotification('Page, section, and content are required');
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
      resetForm();
    } else {
      showNotification(`Update failed: ${result.error}`);
    }
  };

  const handleCreate = async () => {
    if (!formData.page || !formData.section || !formData.content) {
      showNotification('Page, section, and content are required');
      return;
    }

    const result = await createContentSection({
      ...formData,
      updated_by: 'admin'
    });

    if (result.success) {
      showNotification('Content section created successfully');
      setIsCreating(false);
      loadContent();
      loadPages();
      resetForm();
    } else {
      showNotification(`Creation failed: ${result.error}`);
    }
  };

  const handleDelete = async (id: string, section: string) => {
    if (!confirm(`Delete "${section}"? This cannot be undone.`)) return;

    const result = await deleteContentSection(id);
    
    if (result.success) {
      showNotification('Content section deleted');
      loadContent();
    } else {
      showNotification(`Delete failed: ${result.error}`);
    }
  };

  const resetForm = () => {
    setFormData({
      page: '',
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
      case 'Homepage': return <Home size={20} />;
      case 'Services': return <Briefcase size={20} />;
      case 'Compliance': return <Shield size={20} />;
      case 'Contact': return <Mail size={20} />;
      case 'Registry': return <Database size={20} />;
      default: return <Globe size={20} />;
    }
  };

  // Edit/Create Modal
  const renderModal = () => {
    if (!isEditing && !isCreating) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[3rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-navy p-8 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold/20 rounded-2xl flex items-center justify-center">
                {isEditing ? <Edit2 size={24} className="text-gold" /> : <Plus size={24} className="text-gold" />}
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {isEditing ? 'Edit Content Section' : 'Create Content Section'}
                </h3>
                <p className="text-xs text-gold font-bold uppercase tracking-widest mt-1">
                  {isEditing ? editingItem?.page : 'New Section'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleCancel}
              className="p-3 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <div className="p-8 space-y-6 overflow-y-auto flex-grow">
            {/* Page Selection */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Page *
              </label>
              <select
                value={formData.page}
                onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                disabled={isEditing}
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
              >
                <option value="">Select a page...</option>
                <option value="Homepage">Homepage</option>
                <option value="Services">Services</option>
                <option value="Compliance">Compliance</option>
                <option value="Contact">Contact</option>
                <option value="Registry">Registry</option>
                <option value="About">About</option>
              </select>
            </div>

            {/* Section Identifier */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Section Identifier * <span className="text-gray-400 normal-case">(e.g., hero_title, tier1_price)</span>
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                disabled={isEditing}
                placeholder="hero_title"
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-mono text-navy focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Content Type
              </label>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="text">Plain Text</option>
                <option value="html">HTML</option>
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
                <option value="image_url">Image URL</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                placeholder="Enter your content here..."
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold font-mono resize-none"
              />
              <div className="mt-2 text-xs text-gray-400 font-mono">
                {formData.content.length} characters
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Admin Note
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this content for?"
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-gray-100 flex justify-between items-center shrink-0">
            <button
              onClick={handleCancel}
              className="px-8 py-4 text-navy font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={isEditing ? handleSave : handleCreate}
              className="bg-navy text-gold px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-gold hover:text-navy transition-all flex items-center gap-2"
            >
              <Save size={16} />
              {isEditing ? 'Save Changes' : 'Create Section'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-navy mb-2">
            Page Content CMS
          </h2>
          <p className="text-sm text-gray-500 font-medium italic">
            Edit website text without code deployment. Changes sync instantly to production.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-navy text-gold px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-gold hover:text-navy transition-all flex items-center gap-2 justify-center shrink-0"
        >
          <Plus size={16} />
          New Section
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Page Filter */}
        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" size={20} />
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Pages</option>
            {pages.map(page => (
              <option key={page} value={page}>{page}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sections or content..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-2xl font-black text-navy mb-1">{content.length}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Sections</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-2xl font-black text-navy mb-1">{pages.length}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active Pages</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-2xl font-black text-navy mb-1">{filteredContent.length}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filtered Results</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Last Sync</div>
            <div className="text-sm font-bold text-navy">Live</div>
          </div>
          <CheckCircle className="text-green-500" size={24} />
        </div>
      </div>

      {/* Content Groups */}
      {isLoading ? (
        <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center">
          <RefreshCw className="animate-spin text-navy/20 mx-auto mb-4" size={48} />
          <p className="text-sm font-bold text-navy/60 uppercase tracking-widest">Loading content...</p>
        </div>
      ) : Object.keys(groupedContent).length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-gray-200 rounded-[3rem] p-20 text-center">
          <FileText className="text-gray-300 mx-auto mb-4" size={48} />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            {searchTerm || selectedPage !== 'all' ? 'No matching content found' : 'No content sections yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedContent).map(([page, items]) => (
            <div key={page} className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              {/* Page Header */}
              <div className="bg-navy p-6 flex items-center gap-4">
                <div className="w-10 h-10 bg-gold/20 rounded-xl flex items-center justify-center text-gold">
                  {getPageIcon(page)}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">{page}</h3>
                  <p className="text-xs text-gold font-bold uppercase tracking-widest">{items.length} sections</p>
                </div>
              </div>

              {/* Sections */}
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-grow min-w-0">
                        {/* Section Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="font-mono text-sm font-bold text-navy">
                            {item.section}
                          </div>
                          <div className="px-2 py-1 bg-slate-100 text-navy rounded text-[8px] font-black uppercase tracking-widest">
                            {item.content_type}
                          </div>
                        </div>

                        {/* Content Preview */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 mb-3">
                          <p className="text-sm text-navy font-medium line-clamp-3">
                            {item.content}
                          </p>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          {item.description && (
                            <div className="flex items-center gap-2">
                              <AlertCircle size={12} />
                              <span className="italic">{item.description}</span>
                            </div>
                          )}
                          <div className="text-[9px] font-mono">
                            Updated: {new Date(item.last_updated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-3 bg-slate-100 text-navy rounded-xl hover:bg-gold hover:text-navy transition-all"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.section)}
                          className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
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

      {/* Modals */}
      {renderModal()}
    </div>
  );
};

export default PageContentTab;
