'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Edit, Trash2, CheckCircle,
  Globe, Mail, Calendar, Shield, X, Save,
  UserPlus, FileText, ExternalLink, Loader2, RefreshCw,
  Zap, Archive
} from 'lucide-react';

// ── Types ──

interface Prospect {
  id: string;
  source: 'scan' | 'contact' | 'calendar' | 'discovery' | 'manual';
  source_detail?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  practice_name?: string;
  npi?: string;
  website_url?: string;
  form_data?: Record<string, unknown>;
  scan_score?: number;
  scan_risk_level?: string;
  scan_report_id?: string;
  appointment_date?: string;
  appointment_time?: string;
  meeting_url?: string;
  subject?: string;
  message?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'archived';
  admin_notes?: string;
  assigned_to?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read?: boolean;
  registry_id?: string;
  fillout_submission_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProspectsTabProps {
  showNotification: (msg: string, type?: string) => void;
}

// ── Helpers ──

const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  scan: { icon: <Shield size={11} />, label: 'Risk Scan', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  contact: { icon: <Mail size={11} />, label: 'Contact Form', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  calendar: { icon: <Calendar size={11} />, label: 'Calendar', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  discovery: { icon: <FileText size={11} />, label: 'Discovery', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  manual: { icon: <UserPlus size={11} />, label: 'Manual', color: 'bg-slate-50 border-slate-200 text-slate-600' },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  new: { icon: <Zap size={11} />, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  contacted: { icon: <Mail size={11} />, color: 'bg-amber-50 border-amber-200 text-amber-700' },
  qualified: { icon: <CheckCircle size={11} />, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  converted: { icon: <Shield size={11} />, color: 'bg-green-50 border-green-200 text-green-800' },
  archived: { icon: <Archive size={11} />, color: 'bg-slate-50 border-slate-200 text-slate-500' },
};

const PRIORITY_CONFIG: Record<string, string> = {
  low: 'text-slate-400',
  normal: 'text-slate-600',
  high: 'text-orange-600 font-bold',
  urgent: 'text-red-600 font-bold animate-pulse',
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Component ──

export const ProspectsTab: React.FC<ProspectsTabProps> = ({ showNotification }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Prospect>>({});
  const [showFormDataId, setShowFormDataId] = useState<string | null>(null);

  // ── Load Prospects ──
  const loadProspects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prospects');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProspects(data.prospects || []);
    } catch (err) {
      console.error('[ProspectsTab] Load failed:', err);
      showNotification('Failed to load prospects', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { loadProspects(); }, [loadProspects]);

  // ── Filtered + Searched ──
  const filtered = useMemo(() => {
    return prospects.filter(p => {
      const matchesSource = sourceFilter === 'all' || p.source === sourceFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      if (!matchesSource || !matchesStatus) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (p.contact_name || '').toLowerCase().includes(s) ||
        (p.practice_name || '').toLowerCase().includes(s) ||
        (p.email || '').toLowerCase().includes(s) ||
        (p.npi || '').includes(s) ||
        (p.subject || '').toLowerCase().includes(s)
      );
    });
  }, [prospects, search, sourceFilter, statusFilter]);

  // ── Stats ──
  const stats = useMemo(() => ({
    total: prospects.length,
    new: prospects.filter(p => p.status === 'new').length,
    scans: prospects.filter(p => p.source === 'scan').length,
    contacts: prospects.filter(p => p.source === 'contact').length,
    calendar: prospects.filter(p => p.source === 'calendar').length,
    unread: prospects.filter(p => !p.is_read).length,
  }), [prospects]);

  // ── Update Prospect ──
  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error('Update failed');
      setProspects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      showNotification('Updated');
    } catch {
      showNotification('Update failed', 'error');
    }
  };

  // ── Delete Prospect ──
  const deleteProspect = async (id: string) => {
    if (!confirm('Delete this prospect?')) return;
    try {
      const res = await fetch(`/api/prospects?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setProspects(prev => prev.filter(p => p.id !== id));
      showNotification('Deleted');
    } catch {
      showNotification('Delete failed', 'error');
    }
  };

  // ── Save Edit ──
  const saveEdit = async () => {
    if (!editingId) return;
    await updateProspect(editingId, editForm);
    setEditingId(null);
    setEditForm({});
  };

  // ── Start Edit ──
  const startEdit = (p: Prospect) => {
    setEditingId(p.id);
    setEditForm({
      contact_name: p.contact_name || '',
      email: p.email || '',
      phone: p.phone || '',
      practice_name: p.practice_name || '',
      npi: p.npi || '',
      website_url: p.website_url || '',
      status: p.status,
      priority: p.priority,
      admin_notes: p.admin_notes || '',
      assigned_to: p.assigned_to || '',
    });
  };

  // ── Mark as Read ──
  const markRead = (id: string) => {
    updateProspect(id, { is_read: true });
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="bg-white rounded-lg p-3 shadow-sm border text-center">
          <div className="text-lg font-bold text-slate-700">{stats.total}</div>
          <div className="text-[8px] font-bold text-slate-400 uppercase">Total</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 shadow-sm border border-blue-100 text-center">
          <div className="text-lg font-bold text-blue-700">{stats.new}</div>
          <div className="text-[8px] font-bold text-blue-600 uppercase">New</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border text-center">
          <div className="text-lg font-bold">{stats.scans}</div>
          <div className="text-[8px] font-bold text-slate-400 uppercase">Scans</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border text-center">
          <div className="text-lg font-bold">{stats.contacts}</div>
          <div className="text-[8px] font-bold text-slate-400 uppercase">Contacts</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border text-center">
          <div className="text-lg font-bold">{stats.calendar}</div>
          <div className="text-[8px] font-bold text-slate-400 uppercase">Calendar</div>
        </div>
        <div className={`rounded-lg p-3 shadow-sm border text-center ${stats.unread > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <div className={`text-lg font-bold ${stats.unread > 0 ? 'text-red-600' : ''}`}>{stats.unread}</div>
          <div className="text-[8px] font-bold text-slate-400 uppercase">Unread</div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, NPI, practice..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg uppercase tracking-wide">
            <option value="all">All Sources</option>
            <option value="scan">🛡 Scan</option>
            <option value="contact">✉ Contact</option>
            <option value="calendar">📅 Calendar</option>
            <option value="discovery">📋 Discovery</option>
            <option value="manual">➕ Manual</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg uppercase tracking-wide">
            <option value="all">All Statuses</option>
            <option value="new">⚡ New</option>
            <option value="contacted">📨 Contacted</option>
            <option value="qualified">✅ Qualified</option>
            <option value="converted">🛡 Converted</option>
            <option value="archived">📦 Archived</option>
          </select>
          <button onClick={loadProspects} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50" title="Refresh">
            <RefreshCw size={16} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#C5A059]" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <UserPlus size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-400">No prospects found</p>
          <p className="text-xs text-slate-300 mt-1">Prospects appear here when visitors scan, fill forms, or book calls</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#00234E] text-white text-[9px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Practice / Contact</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => {
                  const src = SOURCE_CONFIG[p.source] || SOURCE_CONFIG.manual;
                  const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.new;
                  const isExpanded = expandedId === p.id;
                  const isEditing = editingId === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${!p.is_read ? 'bg-blue-50/30' : ''}`}
                        onClick={() => {
                          setExpandedId(isExpanded ? null : p.id);
                          if (!p.is_read) markRead(p.id);
                        }}
                      >
                        {/* Source Badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${src.color}`}>
                            {src.icon} {src.label}
                          </span>
                        </td>

                        {/* Practice + Contact */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-sm text-slate-800">
                            {!p.is_read && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1.5 animate-pulse" />}
                            {p.practice_name || 'Unknown Practice'}
                          </div>
                          {p.contact_name && (
                            <div className="text-xs text-slate-600 font-medium mt-0.5">{p.contact_name}</div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {p.email || ''}
                            {p.npi ? ` · NPI: ${p.npi}` : ''}
                          </div>
                        </td>

                        {/* Details snippet */}
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-500 max-w-[200px] truncate">
                            {p.source === 'scan' && p.scan_score !== undefined && (
                              <span className={`font-bold ${p.scan_score >= 67 ? 'text-emerald-600' : p.scan_score >= 34 ? 'text-amber-600' : 'text-red-600'}`}>
                                Score: {p.scan_score}/100
                              </span>
                            )}
                            {p.source === 'contact' && (p.subject || p.message?.slice(0, 60))}
                            {p.source === 'calendar' && p.appointment_date && `${p.appointment_date} @ ${p.appointment_time || ''}`}
                            {p.source === 'discovery' && 'Discovery form submitted'}
                            {!p.source_detail && p.source === 'manual' && '—'}
                            {p.source_detail && p.source !== 'scan' && p.source !== 'contact' && p.source !== 'calendar' && ` ${p.source_detail}`}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${st.color}`}>
                            {st.icon} {p.status}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${PRIORITY_CONFIG[p.priority] || ''}`}>
                            {p.priority}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-500">{timeAgo(p.created_at)}</div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit">
                              <Edit size={13} className="text-slate-400" />
                            </button>
                            {p.form_data && Object.keys(p.form_data).length > 0 && (
                              <button onClick={() => setShowFormDataId(showFormDataId === p.id ? null : p.id)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="View Form Data">
                                <FileText size={13} className="text-blue-500" />
                              </button>
                            )}
                            {p.website_url && (
                              <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-100 rounded-lg" title="Visit Site">
                                <Globe size={13} className="text-slate-400" />
                              </a>
                            )}
                            <button onClick={() => deleteProspect(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete">
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {isExpanded && !isEditing && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 px-4 py-4 border-t border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Contact Info */}
                              <div className="space-y-2">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Contact</div>
                                {p.contact_name && <div><span className="text-slate-500">Name:</span> <span className="font-bold text-slate-700">{p.contact_name}</span></div>}
                                {p.email && <div><span className="text-slate-500">Email:</span> <a href={`mailto:${p.email}`} className="font-bold text-blue-600 hover:underline">{p.email}</a></div>}
                                {p.phone && <div><span className="text-slate-500">Phone:</span> <span className="font-bold text-slate-700">{p.phone}</span></div>}
                                {p.npi && <div><span className="text-slate-500">NPI:</span> <span className="font-mono font-bold text-slate-700">{p.npi}</span></div>}
                                {p.website_url && <div><span className="text-slate-500">URL:</span> <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline">{p.website_url}</a></div>}
                              </div>

                              {/* Source-Specific */}
                              <div className="space-y-2">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                  {p.source === 'scan' ? 'Scan Results' : p.source === 'contact' ? 'Message' : p.source === 'calendar' ? 'Appointment' : 'Details'}
                                </div>
                                {p.source === 'scan' && (
                                  <>
                                    {p.scan_score !== undefined && <div><span className="text-slate-500">Score:</span> <span className={`font-bold ${p.scan_score >= 67 ? 'text-emerald-600' : p.scan_score >= 34 ? 'text-amber-600' : 'text-red-600'}`}>{p.scan_score}/100</span></div>}
                                    {p.scan_risk_level && <div><span className="text-slate-500">Risk Level:</span> <span className="font-bold">{p.scan_risk_level}</span></div>}
                                    {p.scan_report_id && <div><span className="text-slate-500">Report:</span> <span className="font-mono text-[10px]">{p.scan_report_id}</span></div>}
                                  </>
                                )}
                                {p.source === 'contact' && (
                                  <>
                                    {p.subject && <div><span className="text-slate-500">Subject:</span> <span className="font-bold">{p.subject}</span></div>}
                                    {p.message && <div className="bg-white rounded-lg p-2 border mt-1 text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto">{p.message}</div>}
                                  </>
                                )}
                                {p.source === 'calendar' && (
                                  <>
                                    {p.appointment_date && <div><span className="text-slate-500">Date:</span> <span className="font-bold">{p.appointment_date}</span></div>}
                                    {p.appointment_time && <div><span className="text-slate-500">Time:</span> <span className="font-bold">{p.appointment_time}</span></div>}
                                    {p.meeting_url && <div><span className="text-slate-500">Meeting:</span> <a href={`https://${p.meeting_url}`} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline flex items-center gap-1">{p.meeting_url} <ExternalLink size={10} /></a></div>}
                                  </>
                                )}
                              </div>

                              {/* Admin Info */}
                              <div className="space-y-2">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Admin</div>
                                {p.admin_notes && <div className="bg-white rounded-lg p-2 border text-slate-600 whitespace-pre-wrap">{p.admin_notes}</div>}
                                {p.assigned_to && <div><span className="text-slate-500">Assigned:</span> <span className="font-bold">{p.assigned_to}</span></div>}
                                {p.created_at && <div><span className="text-slate-500">Created:</span> <span className="text-slate-600">{new Date(p.created_at).toLocaleString()}</span></div>}
                                {p.updated_at && <div><span className="text-slate-500">Updated:</span> <span className="text-slate-600">{new Date(p.updated_at).toLocaleString()}</span></div>}
                                <div className="flex gap-1 pt-2">
                                  <button onClick={() => startEdit(p)} className="px-2.5 py-1 bg-[#00234E] text-white rounded text-[9px] font-bold uppercase flex items-center gap-1 hover:bg-[#C5A059]">
                                    <Edit size={10} /> Edit
                                  </button>
                                  {p.form_data && Object.keys(p.form_data).length > 0 && (
                                    <button onClick={() => setShowFormDataId(showFormDataId === p.id ? null : p.id)} className="px-2.5 py-1 bg-blue-600 text-white rounded text-[9px] font-bold uppercase flex items-center gap-1 hover:bg-blue-700">
                                      <FileText size={10} /> Form Data
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Form Data Drawer */}
                            {showFormDataId === p.id && p.form_data && (
                              <div className="mt-3 bg-white rounded-lg border p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Original Form Submission</span>
                                  <button onClick={() => setShowFormDataId(null)} className="p-1 hover:bg-slate-100 rounded"><X size={12} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(p.form_data).map(([key, val]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="text-slate-400 font-mono text-[10px] min-w-[120px]">{key}:</span>
                                      <span className="text-slate-700 font-bold break-all">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}

                      {/* Edit Row */}
                      {isEditing && (
                        <tr>
                          <td colSpan={7} className="bg-amber-50/50 px-4 py-4 border-t border-amber-100">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Edit size={14} className="text-amber-600" />
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Edit Prospect</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Contact Name</label>
                                  <input type="text" value={editForm.contact_name || ''} onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Email</label>
                                  <input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                                  <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Practice Name</label>
                                  <input type="text" value={editForm.practice_name || ''} onChange={e => setEditForm({ ...editForm, practice_name: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">NPI</label>
                                  <input type="text" value={editForm.npi || ''} onChange={e => setEditForm({ ...editForm, npi: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Website</label>
                                  <input type="url" value={editForm.website_url || ''} onChange={e => setEditForm({ ...editForm, website_url: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Status</label>
                                  <select value={editForm.status || 'new'} onChange={e => setEditForm({ ...editForm, status: e.target.value as Prospect['status'] })}
                                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg">
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="converted">Converted</option>
                                    <option value="archived">Archived</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Priority</label>
                                  <select value={editForm.priority || 'normal'} onChange={e => setEditForm({ ...editForm, priority: e.target.value as Prospect['priority'] })}
                                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg">
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Assigned To</label>
                                  <input type="text" value={editForm.assigned_to || ''} onChange={e => setEditForm({ ...editForm, assigned_to: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" placeholder="Team member name" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Admin Notes</label>
                                  <textarea value={editForm.admin_notes || ''} onChange={e => setEditForm({ ...editForm, admin_notes: e.target.value })}
                                    rows={2} className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" placeholder="Internal notes..." />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                                <button onClick={() => { setEditingId(null); setEditForm({}); }} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                                <button onClick={saveEdit} className="px-4 py-1.5 bg-[#00234E] text-white text-xs font-bold rounded-lg hover:bg-[#C5A059] flex items-center gap-1">
                                  <Save size={12} /> Save Changes
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-slate-50 border-t text-[10px] text-slate-400 font-bold">
            Showing {filtered.length} of {prospects.length} prospects
          </div>
        </div>
      )}
    </div>
  );
};

