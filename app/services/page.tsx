'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield, ShieldCheck, Search, FileText, CheckCircle, ArrowRight,
  AlertTriangle, Globe, Lock, Cpu, Zap, Scale, Database, Eye,
  FileCheck, Users, Calendar, Wrench, ChevronDown, ChevronUp,
  BarChart3, Activity, MapPin, Fingerprint, BadgeCheck, Monitor,
  ClipboardList, Bot, FolderOpen, GraduationCap, BookOpen, Settings
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
   FAQ Accordion
   ────────────────────────────────────────────────────────────── */
function FAQItem({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <h3 className="text-lg font-bold text-navy pr-8 group-hover:text-gold transition-colors">{question}</h3>
        {open ? <ChevronUp size={20} className="text-gold shrink-0" /> : <ChevronDown size={20} className="text-gray-400 shrink-0" />}
      </button>
      {open && <div className="pb-6 text-gray-600 leading-relaxed -mt-2">{children}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Styled check-mark list item
   ────────────────────────────────────────────────────────────── */
function Check({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
      <span className={bold ? 'font-bold text-navy' : 'text-gray-700'}>{children}</span>
    </li>
  );
}

/* ══════════════════════════════════════════════════════════════
   SERVICES PAGE
   ══════════════════════════════════════════════════════════════ */
export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ═══════════ HERO ═══════════ */}
      <section className="bg-navy text-white py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(197,160,89,0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <p className="text-gold text-[10px] font-black uppercase tracking-[0.5em] mb-6">Compliance-as-a-Service</p>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold uppercase tracking-tight mb-6">
            Your Compliance. <span className="text-gold">Handled.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-4 leading-relaxed">
            From your first scan to continuous protection &mdash; everything your practice needs to stay
            compliant with Texas SB 1188 and HB 149, without an IT team.
          </p>
          <p className="text-sm text-gold/80 font-bold">
            Scan &rarr; Report &rarr; Remediate &rarr; Monitor. Every purchase includes 3 months of Shield monitoring free.
          </p>
        </div>
      </section>

      {/* ═══════════ STEP 1 — FREE SCAN ═══════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-gold bg-gold/10 px-3 py-1 rounded-full">Step 1 &mdash; Discover</span>
          </div>
          <div className="grid lg:grid-cols-5 gap-12 items-start">
            {/* Left - copy */}
            <div className="lg:col-span-3">
              <h2 className="text-3xl md:text-4xl font-display font-extrabold text-navy mb-2">Free Compliance Scan</h2>
              <p className="text-2xl font-extrabold text-green-600 mb-6">FREE</p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Enter your NPI and website URL. In under 60 seconds, our Check Engine v2 runs plugin-based
                compliance checks and gives you a score with a category-by-category breakdown.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                See your compliance posture instantly &mdash; no signup, no credit card, no commitment.
                The free scan shows your score and which categories need attention, but reserves
                detailed findings and fixes for the full report.
              </p>
              <ul className="space-y-3 mb-8">
                <Check>Check Engine v2 &mdash; plugin-based compliance scanning</Check>
                <Check>NPI Integrity verification (registry vs. website cross-check)</Check>
                <Check>Score + risk level (Sovereign / Drift / Violation)</Check>
                <Check>Category scores: Data Residency, AI Transparency, Clinical Integrity</Check>
                <Check>Data border summary (US vs. foreign endpoints)</Check>
              </ul>
              <Link href="/scan">
                <button className="bg-orange text-white font-bold text-lg px-8 py-4 rounded-lg hover:bg-orange-dark transition-colors">Run Free Scan</button>
              </Link>
            </div>

            {/* Right - mockup card */}
            <div className="lg:col-span-2">
              <div className="bg-navy text-white rounded-2xl p-6 shadow-2xl border border-gold/20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gold">KairoLogic Scan Results</span>
                  <span className="text-[8px] font-mono text-gray-400">SENTRY-3.1.0</span>
                </div>
                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400 mb-1">Compliance Score</p>
                  <p className="text-5xl font-extrabold text-gold">62<span className="text-xl text-gray-400">/100</span></p>
                  <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest bg-orange/20 text-orange px-3 py-1 rounded-full">Drift</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Data Residency</span><span className="text-green-400">3/4 pass</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">AI Transparency</span><span className="text-orange">2/4 pass</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Clinical Integrity</span><span className="text-orange">2/4 pass</span></div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-4 pt-4 border-t border-white/10">Full report with remediation starts at $149</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STEP 2 — AUDIT REPORT ═══════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-gold bg-gold/10 px-3 py-1 rounded-full">Step 2 &mdash; Fix</span>
          </div>
          <div className="grid lg:grid-cols-5 gap-12 items-start">
            <div className="lg:col-span-3">
              <h2 className="text-3xl md:text-4xl font-display font-extrabold text-navy mb-2">Sovereignty Audit Report</h2>
              <p className="text-2xl font-extrabold text-navy mb-1">$149<span className="text-base font-normal text-gray-500">/report</span></p>
              <p className="text-sm text-green-600 font-bold mb-6">+ 3 months Sentry Shield monitoring FREE</p>
              <p className="text-gray-600 leading-relaxed mb-4">
                A professional, audit-defensible PDF with every finding mapped to the specific Texas statute,
                a complete data border map, and an <strong>exact remediation roadmap</strong> your web developer can act on immediately.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                This is the document you hand to your developer, your hosting provider, or your MSP.
                It tells them exactly what&apos;s wrong, where it is, and how to fix it &mdash; no guesswork.
              </p>
              <ul className="space-y-3 mb-8">
                <Check>Full Check Engine v2 forensic analysis with per-check findings</Check>
                <Check>NPI Integrity report &mdash; side-by-side registry vs. website comparison</Check>
                <Check>Professional branded PDF with statute clause mapping</Check>
                <Check>Data border map with IP geolocation for every endpoint</Check>
                <Check>Remediation roadmap &mdash; priority-sorted with technical fixes</Check>
                <Check>Audit-defensible evidence for regulators &amp; insurers</Check>
                <Check>3 months Sentry Shield included (dashboard + drift alerts)</Check>
              </ul>
              <div className="flex flex-wrap gap-4">
                <Link href="/scan">
                  <button className="bg-orange text-white font-bold text-lg px-8 py-4 rounded-lg hover:bg-orange-dark transition-colors">Get My Report</button>
                </Link>
                <Link href="/sample-report.pdf">
                  <button className="border-2 border-orange text-orange font-bold text-lg px-6 py-4 rounded-lg hover:bg-orange/10 transition-colors">Preview a sample report (PDF)</button>
                </Link>
              </div>
            </div>

            {/* Report mockup */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-navy">KAIROLOGIC</span>
                  <span className="text-[8px] font-mono text-gray-400">Statutory Audit Report</span>
                </div>
                <p className="text-[9px] text-gray-400 mb-4">Report ID: KL-SAR-2X7F &bull; Feb 2026</p>
                <div className="text-center mb-4">
                  <p className="text-5xl font-extrabold text-navy">92</p>
                  <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-700 px-3 py-1 rounded-full">LOW RISK</span>
                  <p className="text-[9px] text-gray-400 mt-1">Post-remediation score</p>
                </div>
                <div className="space-y-2 text-xs border-t pt-3">
                  <div className="flex justify-between"><span className="font-mono text-gray-500">DR-01 IP Geo-Location</span><span className="text-green-600 font-bold">PASS</span></div>
                  <div className="flex justify-between"><span className="font-mono text-gray-500">DR-02 CDN Analysis</span><span className="text-green-600 font-bold">PASS</span></div>
                  <div className="flex justify-between"><span className="font-mono text-gray-500">AI-01 AI Disclosure</span><span className="text-orange font-bold">WARN</span></div>
                  <div className="flex justify-between"><span className="font-mono text-gray-500">ER-01 EHR Portal Security</span><span className="text-green-600 font-bold">PASS</span></div>
                </div>
                <div className="mt-4 pt-3 border-t space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600"><Wrench size={14} className="text-gold" /> Remediation Roadmap <span className="text-gray-400">3 items &bull; Priority-sorted with technical fixes</span></div>
                  <div className="flex items-center gap-2 text-xs text-gray-600"><Globe size={14} className="text-gold" /> Data Border Map <span className="text-gray-400">{'\uD83C\uDDFA\uD83C\uDDF8'} 10 US {'\uD83C\uDF0D'} 3 foreign</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STEP 2B — SAFE HARBOR ═══════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-gold bg-gold/10 px-3 py-1 rounded-full">Step 2B &mdash; Remediate</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-navy mb-2">Safe Harbor&trade; Bundle</h2>
          <p className="text-2xl font-extrabold text-navy mb-1">$249<span className="text-base font-normal text-gray-500">/one-time</span></p>
          <p className="text-sm text-green-600 font-bold mb-2">+ 3 months Sentry Shield monitoring FREE</p>
          <p className="text-sm text-gray-500 mb-6">Includes everything in Audit Report</p>
          <p className="text-gray-600 leading-relaxed mb-4">
            The Audit Report tells you what&apos;s wrong. Safe Harbor&trade; gives you <strong>everything you need to fix it</strong> &mdash;
            pre-written policies, copy-paste code, staff training, and an implementation blueprint.
            Zero research. Zero writing. Just implement. Plus, your Shield trial includes a live 7-tab compliance dashboard to track remediation progress.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Designed for practice managers without legal or IT backgrounds.
            Every deliverable is ready to use &mdash; no customization required.
          </p>
          <Link href="/scan">
            <button className="bg-orange text-white font-bold text-lg px-8 py-4 rounded-lg hover:bg-orange-dark transition-colors mb-12">Get Safe Harbor Bundle</button>
          </Link>

          {/* Bundle cards */}
          <h3 className="text-xl font-bold text-navy mb-6">What&apos;s in the Bundle</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <ClipboardList size={24} />, title: 'SB 1188 Policy Pack', sub: 'Formalize data residency rules', desc: 'A board-ready "Data Sovereignty Policy" manual that mandates U.S.-based PHI processing.' },
              { icon: <Bot size={24} />, title: 'AI Disclosure Kit', sub: 'Meet HB 149 transparency laws', desc: 'Copy-and-paste code snippets and text for "clear and conspicuous" AI notifications.' },
              { icon: <FolderOpen size={24} />, title: 'Evidence Ledger', sub: 'Prepare for state inspectors', desc: 'Structured templates to document your digital supply chain and vendor locations.' },
              { icon: <GraduationCap size={24} />, title: 'Staff Training Guide', sub: 'Prevent human error', desc: 'A 15-minute training checklist so staff don\'t inadvertently move PHI offshore.' },
              { icon: <Calendar size={24} />, title: 'Annual Compliance Roadmap', sub: 'Maintain long-term standing', desc: 'A compliance calendar telling you exactly what to check and when.' },
              { icon: <Wrench size={24} />, title: 'Implementation Blueprint', sub: 'Eliminate uncertainty', desc: 'Step-by-step instructions on where to place each disclosure and how to file each policy.' },
            ].map((item, i) => (
              <div key={i} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="text-gold mb-3">{item.icon}</div>
                <h4 className="font-bold text-navy mb-1">{item.title}</h4>
                <p className="text-xs text-gold font-semibold mb-2">{item.sub}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ STEP 3 — SENTRY SHIELD ═══════════ */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-gold bg-gold/10 px-3 py-1 rounded-full">Step 3 &mdash; Monitor</span>
          </div>
          <div className="grid lg:grid-cols-5 gap-12 items-start">
            <div className="lg:col-span-3">
              <h2 className="text-3xl md:text-4xl font-display font-extrabold mb-2">Sentry Shield &mdash; Continuous Compliance</h2>
              <p className="text-2xl font-extrabold text-gold mb-1">$79<span className="text-base font-normal text-gray-400">/month</span></p>
              <p className="text-sm text-green-400 font-bold mb-6">Includes free Audit Report</p>
              <p className="text-gray-300 leading-relaxed mb-4">
                Fixes don&apos;t stay fixed. Plugin updates, hosting changes, and new third-party scripts
                can silently break your compliance overnight. Sentry Shield keeps you protected around the clock.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                Proof of <strong className="text-white">ongoing diligence</strong> &mdash; not just a one-time fix.
                This is the evidence that tells regulators and insurers you take compliance seriously, every day.
              </p>

              <h3 className="text-lg font-bold text-gold mb-4">Everything You Need</h3>
              <ul className="space-y-3 mb-8">
                {[
                  'Free Sovereignty Audit Report (Check Engine v2)',
                  '24/7 continuous compliance monitoring',
                  'Shield Dashboard \u2014 7 views: Overview, NPI Integrity, Data Border Map, Drift Monitor, Scan History, Documents, Settings',
                  '\u201CData & AI Trust\u201D website badge with interactive trust pane',
                  'NPI Integrity monitoring (registry-to-website drift detection)',
                  'Compliance drift alerts',
                  'Automated monthly re-scans',
                  'Patient verification page \u2014 patients can verify your compliance',
                  'Quarterly forensic reports',
                  'Annual certification seal',
                  'Priority support',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
                    <span className={i < 5 ? 'font-semibold text-white' : 'text-gray-300'}>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 space-y-3">
                <a href="https://buy.stripe.com/aFa3cv3OW4Y54kJ3057Re06" target="_blank"
                   className="block w-full bg-orange text-white font-bold text-lg px-8 py-4 rounded-lg hover:bg-orange-dark transition-colors text-center">
                  Subscribe to Shield
                </a>
                <p className="text-xs text-gray-500 text-center">$79/month · Cancel anytime · Secure checkout via Stripe</p>
                <a href="/shield-demo.html" target="_blank"
                   className="block text-center text-sm text-gold underline hover:text-white transition-colors">
                  View Sample Dashboard →
                </a>
              </div>
            </div>
              {/* Dashboard mockup — UPDATED */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gold">Sentry Shield Dashboard</span>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full">LIVE</span>
                </div>

                {/* Score + categories */}
                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400 mb-1">Compliance Score</p>
                  <p className="text-4xl font-extrabold text-gold">98<span className="text-lg text-gray-500">%</span></p>
                  <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full">Sovereign</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] mb-4">
                  <div className="bg-white/5 rounded-lg p-2 text-center"><span className="text-green-400">{'\u2713'}</span> NPI Integrity</div>
                  <div className="bg-white/5 rounded-lg p-2 text-center"><span className="text-green-400">{'\u2713'}</span> Data Border</div>
                  <div className="bg-white/5 rounded-lg p-2 text-center"><span className="text-green-400">{'\u2713'}</span> AI Transparency</div>
                  <div className="bg-white/5 rounded-lg p-2 text-center"><span className="text-green-400">{'\u2713'}</span> Clinical Integrity</div>
                </div>

                {/* Mini chart placeholder */}
                <div className="h-12 mb-4 flex items-end gap-1">
                  {[60,65,70,72,78,82,88,90,93,95,96,98].map((v, i) => (
                    <div key={i} className="flex-1 bg-gold/40 rounded-t" style={{ height: `${v * 0.45}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[8px] text-gray-500 mb-4">
                  <span>Jan</span><span>Mar</span><span>Jun</span><span>Now</span>
                </div>

                {/* Activity feed — UPDATED */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-400"><Activity size={12} className="text-green-400" /> <span className="text-gray-500">2h ago</span> Check Engine re-scan &mdash; 98% sovereign</div>
                  <div className="flex items-center gap-2 text-gray-400"><AlertTriangle size={12} className="text-orange" /> <span className="text-gray-500">3d ago</span> NPI-02 name mismatch detected &rarr; alerted</div>
                  <div className="flex items-center gap-2 text-gray-400"><Globe size={12} className="text-gold" /> <span className="text-gray-500">1w ago</span> Data border map updated &mdash; all endpoints domestic</div>
                </div>
                <p className="text-[9px] text-gray-600 mt-4 pt-3 border-t border-white/10 text-center">Next scan in 6 days &bull; 7 dashboard views active</p>
              </div>
            </div>
          </div>

          {/* Shield trial note */}
          <div className="mt-16 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-3">Already buying a Report or Safe Harbor?</h3>
            <p className="text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Every Audit Report ($149) and Safe Harbor Bundle ($249) purchase includes <strong className="text-white">3 months of Sentry Shield monitoring FREE</strong>.
              After your trial, continue at $79/mo, switch to basic monitoring at $39/mo, or cancel anytime.
            </p>
            <div className="mt-6 inline-flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-full px-6 py-2">
              <span className="text-3xl font-extrabold text-gold">90 days</span>
              <span className="text-sm text-gray-300">FREE Shield</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ VERIFICATION MATRIX ═══════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-navy mb-4 text-center">
            The KairoLogic Verification Matrix
          </h2>
          <p className="text-center text-gray-500 mb-12">See exactly what you get at each level. Every tier builds on the last.</p>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="text-left p-4 font-bold">Feature / Protection</th>
                  <th className="p-4 text-center font-bold">Free Scan</th>
                  <th className="p-4 text-center font-bold">Report<br/><span className="text-gold text-xs">$149</span></th>
                  <th className="p-4 text-center font-bold">Safe Harbor<br/><span className="text-gold text-xs">$249</span></th>
                  <th className="p-4 text-center font-bold bg-gold/20">Shield<br/><span className="text-gold text-xs">$79/mo</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Risk Identification', 'Basic', 'Forensic', 'Forensic', 'Continuous'],
                  ['Compliance Score + Breakdown', '\u2713', '\u2713', '\u2713', '\u2713'],
                  ['NPI Integrity Check', 'Basic', '\u2713 Full', '\u2713 Full', '\u2713 Continuous'],
                  ['Category Scores (3 domains)', '\u2713', '\u2713', '\u2713', '\u2713'],
                  ['Individual Finding Details', '\u2014', '\u2713', '\u2713', '\u2713'],
                  ['Remediation Roadmap', '\u2014', '\u2713', '\u2713 Full Kit', '\u2713'],
                  ['Data Border Map (Full)', 'Summary', '\u2713 Full', '\u2713 Full', '\u2713 Full'],
                  ['Professional PDF Report', '\u2014', '\u2713', '\u2713', '\u2713 + Quarterly'],
                  ['Statutory Clause Mapping', '\u2014', '\u2713', '\u2713', '\u2713'],
                  ['SB 1188 Policy Pack', '\u2014', '\u2014', '\u2713', '\u2014'],
                  ['AI Disclosure Kit (Code + Copy)', '\u2014', '\u2014', '\u2713', '\u2014'],
                  ['Evidence Ledger Templates', '\u2014', '\u2014', '\u2713', '\u2014'],
                  ['Staff Training Guide', '\u2014', '\u2014', '\u2713', '\u2014'],
                  ['Implementation Blueprint', '\u2014', '\u2014', '\u2713', '\u2014'],
                  ['3 Months Shield Monitoring', '\u2014', '\u2713 FREE', '\u2713 FREE', '\u2713'],
                  ['Compliance Drift Alerts', '\u2014', '\u2713 Trial', '\u2713 Trial', '\u2713'],
                  ['Shield Dashboard (7 tabs)', '\u2014', '\u2713 Trial', '\u2713 Trial', '\u2713 Full'],
                  ['\u201CData & AI Trust\u201D Badge', '\u2014', '\u2713 Trial', '\u2713 Trial', '\u2713 Full'],
                  ['Patient Verification Page', '\u2014', '\u2014', '\u2014', '\u2713'],
                  ['Automated Re-Scans', '\u2014', '\u2713 Trial', '\u2713 Trial', 'Monthly'],
                  ['Quarterly Forensic Reports', '\u2014', '\u2014', '\u2014', '\u2713'],
                  ['Annual Certification Seal', '\u2014', '\u2014', '\u2014', '\u2713'],
                  ['Priority Support', '\u2014', '\u2014', '\u2014', '\u2713'],
                  ['Liability Defense Level', 'None', 'Strong', 'Maximum', 'Maximum + Ongoing'],
                ].map(([feature, ...tiers], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 font-medium text-navy">{feature}</td>
                    {tiers.map((val, j) => (
                      <td key={j} className={`p-3 text-center ${j === 3 ? 'bg-gold/5 font-semibold' : ''} ${val === '\u2713' ? 'text-green-600' : val === '\u2014' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-display font-extrabold text-navy mb-8 text-center">Common Questions</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8">
            <FAQItem question="Why do I need the Report if the scan is free?">
              <p>
                The free scan tells you your score and which categories need work. The Report tells you
                exactly what&apos;s wrong, maps each finding to the specific law, and gives your developer the
                exact technical steps to fix it. Think of the scan as the thermometer &mdash; the report is the
                prescription. Plus, every Report purchase includes 3 months of Sentry Shield monitoring free.
              </p>
            </FAQItem>
            <FAQItem question="Why do I need Safe Harbor if I have the Report?">
              <p>
                The Report tells you what&apos;s broken. Safe Harbor gives you the ready-made materials to fix it &mdash;
                pre-written policies, AI disclosure code, evidence templates, and staff training. Think of it
                this way: the Report is the inspection, Safe Harbor is the repair kit. Both include 3 months
                of Shield monitoring free.
              </p>
            </FAQItem>
            <FAQItem question="What happens after the 3-month Shield trial?">
              <p>
                After your 90-day free trial, you can continue Sentry Shield at $79/month for full
                enterprise-grade monitoring (dashboard, quarterly reports, certification seal), switch to
                basic Sentry Watch at $39/month (monthly scans and drift alerts), or cancel entirely.
                You&apos;ll get advance notice before the trial ends so there are no surprises.
              </p>
            </FAQItem>
            <FAQItem question="Is Sentry Shield worth $79/month?">
              <p>
                If your website updates, a plugin changes its data routing, or a new AI tool is added,
                your compliance status changes instantly. Sentry Shield gives you a 7-tab live dashboard
                (including NPI Integrity monitoring and Data Border mapping), a &ldquo;Data &amp; AI Trust&rdquo; badge for
                your website, and a patient verification page &mdash; plus quarterly forensic reports and the
                Annual Sovereignty Certification.
              </p>
            </FAQItem>
            <FAQItem question="Can I just fix things once and be done?">
              <p>
                You can &mdash; the $149 Report (which includes 3 months of free monitoring) gives you
                everything to fix current issues. But compliance is a moving target. WordPress updates,
                hosting changes, new third-party scripts, and regulatory changes can all silently break
                your compliance. Most practices that fix once find themselves non-compliant again within 3-6 months.
              </p>
            </FAQItem>
            <FAQItem question="What if I don't have a web developer?">
              <p>
                The Remediation Roadmap in your Report is written clearly enough that you can hand it to
                any hosting provider (GoDaddy, Squarespace, Wix support) and they can act on it. For
                complex cases, we can recommend vetted partners.
              </p>
            </FAQItem>
          </div>
        </div>
      </section>

      {/* ═══════════ PENALTY CTA ═══════════ */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-gold uppercase tracking-widest font-bold mb-4">The math is simple</p>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold mb-6">
            $79/month vs. <span className="text-orange">$50,000+</span> per violation
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Texas SB 1188 carries civil penalties up to $50,000 per violation, with potential criminal
            prosecution for willful non-compliance. A data breach involving foreign-routed PHI can exceed
            $250,000 in combined penalties, legal fees, and reputational damage.
          </p>
          <p className="text-gray-400 mb-10">
            Sentry Shield costs less than one hour of healthcare compliance attorney time &mdash; every month.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-3xl font-extrabold text-orange">$50K+</p>
              <p className="text-sm text-gray-400 mt-1">Per-violation fine</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-3xl font-extrabold text-orange">$250K+</p>
              <p className="text-sm text-gray-400 mt-1">Data breach cost</p>
            </div>
            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-6">
              <p className="text-3xl font-extrabold text-gold">$79/mo</p>
              <p className="text-sm text-gray-300 mt-1">Sentry Shield</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-display font-extrabold mb-4">Not Sure Which Tier You Need?</h2>
          <p className="text-xl mb-8 opacity-90">
            Start with a free scan. The Sentry engine will assess your compliance posture and prescribe
            the right roadmap for your practice.
          </p>
          <Link href="/scan">
            <button className="bg-orange text-white font-bold text-lg px-10 py-5 rounded-lg hover:bg-orange-dark transition-colors shadow-xl">
              Run My Free Scan
            </button>
          </Link>
          <p className="text-sm mt-4 opacity-80">30 seconds. No signup. No credit card.</p>
        </div>
      </section>
    </div>
  );
}
