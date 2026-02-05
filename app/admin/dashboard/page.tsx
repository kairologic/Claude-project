'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase, Registry } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Shield, Users, Database, Calendar, Mail, 
  Search, Plus, Trash2, Edit, Eye, EyeOff, Download, Upload, Play, 
  Star,
  CheckCircle, AlertTriangle, XCircle, Clock, Copy, Globe, FileCode, 
  BarChart3, TrendingUp, AlertCircle, Loader2, X, Save, LogOut, FileText, Package, Zap, Pause, FileWarning, UserPlus
} from 'lucide-react';

import { AssetsTab } from '@/components/admin/AssetsTab';
import { PageContentTab } from '@/components/admin/PageContentTab';
import { ProviderDetailModal } from '@/components/admin/ProviderDetailModal';
import { ProspectsTab } from '@/components/admin/ProspectsTab';
import { EmailTemplatesTab } from '@/components/admin/EmailTemplatesTab';

type TabType = 'overview' | 'registry' | 'prospects' | 'widgets' | 'templates' | 'calendar' | 'content' | 'assets';

// Technical fixes for violations (from RiskScanWidget)
const TECHNICAL_FIXES: Record<string, any> = {
  'DR-01': { name: 'Primary EHR Domain IP Geo-Location', regulation: 'SB1188', clause: 'Sec. 183.002(a)', fix_priority: 'Critical' },
  'DR-02': { name: 'CDN & Edge Cache Analysis', regulation: 'SB1188', clause: 'Sec. 183.002(a)', fix_priority: 'Critical' },
  'DR-03': { name: 'MX Record Analysis', regulation: 'SB1188', clause: 'Sec. 183.002(b)', fix_priority: 'High' },
  'DR-04': { name: 'Third-Party Resource Audit', regulation: 'SB1188', clause: 'Sec. 183.002(c)', fix_priority: 'High' },
  'AI-01': { name: 'AI Disclosure Presence', regulation: 'HB149', clause: 'Sec. 101.001(a)', fix_priority: 'High' },
  'AI-02': { name: 'AI Disclosure Visibility', regulation: 'HB149', clause: 'Sec. 101.001(b)', fix_priority: 'Critical' },
  'AI-03': { name: 'AI Diagnostic Tool Disclaimer', regulation: 'HB149', clause: 'Sec. 101.002', fix_priority: 'High' },
};

interface ScanResult {
  total: number;
  scanned: number;
  withUrl: number;
  withoutUrl: Registry[];
  withoutUrlCount: number;  // Count of providers without URLs (too many to load)
  scanResults: any[];
  errors: string[];
  timestamp: string;
}

