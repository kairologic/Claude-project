'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase, Registry } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Shield, Users, Database, Calendar, Mail, 
  Search, Plus, Trash2, Edit, Eye, EyeOff, Download, Upload, Play, 
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

// Simulated scan function (mimics RiskScanWidget logic)
const runComplianceScan = async (url: string): Promise<any> => {
  // Simulate scan checks for SB1188 and HB149
  const sb1188Findings = [
    { id: 'DR-01', name: 'Primary EHR Domain IP Geo-Location', status: Math.random() > 0.3 ? 'pass' : 'fail', clause: 'Sec. 183.002(a)' },
    { id: 'DR-02', name: 'CDN & Edge Cache Analysis', status: Math.random() > 0.4 ? 'pass' : 'fail', clause: 'Sec. 183.002(a)' },
    { id: 'DR-03', name: 'MX Record Analysis', status: Math.random() > 0.5 ? 'pass' : 'fail', clause: 'Sec. 183.002(b)' },
    { id: 'DR-04', name: 'Third-Party Resource Audit', status: Math.random() > 0.4 ? 'pass' : 'fail', clause: 'Sec. 183.002(c)' },
  ];
  
  const hb149Findings = [
    { id: 'AI-01', name: 'AI Disclosure Presence', status: Math.random() > 0.5 ? 'pass' : 'fail', clause: 'Sec. 101.001(a)' },
    { id: 'AI-02', name: 'AI Disclosure Visibility', status: Math.random() > 0.6 ? 'pass' : 'fail', clause: 'Sec. 101.001(b)' },
    { id: 'AI-03', name: 'AI Diagnostic Tool Disclaimer', status: Math.random() > 0.5 ? 'pass' : 'fail', clause: 'Sec. 101.002' },
  ];

  const sb1188Pass = sb1188Findings.filter(f => f.status === 'pass').length;
  const sb1188Fail = sb1188Findings.filter(f => f.status === 'fail').length;
  const hb149Pass = hb149Findings.filter(f => f.status === 'pass').length;
  const hb149Fail = hb149Findings.filter(f => f.status === 'fail').length;
  
  const totalPass = sb1188Pass + hb149Pass;
  const totalChecks = sb1188Findings.length + hb149Findings.length;
  const riskScore = Math.round((totalPass / totalChecks) * 100);
  
  let riskLevel = 'low';
  if (riskScore < 50) riskLevel = 'critical';
  else if (riskScore < 70) riskLevel = 'high';
  else if (riskScore < 85) riskLevel = 'medium';

  return {
    url,
    risk_score: riskScore,
    risk_level: riskLevel,
    sb1188_findings: sb1188Findings,
    sb1188_pass_count: sb1188Pass,
    sb1188_fail_count: sb1188Fail,
    hb149_findings: hb149Findings,
    hb149_pass_count: hb149Pass,
    hb149_fail_count: hb149Fail,
    technical_fixes: [...sb1188Findings, ...hb149Findings].filter(f => f.status === 'fail').map(f => ({
      ...f,
      ...TECHNICAL_FIXES[f.id]
    }))
  };
};

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
      // Use .gt('url', '') to find non-empty URLs (works better than .neq)
      const [totalResult, withUrlResult, activeResult] = await Promise.all([
        supabase.from('registry').select('id', { count: 'exact', head: true }),
        supabase.from('registry').select('id', { count: 'exact', head: true }).not('url', 'is', null).gt('url', ''),
        supabase.from('registry').select('id', { count: 'exact', head: true }).eq('widget_status', 'active')
      ]);
      
      const totalCount = totalResult.count || 0;
      const withUrlCount = withUrlResult.count || 0;
      const activeCount = activeResult.count || 0;
      setTotalCounts({
        total: totalCount,
        withUrl: withUrlCount,
        withoutUrl: totalCount - withUrlCount,
        active: activeCount
      });
      
      // Only load providers WITH URLs (scannable) - limit to 500 for performance in table view
      const { data } = await supabase
        .from('registry')
        .select('*')
        .not('url', 'is', null)
        .gt('url', '')
        .order('updated_at', { ascending: false })
        .limit(500);
      setProviders(data || []);
      console.log(`Loaded ${data?.length || 0} providers with URLs (${withUrlCount} total scannable, ${totalCount} total in registry, ${activeCount} active)`);
      
      
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
    if (!searchTerm.trim()) return providers;
    const t = searchTerm.toLowerCase();
    return providers.filter(r => r.name.toLowerCase().includes(t) || r.npi.includes(t) || r.city?.toLowerCase().includes(t));
  }, [providers, searchTerm]);

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
        .not('url', 'is', null)
        .gt('url', '')
        .limit(1000); // Limit to 1000 for reasonable scan time
      
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
        
        try {
          // Run compliance scan
          const scanData = await runComplianceScan(p.url!);
          
          // Store scan result in database
          const scanRecord = {
            registry_id: p.id,
            npi: p.npi,
            url: p.url,
            scan_type: 'global',
            risk_score: scanData.risk_score,
            risk_level: scanData.risk_level,
            sb1188_findings: scanData.sb1188_findings,
            sb1188_pass_count: scanData.sb1188_pass_count,
            sb1188_fail_count: scanData.sb1188_fail_count,
            hb149_findings: scanData.hb149_findings,
            hb149_pass_count: scanData.hb149_pass_count,
            hb149_fail_count: scanData.hb149_fail_count,
            technical_fixes: scanData.technical_fixes,
            raw_scan_data: scanData
          };
          
          await supabase.from('scan_results').insert(scanRecord);
          
          // Update provider record
          await supabase.from('registry').update({
            risk_score: scanData.risk_score,
            risk_level: scanData.risk_level,
            scan_count: (p.scan_count || 0) + 1,
            widget_status: scanData.risk_score >= 70 ? 'active' : scanData.risk_score >= 50 ? 'warning' : 'hidden',
            last_scan_result: scanData,
            updated_at: new Date().toISOString()
          }).eq('id', p.id);
          
          result.scanResults.push({ provider: p.name, ...scanData });
          result.scanned++;
          
        } catch (scanErr: any) {
          result.errors.push(`${p.name}: ${scanErr.message}`);
        }
        
        // Small delay between scans
        await new Promise(r => setTimeout(r, 500));
      }
      
      setScanStatus('Scan complete!');
      setScanResult(result);
      setShowScanReport(true);
      await loadData();
      notify(`Scan complete! ${result.scanned} scanned, ${result.withoutUrlCount.toLocaleString()} need URLs.`);
      
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
    const toScan = providers.filter(p => ids.includes(p.id));
    const withUrl = toScan.filter(p => p.url && p.url.trim());
    const withoutUrl = toScan.filter(p => !p.url || !p.url.trim());
    
    if (withoutUrl.length > 0) {
      notify(`${withoutUrl.length} provider(s) have no URL and cannot be scanned`, 'error');
    }
    
    if (withUrl.length === 0) return;
    
    setScanning(true); setScanProgress(0);
    setScanStatus(`Scanning ${withUrl.length} provider(s)...`);
    
    try {
      const supabase = getSupabase();
      for (let i = 0; i < withUrl.length; i++) {
        const p = withUrl[i];
        setScanProgress(Math.round(((i + 1) / withUrl.length) * 100));
        setScanStatus(`Scanning ${p.name}...`);
        
        const scanData = await runComplianceScan(p.url!);
        
        await supabase.from('scan_results').insert({
          registry_id: p.id, npi: p.npi, url: p.url, scan_type: 'manual',
          risk_score: scanData.risk_score, risk_level: scanData.risk_level,
          sb1188_findings: scanData.sb1188_findings, hb149_findings: scanData.hb149_findings,
          technical_fixes: scanData.technical_fixes
        });
        
        await supabase.from('registry').update({ 
          risk_score: scanData.risk_score, scan_count: (p.scan_count || 0) + 1,
          widget_status: scanData.risk_score >= 70 ? 'active' : scanData.risk_score >= 50 ? 'warning' : 'hidden',
          updated_at: new Date().toISOString() 
        }).eq('id', p.id);
        
        await new Promise(r => setTimeout(r, 300));
      }
      await loadData(); notify('Scan complete!');
    } catch (e: any) { notify(e.message || 'Scan failed', 'error'); }
    finally { setScanning(false); setScanProgress(0); setScanStatus(''); }
  };

  // CSV EXPORT - All providers
  const handleExport = () => {
    const csv = [
      'NPI,Name,Provider Type,City,Email,Phone,URL,Risk Score,Widget Status,Subscription',
      ...providers.map(r => 
        `${r.npi},"${r.name}",${(r as any).provider_type || 2},${r.city||''},${r.email||''},${r.phone||''},${r.url||''},${r.risk_score||0},${r.widget_status||''},${r.subscription_status||''}`
      )
    ].join('\n');
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `registry-${new Date().toISOString().split('T')[0]}.csv`; 
    a.click(); 
    notify('Exported to CSV');
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
          else if (h.includes('url') || h.includes('website')) row.url = val;
          else if (h.includes('zip')) row.zip = val;
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
          await supabase.from('registry').update(updateData).eq('id', existing.id);
          updated++;
        } else {
          await supabase.from('registry').insert({
            id: `REG-${Date.now()}-${i}`, npi: row.npi, name: row.name,
            email: row.email || null, phone: row.phone || null, city: row.city || null,
            zip: row.zip || null, url: row.url || null, provider_type: row.provider_type || 2,
            widget_status: 'hidden', subscription_status: 'trial', is_visible: false, risk_score: 0, scan_count: 0
          });
          imported++;
        }
      }
      
      await loadData();
      setShowImportModal(false); setImportData([]);
      notify(`Import complete! ${imported} new, ${updated} updated.`);
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
                      Showing <strong>{providers.length}</strong> providers with URLs (of {stats.withUrl.toLocaleString()} total scannable). 
                      <span className="text-blue-600 ml-1">{stats.withoutUrl.toLocaleString()} providers need URLs.</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-9 pr-3 py-1.5 text-sm bg-white border rounded-lg w-48" /></div>
                    {selectedProviders.length > 0 && <button onClick={() => handleScan(selectedProviders)} className="bg-[#C5A059] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Play size={12} /> Scan ({selectedProviders.length})</button>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddProvider(true)} className="bg-[#00234E] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Plus size={12} /> Add</button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white border px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Upload size={12} /> Import</button>
                    <button onClick={handleExport} className="bg-white border px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Download size={12} /> Export</button>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-[#00234E] text-white text-[9px] font-bold uppercase">
                      <th className="px-3 py-2 w-8"><input type="checkbox" onChange={e => setSelectedProviders(e.target.checked ? filteredProviders.map(p => p.id) : [])} checked={selectedProviders.length === filteredProviders.length && filteredProviders.length > 0} /></th>
                      <th className="px-3 py-2">Name</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">NPI</th><th className="px-3 py-2">URL</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {filteredProviders.map(r => (
                        <tr key={r.id} className={`hover:bg-slate-50 group ${!r.url ? 'bg-red-50/50' : ''}`}>
                          <td className="px-3 py-2"><input type="checkbox" checked={selectedProviders.includes(r.id)} onChange={() => setSelectedProviders(p => p.includes(r.id) ? p.filter(i => i !== r.id) : [...p, r.id])} /></td>
                          <td className="px-3 py-2"><div className="font-medium">{r.name}</div><div className="text-[10px] text-slate-400">{r.city || ''}</div></td>
                          <td className="px-3 py-2"><span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Type {(r as any).provider_type || 2}</span></td>
                          <td className="px-3 py-2"><code className="text-xs font-mono bg-slate-50 px-1 rounded">{r.npi}</code></td>
                          <td className="px-3 py-2">{r.url ? <a href={r.url} target="_blank" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"><Globe size={9} />{r.url.replace(/^https?:\/\//, '').substring(0,25)}...</a> : <span className="text-[10px] text-red-500 font-bold">MISSING</span>}</td>
                          <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${(r.risk_score||0) > 70 ? 'bg-emerald-500' : (r.risk_score||0) > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.risk_score||0}%` }} /></div><span className="text-xs font-bold">{r.risk_score||0}</span></div></td>
                          <td className="px-3 py-2"><StatusBadge status={r.widget_status || 'hidden'} size="sm" /></td>
                          <td className="px-3 py-2"><div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100">
                            <button onClick={() => setViewingProvider(r)} className="p-1 hover:bg-slate-100 rounded"><Eye size={13} className="text-slate-400" /></button>
                            <button onClick={() => setEditingProvider(r)} className="p-1 hover:bg-slate-100 rounded"><Edit size={13} className="text-slate-400" /></button>
                            <button onClick={() => r.url ? handleScan([r.id]) : notify('Add URL first', 'error')} className={`p-1 hover:bg-amber-100 rounded ${!r.url ? 'opacity-30' : ''}`}><Play size={13} className="text-[#C5A059]" /></button>
                            <button onClick={() => handleDeleteProvider(r.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={13} className="text-red-400" /></button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredProviders.length === 0 && <div className="p-8 text-center"><Database size={32} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400">No providers found</p></div>}
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

      {viewingProvider && <ProviderDetailModal entry={viewingProvider} onClose={() => setViewingProvider(null)} />}

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
              </div>
              <div className="max-h-64 overflow-y-auto bg-slate-50 rounded-lg p-2">
                <table className="w-full text-xs">
                  <thead><tr className="text-left font-bold text-slate-600"><th className="py-1 px-2">NPI</th><th className="py-1 px-2">Name</th><th className="py-1 px-2">Type</th><th className="py-1 px-2">URL</th></tr></thead>
                  <tbody>
                    {importData.slice(0, 15).map((r, i) => (
                      <tr key={i} className="border-t border-slate-200">
                        <td className="py-1 px-2 font-mono">{r.npi}</td>
                        <td className="py-1 px-2">{r.name}</td>
                        <td className="py-1 px-2">{r.provider_type || 2}</td>
                        <td className="py-1 px-2">{r.url ? <span className="text-emerald-600">✓</span> : <span className="text-red-500">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
                <button onClick={executeImport} className="px-5 py-2 bg-[#00234E] text-white text-sm font-bold rounded-lg hover:bg-[#C5A059] flex items-center gap-1.5">
                  <Upload size={14} /> Import {importData.length} Providers
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Upload size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Select a CSV file to import</p>
              <button onClick={() => fileInputRef.current?.click()} className="mt-3 px-4 py-2 bg-[#00234E] text-white text-sm font-bold rounded-lg">Choose File</button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
