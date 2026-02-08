/**
 * Enhanced Provider Detail Modal with Real Scan Data
 * Fetches actual findings from scan_reports table
 * Shows drift items, report downloads, and promote action
 * Version: 12.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  X, Download, FileText, Code2, AlertTriangle, CheckCircle, Shield,
  ExternalLink, Calendar, Mail, Phone, Globe, Star, StarOff,
  RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { Registry } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

interface Finding {
  id: string;
  name: string;
  clause?: string;
  detail: string;
  status: string;
  severity?: string;
  category?: string;
}

interface ScanReport {
  report_id: string;
  report_date: string;
  sovereignty_score: number;
  compliance_status: string;
  category_scores?: Record<string, { name: string; score: number; findings: number; passed: number; failed: number }>;
  findings: Finding[];
  data_border_map?: Array<{ domain: string; country: string; isSovereign: boolean; purpose?: string }>;
  engine_version?: string;
}

interface ProviderDetailModalProps {
  entry: Registry;
  onClose: () => void;
  onUpdate?: (updated: Registry) => void;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({ entry, onClose, onUpdate }) => {
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [isFeatured, setIsFeatured] = useState(!!entry.is_featured);
  const [expandedFindings, setExpandedFindings] = useState(true);
  const [expandedBorder, setExpandedBorder] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/report?npi=${entry.npi}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reports && data.reports.length > 0) {
            const fullRes = await fetch(`/api/report?reportId=${data.reports[0].report_id}`);
            if (fullRes.ok) {
              setScanReport(await fullRes.json());
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch scan report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [entry.npi]);

  const isVerified = entry.widget_status === 'active';
  const lastScanDate = (entry.last_scan_timestamp || entry.updated_at)
    ? new Date(entry.last_scan_timestamp || entry.updated_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Never';

  const toggleFeatured = async () => {
    setPromoting(true);
    try {
      const newValue = !isFeatured;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/registry?npi=eq.${entry.npi}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_featured: newValue })
      });
      if (res.ok) {
        setIsFeatured(newValue);
        if (onUpdate) onUpdate({ ...entry, is_featured: newValue });
      }
    } catch (err) {
      console.error('Failed to toggle featured:', err);
    } finally {
      setPromoting(false);
    }
  };

  const severityColor = (s?: string) => {
    switch (s?.toLowerCase()) {
      case 'critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'fail': return <AlertTriangle size={14} className="text-red-500 shrink-0" />;
      case 'warn': return <AlertTriangle size={14} className="text-orange-500 shrink-0" />;
      case 'pass': return <CheckCircle size={14} className="text-green-500 shrink-0" />;
      default: return <Shield size={14} className="text-gray-400 shrink-0" />;
    }
  };

  const downloadHTMLReport = () => {
    const findings = scanReport?.findings || [];
    const catScores = scanReport?.category_scores ? Object.entries(scanReport.category_scores) : [];
    const borderMap = scanReport?.data_border_map || [];
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>KairoLogic Report - ${entry.name}</title>
<style>body{font-family:'Segoe UI',system-ui,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#1a1a2e}
.hdr{background:#00234E;color:#fff;padding:40px;border-radius:16px;margin-bottom:30px}.hdr h1{margin:0 0 8px;font-size:28px}.hdr .sub{color:#C5A059;font-size:13px}
.row{display:flex;gap:20px;margin-bottom:30px}.card{flex:1;background:#f8f9fa;border-radius:12px;padding:20px;text-align:center;border:1px solid #e5e7eb}
.card .n{font-size:36px;font-weight:800}.card .l{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px}
.sec{margin-bottom:30px}.sec h2{font-size:16px;color:#00234E;border-bottom:2px solid #C5A059;padding-bottom:8px}
.f{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px}.f .t{font-weight:700;font-size:14px;margin-bottom:4px}
.f .d{font-size:13px;color:#444;line-height:1.5}.f .m{font-size:11px;color:#888;margin-top:8px}
.b{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase}
.bf{background:#fee2e2;color:#dc2626}.bw{background:#fef3c7;color:#d97706}.bp{background:#dcfce7;color:#16a34a}
.br{display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}
.sov{color:#16a34a}.nsov{color:#dc2626;font-weight:700}
.cr{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0}
.ft{text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #e5e7eb;font-size:11px;color:#999}
@media print{body{padding:20px}.hdr{break-inside:avoid}}</style></head><body>
<div class="hdr"><h1>${entry.name}</h1><div class="sub">NPI: ${entry.npi} ${entry.city ? '• ' + entry.city : ''} ${entry.url ? '• ' + entry.url : ''}</div>
<div class="sub" style="margin-top:8px">Report: ${scanReport?.report_id || 'N/A'} • Engine: ${scanReport?.engine_version || 'SENTRY-3.0.0'} • ${new Date().toLocaleDateString()}</div></div>
<div class="row"><div class="card"><div class="n" style="color:${(entry.risk_score||0)>=67?'#16a34a':(entry.risk_score||0)>=34?'#d97706':'#dc2626'}">${entry.risk_score||0}</div><div class="l">Score</div></div>
<div class="card"><div class="n">${findings.filter(f=>f.status==='fail').length}</div><div class="l">Failures</div></div>
<div class="card"><div class="n">${findings.filter(f=>f.status==='warn').length}</div><div class="l">Warnings</div></div>
<div class="card"><div class="n">${findings.filter(f=>f.status==='pass').length}</div><div class="l">Passed</div></div></div>
${catScores.length>0?`<div class="sec"><h2>Category Scores</h2>${catScores.map(([,c])=>`<div class="cr"><span>${c.name}</span><span style="font-weight:700;color:${c.score>=67?'#16a34a':c.score>=34?'#d97706':'#dc2626'}">${c.score}/100</span></div>`).join('')}</div>`:''}
<div class="sec"><h2>Findings (${findings.length})</h2>${findings.length===0?'<p style="color:#16a34a;font-weight:600">No compliance issues detected</p>':findings.map(f=>`<div class="f"><div style="display:flex;justify-content:space-between;align-items:center"><div class="t">${f.name||f.id}</div><span class="b b${f.status[0]}">${f.status}</span></div><div class="d">${f.detail}</div><div class="m">${f.clause||''} ${f.severity?'• '+f.severity:''} ${f.category?'• '+f.category:''}</div></div>`).join('')}</div>
${borderMap.length>0?`<div class="sec"><h2>Data Border Map (${borderMap.length})</h2>${borderMap.map(b=>`<div class="br"><span>${b.domain}</span><span>${b.purpose||''}</span><span class="${b.isSovereign?'sov':'nsov'}">${b.country} ${b.isSovereign?'✓':'✗'}</span></div>`).join('')}</div>`:''}
<div class="ft"><p>KairoLogic Sentry Compliance Report • ${new Date().toISOString()}</p><p>TX SB 1188 &amp; HB 149 Statutory Alignment Analysis</p></div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${entry.name.replace(/\s+/g, '_')}_Report.html`; a.click();
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify({ provider: { name: entry.name, npi: entry.npi, city: entry.city, url: entry.url }, score: entry.risk_score, scanReport, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${entry.name.replace(/\s+/g, '_')}_Report.json`; a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#00234E] p-8 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#C5A059]/20 rounded-2xl flex items-center justify-center"><Shield size={28} className="text-[#C5A059]" /></div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">{entry.name}</h3>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs text-[#C5A059] font-mono">NPI: {entry.npi}</span>
                {entry.city && <><span className="text-[#C5A059]">•</span><span className="text-xs text-gray-400">{entry.city}</span></>}
                {isFeatured && <span className="px-2 py-0.5 bg-[#C5A059]/20 border border-[#C5A059]/30 rounded text-[9px] font-bold text-[#C5A059] uppercase">Public</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleFeatured} disabled={promoting} title={isFeatured ? 'Remove from public registry' : 'Promote to public registry'}
              className={`p-3 rounded-xl transition-colors ${isFeatured ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'hover:bg-white/10 text-gray-400'}`}>
              {promoting ? <RefreshCw size={20} className="animate-spin" /> : isFeatured ? <Star size={20} fill="currentColor" /> : <StarOff size={20} />}
            </button>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-xl"><X size={24} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-grow">
          {/* Score Cards */}
          <div className="p-6 bg-slate-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Score</div>
                <div className={`text-4xl font-black ${(entry.risk_score||0)>=67?'text-green-500':(entry.risk_score||0)>=34?'text-orange-500':'text-red-500'}`}>{entry.risk_score||0}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Widget</div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {isVerified ? <CheckCircle className="text-green-500" size={24} /> : <AlertTriangle className="text-orange-500" size={24} />}
                  <span className="text-sm font-black text-[#00234E] capitalize">{entry.widget_status || 'pending'}</span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Last Scan</div>
                <div className="flex items-center justify-center gap-1 mt-2"><Calendar size={14} className="text-gray-400" /><span className="text-sm font-black text-[#00234E]">{lastScanDate}</span></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Report</div>
                <div className="text-sm font-bold mt-2">{loading ? <span className="text-gray-400">Loading...</span> : scanReport ? <span className="text-green-600 text-xs">{scanReport.report_id}</span> : <span className="text-gray-400">None</span>}</div>
              </div>
            </div>
          </div>

          {/* Category Scores */}
          {scanReport?.category_scores && (
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#00234E] mb-4">Category Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(scanReport.category_scores).map(([key, cat]) => (
                  <div key={key} className="p-4 bg-slate-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-[#00234E]">{cat.name}</span>
                      <span className={`text-lg font-black ${cat.score>=67?'text-green-600':cat.score>=34?'text-orange-500':'text-red-500'}`}>{cat.score}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${cat.score>=67?'bg-green-500':cat.score>=34?'bg-orange-400':'bg-red-500'}`} style={{width:`${cat.score}%`}} />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-gray-500"><span>{cat.passed} pass</span><span>{cat.failed} fail</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          <div className="p-6 border-b border-gray-200">
            <button onClick={() => setExpandedFindings(!expandedFindings)} className="w-full flex items-center justify-between mb-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#00234E] flex items-center gap-2">
                <AlertTriangle size={16} /> Compliance Findings {scanReport?.findings ? `(${scanReport.findings.length})` : ''}
              </h4>
              {expandedFindings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedFindings && (
              loading ? (
                <div className="text-center py-8 text-gray-400"><RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading scan data...</div>
              ) : scanReport?.findings && scanReport.findings.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {scanReport.findings.map((f, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${severityColor(f.severity)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          {statusIcon(f.status)}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm">{f.name || f.id}</div>
                            <div className="text-xs mt-1 leading-relaxed opacity-80">{f.detail}</div>
                            {f.clause && <div className="text-[10px] mt-2 opacity-60">{f.clause}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${f.status==='fail'?'bg-red-100 text-red-700':f.status==='warn'?'bg-orange-100 text-orange-700':'bg-green-100 text-green-700'}`}>{f.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400"><Shield size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">No scan data. Run a scan to see findings.</p></div>
              )
            )}
          </div>

          {/* Data Border Map */}
          {scanReport?.data_border_map && scanReport.data_border_map.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <button onClick={() => setExpandedBorder(!expandedBorder)} className="w-full flex items-center justify-between mb-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-[#00234E] flex items-center gap-2">
                  <Globe size={16} /> Data Border Map ({scanReport.data_border_map.length})
                </h4>
                {expandedBorder ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedBorder && (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {scanReport.data_border_map.map((b, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-xs">
                      <span className="font-mono text-gray-700 truncate flex-1">{b.domain}</span>
                      <span className="text-gray-400 mx-2">{b.purpose || ''}</span>
                      <span className={`font-bold ${b.isSovereign ? 'text-green-600' : 'text-red-600'}`}>{b.country} {b.isSovereign ? '✓' : '✗'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          {(entry.email || entry.phone || entry.url) && (
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#00234E] mb-4">Contact</h4>
              <div className="flex flex-wrap gap-3">
                {entry.email && <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-sm"><Mail size={14} className="text-[#00234E]" />{entry.email}</div>}
                {entry.phone && <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-sm"><Phone size={14} className="text-[#00234E]" />{entry.phone}</div>}
                {entry.url && <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-sm text-[#C5A059] hover:underline"><Globe size={14} />{entry.url}<ExternalLink size={10} /></a>}
              </div>
            </div>
          )}

          {/* Downloads */}
          <div className="p-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-[#00234E] mb-4 flex items-center gap-2"><Download size={16} />Reports</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={downloadHTMLReport} className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:border-[#C5A059] hover:shadow-lg transition-all text-left group">
                <FileText className="text-[#00234E] group-hover:text-[#C5A059] mb-2" size={24} />
                <div className="text-sm font-black text-[#00234E] mb-1">Full HTML Report</div>
                <div className="text-[10px] text-gray-500">Printable with all findings (.html)</div>
              </button>
              <button onClick={downloadJSON} className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:border-[#C5A059] hover:shadow-lg transition-all text-left group">
                <Code2 className="text-[#00234E] group-hover:text-[#C5A059] mb-2" size={24} />
                <div className="text-sm font-black text-[#00234E] mb-1">JSON Export</div>
                <div className="text-[10px] text-gray-500">Machine-readable data (.json)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-8 py-4 border-t border-gray-200 shrink-0 flex justify-between items-center">
          <button onClick={toggleFeatured} disabled={promoting}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${isFeatured ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-[#C5A059] text-white hover:opacity-90'}`}>
            {promoting ? <RefreshCw size={14} className="animate-spin" /> : isFeatured ? <StarOff size={14} /> : <Star size={14} />}
            {isFeatured ? 'Remove from Public Registry' : 'Promote to Public Registry'}
          </button>
          <button onClick={onClose} className="px-6 py-2 bg-[#00234E] text-white rounded-xl font-bold text-sm hover:opacity-90">Close</button>
        </div>
      </div>
    </div>
  );
};