const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    hidden: 'bg-slate-100 border-slate-200 text-slate-500',
    trial: 'bg-blue-50 border-blue-200 text-blue-700',
    inactive: 'bg-slate-100 border-slate-200 text-slate-500'
  };
  const icons: Record<string, React.ReactNode> = {
    active: <CheckCircle size={11} />, warning: <AlertTriangle size={11} />, hidden: <EyeOff size={11} />,
    trial: <Clock size={11} />, inactive: <Pause size={11} />
  };
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[9px]'} rounded-full border font-bold uppercase tracking-wide ${styles[status] || styles.hidden}`}>
      {icons[status]} {status}
    </span>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }> = 
  ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`${widths[size]} w-full bg-white rounded-xl shadow-2xl max-h-[85vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg"><X size={16} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

interface ProviderFormData {
  id: string; npi: string; name: string; contact_first_name: string; contact_last_name: string;
  email: string; phone: string; city: string; zip: string; url: string;
  widget_status: 'active' | 'warning' | 'hidden'; subscription_status: 'trial' | 'active' | 'inactive';
  is_visible: boolean; risk_score: number; provider_type: number;
}

const ProviderForm: React.FC<{ entry?: Registry | null; onSave: (data: ProviderFormData) => void; onCancel: () => void; }> = ({ entry, onSave, onCancel }) => {
  const [form, setForm] = useState<ProviderFormData>({
    id: entry?.id || `REG-${Date.now()}`, npi: entry?.npi || '', name: entry?.name || '',
    contact_first_name: entry?.contact_first_name || '', contact_last_name: entry?.contact_last_name || '',
    email: entry?.email || '', phone: entry?.phone || '', city: entry?.city || '', zip: entry?.zip || '',
    url: entry?.url || '', widget_status: (entry?.widget_status as any) || 'hidden',
    subscription_status: (entry?.subscription_status as any) || 'trial', is_visible: entry?.is_visible ?? false, 
    risk_score: entry?.risk_score || 0, provider_type: (entry as any)?.provider_type || 2
  });
  
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Practice Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NPI *</label>
          <input type="text" value={form.npi} onChange={e => setForm({ ...form, npi: e.target.value })} required maxLength={10} className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Provider Type</label>
          <select value={form.provider_type} onChange={e => setForm({ ...form, provider_type: parseInt(e.target.value) })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg">
            <option value={1}>Type 1</option><option value={2}>Type 2</option></select></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">City</label>
          <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ZIP</label>
          <input type="text" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" /></div>
        <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Website URL (required for scanning)</label>
          <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://example.com" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Widget Status</label>
          <select value={form.widget_status} onChange={e => setForm({ ...form, widget_status: e.target.value as any })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg">
            <option value="active">Active</option><option value="warning">Warning</option><option value="hidden">Hidden</option></select></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subscription</label>
          <select value={form.subscription_status} onChange={e => setForm({ ...form, subscription_status: e.target.value as any })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg">
            <option value="trial">Trial</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t"><button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
        <button type="submit" className="px-5 py-2 bg-[#00234E] text-white text-sm font-bold rounded-lg hover:bg-[#C5A059] flex items-center gap-1.5"><Save size={14} /> Save</button></div>
    </form>
  );
};

interface EmailTemplate { id: string; name: string; category: string; subject: string; body: string; event_trigger: string; is_active: boolean; html_body?: string; }

interface MarketingTemplate { 
  id: string; 
  name: string; 
  category: string; 
  description?: string;
  file_name?: string;
  file_type?: string;
  file_data?: string;
  last_updated?: string;
}
interface CalendarSlot { id: string; date: string; time: string; is_booked: boolean; booked_by?: { name: string } | null; }

// REAL scan function - calls the /api/scan route for actual DNS/IP/header forensics
const runComplianceScan = async (npi: string, url: string): Promise<any> => {
  const targetUrl = url.startsWith('http') ? url : `https://${url}`;
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ npi, url: targetUrl }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Scan failed (${res.status})`);
  }
  const data = await res.json();
  // Normalize response to fields used by the dashboard
  const findings = data.findings || [];
  const sb1188 = findings.filter((f: any) => f.category === 'data_sovereignty');
  const hb149 = findings.filter((f: any) => f.category === 'ai_transparency');
  return {
    ...data,
    url: targetUrl,
    risk_score: data.riskScore ?? 0,
    risk_level: data.riskLevel ?? 'critical',
    status_label: data.complianceStatus ?? 'Violation',
    sb1188_findings: sb1188,
    sb1188_pass_count: sb1188.filter((f: any) => f.status === 'pass').length,
    sb1188_fail_count: sb1188.filter((f: any) => f.status === 'fail').length,
    hb149_findings: hb149,
    hb149_pass_count: hb149.filter((f: any) => f.status === 'pass').length,
    hb149_fail_count: hb149.filter((f: any) => f.status === 'fail').length,
    technical_fixes: findings.filter((f: any) => f.status === 'fail').map((f: any) => ({
      ...f, ...TECHNICAL_FIXES[f.id]
    }))
  };
};

// Store a report snapshot via /api/report after a successful scan
const storeReport = async (provider: Registry, scanData: any): Promise<string | null> => {
  try {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npi: provider.npi,
        url: scanData.url,
        providerName: provider.name,
        riskScore: scanData.risk_score,
        riskLevel: scanData.risk_level,
        complianceStatus: scanData.status_label,
        findings: scanData.findings || [],
        categoryScores: scanData.categoryScores,
        dataBorderMap: scanData.dataBorderMap,
        pageContext: scanData.pageContext,
        npiVerification: scanData.npiVerification,
        engineVersion: scanData.engineVersion,
        scanDuration: scanData.scanDuration,
        meta: scanData.meta,
      }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result.reportId || null;
  } catch { return null; }
};

type SortField = 'name' | 'npi' | 'city' | 'zip' | 'risk_score' | 'last_scan_timestamp' | 'report_status' | 'widget_status';
type SortDir = 'asc' | 'desc';

export default function AdminDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [providers, setProviders] = useState<Registry[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [marketingTemplates, setMarketingTemplates] = useState<MarketingTemplate[]>([]);
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('report_status');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Registry | null>(null);
  const [viewingProvider, setViewingProvider] = useState<Registry | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [widgetModal, setWidgetModal] = useState<Registry | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanReport, setShowScanReport] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [showImportScanPrompt, setShowImportScanPrompt] = useState(false);
  const [totalCounts, setTotalCounts] = useState({ total: 0, withUrl: 0, withoutUrl: 0, active: 0 });

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') { router.push('/admin'); return; }
    setAuthenticated(true); loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      
      // Get total counts first (fast count queries)
      const [totalResult, activeResult] = await Promise.all([
        supabase.from('registry').select('id', { count: 'exact', head: true }),
        supabase.from('registry').select('id', { count: 'exact', head: true }).eq('widget_status', 'active')
      ]);
      
      const totalCount = totalResult.count || 0;
      const activeCount = activeResult.count || 0;
      
      // Load providers WITH URLs (scannable) - limit to 500 for performance
      const { data, error: loadError } = await supabase
        .from('registry')
        .select('*')
        .not('url', 'is', null)
        .neq('url', '')
        .order('last_scan_timestamp', { ascending: false, nullsFirst: false })
        .limit(500);
      if (loadError) console.error('Registry load error:', loadError);
      setProviders(data || []);
      
      // Derive WITH URL count from actual loaded data (count queries with .like are unreliable)
      const withUrlCount = data?.length || 0;
      setTotalCounts({
        total: totalCount,
        withUrl: withUrlCount,
        withoutUrl: totalCount - withUrlCount,
        active: activeCount
      });
      console.log(`Loaded ${withUrlCount} providers with URLs (${totalCount} total in registry, ${activeCount} active)`);
      
      
      // Load email templates from database
      const { data: emailTemplatesData } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      if (emailTemplatesData && emailTemplatesData.length > 0) {
        setTemplates(emailTemplatesData.map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category || 'transactional',
          subject: t.subject || '',
          body: t.body || t.html_body || '',
          event_trigger: t.name, // Use name as event trigger
          is_active: t.is_active !== false,
          html_body: t.html_body
        })));
      } else {
        // Fallback if no data
        setTemplates([
          { id: 'ET-001', name: 'Cure Notice Warning', category: 'marketing', subject: 'URGENT: TX SB 1188 Alert', body: 'Your practice may be at risk.', event_trigger: 'risk_scan_high', is_active: true },
          { id: 'ET-002', name: 'Verification Complete', category: 'transactional', subject: 'Sentry Verified', body: 'Congratulations! Your practice is verified.', event_trigger: 'verification_complete', is_active: true },
        ]);
      }
      
      // Load marketing/asset templates from templates table
      const { data: marketingData } = await supabase
        .from('templates')
        .select('*')
        .order('id');
      if (marketingData) {
        setMarketingTemplates(marketingData.map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category || 'General',
          description: t.description,
          file_name: t.file_name,
          file_type: t.file_type,
          file_data: t.file_data,
          last_updated: t.last_updated
        })));
      }
      
      generateCalendarSlots();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const generateCalendarSlots = () => {
    const slots: CalendarSlot[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(); date.setDate(date.getDate() + d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      ['09:00','10:00','11:00','14:00','15:00','16:00'].forEach(time => {
        slots.push({ id: `${date.toISOString().split('T')[0]}-${time}`, date: date.toISOString().split('T')[0], time, is_booked: Math.random() > 0.8, booked_by: Math.random() > 0.8 ? { name: 'Dr. Sample' } : null });
      });
    }
    setCalendarSlots(slots);
    if (slots.length && !selectedDate) setSelectedDate(slots[0].date);
  };

  const stats = useMemo(() => ({
    total: totalCounts.total,
    withUrl: totalCounts.withUrl,
    withoutUrl: totalCounts.withoutUrl,
    loaded: providers.length,
    active: totalCounts.active, // Use count from database, not from loaded providers
    warning: providers.filter(r => r.widget_status === 'warning').length,
    hidden: providers.filter(r => r.widget_status === 'hidden').length,
    paid: providers.filter(r => r.subscription_status === 'active').length,
    type1: providers.filter(r => (r as any).provider_type === 1).length,
    type2: providers.filter(r => (r as any).provider_type === 2 || !(r as any).provider_type).length,
  }), [providers, totalCounts]);

  const filteredProviders = useMemo(() => {
    // Multi-value search: split on spaces/commas, match ALL terms across name/npi/city/zip
    let results = providers;
    if (searchTerm.trim()) {
      const terms = searchTerm.toLowerCase().split(/[\s,]+/).filter(Boolean);
      results = providers.filter(r => {
        const haystack = `${r.name} ${r.npi} ${r.city || ''} ${r.zip || ''}`.toLowerCase();
        return terms.every(t => haystack.includes(t));
      });
    }
    // Sort: default is report_status (generated/sent first) then by last_scan_timestamp desc
    const sorted = [...results].sort((a, b) => {
      // Primary sort by selected field
      let cmp = 0;
      if (sortField === 'report_status') {
        const rank: Record<string, number> = { subscriber: 4, sent: 3, generated: 2, none: 0 };
        cmp = (rank[b.report_status || 'none'] || 0) - (rank[a.report_status || 'none'] || 0);
        // Secondary: by last_scan_timestamp desc
        if (cmp === 0) {
          const aTs = a.last_scan_timestamp ? new Date(a.last_scan_timestamp).getTime() : 0;
          const bTs = b.last_scan_timestamp ? new Date(b.last_scan_timestamp).getTime() : 0;
          cmp = bTs - aTs;
        }
        return sortDir === 'asc' ? -cmp : cmp;
      }
      if (sortField === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortField === 'npi') cmp = (a.npi || '').localeCompare(b.npi || '');
      else if (sortField === 'city') cmp = (a.city || '').localeCompare(b.city || '');
      else if (sortField === 'zip') cmp = (a.zip || '').localeCompare(b.zip || '');
      else if (sortField === 'risk_score') cmp = (a.risk_score || 0) - (b.risk_score || 0);
      else if (sortField === 'last_scan_timestamp') {
        const aTs = a.last_scan_timestamp ? new Date(a.last_scan_timestamp).getTime() : 0;
        const bTs = b.last_scan_timestamp ? new Date(b.last_scan_timestamp).getTime() : 0;
        cmp = aTs - bTs;
      }
      else if (sortField === 'widget_status') cmp = (a.widget_status || '').localeCompare(b.widget_status || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [providers, searchTerm, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'name' || field === 'npi' ? 'asc' : 'desc'); }
  }, [sortField]);

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <span className="ml-0.5 opacity-30 text-[8px]">{'\u2195'}</span>;
    return <span className="ml-0.5 text-[#C5A059] text-[8px]">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  const calendarDates = useMemo(() => [...new Set(calendarSlots.map(s => s.date))].sort(), [calendarSlots]);
  const dateSlots = useMemo(() => selectedDate ? calendarSlots.filter(s => s.date === selectedDate) : [], [calendarSlots, selectedDate]);

  const notify = useCallback((msg: string, type = 'success') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); }, []);
  const handleLogout = () => { sessionStorage.removeItem('admin_auth'); router.push('/admin'); };

  const handleSaveProvider = async (data: ProviderFormData) => {
    try {
      const supabase = getSupabase();
      const isNew = !providers.find(p => p.id === data.id);
      if (isNew) await supabase.from('registry').insert(data);
      else await supabase.from('registry').update(data).eq('id', data.id);
      await loadData(); setShowAddProvider(false); setEditingProvider(null); notify(isNew ? 'Provider added!' : 'Provider updated!');
    } catch (e: any) { notify(e.message || 'Failed to save', 'error'); }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Delete this provider?')) return;
    try { const supabase = getSupabase(); await supabase.from('registry').delete().eq('id', id); await loadData(); notify('Deleted'); }
    catch (e: any) { notify(e.message || 'Failed', 'error'); }
  };

  // GLOBAL SCAN - Scans Type 2 providers WITH URLs, stores results
  const handleGlobalScan = async () => {
    setScanning(true); 
    setScanProgress(0); 
    setScanStatus('Fetching Type 2 providers...');
    
    try {
      const supabase = getSupabase();
      
      // Step 1: Get count of all Type 2 providers
      const { count: totalType2 } = await supabase
        .from('registry')
        .select('id', { count: 'exact', head: true })
        .or('provider_type.eq.2,provider_type.is.null'); // Type 2 or null (default)
      
      // Step 2: Fetch Type 2 providers WITH URLs (scannable)
      const { data: providersToScan, error } = await supabase
        .from('registry')
        .select('*')
        .or('provider_type.eq.2,provider_type.is.null')
        .like('url', 'http%')
        .limit(1000);
      
      if (error) throw error;
      
      // Step 3: Get count of Type 2 providers WITHOUT URLs
      const { count: type2WithoutUrl } = await supabase
        .from('registry')
        .select('id', { count: 'exact', head: true })
        .or('provider_type.eq.2,provider_type.is.null')
        .or('url.is.null,url.eq.');
      
      const result: ScanResult = {
        total: totalType2 || 0,
        scanned: 0,
        withUrl: providersToScan?.length || 0,
        withoutUrl: [], // Too many to load individually
        withoutUrlCount: type2WithoutUrl || 0,  // Just the count
        scanResults: [],
        errors: [],
        timestamp: new Date().toISOString()
      };

      setScanStatus(`Found ${providersToScan?.length || 0} Type 2 providers with URLs`);
      await new Promise(r => setTimeout(r, 1000));

      if (!providersToScan || providersToScan.length === 0) {
        setScanning(false);
        setScanResult(result);
        setShowScanReport(true);
        notify('No Type 2 providers with URLs to scan', 'info');
        return;
      }
      
      for (let i = 0; i < providersToScan.length; i++) {
        const p = providersToScan[i];
        setScanStatus(`Scanning ${p.name} (${i + 1}/${providersToScan.length})...`);
        setScanProgress(Math.round(((i + 1) / providersToScan.length) * 100));
        
        let scanData: any = null;
        // Attempt scan with one retry on failure
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            scanData = await runComplianceScan(p.npi, p.url!);
            break;
          } catch (err: any) {
            if (attempt === 1) {
              setScanStatus(`Retry ${p.name} in 10s...`);
              await new Promise(r => setTimeout(r, 10000));
            } else {
              result.errors.push(`${p.name}: ${err.message}`);
            }
          }
        }
        
        if (scanData) {
          try {
            // Store scan result in database
            await supabase.from('scan_results').insert({
              registry_id: p.id, npi: p.npi, url: p.url, scan_type: 'global',
              risk_score: scanData.risk_score, risk_level: scanData.risk_level,
              sb1188_findings: scanData.sb1188_findings,
              sb1188_pass_count: scanData.sb1188_pass_count,
              sb1188_fail_count: scanData.sb1188_fail_count,
              hb149_findings: scanData.hb149_findings,
              hb149_pass_count: scanData.hb149_pass_count,
              hb149_fail_count: scanData.hb149_fail_count,
              technical_fixes: scanData.technical_fixes,
              raw_scan_data: scanData
            });
            
            // Store report snapshot
            const reportId = await storeReport(p, scanData);
            const nowIso = new Date().toISOString();
            
            // Update provider record with all fields
            const updatePayload: any = {
              risk_score: scanData.risk_score,
              risk_level: scanData.risk_level,
              status_label: scanData.status_label || (scanData.risk_score >= 75 ? 'Verified Sovereign' : scanData.risk_score >= 50 ? 'Drift Detected' : 'Violation'),
              scan_count: (p.scan_count || 0) + 1,
              widget_status: scanData.risk_score >= 75 ? 'active' : scanData.risk_score >= 50 ? 'warning' : 'hidden',
              last_scan_result: scanData,
              last_scan_timestamp: nowIso,
              updated_at: nowIso
            };
            if (reportId) {
              updatePayload.report_status = 'generated';
              updatePayload.latest_report_url = `/api/report?reportId=${reportId}`;
            }
            await supabase.from('registry').update(updatePayload).eq('id', p.id);
            
            result.scanResults.push({ provider: p.name, ...scanData });
            result.scanned++;
          } catch (dbErr: any) {
            result.errors.push(`${p.name}: DB save failed - ${dbErr.message}`);
          }
        }
        
        // 2-second delay between scans to respect ip-api rate limits (45/min)
        if (i < providersToScan.length - 1) await new Promise(r => setTimeout(r, 2000));
      }
      
      setScanStatus('Scan complete!');
      setScanResult(result);
      setShowScanReport(true);
      await loadData();
      const doneMsg = result.errors.length > 0
        ? `Done: ${result.scanned} scanned, ${result.errors.length} failed, ${result.withoutUrlCount.toLocaleString()} need URLs.`
        : `Scan complete! ${result.scanned} scanned, ${result.withoutUrlCount.toLocaleString()} need URLs.`;
      notify(doneMsg, result.errors.length > 0 ? 'error' : 'success');
      
    } catch (e: any) {
      notify('Scan failed: ' + e.message, 'error');
    } finally {
      setScanning(false);
      setScanProgress(0);
      setScanStatus('');
    }
  };

  // Individual provider scan
  const handleScan = async (ids: string[]) => {
    // Fetch providers directly from DB to ensure we have the latest data
    const supabase = getSupabase();
    const { data: fetchedProviders, error: fetchError } = await supabase
      .from('registry')
      .select('*')
      .in('id', ids);
    
    if (fetchError || !fetchedProviders) {
      notify('Failed to fetch providers for scanning', 'error');
      return;
    }
    
    const toScan = fetchedProviders;
    const withUrl = toScan.filter(p => p.url && p.url.trim());
    const withoutUrl = toScan.filter(p => !p.url || !p.url.trim());
    
    if (withoutUrl.length > 0) {
      notify(`${withoutUrl.length} provider(s) have no URL and cannot be scanned`, 'error');
    }
    
    if (withUrl.length === 0) return;
    
    setScanning(true); setScanProgress(0);
    setScanStatus(`Scanning ${withUrl.length} provider(s)... (~${Math.ceil(withUrl.length * 4 / 60)} min)`);
    
    try {
      const supabase = getSupabase();
      const nowIso = new Date().toISOString();
      let scanned = 0, failed = 0;
      for (let i = 0; i < withUrl.length; i++) {
        const p = withUrl[i];
        setScanProgress(Math.round(((i + 1) / withUrl.length) * 100));
        setScanStatus(`Scanning ${p.name} (${i+1}/${withUrl.length})...`);
        
        let scanData: any = null;
        // Attempt scan with one retry on failure
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            scanData = await runComplianceScan(p.npi, p.url!);
            break; // success
          } catch (err: any) {
            if (attempt === 1) {
              setScanStatus(`Retry ${p.name} in 10s...`);
              await new Promise(r => setTimeout(r, 10000));
            } else {
              console.error(`Scan failed for ${p.name}: ${err.message}`);
              failed++;
            }
          }
        }
        
        if (!scanData) continue; // skip to next provider
        
        // Store in scan_results table
        await supabase.from('scan_results').insert({
          registry_id: p.id, npi: p.npi, url: p.url, scan_type: 'manual',
          risk_score: scanData.risk_score, risk_level: scanData.risk_level,
          sb1188_findings: scanData.sb1188_findings, hb149_findings: scanData.hb149_findings,
          technical_fixes: scanData.technical_fixes, raw_scan_data: scanData
        });
        
        // Store report via /api/report for PDF generation
        const reportId = await storeReport(p, scanData);
        
        // Update registry with all fields
        const updatePayload: any = { 
          risk_score: scanData.risk_score,
          risk_level: scanData.risk_level,
          status_label: scanData.status_label || (scanData.risk_score >= 75 ? 'Verified Sovereign' : scanData.risk_score >= 50 ? 'Drift Detected' : 'Violation'),
          scan_count: (p.scan_count || 0) + 1,
          widget_status: scanData.risk_score >= 75 ? 'active' : scanData.risk_score >= 50 ? 'warning' : 'hidden',
          last_scan_result: scanData,
          last_scan_timestamp: nowIso,
          updated_at: nowIso
        };
        if (reportId) {
          updatePayload.report_status = 'generated';
          updatePayload.latest_report_url = `/api/report?reportId=${reportId}`;
        }
        await supabase.from('registry').update(updatePayload).eq('id', p.id);
        scanned++;
        
        // 2-second delay between scans to respect ip-api rate limits (45/min)
        if (i < withUrl.length - 1) await new Promise(r => setTimeout(r, 2000));
      }
      await loadData();
      const msg = failed > 0 ? `Done: ${scanned} scanned, ${failed} failed.` : `Scan complete! ${scanned} provider(s) scanned.`;
      notify(msg, failed > 0 ? 'error' : 'success');
    } catch (e: any) { notify(e.message || 'Scan failed', 'error'); }
    finally { setScanning(false); setScanProgress(0); setScanStatus(''); }
  };

  // CSV EXPORT - All providers
  const handleExport = () => {
    const csv = [
      'NPI,Name,Provider Type,City,Zip,Email,Phone,URL,Risk Score,Last Scan,Report Status,Widget Status,Subscription',
      ...providers.map(r => 
        `${r.npi},"${r.name}",${(r as any).provider_type || 2},${r.city||''},${r.zip||''},${r.email||''},${r.phone||''},${r.url||''},${r.risk_score||0},${r.last_scan_timestamp||''},${r.report_status||'none'},${r.widget_status||''},${r.subscription_status||''}`
      )
    ].join('\n');
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `registry-${new Date().toISOString().split('T')[0]}.csv`; 
    a.click(); 
    notify('Exported to CSV');
  };

  // Download professional PDF compliance report for a provider
  const handleDownloadReport = async (provider: Registry) => {
    notify('Generating PDF report...');
    try {
      // Fetch scan report from API
      const res = await fetch(`/api/report?npi=${provider.npi}`);
      const data = await res.json();
      const report = data.reports?.[0] || null;
      
      // Fetch full report if we have a report_id
      let fullReport = report;
      if (report?.report_id) {
        const fullRes = await fetch(`/api/report?reportId=${report.report_id}`);
        if (fullRes.ok) fullReport = await fullRes.json();
      }
      
      const findings = fullReport?.findings || [];
      const catScores = fullReport?.category_scores || {};
      const borderMap = fullReport?.data_border_map || [];
      const score = provider.risk_score || fullReport?.sovereignty_score || 0;
      const riskLevel = score >= 75 ? 'Low Risk' : score >= 50 ? 'Moderate Risk' : 'High Risk';
      const reportId = fullReport?.report_id || `KL-SAR-${Date.now().toString(36).toUpperCase()}`;
      const reportDate = fullReport?.report_date ? new Date(fullReport.report_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Generate professional HTML report for PDF (print-optimized)
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>KairoLogic Compliance Report - ${provider.name}</title>
  <style>
    @page { size: letter; margin: 0.75in; }
    @media print { 
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      @page { margin-top: 0.5in; margin-bottom: 0.5in; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, system-ui, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; background: white; }
    .page { page-break-after: always; padding: 0.5in; }
    .page:last-child { page-break-after: auto; }
    
    /* Header */
    .header { background: linear-gradient(135deg, #00234E 0%, #003366 100%); color: white; padding: 32px; margin: -0.5in -0.5in 24px -0.5in; text-align: center; }
    .header-logo { font-size: 28pt; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
    .header-logo span { color: #C5A059; }
    .header-sub { color: #C5A059; font-size: 9pt; letter-spacing: 4px; text-transform: uppercase; font-weight: 700; }
    .header-title { font-size: 18pt; font-weight: 800; margin-top: 16px; letter-spacing: 1px; }
    .header-meta { font-size: 9pt; color: rgba(255,255,255,0.7); margin-top: 8px; }
    
    /* Score Section */
    .score-section { display: flex; align-items: center; justify-content: space-between; padding: 24px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; }
    .score-circle { width: 100px; height: 100px; border-radius: 50%; border: 6px solid ${score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'}; display: flex; align-items: center; justify-content: center; flex-direction: column; }
    .score-value { font-size: 32pt; font-weight: 900; color: ${score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'}; line-height: 1; }
    .score-label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .score-info { text-align: right; }
    .risk-badge { display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: ${score >= 75 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2'}; color: ${score >= 75 ? '#166534' : score >= 50 ? '#92400e' : '#991b1b'}; }
    .compliance-status { font-size: 9pt; color: #64748b; margin-top: 8px; }
    
    /* Practice Info */
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
    .info-item { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .info-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 2px; }
    .info-value { font-size: 11pt; font-weight: 600; color: #1e293b; }
    
    /* Section Headers */
    .section-title { font-size: 14pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #00234E; padding-bottom: 8px; border-bottom: 3px solid #C5A059; margin: 32px 0 16px 0; }
    
    /* Category Scores */
    .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .cat-card { background: #f8fafc; padding: 16px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
    .cat-name { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
    .cat-score { font-size: 24pt; font-weight: 900; }
    .cat-detail { font-size: 8pt; color: #94a3b8; margin-top: 4px; }
    
    /* Findings */
    .finding { background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; page-break-inside: avoid; }
    .finding-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .finding-id { font-size: 10pt; font-weight: 900; color: #00234E; }
    .finding-name { font-size: 11pt; font-weight: 700; color: #1e293b; margin-top: 2px; }
    .severity { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .severity-critical { background: #fee2e2; color: #991b1b; }
    .severity-high { background: #ffedd5; color: #9a3412; }
    .severity-medium { background: #fef3c7; color: #92400e; }
    .severity-low { background: #dcfce7; color: #166534; }
    .finding-clause { font-size: 9pt; color: #64748b; font-style: italic; margin: 8px 0; }
    .finding-detail { font-size: 10pt; color: #475569; line-height: 1.6; margin-bottom: 12px; padding: 12px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; }
    .tech-fix { background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 12px 12px 0; margin-top: 12px; }
    .tech-fix-label { font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #059669; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .tech-fix-text { font-size: 10pt; color: #064e3b; font-family: 'Consolas', 'Monaco', monospace; line-height: 1.6; }
    
    /* Border Map Table */
    .border-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 24px; }
    .border-table th { background: #00234E; color: white; padding: 10px 8px; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
    .border-table td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
    .border-table tr:nth-child(even) { background: #f8fafc; }
    .sovereign { color: #16a34a; font-weight: 700; }
    .non-sovereign { color: #dc2626; font-weight: 700; }
    
    /* Attestation */
    .attestation { background: linear-gradient(135deg, #00234E 0%, #003366 100%); color: white; padding: 32px; border-radius: 16px; margin-top: 32px; page-break-inside: avoid; }
    .attestation-title { font-size: 14pt; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #C5A059; margin-bottom: 16px; text-align: center; }
    .attestation-text { font-size: 10pt; line-height: 1.8; color: rgba(255,255,255,0.9); margin-bottom: 24px; }
    .attestation-sig { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 24px; }
    .sig-block { text-align: center; }
    .sig-line { width: 180px; border-bottom: 2px solid #C5A059; margin-bottom: 8px; height: 40px; display: flex; align-items: flex-end; justify-content: center; }
    .sig-name { font-size: 11pt; font-weight: 700; color: #C5A059; font-style: italic; }
    .sig-title { font-size: 8pt; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .seal { width: 80px; height: 80px; border: 3px solid #C5A059; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; }
    .seal-text { font-size: 7pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #C5A059; text-align: center; line-height: 1.2; }
    
    /* Footer */
    .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .footer-logo { font-weight: 900; color: #00234E; }
    
    /* CTA */
    .cta { background: #f8fafc; border: 2px solid #C5A059; border-radius: 12px; padding: 24px; text-align: center; margin-top: 24px; }
    .cta-title { font-size: 12pt; font-weight: 800; color: #00234E; margin-bottom: 8px; }
    .cta-text { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
    .cta-url { font-size: 11pt; font-weight: 700; color: #C5A059; }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-logo">Kairo<span>Logic</span></div>
      <div class="header-sub">Statutory Vanguard • ATX-01 Anchor Node</div>
      <div class="header-title">Texas Healthcare Compliance Report</div>
      <div class="header-meta">SB 1188 Data Sovereignty & HB 149 AI Transparency Assessment</div>
    </div>
    
    <!-- Score Section -->
    <div class="score-section">
      <div class="score-circle">
        <div class="score-value">${score}</div>
        <div class="score-label">Score</div>
      </div>
      <div style="flex: 1; padding: 0 24px;">
        <div style="font-size: 16pt; font-weight: 800; color: #00234E;">${provider.name}</div>
        <div style="font-size: 10pt; color: #64748b; margin-top: 4px;">NPI: ${provider.npi}</div>
      </div>
      <div class="score-info">
        <div class="risk-badge">${riskLevel}</div>
        <div class="compliance-status">Report ID: ${reportId}</div>
        <div class="compliance-status">${reportDate}</div>
      </div>
    </div>
    
    <!-- Practice Info -->
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Practice Name</div><div class="info-value">${provider.name}</div></div>
      <div class="info-item"><div class="info-label">NPI</div><div class="info-value">${provider.npi}</div></div>
      <div class="info-item"><div class="info-label">Location</div><div class="info-value">${provider.city || 'Texas'}, TX</div></div>
      <div class="info-item"><div class="info-label">Website Scanned</div><div class="info-value">${provider.url || 'Not provided'}</div></div>
    </div>
    
    <!-- Category Scores -->
    ${Object.keys(catScores).length > 0 ? `
    <div class="section-title">Compliance Category Breakdown</div>
    <div class="cat-grid">
      ${Object.entries(catScores).map(([name, data]: [string, any]) => `
        <div class="cat-card">
          <div class="cat-name">${name.replace(/_/g, ' ')}</div>
          <div class="cat-score" style="color: ${(data.percentage || 0) >= 75 ? '#16a34a' : (data.percentage || 0) >= 50 ? '#d97706' : '#dc2626'}">${data.percentage || 0}%</div>
          <div class="cat-detail">${data.passed || 0} passed / ${data.findings || 0} checks</div>
        </div>
      `).join('')}
    </div>` : ''}
    
    <!-- Findings Section -->
    <div class="section-title">Statutory Drift Analysis (${findings.length} Findings)</div>
    ${findings.length === 0 ? `
      <div class="finding" style="text-align: center; padding: 40px;">
        <div style="font-size: 32pt; color: #16a34a; margin-bottom: 12px;">✓</div>
        <div style="font-size: 14pt; font-weight: 700; color: #16a34a;">No Compliance Violations Detected</div>
        <div style="font-size: 10pt; color: #64748b; margin-top: 8px;">Your practice infrastructure is aligned with Texas SB 1188 and HB 149 requirements.</div>
      </div>
    ` : findings.map((f: any, i: number) => `
      <div class="finding">
        <div class="finding-header">
          <div>
            <div class="finding-id">${f.id || `DRIFT-${String(i + 1).padStart(2, '0')}`}</div>
            <div class="finding-name">${f.name || 'Compliance Finding'}</div>
          </div>
          <span class="severity severity-${(f.severity || 'medium').toLowerCase()}">${f.severity || 'MEDIUM'}</span>
        </div>
        ${f.clause ? `<div class="finding-clause">📜 Legal Reference: ${f.clause}</div>` : ''}
        <div class="finding-detail">
          <strong>Technical Finding:</strong> ${f.detail || f.description || f.technical_finding || 'Infrastructure deviation detected requiring remediation.'}
        </div>
        ${f.technicalFix || f.recommended_fix ? `
        <div class="tech-fix">
          <div class="tech-fix-label">✅ Recommended Technical Fix</div>
          <div class="tech-fix-text">${f.technicalFix || f.recommended_fix}</div>
        </div>` : `
        <div class="tech-fix">
          <div class="tech-fix-label">✅ Recommended Technical Fix</div>
          <div class="tech-fix-text">Contact KairoLogic engineering to provision a Texas-anchored remediation for this drift vector. Reference: ATX-01-SECURE // PROTOCOL-TX-2026</div>
        </div>`}
      </div>
    `).join('')}
  </div>
  
  <div class="page">
    <!-- Data Border Map -->
    ${borderMap.length > 0 ? `
    <div class="section-title">Data Border Map (${borderMap.length} Endpoints Analyzed)</div>
    <table class="border-table">
      <thead>
        <tr>
          <th>Domain</th>
          <th>IP Address</th>
          <th>Location</th>
          <th>Purpose</th>
          <th>Sovereignty</th>
        </tr>
      </thead>
      <tbody>
        ${borderMap.map((e: any) => `
          <tr>
            <td>${e.domain || '-'}</td>
            <td style="font-family: monospace; font-size: 8pt;">${e.ip || '-'}</td>
            <td>${e.city || ''}, ${e.country || e.countryCode || ''}</td>
            <td>${e.purpose || e.type || '-'}</td>
            <td class="${e.isSovereign !== false ? 'sovereign' : 'non-sovereign'}">${e.isSovereign !== false ? '✓ US Sovereign' : '⚠ Foreign/OCONUS'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : ''}
    
    <!-- Official Attestation -->
    <div class="attestation">
      <div class="attestation-title">Official Compliance Attestation</div>
      <div class="attestation-text">
        This document certifies that the above-named healthcare practice has been assessed for compliance with Texas Senate Bill 1188 (Data Sovereignty Requirements) and House Bill 149 (AI Transparency Mandates) as of the scan date indicated. The findings, technical recommendations, and remediation guidance contained herein represent the current compliance posture based on automated infrastructure analysis.
        <br><br>
        ${score >= 75 ? 
          'This practice demonstrates <strong>Substantial Compliance</strong> with Texas healthcare data sovereignty requirements. Continued monitoring is recommended to maintain this status.' :
          'This practice requires <strong>Technical Remediation</strong> to achieve full compliance. The drift items identified above must be addressed to meet Texas statutory requirements and avoid potential regulatory penalties.'}
      </div>
      <div class="attestation-sig">
        <div class="sig-block">
          <div class="sig-line"><div class="sig-name">KairoLogic Compliance Team</div></div>
          <div class="sig-title">Statutory Vanguard Division</div>
          <div class="sig-title">Austin, Texas</div>
        </div>
        <div class="seal">
          <div class="seal-text">SENTRY<br>ASSESSED<br>TX-2026</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"><div class="sig-name">${reportDate}</div></div>
          <div class="sig-title">Assessment Date</div>
          <div class="sig-title">Report ID: ${reportId}</div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-logo">KairoLogic Compliance Vanguard</div>
      <div>ATX-01 Anchor Node • Austin, Texas</div>
      <div>Report Generated: ${new Date().toISOString()} • TX SB 1188 & HB 149 Statutory Alignment</div>
      <div style="margin-top: 8px; font-size: 7pt; color: #cbd5e1;">This report is provided for informational purposes. KairoLogic makes no warranty regarding regulatory outcomes. Consult legal counsel for compliance decisions.</div>
    </div>
  </div>
</body>
</html>`;
      
      // Create blob and trigger print dialog (which allows Save as PDF)
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Download HTML file directly (user can open and print/save as PDF)
      const a = document.createElement('a');
      a.href = url;
      a.download = `${provider.name.replace(/\\s+/g, '_')}_Compliance_Report_${reportId}.html`;
      a.click();
      URL.revokeObjectURL(url);
      
      notify('Report downloaded - open and print to PDF');
    } catch (err) {
      console.error('Report download error:', err);
      notify('Failed to generate report', 'error');
    }
  };

  // Export Type 2 providers without URLs - fetches directly from DB in batches
  const handleExportMissingUrls = async () => {
    setScanning(true);
    setScanStatus('Fetching Type 2 providers without URLs...');
    setScanProgress(0);
    
    try {
      const supabase = getSupabase();
      const allMissing: any[] = [];
      const batchSize = 10000;
      let offset = 0;
      let hasMore = true;
      
      // Fetch in batches to handle large datasets
      while (hasMore) {
        setScanStatus(`Fetching records ${offset + 1} to ${offset + batchSize}...`);
        
        const { data, error } = await supabase
          .from('registry')
          .select('npi, name, city, email, phone, provider_type')
          .or('provider_type.eq.2,provider_type.is.null')
          .or('url.is.null,url.eq.')
          .range(offset, offset + batchSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allMissing.push(...data);
          offset += batchSize;
          setScanProgress(Math.min(90, Math.round((allMissing.length / totalCounts.withoutUrl) * 100)));
        } else {
          hasMore = false;
        }
        
        // Stop if we've fetched enough or no more data
        if (!data || data.length < batchSize) hasMore = false;
        
        // Safety limit
        if (allMissing.length >= 100000) {
          notify('Export limited to 100,000 records', 'info');
          hasMore = false;
        }
      }
      
      setScanStatus('Generating CSV...');
      setScanProgress(95);
      
      const csv = [
        'NPI,Name,Provider Type,City,Email,Phone,URL (ADD THIS)',
        ...allMissing.map(r => `${r.npi},"${(r.name || '').replace(/"/g, '""')}",${r.provider_type || 2},${r.city||''},${r.email||''},${r.phone||''},`)
      ].join('\n');
      
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `type2-providers-needing-urls-${new Date().toISOString().split('T')[0]}.csv`; 
      a.click(); 
      
      notify(`Exported ${allMissing.length.toLocaleString()} Type 2 providers needing URLs`);
      
    } catch (e: any) {
      notify('Export failed: ' + e.message, 'error');
    } finally {
      setScanning(false);
      setScanProgress(0);
      setScanStatus('');
    }
  };

  // CSV IMPORT
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      
      const data = lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const row: any = {};
        headers.forEach((h, i) => {
          let val = values[i]?.replace(/^"|"$/g, '').trim() || '';
          if (h.includes('npi')) row.npi = val;
          else if (h.includes('name') || h.includes('practice')) row.name = val;
          else if (h.includes('type')) row.provider_type = parseInt(val) || 2;
          else if (h.includes('city')) row.city = val;
          else if (h.includes('email')) row.email = val;
          else if (h.includes('phone')) row.phone = val;
          else if (h.includes('url') || h.includes('website')) {
            row.url = val;
            // Normalize URL with https:// if missing
            if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
              row.url = 'https://' + val;
            }
          }
          else if (h.includes('zip')) row.zip = val;
          else if (h.includes('featured')) row.is_featured = val.toLowerCase() === 'true' || val === '1';
          else if (h.includes('status')) row.status_label = val;
        });
        return row;
      }).filter(r => r.npi && r.name);
      
      setImportData(data);
      setShowImportModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeImport = async () => {
    if (importData.length === 0) return;
    setScanning(true); setScanStatus('Importing providers...'); setScanProgress(0);
    
    try {
      const supabase = getSupabase();
      let imported = 0, updated = 0;
      const newIds: string[] = [];
      
      for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        setScanProgress(Math.round(((i + 1) / importData.length) * 100));
        setScanStatus(`Importing ${row.name}...`);
        
        const existing = providers.find(p => p.npi === row.npi);
        
        if (existing) {
          const updateData: any = { updated_at: new Date().toISOString() };
          if (row.url && row.url.trim()) updateData.url = row.url;
          if (row.email) updateData.email = row.email;
          if (row.phone) updateData.phone = row.phone;
          if (row.city) updateData.city = row.city;
          if (row.zip) updateData.zip = row.zip;
          if (row.provider_type) updateData.provider_type = row.provider_type;
          if (row.is_featured !== undefined) updateData.is_featured = row.is_featured;
          if (row.status_label) updateData.status_label = row.status_label;
          await supabase.from('registry').update(updateData).eq('id', existing.id);
          if (row.url && row.url.trim()) newIds.push(existing.id);
          updated++;
        } else {
          const newId = `REG-${Date.now()}-${i}`;
          await supabase.from('registry').insert({
            id: newId, npi: row.npi, name: row.name,
            email: row.email || null, phone: row.phone || null, city: row.city || null,
            zip: row.zip || null, url: row.url || null, provider_type: row.provider_type || 2,
            widget_status: 'hidden', subscription_status: 'trial', is_visible: false, risk_score: 0, scan_count: 0,
            is_featured: row.is_featured || false, status_label: row.status_label || null
          });
          if (row.url && row.url.trim()) newIds.push(newId);
          imported++;
        }
      }
      
      await loadData();
      setShowImportModal(false); setImportData([]);
      notify(`Import complete! ${imported} new, ${updated} updated.`);
      
      // Prompt to scan imported providers that have URLs
      if (newIds.length > 0) {
        setImportedIds(newIds);
        setShowImportScanPrompt(true);
      }
    } catch (e: any) { notify('Import failed: ' + e.message, 'error'); }
    finally { setScanning(false); setScanProgress(0); setScanStatus(''); }
  };

  const handleWidgetStatusChange = async (p: Registry, status: string) => {
    try { await getSupabase().from('registry').update({ widget_status: status }).eq('id', p.id); await loadData(); notify(`Widget: ${status}`); }
    catch (e: any) { notify(e.message, 'error'); }
  };

  const tabs = [
    { id: 'overview' as TabType, icon: <BarChart3 size={15} />, label: 'Overview' },
    { id: 'prospects' as TabType, icon: <UserPlus size={15} />, label: 'Prospects' },
    { id: 'registry' as TabType, icon: <Database size={15} />, label: 'Registry' },
    { id: 'widgets' as TabType, icon: <Shield size={15} />, label: 'Widgets' },
    { id: 'templates' as TabType, icon: <Mail size={15} />, label: 'Templates' },
    { id: 'calendar' as TabType, icon: <Calendar size={15} />, label: 'Calendar' },
    { id: 'content' as TabType, icon: <FileText size={15} />, label: 'Content' },
    { id: 'assets' as TabType, icon: <Package size={15} />, label: 'Assets' },
  ];

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportFile} className="hidden" />

      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle size={14} /> : notification.type === 'error' ? <XCircle size={14} /> : <AlertCircle size={14} />} {notification.msg}
        </div>
      )}

      {scanning && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md">
            <Loader2 className="animate-spin text-[#C5A059] mx-auto mb-4" size={48} />
            <h3 className="text-lg font-bold text-[#00234E] mb-2">{scanStatus || 'Processing...'}</h3>
            <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-[#C5A059] transition-all" style={{ width: `${scanProgress}%` }} />
            </div>
            <p className="text-sm text-slate-500 mt-2">{scanProgress}% complete</p>
          </div>
        </div>
      )}

      <header className="bg-[#00234E] text-white py-3 px-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-[#C5A059]" />
            <div><h1 className="text-base font-bold">Sentry Control Center</h1><p className="text-[9px] text-slate-400 uppercase">Registry & Compliance</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/"><button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"><Eye size={16} /></button></Link>
            <button onClick={handleLogout} className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b py-2 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg"><Users size={14} /><div><div className="text-sm font-bold">{stats.total}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Total</div></div></div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg"><Globe size={14} className="text-blue-600" /><div><div className="text-sm font-bold text-blue-700">{stats.withUrl}</div><div className="text-[8px] font-bold text-blue-600 uppercase">With URL</div></div></div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg"><FileWarning size={14} className="text-red-600" /><div><div className="text-sm font-bold text-red-700">{stats.withoutUrl}</div><div className="text-[8px] font-bold text-red-600 uppercase">No URL</div></div></div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg"><Shield size={14} className="text-emerald-600" /><div><div className="text-sm font-bold text-emerald-700">{stats.active}</div><div className="text-[8px] font-bold text-emerald-600 uppercase">Active</div></div></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-[#00234E] text-white shadow' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#C5A059]" size={28} /></div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl p-4 shadow-sm border"><Database size={18} className="text-slate-700 mb-2" /><div className="text-2xl font-bold">{stats.total}</div><div className="text-[9px] font-bold text-slate-400 uppercase">Total Providers</div></div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border"><Globe size={18} className="text-blue-600 mb-2" /><div className="text-2xl font-bold text-blue-600">{stats.withUrl}</div><div className="text-[9px] font-bold text-slate-400 uppercase">Ready to Scan</div></div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border"><FileWarning size={18} className="text-red-600 mb-2" /><div className="text-2xl font-bold text-red-600">{stats.withoutUrl}</div><div className="text-[9px] font-bold text-slate-400 uppercase">Need URLs</div></div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border"><Shield size={18} className="text-emerald-600 mb-2" /><div className="text-2xl font-bold text-emerald-600">{stats.active}</div><div className="text-[9px] font-bold text-slate-400 uppercase">Compliant</div></div>
                </div>
                
                {stats.withoutUrl > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-600" size={20} />
                        <div>
                          <h4 className="font-bold text-red-800">{stats.withoutUrl} providers need URLs before scanning</h4>
                          <p className="text-xs text-red-600">Export → Add URLs → Re-import → Run Global Scan</p>
                        </div>
                      </div>
                      <button onClick={handleExportMissingUrls} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-red-700">
                        <Download size={12} /> Export List
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-[#00234E] rounded-xl p-4">
                  <h3 className="text-[10px] font-bold text-[#C5A059] uppercase mb-3">Scan & Import Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button onClick={handleGlobalScan} disabled={stats.withUrl === 0} className={`${stats.withUrl === 0 ? 'opacity-50 cursor-not-allowed' : ''} bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg text-center`}>
                      <Play size={18} className="mx-auto mb-1" /><div className="text-[8px] font-bold uppercase">Global Scan</div>
                      <div className="text-[7px] text-slate-400">Scan {stats.withUrl} providers</div>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg text-center">
                      <Upload size={18} className="mx-auto mb-1" /><div className="text-[8px] font-bold uppercase">Import CSV</div>
                      <div className="text-[7px] text-slate-400">Bulk add providers</div>
                    </button>
                    <button onClick={handleExport} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg text-center">
                      <Download size={18} className="mx-auto mb-1" /><div className="text-[8px] font-bold uppercase">Export All</div>
                      <div className="text-[7px] text-slate-400">Download registry</div>
                    </button>
                    <button onClick={handleExportMissingUrls} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg text-center">
                      <FileWarning size={18} className="mx-auto mb-1" /><div className="text-[8px] font-bold uppercase">Missing URLs</div>
                      <div className="text-[7px] text-slate-400">Export to fix</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'registry' && (
              <div className="space-y-3">
                {/* Info about what's displayed */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Showing <strong>{filteredProviders.length}</strong> of {providers.length} loaded providers ({stats.withUrl.toLocaleString()} scannable). 
                      <span className="text-blue-600 ml-1">{stats.withoutUrl.toLocaleString()} need URLs.</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name, NPI, city, zip..." className="pl-9 pr-3 py-1.5 text-sm bg-white border rounded-lg w-72" /></div>
                    {searchTerm && <button onClick={() => setSearchTerm('')} className="text-[10px] text-slate-400 hover:text-red-500"><X size={14} /></button>}
                    {selectedProviders.length > 0 && <button onClick={() => handleScan(selectedProviders)} disabled={scanning} className="bg-[#C5A059] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"><Play size={12} /> Scan ({selectedProviders.length})</button>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddProvider(true)} className="bg-[#00234E] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Add</button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white border px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Upload size={12} /> Import</button>
                    <button onClick={handleExport} className="bg-white border px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Download size={12} /> Export</button>
                  </div>
                </div>
                {/* Scanning progress bar */}
                {scanning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> {scanStatus}</span>
                      <span className="text-xs font-bold text-amber-600">{scanProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden"><div className="h-full bg-[#C5A059] rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} /></div>
                  </div>
                )}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-[#00234E] text-white text-[9px] font-bold uppercase">
                      <th className="px-3 py-2 w-8"><input type="checkbox" onChange={e => setSelectedProviders(e.target.checked ? filteredProviders.map(p => p.id) : [])} checked={selectedProviders.length === filteredProviders.length && filteredProviders.length > 0} /></th>
                      <th className="px-3 py-2 cursor-pointer hover:text-[#C5A059] select-none" onClick={() => toggleSort('name')}>Name / City <SortIcon field="name" /></th>
                      <th className="px-3 py-2 cursor-pointer hover:text-[#C5A059] select-none" onClick={() => toggleSort('npi')}>NPI <SortIcon field="npi" /></th>
                      <th className="px-3 py-2 cursor-pointer hover:text-[#C5A059] select-none" onClick={() => toggleSort('zip')}>Zip <SortIcon field="zip" /></th>
                      <th className="px-3 py-2">URL</th>
                      <th className="px-3 py-2 cursor-pointer hover:text-[#C5A059] select-none" onClick={() => toggleSort('risk_score')}>Score <SortIcon field="risk_score" /></th>
                      <th className="px-3 py-2 cursor-pointer hover:text-[#C5A059] select-none" onClick={() => toggleSort('last_scan_timestamp')}>Last Scan <SortIcon field="last_scan_timestamp" /></th>
                      <th className="px-3 py-2 cursor-pointer hover:text-[#C5A059] select-none" onClick={() => toggleSort('report_status')}>Report <SortIcon field="report_status" /></th>
                      <th className="px-3 py-2 cursor-pointer hover:text-[#C5A059] select-none" onClick={() => toggleSort('widget_status')}>Status <SortIcon field="widget_status" /></th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {filteredProviders.map(r => {
                        const hasReport = r.report_status && r.report_status !== 'none';
                        const scanDate = r.last_scan_timestamp ? new Date(r.last_scan_timestamp) : null;
                        return (
                        <tr key={r.id} className={`hover:bg-slate-50 group ${!r.url ? 'bg-red-50/50' : ''}`}>
                          <td className="px-3 py-2"><input type="checkbox" checked={selectedProviders.includes(r.id)} onChange={() => setSelectedProviders(p => p.includes(r.id) ? p.filter(i => i !== r.id) : [...p, r.id])} /></td>
                          <td className="px-3 py-2"><div className="font-medium text-xs">{r.name}</div><div className="text-[10px] text-slate-400">{r.city || ''}{r.city && r.zip ? ', ' : ''}{r.zip || ''}</div></td>
                          <td className="px-3 py-2"><code className="text-xs font-mono bg-slate-50 px-1 rounded">{r.npi}</code></td>
                          <td className="px-3 py-2"><span className="text-xs text-slate-500">{r.zip || '-'}</span></td>
                          <td className="px-3 py-2">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"><Globe size={9} />{r.url.replace(/^https?:\/\//, '').substring(0,22)}{r.url.replace(/^https?:\/\//, '').length > 22 ? '...' : ''}</a> : <span className="text-[10px] text-red-500 font-bold">MISSING</span>}</td>
                          <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${(r.risk_score||0) >= 67 ? 'bg-emerald-500' : (r.risk_score||0) >= 34 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.risk_score||0}%` }} /></div><span className="text-xs font-bold">{r.risk_score||0}</span></div></td>
                          <td className="px-3 py-2">{scanDate ? <div className="text-[10px] text-slate-500">{scanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div> : <span className="text-[10px] text-slate-300">Never</span>}</td>
                          <td className="px-3 py-2">{hasReport ? (
                            <button onClick={() => handleDownloadReport(r)} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-[9px] font-bold hover:bg-emerald-100 transition-colors"><Download size={10} /> Report</button>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}</td>
                          <td className="px-3 py-2"><StatusBadge status={r.widget_status || 'hidden'} size="sm" /></td>
                          <td className="px-3 py-2"><div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewingProvider(r)} title="View Details" className="p-1 hover:bg-slate-100 rounded"><Eye size={13} className="text-slate-400" /></button>
                            <button onClick={async () => { const nv = !r.is_featured; const sb = getSupabase(); await sb.from('registry').update({ is_featured: nv }).eq('id', r.id); setProviders(p => p.map(x => x.id === r.id ? { ...x, is_featured: nv } : x)); notify(nv ? 'Promoted to public registry' : 'Removed from public registry'); }} title={r.is_featured ? 'Remove from public' : 'Promote to public'} className="p-1 hover:bg-amber-50 rounded"><Star size={13} className={r.is_featured ? 'text-[#C5A059] fill-[#C5A059]' : 'text-slate-300'} /></button>
                            <button onClick={() => setEditingProvider(r)} title="Edit" className="p-1 hover:bg-slate-100 rounded"><Edit size={13} className="text-slate-400" /></button>
                            <button onClick={() => r.url ? handleScan([r.id]) : notify('Add URL first', 'error')} title="Scan" disabled={scanning} className={`p-1 hover:bg-amber-100 rounded ${!r.url ? 'opacity-30' : ''}`}><Play size={13} className="text-[#C5A059]" /></button>
                            <button onClick={() => handleDeleteProvider(r.id)} title="Delete" className="p-1 hover:bg-red-50 rounded"><Trash2 size={13} className="text-red-400" /></button>
                          </div></td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  {filteredProviders.length === 0 && <div className="p-8 text-center"><Database size={32} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400">{searchTerm ? 'No providers match your search' : 'No providers found'}</p></div>}
                </div>
              </div>
            )}

            {activeTab === 'widgets' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center"><div className="text-xl font-bold text-emerald-700">{stats.active}</div><div className="text-[8px] font-bold text-emerald-600 uppercase">Active</div></div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center"><div className="text-xl font-bold text-amber-700">{stats.warning}</div><div className="text-[8px] font-bold text-amber-600 uppercase">Warning</div></div>
                  <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center"><div className="text-xl font-bold text-slate-500">{stats.hidden}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Hidden</div></div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-[#00234E] text-white text-[9px] font-bold uppercase"><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Widget ID</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
                    <tbody className="divide-y">
                      {providers.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2"><div className="font-medium">{r.name}</div><div className="text-[9px] text-slate-400 font-mono">{r.npi}</div></td>
                          <td className="px-3 py-2"><code className="text-xs font-mono bg-slate-50 px-1 rounded">{r.widget_id || `WGT-${r.npi}`}</code></td>
                          <td className="px-3 py-2"><StatusBadge status={r.widget_status || 'hidden'} size="sm" /></td>
                          <td className="px-3 py-2"><div className="flex items-center gap-1.5">
                            <select value={r.widget_status || 'hidden'} onChange={e => handleWidgetStatusChange(r, e.target.value)} className="px-2 py-1 text-xs bg-slate-50 border rounded">
                              <option value="active">Active</option><option value="warning">Warning</option><option value="hidden">Hidden</option></select>
                            <button onClick={() => setWidgetModal(r)} className="p-1 hover:bg-amber-100 rounded"><FileCode size={13} className="text-[#C5A059]" /></button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <EmailTemplatesTab showNotification={notify} />
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold">Appointment Calendar</h3>
                <div className="bg-white rounded-lg p-2.5 shadow-sm border">
                  <div className="flex gap-1.5 overflow-x-auto">
                    {calendarDates.map(d => {
                      const dt = new Date(d);
                      return (
                        <button key={d} onClick={() => setSelectedDate(d)} className={`flex-shrink-0 w-14 py-2 rounded-lg border ${selectedDate === d ? 'bg-[#00234E] text-white' : 'bg-slate-50 hover:border-[#C5A059]'}`}>
                          <div className="text-[8px] font-bold uppercase opacity-60">{dt.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-lg font-bold">{dt.getDate()}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedDate && (
                  <div className="bg-white rounded-lg p-3 shadow-sm border">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                      {dateSlots.map(s => (
                        <div key={s.id} className={`p-1.5 rounded-lg border text-center text-[10px] ${s.is_booked ? 'bg-slate-100' : 'bg-emerald-50 border-emerald-200'}`}>
                          <div className={`font-bold ${s.is_booked ? 'text-slate-700' : 'text-emerald-700'}`}>{s.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'content' && <PageContentTab showNotification={notify} />}
            {activeTab === 'assets' && <AssetsTab showNotification={notify} />}
            {activeTab === 'prospects' && <ProspectsTab showNotification={notify} />}
          </>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={showAddProvider} onClose={() => setShowAddProvider(false)} title="Add Provider" size="lg">
        <ProviderForm onSave={handleSaveProvider} onCancel={() => setShowAddProvider(false)} />
      </Modal>

      <Modal isOpen={!!editingProvider} onClose={() => setEditingProvider(null)} title="Edit Provider" size="lg">
        {editingProvider && <ProviderForm entry={editingProvider} onSave={handleSaveProvider} onCancel={() => setEditingProvider(null)} />}
      </Modal>

      {viewingProvider && <ProviderDetailModal entry={viewingProvider} onClose={() => setViewingProvider(null)} onUpdate={(updated) => { setProviders(prev => prev.map(p => p.npi === updated.npi ? { ...p, ...updated } : p)); setViewingProvider(null); }} />}

      <Modal isOpen={!!editingTemplate} onClose={() => setEditingTemplate(null)} title={editingTemplate?.name ? 'Edit Template' : 'New Template'}>
        {editingTemplate && (
          <form onSubmit={e => { e.preventDefault(); setTemplates(p => { const ex = p.find(x => x.id === editingTemplate.id); return ex ? p.map(x => x.id === editingTemplate.id ? editingTemplate : x) : [...p, editingTemplate]; }); setEditingTemplate(null); notify('Saved'); }} className="space-y-3">
            <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Name</label><input type="text" value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} required className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg" /></div>
            <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Subject</label><input type="text" value={editingTemplate.subject} onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} required className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg" /></div>
            <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Body</label><textarea value={editingTemplate.body} onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })} rows={4} className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border rounded-lg" /></div>
            <div className="flex justify-end gap-2 pt-3 border-t"><button type="button" onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-[#00234E] text-white text-sm font-bold rounded-lg hover:bg-[#C5A059]">Save</button></div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!widgetModal} onClose={() => setWidgetModal(null)} title="Widget Embed Code">
        {widgetModal && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Embed Code</span>
                <button onClick={() => { navigator.clipboard.writeText(`<script src="https://widget.kairologic.com/sentry.js" data-npi="${widgetModal.npi}"></script>`); notify('Copied!'); }} className="text-[9px] font-bold text-[#C5A059] flex items-center gap-0.5"><Copy size={10} /> Copy</button>
              </div>
              <pre className="text-[10px] font-mono text-slate-600 bg-white p-2 rounded border overflow-x-auto">{`<script src="https://widget.kairologic.com/sentry.js" data-npi="${widgetModal.npi}"></script>`}</pre>
            </div>
          </div>
        )}
      </Modal>

      {/* Scan Report Modal */}
      <Modal isOpen={showScanReport && !!scanResult} onClose={() => setShowScanReport(false)} title="Global Scan Report - Type 2 Providers" size="xl">
        {scanResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-slate-700">{scanResult.total.toLocaleString()}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Total Type 2</div></div>
              <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-700">{scanResult.scanned.toLocaleString()}</div><div className="text-[8px] font-bold text-blue-600 uppercase">Scanned</div></div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-emerald-700">{scanResult.withUrl.toLocaleString()}</div><div className="text-[8px] font-bold text-emerald-600 uppercase">With URLs</div></div>
              <div className="bg-red-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-red-700">{scanResult.withoutUrlCount.toLocaleString()}</div><div className="text-[8px] font-bold text-red-600 uppercase">Need URLs</div></div>
            </div>
            
            {scanResult.scanResults.length > 0 && (
              <div className="bg-white border rounded-lg p-3">
                <h4 className="text-sm font-bold mb-2">Scan Results Summary ({scanResult.scanned} providers scanned)</h4>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-slate-500 border-b"><th className="py-1">Provider</th><th className="py-1">Score</th><th className="py-1">SB1188</th><th className="py-1">HB149</th><th className="py-1">Status</th></tr></thead>
                    <tbody>
                      {scanResult.scanResults.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-1">{r.provider}</td>
                          <td className="py-1 font-bold">{r.risk_score}%</td>
                          <td className="py-1"><span className="text-emerald-600">{r.sb1188_pass_count}✓</span> <span className="text-red-600">{r.sb1188_fail_count}✗</span></td>
                          <td className="py-1"><span className="text-emerald-600">{r.hb149_pass_count}✓</span> <span className="text-red-600">{r.hb149_fail_count}✗</span></td>
                          <td className="py-1"><span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${r.risk_level === 'low' ? 'bg-emerald-100 text-emerald-700' : r.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.risk_level}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {scanResult.withoutUrlCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-red-800">{scanResult.withoutUrlCount.toLocaleString()} Type 2 Providers Need URLs</h4>
                    <p className="text-xs text-red-600 mt-1">Export the list, add website URLs, then re-import to enable scanning</p>
                  </div>
                  <button onClick={handleExportMissingUrls} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-700">
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportData([]); }} title="Import Providers" size="lg">
        <div className="space-y-4">
          {importData.length > 0 ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <h4 className="text-sm font-bold text-emerald-800">Ready to import {importData.length} providers</h4>
                <p className="text-[10px] text-emerald-600 mt-0.5">{importData.filter((r: any) => r.url).length} have URLs (scannable), {importData.filter((r: any) => !r.url).length} without URLs</p>
              </div>
              <div className="max-h-64 overflow-y-auto bg-slate-50 rounded-lg p-2">
                <table className="w-full text-xs">
                  <thead><tr className="text-left font-bold text-slate-600"><th className="py-1 px-2">NPI</th><th className="py-1 px-2">Name</th><th className="py-1 px-2">City</th><th className="py-1 px-2">Zip</th><th className="py-1 px-2">URL</th></tr></thead>
                  <tbody>
                    {importData.slice(0, 20).map((r: any, i: number) => (
                      <tr key={i} className="border-t border-slate-200">
                        <td className="py-1 px-2 font-mono">{r.npi}</td>
                        <td className="py-1 px-2">{r.name}</td>
                        <td className="py-1 px-2">{r.city || '-'}</td>
                        <td className="py-1 px-2">{r.zip || '-'}</td>
                        <td className="py-1 px-2">{r.url ? <span className="text-emerald-600"><CheckCircle size={10} /></span> : <span className="text-red-500">-</span>}</td>
                      </tr>
                    ))}
                    {importData.length > 20 && <tr><td colSpan={5} className="py-1 px-2 text-center text-slate-400">...and {importData.length - 20} more</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
                <button onClick={executeImport} disabled={scanning} className="px-5 py-2 bg-[#00234E] text-white text-sm font-bold rounded-lg hover:bg-[#C5A059] flex items-center gap-1.5 disabled:opacity-50">
                  <Upload size={14} /> Import {importData.length} Providers
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Upload size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Select a CSV file to import</p>
              <p className="text-[10px] text-slate-400 mt-1">CSV columns: NPI, Name, URL, City, Zip, Email, Phone</p>
              <button onClick={() => fileInputRef.current?.click()} className="mt-3 px-4 py-2 bg-[#00234E] text-white text-sm font-bold rounded-lg">Choose File</button>
            </div>
          )}
        </div>
      </Modal>

      {/* Post-Import Scan Prompt */}
      <Modal isOpen={showImportScanPrompt} onClose={() => { setShowImportScanPrompt(false); setImportedIds([]); }} title="Scan Imported Providers?" size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <Zap size={24} className="mx-auto text-[#C5A059] mb-2" />
            <h4 className="text-sm font-bold text-slate-800">{importedIds.length} imported provider(s) have URLs</h4>
            <p className="text-xs text-slate-500 mt-1">Run compliance scans now to generate reports?</p>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={() => { setShowImportScanPrompt(false); setImportedIds([]); }} className="px-4 py-2 text-sm text-slate-500 border rounded-lg">Skip</button>
            <button onClick={() => { setShowImportScanPrompt(false); handleScan(importedIds); setImportedIds([]); }} className="px-5 py-2 bg-[#C5A059] text-white text-sm font-bold rounded-lg hover:brightness-110 flex items-center gap-1.5">
              <Play size={14} /> Scan Now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
