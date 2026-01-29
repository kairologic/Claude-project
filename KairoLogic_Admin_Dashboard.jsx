import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Users, Database, Calendar, Mail, Settings, Search, Plus, Trash2, Edit, Eye, EyeOff, Download, Upload, Play, Pause, CheckCircle, AlertTriangle, XCircle, Clock, Send, Copy, ExternalLink, Zap, Globe, FileCode, BarChart3, TrendingUp, AlertCircle, Loader2, X, Save, ArrowUpDown } from 'lucide-react';

// Mock Data
const mockRegistry = [
  { id: 'REG-001', npi: '1234567890', name: 'Austin Family Medical Center', contactFirstName: 'Dr. Sarah', contactLastName: 'Johnson', email: 'sjohnson@austinfmc.com', phone: '512-555-0123', city: 'Austin', zip: '78701', url: 'https://austinfamilymedical.com', widgetStatus: 'active', widgetId: 'WGT-AF001', subscriptionStatus: 'active', scanCount: 12, riskScore: 87, complianceStatus: 'Verified', lastScanDate: '2026-01-27', topIssues: [], isVisible: true },
  { id: 'REG-002', npi: '0987654321', name: 'Dallas Orthopedic Specialists', contactFirstName: 'Dr. Michael', contactLastName: 'Chen', email: 'mchen@dallasortho.com', phone: '214-555-0456', city: 'Dallas', zip: '75201', url: 'https://dallasorthopedic.com', widgetStatus: 'warning', widgetId: 'WGT-DO002', subscriptionStatus: 'active', scanCount: 8, riskScore: 45, complianceStatus: 'Warning', lastScanDate: '2026-01-26', topIssues: [{ title: 'PHI Residency Drift', description: 'CDN outside TX', remediationPriority: 'CRITICAL' }], isVisible: true },
  { id: 'REG-003', npi: '1122334455', name: 'Houston Pediatric Care', contactFirstName: 'Dr. Emily', contactLastName: 'Rodriguez', email: 'erodriguez@houstonpeds.com', phone: '713-555-0789', city: 'Houston', zip: '77001', url: '', widgetStatus: 'hidden', subscriptionStatus: 'inactive', scanCount: 3, riskScore: 28, complianceStatus: 'Revoked', lastScanDate: '2026-01-15', topIssues: [], isVisible: false },
  { id: 'REG-004', npi: '5566778899', name: 'San Antonio Heart Institute', contactFirstName: 'Dr. James', contactLastName: 'Williams', email: 'jwilliams@saheart.com', phone: '210-555-0321', city: 'San Antonio', zip: '78205', url: 'https://saheartinstitute.com', widgetStatus: 'active', widgetId: 'WGT-SA004', subscriptionStatus: 'active', scanCount: 15, riskScore: 92, complianceStatus: 'Verified', lastScanDate: '2026-01-28', topIssues: [], isVisible: true }
];

const mockTemplates = [
  { id: 'ET-001', name: 'Cure Notice Warning', category: 'marketing', subject: 'URGENT: TX SB 1188 Alert - {{practiceName}}', body: 'Dear {{contactName}},\n\nYour practice may be at risk. Risk Score: {{riskScore}}', eventTrigger: 'risk_scan_high', isActive: true },
  { id: 'ET-002', name: 'Verification Complete', category: 'transactional', subject: 'Sentry Verified - {{practiceName}}', body: 'Congratulations! Seal ID: {{sealId}}', eventTrigger: 'verification_complete', isActive: true },
  { id: 'ET-003', name: 'Weekly Report', category: 'report', subject: 'Weekly Summary - {{dateRange}}', body: 'Scans: {{totalScans}}, Issues: {{issuesFound}}', eventTrigger: 'weekly_report', isActive: true }
];

const generateSlots = () => {
  const slots = [];
  const today = new Date();
  for (let d = 0; d < 10; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].forEach(time => {
      const isBooked = Math.random() > 0.85;
      slots.push({ id: `${date.toISOString().split('T')[0]}-${time}`, date: date.toISOString().split('T')[0], time, isBooked, bookedBy: isBooked ? { name: 'Dr. Sample', practiceName: 'Sample Practice' } : null });
    });
  }
  return slots;
};

