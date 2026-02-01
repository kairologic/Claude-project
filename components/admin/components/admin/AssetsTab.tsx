/**
 * KairoLogic Assets Management Tab
 * Admin interface for managing images, code snippets, and documents
 * Version: 11.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Image, 
  Code, 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Download,
  Search,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  Upload,
  Save
} from 'lucide-react';
import {
  getAllAssets,
  getAssetsByType,
  getCategories,
  createAsset,
  updateAsset,
  deleteAsset,
  searchAssets,
  getAssetStats,
  formatFileSize,
  Asset
} from '@/services/assetsService';

interface AssetsTabProps {
  showNotification: (msg: string) => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({ showNotification }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, images: 0, code: 0, documents: 0, totalSize: 0 });
  
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'code' | 'document'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'code' as 'image' | 'code' | 'document',
    category: 'General',
    description: '',
    content: '',
    url: ''
  });

  useEffect(() => {
    loadAssets();
    loadCategories();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [assets, selectedType, selectedCategory, searchTerm]);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const data = await getAllAssets();
      setAssets(data);
    } catch (e) {
      showNotification('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  const loadStats = async () => {
    const data = await getAssetStats();
    setStats(data);
  };

  const applyFilters = async () => {
    let filtered = assets;

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    // Search filter
    if (searchTerm && searchTerm.length >= 2) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(term) ||
        a.description?.toLowerCase().includes(term) ||
        a.category.toLowerCase().includes(term)
      );
    }

    setFilteredAssets(filtered);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.type) {
      showNotification('Name and type are required');
      return;
    }

    if (formData.type === 'code' && !formData.content) {
      showNotification('Content is required for code snippets');
      return;
    }

    const result = await createAsset({
      ...formData,
      uploaded_by: 'admin'
    });

    if (result.success) {
      showNotification('Asset created successfully');
      setIsModalOpen(false);
      resetForm();
      loadAssets();
      loadCategories();
      loadStats();
    } else {
      showNotification(`Creation failed: ${result.error}`);
    }
  };

  const handleUpdate = async () => {
    if (!editingAsset) return;

    const result = await updateAsset(editingAsset.id, formData);

    if (result.success) {
      showNotification('Asset updated successfully');
      setIsModalOpen(false);
      setIsEditing(false);
      setEditingAsset(null);
      resetForm();
      loadAssets();
      loadCategories();
    } else {
      showNotification(`Update failed: ${result.error}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    const result = await deleteAsset(id);
    
    if (result.success) {
      showNotification('Asset deleted');
      loadAssets();
      loadStats();
    } else {
      showNotification(`Delete failed: ${result.error}`);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      type: asset.type,
      category: asset.category,
      description: asset.description || '',
      content: asset.content || '',
      url: asset.url || ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      showNotification('Copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      showNotification('Failed to copy');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'code',
      category: 'General',
      description: '',
      content: '',
      url: ''
    });
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingAsset(null);
    resetForm();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image size={20} />;
      case 'code': return <Code size={20} />;
      case 'document': return <FileText size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'image': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'code': return 'bg-green-100 text-green-700 border-green-200';
      case 'document': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Modal for create/edit
  const renderModal = () => {
    if (!isModalOpen) return null;

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
                  {isEditing ? 'Edit Asset' : 'Create New Asset'}
                </h3>
                <p className="text-xs text-gold font-bold uppercase tracking-widest mt-1">
                  {formData.type.toUpperCase()}
                </p>
              </div>
            </div>
            <button onClick={handleCancel} className="p-3 hover:bg-white/10 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <div className="p-8 space-y-6 overflow-y-auto flex-grow">
            {/* Asset Name */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Asset Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="HB 149 AI Disclosure Snippet"
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            {/* Type Selection */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Asset Type *
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['code', 'image', 'document'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    disabled={isEditing}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.type === type
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-navy border-gray-200 hover:border-gold'
                    } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {getTypeIcon(type)}
                    <span className="text-xs font-black uppercase">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Compliance, Widget, Legal, etc."
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="What is this asset for?"
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              />
            </div>

            {/* Code Content (for code type) */}
            {formData.type === 'code' && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                  Code Snippet *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  placeholder="<div>Your code here...</div>"
                  className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-2 focus:ring-gold font-mono resize-none"
                />
                <div className="mt-2 text-xs text-gray-400 font-mono">
                  {formData.content.length} characters
                </div>
              </div>
            )}

            {/* URL (for images/documents) */}
            {(formData.type === 'image' || formData.type === 'document') && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-navy/60 mb-2 block">
                  File URL {formData.type === 'image' ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://cdn.kairologic.com/hero-image.jpg"
                  className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-mono text-navy focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <p className="mt-2 text-xs text-gray-400 italic">
                  Upload to Supabase Storage first, then paste the URL here
                </p>
              </div>
            )}
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
              onClick={isEditing ? handleUpdate : handleCreate}
              className="bg-navy text-gold px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-gold hover:text-navy transition-all flex items-center gap-2"
            >
              <Save size={16} />
              {isEditing ? 'Save Changes' : 'Create Asset'}
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
            Assets Library
          </h2>
          <p className="text-sm text-gray-500 font-medium italic">
            Manage code snippets, images, and documents for your compliance platform.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-navy text-gold px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-gold hover:text-navy transition-all flex items-center gap-2 justify-center shrink-0"
        >
          <Plus size={16} />
          New Asset
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-2xl font-black text-navy mb-1">{stats.total}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Assets</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="text-2xl font-black text-blue-700 mb-1">{stats.images}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">Images</div>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-sm">
          <div className="text-2xl font-black text-green-700 mb-1">{stats.code}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-green-600">Code Snippets</div>
        </div>
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 shadow-sm">
          <div className="text-2xl font-black text-purple-700 mb-1">{stats.documents}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-purple-600">Documents</div>
        </div>
        <div className="bg-gold/10 p-6 rounded-2xl border border-gold/20 shadow-sm">
          <div className="text-lg font-black text-navy mb-1">{formatFileSize(stats.totalSize)}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Size</div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Type Filter */}
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" size={20} />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold appearance-none"
          >
            <option value="all">All Types</option>
            <option value="code">Code Snippets</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40" size={20} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold appearance-none"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
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
            placeholder="Search assets..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
      </div>

      {/* Assets Grid */}
      {isLoading ? (
        <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center">
          <div className="animate-spin text-navy/20 mx-auto mb-4">
            <Upload size={48} />
          </div>
          <p className="text-sm font-bold text-navy/60 uppercase tracking-widest">Loading assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-gray-200 rounded-[3rem] p-20 text-center">
          <FileText className="text-gray-300 mx-auto mb-4" size={48} />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            {searchTerm || selectedType !== 'all' || selectedCategory !== 'all' 
              ? 'No matching assets found' 
              : 'No assets yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all p-6 group"
            >
              {/* Asset Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 flex-grow min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    asset.type === 'image' ? 'bg-blue-100 text-blue-700' :
                    asset.type === 'code' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {getTypeIcon(asset.type)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-black text-navy text-sm mb-1 truncate">{asset.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getTypeBadgeColor(asset.type)}`}>
                        {asset.type}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-navy rounded text-[8px] font-black uppercase tracking-widest">
                        {asset.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {asset.type === 'code' && asset.content && (
                    <button
                      onClick={() => handleCopy(asset.content!, asset.id)}
                      className="p-2 bg-slate-100 text-navy rounded-xl hover:bg-gold hover:text-navy transition-all relative"
                      title="Copy to clipboard"
                    >
                      {copiedId === asset.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(asset)}
                    className="p-2 bg-slate-100 text-navy rounded-xl hover:bg-gold hover:text-navy transition-all"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id, asset.name)}
                    className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Asset Content Preview */}
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 mb-3 max-h-40 overflow-y-auto">
                {asset.type === 'code' && asset.content && (
                  <pre className="text-xs font-mono text-navy whitespace-pre-wrap break-all">
                    {asset.content.substring(0, 200)}
                    {asset.content.length > 200 && '...'}
                  </pre>
                )}
                {asset.type === 'image' && asset.url && (
                  <div className="text-xs font-mono text-navy break-all">
                    {asset.url}
                  </div>
                )}
                {asset.type === 'document' && asset.url && (
                  <div className="text-xs font-mono text-navy break-all">
                    {asset.url}
                  </div>
                )}
                {asset.description && (
                  <p className="text-xs text-gray-500 italic mt-2">{asset.description}</p>
                )}
              </div>

              {/* Asset Metadata */}
              <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono">
                <span>ID: {asset.id}</span>
                <span>{new Date(asset.uploaded_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {renderModal()}
    </div>
  );
};

export default AssetsTab;
