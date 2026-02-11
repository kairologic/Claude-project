'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Search, FileText, Eye, AlertTriangle, CheckCircle, ArrowRight, Zap, Clock, DollarSign, Users, Lock, Activity, Play, X } from 'lucide-react';

export default function HomePage() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-screen bg-white">

      {/* ═══ HERO ═══ */}
      <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy-dark text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange/5 rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20 pb-16">
          {/* Audience tag */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-300 text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-full">
              <AlertTriangle size={14} />
              New Texas law — most healthcare websites are not compliant
            </span>
          </div>

          {/* Primary message — immediately clear */}
          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl font-display font-extrabold leading-tight mb-6">
            Your Practice Website May Be{' '}
            <span className="text-gold">Breaking Texas Law</span>
          </h1>

          {/* Sub message — plain English, specific */}
          <p className="text-center text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-3 leading-relaxed">
            Texas SB 1188 requires healthcare providers to keep patient data inside the US. Most practice websites unknowingly send data to servers in Ireland, Singapore, and beyond — through Google Fonts, analytics, chatbots, and scheduling tools.
          </p>
          <p className="text-center text-base text-red-300 font-semibold mb-10">
            Fines up to $50,000 per violation. Free scan takes 30 seconds.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/scan">
              <button className="btn-primary text-lg px-10 py-4 flex items-center gap-2 shadow-xl shadow-orange/20">
                <Search size={20} />
                SCAN MY PRACTICE — FREE
              </button>
            </Link>
            <button
              onClick={() => setShowVideo(true)}
              className="bg-white/10 border-2 border-white/20 hover:border-gold hover:bg-gold/10 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-200 flex items-center gap-2 justify-center">
              <Play size={18} className="text-gold" />
              Watch How It Works
              <span className="text-xs text-gray-400 ml-1">(1 min)</span>
            </button>
          </div>

          {/* 3-step visual — brief preview */}
          <div className="grid md:grid-cols-3 gap-0 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Scan',
                desc: 'Free 30-second scan of your website',
                icon: <Search size={18} />,
                color: 'bg-blue-500/20 text-blue-400',
                connector: true,
              },
              {
                step: '2',
                title: 'Fix',
                desc: 'Get your report + ready-made fixes',
                icon: <FileText size={18} />,
                color: 'bg-orange/20 text-orange',
                connector: true,
              },
              {
                step: '3',
                title: 'Monitor',
                desc: '24/7 protection — 3 months free',
                icon: <Shield size={18} />,
                color: 'bg-green-500/20 text-green-400',
                connector: false,
              },
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center px-4 py-6">
                {item.connector && (
                  <div className="hidden md:block absolute top-1/2 right-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-4 z-0" />
                )}
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-3 relative z-10`}>
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Step {item.step}</div>
                <div className="font-display font-bold text-lg mb-1">{item.title}</div>
                <div className="text-sm text-gray-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VIDEO MODAL ═══ */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowVideo(false)}>
          <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white hover:text-gold transition-colors">
              <X size={28} />
            </button>
            <div className="bg-navy rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {/* 
                TODO: Replace this placeholder with your actual video embed.
                Options:
                  - YouTube: <iframe src="https://www.youtube.com/embed/YOUR_VIDEO_ID" ...>
                  - Vimeo:   <iframe src="https://player.vimeo.com/video/YOUR_VIDEO_ID" ...>
                  - Loom:    <iframe src="https://www.loom.com/embed/YOUR_VIDEO_ID" ...>
                  - Self-hosted: <video src="/videos/demo.mp4" controls autoPlay />
              */}
              <div className="aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-navy to-navy-dark p-12">
                <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mb-6">
                  <Play size={36} className="text-gold ml-1" />
                </div>
                <h3 className="text-white text-2xl font-display font-bold mb-2">Product Demo Coming Soon</h3>
                <p className="text-gray-400 text-sm max-w-md text-center mb-6">
                  A 1-minute walkthrough showing how to scan your practice, read your report, and monitor your compliance with Sentry Shield.
                </p>
                <Link href="/scan" onClick={() => setShowVideo(false)}>
                  <button className="btn-primary px-8 py-3 flex items-center gap-2">
                    <Search size={16} />
                    Try a Free Scan Now Instead
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ THE PROBLEM — Why this matters ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-heading">
              Why <span className="text-gold">Most Healthcare Websites</span> Fail
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              It&apos;s not about hacking — it&apos;s about where your website sends patient data without you knowing.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <AlertTriangle className="text-red-500" size={28} />,
                title: 'Your Site Sends Data Overseas',
                detail: 'Google Fonts, analytics, CDNs, and scheduling widgets route patient-identifying data through servers in Ireland, Singapore, and beyond — silently, on every page load.',
                stat: '73%',
                statLabel: 'of healthcare sites fail',
              },
              {
                icon: <Eye className="text-amber-500" size={28} />,
                title: 'Your AI Isn\'t Disclosing Itself',
                detail: 'Chatbots, AI scheduling, automated forms — Texas HB 149 requires clear disclosure when AI interacts with patients. Almost no one does this.',
                stat: '89%',
                statLabel: 'lack AI disclosure',
              },
              {
                icon: <DollarSign className="text-green-500" size={28} />,
                title: 'Enforcement Has Started',
                detail: 'SB 1188 carries penalties up to $50,000 per violation. A single data breach involving foreign-routed PHI can trigger six-figure liability.',
                stat: '$50K',
                statLabel: 'per violation',
              },
            ].map((card, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <div className="mb-4">{card.icon}</div>
                <h3 className="text-lg font-display font-bold text-navy mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{card.detail}</p>
                <div className="border-t border-gray-200 pt-3">
                  <span className="text-2xl font-display font-black text-navy">{card.stat}</span>
                  <span className="text-xs text-gray-400 ml-2 uppercase tracking-wider">{card.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — with video CTA ═══ */}
      <section id="how-it-works" className="py-20 bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Three Steps to <span className="text-gold">Compliance</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              From vulnerability to verified — no IT team required.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                step: '01',
                title: 'Free Scan',
                desc: 'Enter your NPI and website URL. In 30 seconds, our Sentry engine checks 12 compliance points and shows you exactly where patient data is going.',
                icon: <Search size={24} />,
                color: 'from-blue-500 to-indigo-500',
              },
              {
                step: '02',
                title: 'Get Your Report + Fixes',
                desc: 'Download a forensic PDF with every issue mapped to the specific Texas statute, plus a remediation roadmap your developer can follow. Or get the Safe Harbor bundle with ready-made policies and templates.',
                icon: <FileText size={24} />,
                color: 'from-orange to-amber-500',
              },
              {
                step: '03',
                title: 'Stay Protected',
                desc: 'Sentry Shield monitors your site 24/7, catching compliance drift before it becomes a violation. Every report purchase includes 3 months free.',
                icon: <Shield size={24} />,
                color: 'from-green-500 to-emerald-500',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} mb-4`}>
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-gold uppercase tracking-widest mb-2">Step {item.step}</div>
                <h3 className="text-xl font-display font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Video CTA */}
          <div className="text-center">
            <button
              onClick={() => setShowVideo(true)}
              className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all">
              <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                <Play size={18} className="text-gold ml-0.5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Watch the 1-Minute Demo</div>
                <div className="text-xs text-gray-400">See a real scan → report → dashboard walkthrough</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { stat: '481K+', label: 'TX providers in registry', icon: <Users size={20} className="text-gold" /> },
              { stat: '12', label: 'compliance checks', icon: <CheckCircle size={20} className="text-green-500" /> },
              { stat: '<30s', label: 'scan time', icon: <Clock size={20} className="text-blue-500" /> },
              { stat: '24/7', label: 'drift monitoring', icon: <Activity size={20} className="text-orange" /> },
            ].map((item, i) => (
              <div key={i} className="text-center py-4">
                <div className="flex justify-center mb-2">{item.icon}</div>
                <div className="text-2xl md:text-3xl font-display font-black text-navy">{item.stat}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-heading">
              Simple, <span className="text-gold">Transparent</span> Pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every purchase includes 3 months of Sentry Shield monitoring — free.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

            {/* Audit Report — $149 */}
            <div className="border-2 border-gray-200 rounded-2xl p-7 hover:border-gold transition-colors relative">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">One-Time</div>
              <h3 className="text-xl font-display font-bold text-navy mb-2">Audit Report</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-display font-black text-navy">$149</span>
                <span className="text-gray-400 text-sm">/report</span>
              </div>
              <div className="text-xs text-green-600 font-bold mb-4">+ 3 months Sentry Shield FREE</div>
              <p className="text-gray-500 text-sm mb-6">
                Know exactly where you stand and what to fix.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  'Full 12-point forensic scan',
                  'Professional PDF report',
                  'Data border map with IP geolocation',
                  'Remediation roadmap with tech fixes',
                  'SB 1188 & HB 149 statute mapping',
                  '3 months Shield monitoring included',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/scan">
                <button className="w-full bg-navy hover:bg-navy-light text-white font-semibold py-3 rounded-lg transition-colors">
                  Get My Report
                </button>
              </Link>
              <a href="/sample-report.pdf" target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-gold hover:text-gold-light mt-2 underline underline-offset-2">
                Preview sample report
              </a>
            </div>

            {/* Safe Harbor — $249 */}
            <div className="border-2 border-orange rounded-2xl p-7 relative shadow-xl shadow-orange/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                Most Popular
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-orange mb-4">One-Time</div>
              <h3 className="text-xl font-display font-bold text-navy mb-2">Safe Harbor&trade;</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-display font-black text-navy">$249</span>
                <span className="text-gray-400 text-sm">/bundle</span>
              </div>
              <div className="text-xs text-green-600 font-bold mb-4">+ 3 months Sentry Shield FREE</div>
              <p className="text-gray-500 text-sm mb-6">
                Everything to fix it — policies, disclosures, and training.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  'Everything in Audit Report',
                  'SB 1188 Policy Pack',
                  'AI Disclosure Kit (copy-paste code)',
                  'Evidence Ledger Templates',
                  'Staff Training Guide',
                  'Implementation Blueprint',
                  '3 months Shield monitoring included',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/scan">
                <button className="w-full btn-primary py-3 text-base">
                  Get Safe Harbor
                </button>
              </Link>
              <a href="/sample-report.pdf" target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-orange hover:text-orange-dark mt-2 underline underline-offset-2">
                Preview sample report
              </a>
            </div>

            {/* Sentry Shield — $79/mo */}
            <div className="border-2 border-green-500 rounded-2xl p-7 relative shadow-lg shadow-green-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                Ongoing Protection
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-green-600 mb-4">Monthly</div>
              <h3 className="text-xl font-display font-bold text-navy mb-2">Sentry Shield</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-display font-black text-navy">$79</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <div className="text-xs text-green-600 font-bold mb-4">Includes free Audit Report</div>
              <p className="text-gray-500 text-sm mb-6">
                24/7 monitoring. Never fall out of compliance.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  'Free Sovereignty Audit Report',
                  '24/7 continuous monitoring',
                  'Live compliance dashboard',
                  'Website compliance widget',
                  'Quarterly forensic reports',
                  'Annual certification seal',
                  'Priority support',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/scan">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors">
                  Start Monitoring
                </button>
              </Link>
              <p className="text-center text-xs text-gray-400 mt-3">Cancel anytime. No long-term contracts.</p>
            </div>
          </div>

          {/* Cost comparison callout */}
          <div className="mt-12 max-w-3xl mx-auto bg-navy/5 border border-navy/10 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600">
              <strong className="text-navy">$79/month</strong> vs. <strong className="text-red-600">$50,000+</strong> per compliance violation.{' '}
              <span className="text-gray-500">That&apos;s 0.16% of the cost of a single fine — to make sure it never happens.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHO IT'S FOR ═══ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-heading">
              Built for Texas <span className="text-gold">Healthcare</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Activity size={20} />, title: 'Medical Practices', desc: 'Solo and group practices with patient-facing websites' },
              { icon: <Users size={20} />, title: 'Dental Offices', desc: 'Online scheduling, patient portals, and practice sites' },
              { icon: <Shield size={20} />, title: 'Mental Health', desc: 'Therapy practices handling sensitive behavioral health data' },
              { icon: <Eye size={20} />, title: 'Specialty Clinics', desc: 'Dermatology, orthopedics, optometry, and more' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gold transition-colors">
                <div className="w-10 h-10 bg-navy/5 rounded-lg flex items-center justify-center mb-3 text-navy">
                  {item.icon}
                </div>
                <h3 className="font-display font-bold text-navy text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 bg-navy">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-white">
            Don&apos;t Wait for a Regulator to Find Out First
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
            Run a free compliance scan right now. 30 seconds, no signup, no credit card — and you&apos;ll know exactly where your practice stands.
          </p>
          <Link href="/scan">
            <button className="btn-primary text-lg px-10 py-4 flex items-center gap-2 mx-auto shadow-xl shadow-orange/20">
              <Shield size={22} />
              SCAN MY PRACTICE — FREE
            </button>
          </Link>
          <p className="text-xs text-gray-500 mt-4">
            Full report with remediation starts at $149. Every purchase includes 3 months of monitoring free.
          </p>
        </div>
      </section>
    </div>
  );
}
