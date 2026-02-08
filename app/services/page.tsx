'use client';

import Link from 'next/link';
import { Shield, FileText, Eye, Search, CheckCircle, AlertTriangle, Activity, ArrowRight, Zap, Lock, Globe, XCircle, Clock, DollarSign } from 'lucide-react';

// ── Inline Mockup: Scan Results Preview ──
function ScanResultsMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-left">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy to-navy-light px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-gold" />
          <span className="text-white text-xs font-bold">KairoLogic Scan Results</span>
        </div>
        <span className="text-slate-400 text-[10px] font-mono">SENTRY-3.1.0</span>
      </div>
      {/* Score */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Compliance Score</div>
            <div className="text-3xl font-black text-amber-600">62<span className="text-base text-slate-400 font-normal">/100</span></div>
          </div>
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">Drift</span>
        </div>
      </div>
      {/* Categories */}
      <div className="px-5 py-3 space-y-2.5">
        {[
          { label: 'Data Residency', pct: 75, pass: 3, total: 4, color: 'bg-green-500' },
          { label: 'AI Transparency', pct: 50, pass: 2, total: 4, color: 'bg-amber-500' },
          { label: 'Clinical Integrity', pct: 60, pass: 2, total: 4, color: 'bg-amber-500' },
        ].map((c) => (
          <div key={c.label}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-slate-700">{c.label}</span>
              <span className="text-slate-400">{c.pass}/{c.total} pass</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      {/* CTA teaser */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-center">
        <span className="text-[10px] text-slate-500">Full report with remediation available for $149</span>
      </div>
    </div>
  );
}

// ── Inline Mockup: PDF Report Preview ──
function ReportMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-left">
      {/* Navy header */}
      <div className="bg-navy px-5 py-4 text-center">
        <div className="text-white text-sm font-bold tracking-wider">KAIRO<span className="text-gold">LOGIC</span></div>
        <div className="text-gold text-[8px] uppercase tracking-[0.2em] mt-0.5">Statutory Audit Report</div>
        <div className="text-slate-400 text-[8px] mt-1">Report ID: KL-SAR-2X7F • Feb 2026</div>
      </div>
      {/* Score row */}
      <div className="px-5 py-3 flex items-center gap-4 border-b border-slate-100">
        <div className="w-12 h-12 rounded-full border-[3px] border-green-500 flex items-center justify-center">
          <span className="text-green-600 font-black text-lg">92</span>
        </div>
        <div>
          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">LOW RISK</span>
          <div className="text-[10px] text-slate-400 mt-0.5">Post-remediation score</div>
        </div>
      </div>
      {/* Findings preview */}
      <div className="px-5 py-3 space-y-2">
        {[
          { id: 'DR-01', name: 'IP Geo-Location', status: 'pass' },
          { id: 'DR-02', name: 'CDN Analysis', status: 'pass' },
          { id: 'AI-01', name: 'AI Disclosure', status: 'warn' },
          { id: 'ER-01', name: 'EHR Portal Security', status: 'pass' },
        ].map((f) => (
          <div key={f.id} className="flex items-center gap-2 text-[11px]">
            {f.status === 'pass' ? <CheckCircle size={12} className="text-green-500" /> : <AlertTriangle size={12} className="text-amber-500" />}
            <span className="font-mono text-slate-500">{f.id}</span>
            <span className="text-slate-700">{f.name}</span>
            <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${f.status === 'pass' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
              {f.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      {/* Remediation peek */}
      <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-200">
        <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Remediation Roadmap</div>
        <div className="text-[10px] text-emerald-600">3 items • Priority-sorted with technical fixes</div>
      </div>
      {/* Border map peek */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200">
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Border Map</div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="text-green-600 font-semibold">🇺🇸 10 US</span>
          <span className="text-amber-600 font-semibold">🌍 3 foreign</span>
        </div>
      </div>
    </div>
  );
}

// ── Inline Mockup: Monitoring Dashboard ──
function MonitoringMockup() {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-left">
      <div className="bg-gradient-to-r from-navy to-navy-light px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-green-400" />
          <span className="text-white text-xs font-bold">Sentry Watch Dashboard</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-semibold">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
          LIVE
        </span>
      </div>
      {/* Score timeline */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Compliance Timeline</span>
          <span className="text-xs font-bold text-green-600">98%</span>
        </div>
        {/* Simple bar chart */}
        <div className="flex items-end gap-1 h-10">
          {[85, 85, 62, 88, 92, 92, 95, 95, 98, 98, 98, 98].map((v, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${v}%`, backgroundColor: v >= 80 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444' }} />
          ))}
        </div>
        <div className="flex justify-between text-[8px] text-slate-300 mt-1">
          <span>Jan</span><span>Mar</span><span>Jun</span><span>Now</span>
        </div>
      </div>
      {/* Alert feed */}
      <div className="px-5 py-3 border-t border-slate-100 space-y-2">
        {[
          { time: '2h ago', msg: 'Re-scan complete — 98% sovereign', type: 'ok' },
          { time: '3d ago', msg: 'CDN drift detected → auto-alerted', type: 'warn' },
          { time: '1w ago', msg: 'Monthly report generated', type: 'info' },
        ].map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.type === 'ok' ? 'bg-green-400' : a.type === 'warn' ? 'bg-amber-400' : 'bg-blue-400'}`} />
            <span className="text-slate-400 font-mono w-10 flex-shrink-0">{a.time}</span>
            <span className="text-slate-600">{a.msg}</span>
          </div>
        ))}
      </div>
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-center">
        <span className="text-[10px] text-slate-400">Next scan in 6 days • 12 endpoints monitored</span>
      </div>
    </div>
  );
}


export default function ServicesPage() {
  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="bg-gradient-to-br from-navy via-navy-light to-navy-dark text-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-gold text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <Shield size={14} />
            Compliance-as-a-Service
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold leading-tight mb-6">
            Your Compliance.{' '}
            <span className="text-gold">Handled.</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-4">
            From your first scan to continuous protection — everything your practice needs to stay compliant with Texas SB 1188 and HB 149, without an IT team.
          </p>
          <p className="text-sm text-gray-500">
            Scan → Report → Remediate → Monitor. Pick what you need.
          </p>
        </div>
      </section>

      {/* ═══ PRODUCT 1: FREE SCAN ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <Search size={14} />
                Step 1 — Discover
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-navy mb-4">
                Free Compliance Scan
              </h2>
              <div className="inline-block bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full mb-6">FREE</div>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Enter your NPI and website URL. In under 60 seconds, our Sentry engine checks 12 compliance vectors and gives you a score with a category-by-category breakdown.
              </p>
              <p className="text-gray-500 text-sm mb-8">
                See your compliance posture instantly — no signup, no credit card, no commitment. The free scan shows your score and which categories need attention, but reserves detailed findings and fixes for the full report.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  '12-point infrastructure analysis',
                  'Score + risk level (Sovereign / Drift / Violation)',
                  'Category breakdown with pass/fail counts',
                  'Data border summary (US vs. foreign endpoints)',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/scan">
                <button className="btn-primary text-base px-8 py-3 flex items-center gap-2">
                  <Zap size={18} />
                  Run Free Scan
                </button>
              </Link>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-sm transform rotate-1 hover:rotate-0 transition-transform">
                <ScanResultsMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT 2: COMPLIANCE REPORT ═══ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 flex justify-center">
              <div className="w-full max-w-sm transform -rotate-1 hover:rotate-0 transition-transform">
                <ReportMockup />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-orange/10 text-orange px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <FileText size={14} />
                Step 2 — Fix
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-navy mb-4">
                Sovereignty Audit Report
              </h2>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-display font-black text-navy">$149</span>
                <span className="text-gray-400 text-sm">/report</span>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                A professional, audit-defensible PDF with every finding mapped to the specific Texas statute, a complete data border map, and an <strong>exact remediation roadmap</strong> your web developer can act on immediately.
              </p>
              <p className="text-gray-500 text-sm mb-8">
                This is the document you hand to your developer, your hosting provider, or your MSP. It tells them exactly what&apos;s wrong, where it is, and how to fix it — no guesswork.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  'Full 12-point forensic analysis with findings',
                  'Professional branded PDF report',
                  'Data border map with IP geolocation for every endpoint',
                  'Remediation roadmap — priority-sorted with technical fixes',
                  'SB 1188 & HB 149 statute clause mapping',
                  'Audit-defensible evidence for regulators & insurers',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/scan">
                <button className="bg-navy hover:bg-navy-light text-white font-semibold px-8 py-3 rounded-lg transition-colors flex items-center gap-2">
                  Get My Report
                  <ArrowRight size={16} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT 2B: SAFE HARBOR BUNDLE ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <Lock size={14} />
                Step 2B — Remediate
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-navy mb-4">
                Safe Harbor&trade; Bundle
              </h2>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-display font-black text-navy">$249</span>
                <span className="text-gray-400 text-sm">/one-time</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-orange/10 text-orange text-xs font-bold px-3 py-1 rounded-full mb-6">
                <Zap size={12} />
                Recommended with Audit Report
              </div>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                The Audit Report tells you what&apos;s wrong. Safe Harbor&trade; gives you <strong>everything you need to fix it</strong> — pre-written policies, copy-paste code, staff training, and an implementation blueprint. Zero research. Zero writing. Just implement.
              </p>
              <p className="text-gray-500 text-sm mb-8">
                Designed for practice managers without legal or IT backgrounds. Every deliverable is ready to use — no customization required.
              </p>

              <Link href="/scan">
                <button className="btn-primary text-base px-8 py-3 flex items-center gap-2">
                  Get Safe Harbor Bundle
                  <ArrowRight size={16} />
                </button>
              </Link>
            </div>

            {/* Deliverables card */}
            <div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                <div className="text-xs font-bold text-orange uppercase tracking-widest mb-5">What&apos;s in the Bundle</div>
                <div className="space-y-4">
                  {[
                    {
                      icon: '📋',
                      title: 'SB 1188 Policy Pack',
                      job: 'Formalize data residency rules',
                      deliverable: 'A board-ready "Data Sovereignty Policy" manual that mandates U.S.-based PHI processing.',
                    },
                    {
                      icon: '🤖',
                      title: 'AI Disclosure Kit',
                      job: 'Meet HB 149 transparency laws',
                      deliverable: 'Copy-and-paste code snippets and text for "clear and conspicuous" AI notifications.',
                    },
                    {
                      icon: '📁',
                      title: 'Evidence Ledger',
                      job: 'Prepare for state inspectors',
                      deliverable: 'Structured templates to document your digital supply chain and vendor locations.',
                    },
                    {
                      icon: '👥',
                      title: 'Staff Training Guide',
                      job: 'Prevent human error',
                      deliverable: 'A 15-minute training checklist so staff don\'t inadvertently move PHI offshore.',
                    },
                    {
                      icon: '📅',
                      title: 'Annual Compliance Roadmap',
                      job: 'Maintain long-term standing',
                      deliverable: 'A compliance calendar telling you exactly what to check and when.',
                    },
                    {
                      icon: '🔧',
                      title: 'Implementation Blueprint',
                      job: 'Eliminate uncertainty',
                      deliverable: 'Step-by-step instructions on where to place each disclosure and how to file each policy.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="bg-white rounded-xl p-4 border border-amber-100 flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <div className="font-bold text-navy text-sm">{item.title}</div>
                        <div className="text-[11px] text-orange font-medium mb-1">{item.job}</div>
                        <div className="text-xs text-gray-500 leading-relaxed">{item.deliverable}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Audit + Safe Harbor combo callout */}
          <div className="mt-12 max-w-3xl mx-auto bg-navy/5 border border-navy/10 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <div className="font-bold text-navy text-sm mb-1">Audit + Safe Harbor Combo</div>
              <p className="text-xs text-gray-500">
                Most practices purchase both together — the Audit identifies the problems, Safe Harbor provides the ready-made fixes. Together they give you a complete, audit-defensible compliance package.
              </p>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="text-2xl font-display font-black text-navy">$398</div>
              <div className="text-[10px] text-gray-400">$149 + $249</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT 3: SENTRY WATCH & SHIELD ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <Eye size={14} />
                Step 3 — Monitor
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-navy mb-4">
                Continuous Compliance Monitoring
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Fixes don&apos;t stay fixed. Plugin updates, hosting changes, and new third-party scripts can silently break your compliance overnight. Sentry Watch and Sentry Shield keep you protected around the clock.
              </p>

              {/* Two tier cards */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {/* Sentry Watch */}
                <div className="border-2 border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={18} className="text-blue-500" />
                    <h3 className="font-bold text-navy text-sm">Sentry Watch</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-display font-black text-navy">$39</span>
                    <span className="text-gray-400 text-xs">/mo</span>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500 flex-shrink-0" /> Automated monthly re-scans</li>
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500 flex-shrink-0" /> Compliance drift alerts</li>
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500 flex-shrink-0" /> Monthly compliance reports</li>
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500 flex-shrink-0" /> Infrastructure heartbeat</li>
                  </ul>
                </div>

                {/* Sentry Shield */}
                <div className="border-2 border-orange rounded-xl p-5 relative shadow-md">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange text-white text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">Best Value</div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={18} className="text-orange" />
                    <h3 className="font-bold text-navy text-sm">Sentry Shield</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-display font-black text-navy">$79</span>
                    <span className="text-gray-400 text-xs">/mo</span>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500 flex-shrink-0" /> Everything in Watch</li>
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-orange flex-shrink-0" /> <strong>Live compliance dashboard</strong></li>
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-orange flex-shrink-0" /> <strong>Quarterly forensic reports</strong></li>
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-orange flex-shrink-0" /> <strong>Annual certification seal</strong></li>
                    <li className="flex items-center gap-1.5"><CheckCircle size={12} className="text-orange flex-shrink-0" /> <strong>Priority support</strong></li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Proof of <strong>ongoing diligence</strong> — not just a one-time fix. This is the evidence that tells regulators and insurers you take compliance seriously, every day.
              </p>
              <Link href="/scan">
                <button className="btn-primary text-base px-8 py-3 flex items-center gap-2">
                  Start With a Free Scan
                  <ArrowRight size={16} />
                </button>
              </Link>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-sm transform rotate-1 hover:rotate-0 transition-transform">
                <MonitoringMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VERIFICATION MATRIX ═══ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-heading">
              The KairoLogic <span className="text-gold">Verification Matrix</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See exactly what you get at each level. Every tier builds on the last.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="text-left px-4 py-4 font-semibold text-xs uppercase tracking-wider">Feature / Protection</th>
                    <th className="px-3 py-4 text-center font-semibold text-xs uppercase tracking-wider">
                      <div>Free Scan</div>
                    </th>
                    <th className="px-3 py-4 text-center font-semibold text-xs uppercase tracking-wider bg-orange/20">
                      <div>Report</div>
                      <div className="text-[10px] font-normal text-slate-300 mt-0.5">$149</div>
                    </th>
                    <th className="px-3 py-4 text-center font-semibold text-xs uppercase tracking-wider bg-amber-500/15">
                      <div>Safe Harbor</div>
                      <div className="text-[10px] font-normal text-amber-200 mt-0.5">$249</div>
                    </th>
                    <th className="px-3 py-4 text-center font-semibold text-xs uppercase tracking-wider">
                      <div>Watch</div>
                      <div className="text-[10px] font-normal text-slate-300 mt-0.5">$39/mo</div>
                    </th>
                    <th className="px-3 py-4 text-center font-semibold text-xs uppercase tracking-wider bg-gold/10">
                      <div>Shield</div>
                      <div className="text-[10px] font-normal text-gold mt-0.5">$79/mo</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { feature: 'Risk Identification', vals: ['Basic', 'Forensic', '—', 'Continuous', 'Continuous'] },
                    { feature: 'Compliance Score + Breakdown', vals: ['✓', '✓', '—', '✓', '✓'] },
                    { feature: 'Individual Finding Details', vals: ['—', '✓', '—', '✓', '✓'] },
                    { feature: 'Remediation Roadmap', vals: ['—', '✓', '✓ Full Kit', '✓', '✓'] },
                    { feature: 'Data Border Map (Full)', vals: ['Summary', '✓ Full', '—', '✓ Full', '✓ Full'] },
                    { feature: 'Professional PDF Report', vals: ['—', '✓', '—', '—', '✓ Quarterly'] },
                    { feature: 'Statutory Clause Mapping', vals: ['—', '✓', '✓', '✓', '✓'] },
                    { feature: 'Compliance Drift Alerts', vals: ['—', '—', '—', '✓', '✓'] },
                    { feature: 'Live Dashboard', vals: ['—', '—', '—', '—', '✓'] },
                    { feature: 'SB 1188 Policy Pack', vals: ['—', '—', '✓', '—', '—'] },
                    { feature: 'AI Disclosure Kit (Code + Copy)', vals: ['—', '—', '✓', '—', '—'] },
                    { feature: 'Evidence Ledger Templates', vals: ['—', '—', '✓', '—', '—'] },
                    { feature: 'Staff Training Guide', vals: ['—', '—', '✓', '—', '—'] },
                    { feature: 'Implementation Blueprint', vals: ['—', '—', '✓', '—', '—'] },
                    { feature: 'Automated Re-Scans', vals: ['—', '—', '—', 'Monthly', 'Monthly'] },
                    { feature: 'Quarterly Forensic Reports', vals: ['—', '—', '—', '—', '✓'] },
                    { feature: 'Annual Certification Seal', vals: ['—', '—', '—', '—', '✓'] },
                    { feature: 'Priority Support', vals: ['—', '—', '—', '—', '✓'] },
                    { feature: 'Liability Defense Level', vals: ['None', 'Strong', 'Partial', 'Good', 'Maximum'] },
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 font-medium text-slate-700">{row.feature}</td>
                      {row.vals.map((v, j) => (
                        <td key={j} className={`px-3 py-3 text-center ${j === 1 ? 'bg-orange/5' : j === 2 ? 'bg-amber-50/50' : j === 4 ? 'bg-gold/5' : ''}`}>
                          {v === '✓' ? <CheckCircle size={16} className="text-green-500 mx-auto" /> :
                           v === '—' ? <span className="text-slate-300">—</span> :
                           <span className={`text-xs font-medium ${v === 'Maximum' || v === 'Strong' ? 'text-green-600 font-bold' : v === 'None' ? 'text-slate-400' : v.startsWith('✓') ? 'text-green-600' : 'text-slate-600'}`}>{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ OBJECTION HANDLING ═══ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-display font-bold text-navy">Common Questions</h2>
          </div>
          <div className="space-y-8">
            {[
              {
                q: 'Why do I need the Report if the scan is free?',
                a: 'The free scan tells you your score and which categories need work. The Report tells you exactly what\'s wrong, maps each finding to the specific law, and gives your developer the exact technical steps to fix it. Think of the scan as the thermometer — the report is the prescription.',
              },
              {
                q: 'Why do I need Safe Harbor if I have the Report?',
                a: 'The Report tells you what\'s broken. Safe Harbor gives you the ready-made materials to fix it — pre-written policies, AI disclosure code, evidence templates, and staff training. Think of it this way: the Report is the inspection, Safe Harbor is the repair kit. Most practices buy both together to get a complete, audit-defensible compliance package without any writing or research.',
              },
              {
                q: 'Is Sentry Shield worth $79/month?',
                a: 'If your website updates, a plugin changes its data routing, or a new AI tool is added, your compliance status changes instantly. Sentry Shield is the only tier that provides quarterly forensic reports and the Annual Sovereignty Certification — a document you can hand directly to a malpractice carrier to demonstrate ongoing diligence.',
              },
              {
                q: 'Can I just fix things once and be done?',
                a: 'You can — the $149 Report gives you everything to fix current issues. But compliance is a moving target. WordPress updates, hosting changes, new third-party scripts, and regulatory changes can all silently break your compliance. Most practices that fix once find themselves non-compliant again within 3-6 months.',
              },
              {
                q: 'What if I don\'t have a web developer?',
                a: 'The Remediation Roadmap in your Report is written clearly enough that you can hand it to any hosting provider (GoDaddy, Squarespace, Wix support) and they can act on it. For complex cases, we can recommend vetted partners.',
              },
            ].map((item, i) => (
              <div key={i} className="border-b border-slate-100 pb-6">
                <h3 className="font-bold text-navy mb-2">{item.q}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COST COMPARISON ═══ */}
      <section className="py-16 bg-navy text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-gold mb-4">The math is simple</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            $79/month vs. <span className="text-red-400">$50,000+</span> per violation
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-4">
            Texas SB 1188 carries civil penalties up to $50,000 per violation, with potential criminal prosecution for willful non-compliance. A data breach involving foreign-routed PHI can exceed $250,000 in combined penalties, legal fees, and reputational damage.
          </p>
          <p className="text-gray-400 text-sm mb-10">
            Sentry Shield costs less than one hour of healthcare compliance attorney time — every month.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { label: 'Per-violation fine', value: '$50K+', color: 'text-red-400' },
              { label: 'Data breach cost', value: '$250K+', color: 'text-red-400' },
              { label: 'Sentry Shield', value: '$79/mo', color: 'text-green-400' },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className={`text-3xl font-display font-black ${item.color} mb-1`}>{item.value}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 bg-gradient-to-br from-orange to-orange-dark text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Not Sure Which Tier You Need?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Start with a free scan. The Sentry engine will assess your compliance posture and prescribe the right roadmap for your practice.
          </p>
          <Link href="/scan">
            <button className="bg-white text-orange font-bold px-10 py-4 rounded-lg text-lg hover:bg-gray-100 transition-all duration-200 shadow-xl flex items-center gap-2 mx-auto">
              <Search size={20} />
              Run My Free Scan
            </button>
          </Link>
          <p className="text-xs text-white/60 mt-4">
            30 seconds. No signup. No credit card.
          </p>
        </div>
      </section>
    </div>
  );
}