// Components
const StatusBadge = ({ status, size = 'md' }) => {
  const styles = {
    active: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    hidden: 'bg-slate-100 border-slate-200 text-slate-500',
    Verified: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    Warning: 'bg-amber-50 border-amber-200 text-amber-700',
    Revoked: 'bg-red-50 border-red-200 text-red-700',
    trial: 'bg-blue-50 border-blue-200 text-blue-700',
    inactive: 'bg-slate-100 border-slate-200 text-slate-500'
  };
  const icons = {
    active: <CheckCircle size={11} />, warning: <AlertTriangle size={11} />, hidden: <EyeOff size={11} />,
    Verified: <ShieldCheck size={11} />, Warning: <ShieldAlert size={11} />, Revoked: <XCircle size={11} />,
    trial: <Clock size={11} />, inactive: <Pause size={11} />
  };
  return <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[9px]'} rounded-full border font-bold uppercase tracking-wide ${styles[status] || styles.hidden}`}>{icons[status]} {status}</span>;
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`${w} w-full bg-white rounded-xl shadow-2xl max-h-[85vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg"><X size={16} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

const ProviderForm = ({ entry, onSave, onCancel }) => {
  const [form, setForm] = useState(entry || { id: `REG-${Date.now()}`, npi: '', name: '', contactFirstName: '', contactLastName: '', email: '', phone: '', city: '', zip: '', url: '', widgetStatus: 'hidden', subscriptionStatus: 'trial', scanCount: 0, riskScore: 0, complianceStatus: 'Warning', isVisible: false, topIssues: [] });
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Practice Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NPI *</label><input type="text" value={form.npi} onChange={e => setForm({ ...form, npi: e.target.value })} required maxLength={10} pattern="\d{10}" className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" placeholder="10 digits" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name</label><input type="text" value={form.contactFirstName} onChange={e => setForm({ ...form, contactFirstName: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label><input type="text" value={form.contactLastName} onChange={e => setForm({ ...form, contactLastName: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">City</label><input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ZIP</label><input type="text" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
        <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Website</label><input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Widget Status</label><select value={form.widgetStatus} onChange={e => setForm({ ...form, widgetStatus: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="active">Active</option><option value="warning">Warning</option><option value="hidden">Hidden</option></select></div>
        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subscription</label><select value={form.subscriptionStatus} onChange={e => setForm({ ...form, subscriptionStatus: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="trial">Trial</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        <div className="col-span-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} className="rounded border-slate-300 text-amber-500" /><span className="text-sm text-slate-700">Visible in Public Registry</span></label></div>
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100"><button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 font-medium">Cancel</button><button type="submit" className="px-5 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-amber-500 flex items-center gap-1.5"><Save size={14} /> Save</button></div>
    </form>
  );
};

// Main Dashboard
export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registry, setRegistry] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [slots, setSlots] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [editTemplate, setEditTemplate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [widgetModal, setWidgetModal] = useState(null);

  useEffect(() => { setTimeout(() => { setRegistry(mockRegistry); setTemplates(mockTemplates); setSlots(generateSlots()); setLoading(false); }, 500); }, []);

  const notify = useCallback((msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); }, []);

  const stats = useMemo(() => ({
    total: registry.length,
    active: registry.filter(r => r.widgetStatus === 'active').length,
    warning: registry.filter(r => r.widgetStatus === 'warning').length,
    paid: registry.filter(r => r.subscriptionStatus === 'active').length,
    today: slots.filter(s => s.date === new Date().toISOString().split('T')[0] && s.isBooked).length
  }), [registry, slots]);

  const filtered = useMemo(() => {
    if (!search.trim()) return registry;
    const t = search.toLowerCase();
    return registry.filter(r => r.name.toLowerCase().includes(t) || r.npi.includes(t) || r.city?.toLowerCase().includes(t) || r.email?.toLowerCase().includes(t));
  }, [registry, search]);

  const dates = useMemo(() => [...new Set(slots.map(s => s.date))].sort(), [slots]);
  const dateSlots = useMemo(() => selectedDate ? slots.filter(s => s.date === selectedDate) : [], [slots, selectedDate]);

  useEffect(() => { if (dates.length && !selectedDate) setSelectedDate(dates[0]); }, [dates, selectedDate]);

  const handleSave = entry => { setRegistry(p => { const e = p.find(x => x.id === entry.id); return e ? p.map(x => x.id === entry.id ? entry : x) : [...p, entry]; }); setShowAdd(false); setEditing(null); notify('Saved!'); };
  const handleDelete = id => { setRegistry(p => p.filter(r => r.id !== id)); notify('Deleted'); };
  const handleScan = ids => { notify(`Scanning ${ids.length}...`, 'info'); setTimeout(() => { setRegistry(p => p.map(r => ids.includes(r.id) ? { ...r, scanCount: r.scanCount + 1, lastScanDate: new Date().toISOString().split('T')[0] } : r)); notify('Scan complete'); }, 1500); };
  const handleExport = () => { const csv = ['NPI,Name,City,Status,Score', ...registry.map(r => `${r.npi},${r.name},${r.city},${r.complianceStatus},${r.riskScore}`)].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'registry.csv'; a.click(); notify('Exported'); };

  const tabs = [{ id: 'overview', icon: <BarChart3 size={15} />, label: 'Overview' }, { id: 'registry', icon: <Database size={15} />, label: 'Registry' }, { id: 'calendar', icon: <Calendar size={15} />, label: 'Calendar' }, { id: 'templates', icon: <Mail size={15} />, label: 'Templates' }, { id: 'widgets', icon: <Shield size={15} />, label: 'Widgets' }];

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-slate-800 text-white py-3 px-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-amber-400" />
            <div><h1 className="text-base font-bold">Sentry Control Center</h1><p className="text-[9px] text-slate-400 uppercase tracking-wide">Registry & Compliance</p></div>
            <div className="hidden sm:flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg ml-3"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /><span className="text-[9px] font-bold text-emerald-400 uppercase">ATX-01</span></div>
          </div>
          <div className="flex items-center gap-2"><span className="text-[9px] text-amber-400 font-bold hidden sm:block">Full Access</span><button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg"><Settings size={16} /></button></div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-100 py-2 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-4 overflow-x-auto text-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg"><Users size={14} className="text-slate-600" /><div><div className="text-sm font-bold">{stats.total}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Providers</div></div></div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg"><Shield size={14} className="text-emerald-600" /><div><div className="text-sm font-bold text-emerald-700">{stats.active}</div><div className="text-[8px] font-bold text-emerald-600 uppercase">Active</div></div></div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg"><AlertTriangle size={14} className="text-amber-600" /><div><div className="text-sm font-bold text-amber-700">{stats.warning}</div><div className="text-[8px] font-bold text-amber-600 uppercase">Warning</div></div></div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-lg"><Calendar size={14} className="text-purple-600" /><div><div className="text-sm font-bold text-purple-700">{stats.today}</div><div className="text-[8px] font-bold text-purple-600 uppercase">Today</div></div></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${tab === t.id ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}>{t.icon} {t.label}</button>)}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-amber-500" size={28} /><span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">Loading...</span></div>
        ) : (
          <>
            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><div className="flex items-center justify-between mb-2"><Database size={18} className="text-slate-700" /><span className="text-[8px] font-bold text-emerald-500">+12%</span></div><div className="text-2xl font-bold">{stats.total}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Providers</div></div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><div className="flex items-center justify-between mb-2"><Shield size={18} className="text-emerald-600" /></div><div className="text-2xl font-bold text-emerald-600">{stats.active}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Active Widgets</div></div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><div className="flex items-center justify-between mb-2"><AlertTriangle size={18} className="text-amber-600" /></div><div className="text-2xl font-bold text-amber-600">{stats.warning}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Warnings</div></div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"><div className="flex items-center justify-between mb-2"><TrendingUp size={18} className="text-blue-600" /></div><div className="text-2xl font-bold text-blue-600">{stats.paid}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Paid</div></div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-3">Compliance Breakdown</h3>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex mb-2">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(registry.filter(r => r.complianceStatus === 'Verified').length / registry.length) * 100}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${(registry.filter(r => r.complianceStatus === 'Warning').length / registry.length) * 100}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${(registry.filter(r => r.complianceStatus === 'Revoked').length / registry.length) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs"><span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> {registry.filter(r => r.complianceStatus === 'Verified').length} Verified</span><span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> {registry.filter(r => r.complianceStatus === 'Warning').length} Warning</span><span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" /> {registry.filter(r => r.complianceStatus === 'Revoked').length} Revoked</span></div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 shadow-sm">
                  <h3 className="text-[10px] font-bold text-amber-400 uppercase mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg text-center"><Play size={18} className="mx-auto mb-1" /><div className="text-[8px] font-bold uppercase">Global Scan</div></button>
                    <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg text-center"><Mail size={18} className="mx-auto mb-1" /><div className="text-[8px] font-bold uppercase">Bulk Email</div></button>
                    <button onClick={handleExport} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg text-center"><Download size={18} className="mx-auto mb-1" /><div className="text-[8px] font-bold uppercase">Export</div></button>
                    <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg text-center"><Upload size={18} className="mx-auto mb-1" /><div className="text-[8px] font-bold uppercase">Import</div></button>
                  </div>
                </div>
              </div>
            )}

            {/* Registry Tab */}
            {tab === 'registry' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    <button onClick={() => setShowAdd(true)} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-orange-600 flex items-center gap-1"><Plus size={12} /> Add</button>
                    <button onClick={handleExport} className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-slate-200 hover:bg-slate-50 flex items-center gap-1"><Download size={12} /> Export</button>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Total: {registry.length} | Showing: {filtered.length}</div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                  <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, NPI, city, email..." className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
                  {selected.length > 0 && <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100"><span className="text-[9px] font-bold text-slate-600">{selected.length} selected</span><button onClick={() => { handleScan(selected); setSelected([]); }} className="bg-slate-800 text-white px-2 py-1 rounded text-[9px] font-bold hover:bg-amber-500 flex items-center gap-1"><Play size={10} /> Scan</button><button onClick={() => { if (window.confirm(`Delete ${selected.length}?`)) { selected.forEach(handleDelete); setSelected([]); } }} className="bg-red-50 text-red-600 px-2 py-1 rounded text-[9px] font-bold hover:bg-red-100 flex items-center gap-1"><Trash2 size={10} /> Delete</button></div>}
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="bg-slate-800 text-white text-[9px] font-bold uppercase tracking-wide">
                        <th className="px-3 py-2"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map(r => r.id))} className="rounded" /></th>
                        <th className="px-3 py-2">Name</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">NPI</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Widget</th><th className="px-3 py-2">Scans</th><th className="px-3 py-2 text-right">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {filtered.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/50 group">
                            <td className="px-3 py-2"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected(p => p.includes(r.id) ? p.filter(i => i !== r.id) : [...p, r.id])} className="rounded" /></td>
                            <td className="px-3 py-2"><div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${r.isVisible ? 'bg-emerald-500' : 'bg-slate-300'}`} /><div><div className="font-medium">{r.name}</div>{r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 hover:text-amber-500 flex items-center gap-0.5"><Globe size={9} /> {new URL(r.url).hostname}</a>}</div></div></td>
                            <td className="px-3 py-2"><div>{r.city || '-'}</div><div className="text-[10px] text-slate-400">{r.zip || '-'}</div></td>
                            <td className="px-3 py-2"><code className="text-xs font-mono bg-slate-50 px-1 py-0.5 rounded">{r.npi}</code></td>
                            <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.riskScore > 66 ? 'bg-emerald-500' : r.riskScore > 33 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.riskScore}%` }} /></div><span className="text-xs font-bold">{r.riskScore}</span></div><StatusBadge status={r.complianceStatus} size="sm" /></td>
                            <td className="px-3 py-2"><StatusBadge status={r.widgetStatus} size="sm" /></td>
                            <td className="px-3 py-2"><div className="text-xs font-medium">{r.scanCount}</div><div className="text-[9px] text-slate-400">{r.lastScanDate || 'Never'}</div></td>
                            <td className="px-3 py-2"><div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setViewing(r)} className="p-1 hover:bg-slate-100 rounded" title="View"><Eye size={13} className="text-slate-400" /></button>
                              <button onClick={() => setEditing(r)} className="p-1 hover:bg-slate-100 rounded" title="Edit"><Edit size={13} className="text-slate-400" /></button>
                              <button onClick={() => handleScan([r.id])} className="p-1 hover:bg-amber-100 rounded" title="Scan"><Play size={13} className="text-amber-500" /></button>
                              <button onClick={() => setRegistry(p => p.map(x => x.id === r.id ? { ...x, isVisible: !x.isVisible } : x))} className="p-1 hover:bg-slate-100 rounded" title={r.isVisible ? 'Hide' : 'Show'}>{r.isVisible ? <Eye size={13} className="text-emerald-500" /> : <EyeOff size={13} className="text-slate-400" />}</button>
                              <button onClick={() => { if (window.confirm('Delete?')) handleDelete(r.id); }} className="p-1 hover:bg-red-50 rounded" title="Delete"><Trash2 size={13} className="text-red-400" /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filtered.length === 0 && <div className="p-8 text-center"><Database size={32} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400">No results</p></div>}
                </div>
              </div>
            )}

            {/* Calendar Tab */}
            {tab === 'calendar' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold">Appointment Calendar</h3><p className="text-[9px] text-slate-400 uppercase">15-min slots • 9AM-5PM</p></div><div className="bg-emerald-50 px-2.5 py-1 rounded-lg text-[10px]"><span className="font-bold text-emerald-700">{stats.today}</span> <span className="text-emerald-600">today</span></div></div>
                <div className="bg-white rounded-lg p-2.5 shadow-sm border border-slate-100"><div className="flex gap-1.5 overflow-x-auto">{dates.map(d => { const dt = new Date(d); const booked = slots.filter(s => s.date === d && s.isBooked).length; return <button key={d} onClick={() => setSelectedDate(d)} className={`flex-shrink-0 w-14 py-2 rounded-lg border transition-all ${selectedDate === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-amber-400'}`}><div className="text-[8px] font-bold uppercase opacity-60">{dt.toLocaleDateString('en-US', { weekday: 'short' })}</div><div className="text-lg font-bold">{dt.getDate()}</div>{booked > 0 && <div className={`text-[7px] font-bold ${selectedDate === d ? 'text-amber-400' : 'text-emerald-600'}`}>{booked}</div>}</button>; })}</div></div>
                {selectedDate && <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100"><h4 className="text-[9px] font-bold text-slate-500 uppercase mb-2">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h4><div className="grid grid-cols-4 sm:grid-cols-7 gap-1">{dateSlots.map(s => <div key={s.id} className={`p-1.5 rounded-lg border text-center text-[10px] ${s.isBooked ? 'bg-slate-100 border-slate-200' : 'bg-emerald-50 border-emerald-200'}`}><div className={`font-bold ${s.isBooked ? 'text-slate-700' : 'text-emerald-700'}`}>{s.time}</div>{s.isBooked ? <div><div className="text-[7px] text-slate-500 truncate">{s.bookedBy?.name}</div><button onClick={() => { if (window.confirm('Cancel?')) { setSlots(p => p.map(x => x.id === s.id ? { ...x, isBooked: false, bookedBy: null } : x)); notify('Cancelled'); } }} className="text-[7px] text-red-500 font-bold">Cancel</button></div> : <div className="text-[7px] text-emerald-600 font-bold">Open</div>}</div>)}</div></div>}
              </div>
            )}

            {/* Templates Tab */}
            {tab === 'templates' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold">Email Templates</h3><p className="text-[9px] text-slate-400 uppercase">Automated communications</p></div><button onClick={() => setEditTemplate({ id: `ET-${Date.now()}`, name: '', category: 'marketing', subject: '', body: '', eventTrigger: '', isActive: true })} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-amber-500 flex items-center gap-1"><Plus size={12} /> New</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map(t => (
                    <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div><h4 className="font-bold text-sm">{t.name}</h4><div className="flex items-center gap-1.5 mt-1"><span className={`px-1.5 py-0.5 rounded text-[7px] font-bold uppercase ${t.category === 'marketing' ? 'bg-purple-100 text-purple-700' : t.category === 'transactional' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.category}</span>{t.isActive ? <span className="text-[7px] text-emerald-600 font-bold">Active</span> : <span className="text-[7px] text-slate-400 font-bold">Inactive</span>}</div></div>
                        <div className="flex gap-0.5"><button onClick={() => setEditTemplate(t)} className="p-1 hover:bg-slate-100 rounded"><Edit size={13} className="text-slate-400" /></button><button onClick={() => { if (window.confirm('Delete?')) { setTemplates(p => p.filter(x => x.id !== t.id)); notify('Deleted'); } }} className="p-1 hover:bg-red-50 rounded"><Trash2 size={13} className="text-red-400" /></button></div>
                      </div>
                      <div className="text-xs text-slate-500 mb-1"><strong>Subject:</strong> {t.subject}</div>
                      {t.eventTrigger && <div className="text-[8px] text-amber-600 font-bold"><Zap size={9} className="inline mr-0.5" /> {t.eventTrigger}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Widgets Tab */}
            {tab === 'widgets' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center"><div className="text-xl font-bold text-emerald-700">{stats.active}</div><div className="text-[8px] font-bold text-emerald-600 uppercase">Active</div></div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center"><div className="text-xl font-bold text-amber-700">{stats.warning}</div><div className="text-[8px] font-bold text-amber-600 uppercase">Warning</div></div>
                  <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center"><div className="text-xl font-bold text-slate-500">{registry.filter(r => r.widgetStatus === 'hidden').length}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Hidden</div></div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-slate-800 text-white text-[9px] font-bold uppercase"><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Widget ID</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {registry.filter(r => r.widgetId || r.subscriptionStatus === 'active').map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2"><div className="font-medium">{r.name}</div><div className="text-[9px] text-slate-400 font-mono">{r.npi}</div></td>
                          <td className="px-3 py-2"><code className="text-xs font-mono bg-slate-50 px-1 py-0.5 rounded">{r.widgetId || 'N/A'}</code></td>
                          <td className="px-3 py-2"><StatusBadge status={r.widgetStatus} size="sm" /></td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <select value={r.widgetStatus} onChange={e => { setRegistry(p => p.map(x => x.id === r.id ? { ...x, widgetStatus: e.target.value } : x)); notify(`Widget: ${e.target.value}`); }} className="px-2 py-1 text-xs bg-slate-50 border border-slate-100 rounded focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="active">Active</option><option value="warning">Warning</option><option value="hidden">Hidden</option></select>
                              <button onClick={() => setWidgetModal(r)} className="p-1 hover:bg-amber-100 rounded" title="Code"><FileCode size={13} className="text-amber-500" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Provider" size="lg"><ProviderForm onSave={handleSave} onCancel={() => setShowAdd(false)} /></Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Provider" size="lg">{editing && <ProviderForm entry={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}</Modal>
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Provider Details" size="lg">
        {viewing && <div className="space-y-4">
          <div className="flex justify-between items-start"><div><h2 className="text-lg font-bold">{viewing.name}</h2><p className="text-xs text-slate-500">NPI: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{viewing.npi}</code></p></div><button onClick={() => { handleScan([viewing.id]); setViewing(null); }} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-amber-500 flex items-center gap-1"><Play size={12} /> Scan</button></div>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Score</div><div className="text-xl font-bold">{viewing.riskScore}</div><StatusBadge status={viewing.complianceStatus} size="sm" /></div>
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Widget</div><StatusBadge status={viewing.widgetStatus} /></div>
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Subscription</div><StatusBadge status={viewing.subscriptionStatus} /></div>
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Scans</div><div className="text-xl font-bold">{viewing.scanCount}</div></div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3"><h3 className="text-[9px] font-bold text-slate-500 uppercase mb-2">Contact</h3><div className="grid grid-cols-2 gap-2 text-xs"><div><span className="text-slate-400">Name:</span> {viewing.contactFirstName} {viewing.contactLastName}</div><div><span className="text-slate-400">Email:</span> <a href={`mailto:${viewing.email}`} className="text-amber-600 hover:underline">{viewing.email}</a></div><div><span className="text-slate-400">Phone:</span> {viewing.phone}</div><div><span className="text-slate-400">Location:</span> {viewing.city}, {viewing.zip}</div></div></div>
          {viewing.topIssues?.length > 0 && <div className="bg-red-50 border border-red-100 rounded-lg p-3"><h3 className="text-[9px] font-bold text-red-700 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={11} /> Issues</h3>{viewing.topIssues.map((i, idx) => <div key={idx} className="bg-white rounded p-2 border border-red-100 mb-1 last:mb-0"><div className="font-medium text-xs">{i.title}</div><p className="text-[10px] text-slate-500">{i.description}</p></div>)}</div>}
        </div>}
      </Modal>
      <Modal isOpen={!!editTemplate} onClose={() => setEditTemplate(null)} title={editTemplate?.name ? 'Edit Template' : 'New Template'} size="md">
        {editTemplate && <form onSubmit={e => { e.preventDefault(); setTemplates(p => { const ex = p.find(x => x.id === editTemplate.id); return ex ? p.map(x => x.id === editTemplate.id ? editTemplate : x) : [...p, editTemplate]; }); setEditTemplate(null); notify('Saved'); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Name</label><input type="text" value={editTemplate.name} onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })} required className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div><div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Category</label><select value={editTemplate.category} onChange={e => setEditTemplate({ ...editTemplate, category: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="marketing">Marketing</option><option value="transactional">Transactional</option><option value="report">Report</option></select></div></div>
          <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Subject</label><input type="text" value={editTemplate.subject} onChange={e => setEditTemplate({ ...editTemplate, subject: e.target.value })} required className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
          <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Body</label><textarea value={editTemplate.body} onChange={e => setEditTemplate({ ...editTemplate, body: e.target.value })} required rows={6} className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" /></div>
          <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Trigger</label><select value={editTemplate.eventTrigger || ''} onChange={e => setEditTemplate({ ...editTemplate, eventTrigger: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="">None</option><option value="risk_scan_high">Risk Scan - High</option><option value="verification_complete">Verification Complete</option><option value="weekly_report">Weekly Report</option></select></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={editTemplate.isActive} onChange={e => setEditTemplate({ ...editTemplate, isActive: e.target.checked })} className="rounded" /><span className="text-sm">Active</span></div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100"><button type="button" onClick={() => setEditTemplate(null)} className="px-4 py-2 text-sm text-slate-500">Cancel</button><button type="submit" className="px-5 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-amber-500">Save</button></div>
        </form>}
      </Modal>
      <Modal isOpen={!!widgetModal} onClose={() => setWidgetModal(null)} title="Widget Code" size="md">
        {widgetModal && <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3"><div className="flex justify-between items-center mb-2"><span className="text-[9px] font-bold text-slate-500 uppercase">Embed Code</span><button onClick={() => { navigator.clipboard.writeText(`<script>(function(){var e=document.createElement('script');e.src='https://widget.kairologic.com/sentry.js';e.async=true;e.dataset.widgetId='${widgetModal.widgetId || 'WGT-' + widgetModal.npi}';e.dataset.npi='${widgetModal.npi}';document.body.appendChild(e);})();</script>`); notify('Copied!'); }} className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5 hover:text-amber-700"><Copy size={10} /> Copy</button></div><pre className="text-[10px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-100 overflow-x-auto whitespace-pre-wrap">{`<!-- KairoLogic Sentry Widget -->\n<script>\n  (function(){\n    var e=document.createElement('script');\n    e.src='https://widget.kairologic.com/sentry.js';\n    e.async=true;\n    e.dataset.widgetId='${widgetModal.widgetId || 'WGT-' + widgetModal.npi}';\n    e.dataset.npi='${widgetModal.npi}';\n    document.body.appendChild(e);\n  })();\n</script>`}</pre></div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5"><h4 className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Instructions</h4><ol className="text-[10px] text-amber-700 list-decimal list-inside space-y-0.5"><li>Copy code above</li><li>Paste before &lt;/body&gt;</li><li>Widget shows bottom-right</li></ol></div>
        </div>}
      </Modal>

      {/* Toast */}
      {toast && <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>{toast.type === 'success' ? <CheckCircle size={14} /> : toast.type === 'error' ? <XCircle size={14} /> : <AlertCircle size={14} />} {toast.msg}</div>}
    </div>
  );
}
