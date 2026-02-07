'use client';

import Link from 'next/link';
import { Shield, Search, FileText, Eye, AlertTriangle, CheckCircle, ArrowRight, Zap, Clock, DollarSign, Users, Lock, Activity } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* ═══ HERO — Above the fold ═══ */}
      <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy-dark text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange/5 rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20 pb-16">
          {/* Audience tag */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-gold text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-full">
              <Users size={14} />
              Built for small &amp; medium medical practices without dedicated IT staff
            </span>
          </div>

          {/* Primary message */}
          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl font-display font-extrabold leading-tight mb-6">
            Know Your Risk. Fix It.{' '}
            <span className="text-gold">Stay Protected.</span>
          </h1>

          {/* Sub message */}
          <p className="text-center text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-4 leading-relaxed">
            Run a compliance risk scan on your practice website, get expert-backed guidance to fix what&apos;s wrong, and continuously monitor your site so issues never come back.
          </p>
          <p className="text-center text-sm text-gray-500 mb-10">
            Texas SB 1188 &amp; HB 149 compliance — no IT team required.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/scan">
              <button className="btn-primary text-lg px-10 py-4 flex items-center gap-2 shadow-xl shadow-orange/20">
                <Search size={20} />
                SCAN MY PRACTICE — FREE
              </button>
            </Link>
            <Link href="#how-it-works">
              <button className="bg-white/10 border-2 border-white/20 hover:border-gold hover:bg-gold/10 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-200 flex items-center gap-2">
                See How It Works
                <ArrowRight size={18} />
              </button>
            </Link>
          </div>

          {/* 3-step visual */}
          <div className="grid md:grid-cols-3 gap-0 max-w-4xl mx-auto">
            {[
              { step: '1', icon: <Search size={24} />, title: 'Scan', desc: 'Instant risk assessment of your website infrastructure', color: 'text-orange' },
              { step: '2', icon: <FileText size={24} />, title: 'Fix', desc: 'Get a detailed report with exact steps to remediate', color: 'text-gold' },
              { step: '3', icon: <Eye size={24} />, title: 'Monitor', desc: 'Continuous watching so issues never sneak back', color: 'text-green-400' },
            ].map((s, i) => (
              <div key={i} className="relative text-center px-6 py-5">
                {i < 2 && <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-8 h-[2px] bg-white/20"></div>}
                <div className={`${s.color} mb-3 flex justify-center`}>{s.icon}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Step {s.step}</div>
                <div className="text-lg font-display font-bold text-white mb-1">{s.title}</div>
                <div className="text-sm text-gray-400">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WAKE-UP CALL — "oh, my score is lower than I thought" ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-heading">
              Most Practices <span className="text-orange">Fail</span> Their First Scan
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your website might look fine. But under the hood, patient data could be routing through foreign servers, your CDN might be caching PHI overseas, or your site might lack required AI disclosures.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
                stat: '73%',
                label: 'of practices we scan have foreign data routing',
                detail: 'CDN edge nodes, analytics scripts, and third-party widgets often send patient data outside the US — violating SB 1188.',
              },
              {
                icon: <Lock className="w-8 h-8 text-amber-500" />,
                stat: '89%',
                label: 'lack required AI transparency disclosures',
                detail: 'If your site uses chatbots, scheduling AI, or automated forms, HB 149 requires explicit disclosure to patients.',
              },
              {
                icon: <DollarSign className="w-8 h-8 text-navy" />,
                stat: '$50K',
                label: 'per violation in civil penalties',
                detail: "Texas enforcement is active. Non-compliance isn't theoretical — it's a financial and reputational risk right now.",
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-orange/30 hover:shadow-lg transition-all">
                <div className="mb-4">{item.icon}</div>
                <div className="text-4xl font-display font-black text-navy mb-2">{item.stat}</div>
                <div className="text-sm font-bold text-gray-800 mb-3">{item.label}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/scan">
              <button className="btn-primary text-base px-8 py-3 flex items-center gap-2 mx-auto">
                <Zap size={18} />
                Check My Score — It&apos;s Free
              </button>
            </Link>
            <p className="text-xs text-gray-400 mt-3">Takes 30 seconds. No signup required.</p>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — "I need to fix this properly" ═══ */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-heading">
              Compliance in <span className="text-gold">Three Steps</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              No IT team needed. No jargon. Just clear answers and expert-backed fixes.
            </p>
          </div>

          <div className="space-y-12 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-orange/10 flex items-center justify-center">
                <span className="text-2xl font-display font-black text-orange">1</span>
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-navy mb-2">Scan Your Practice Website</h3>
                <p className="text-gray-600 mb-3">
                  Enter your NPI and website URL. Our engine checks 12 compliance vectors in under 60 seconds — data residency, CDN routing, AI disclosures, EHR integrity, mail server sovereignty, and more.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['IP Geolocation', 'CDN Analysis', 'AI Detection', 'Mail Routing', 'SSL/TLS', 'Third-Party Scripts'].map((tag) => (
                    <span key={tag} className="text-xs bg-navy/5 text-navy/70 px-3 py-1 rounded-full font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gold/20 flex items-center justify-center">
                <span className="text-2xl font-display font-black text-gold-dark">2</span>
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-navy mb-2">Get Your Compliance Report</h3>
                <p className="text-gray-600 mb-3">
                  A professional PDF report with your compliance score, every finding mapped to the specific Texas statute, and <strong>exact technical steps to fix each issue</strong> — written so your web developer or hosting provider can act on it immediately.
                </p>
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-lg border border-emerald-200">
                  <FileText size={16} />
                  Includes remediation roadmap + data border map
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <span className="text-2xl font-display font-black text-green-600">3</span>
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-navy mb-2">Continuous Monitoring</h3>
                <p className="text-gray-600 mb-3">
                  Fixes don&apos;t stay fixed. Plugin updates, hosting changes, new third-party scripts — any of these can silently break your compliance. Our monitoring watches your site continuously and alerts you the moment something drifts.
                </p>
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-lg border border-blue-200">
                  <Activity size={16} />
                  Automated re-scans + instant drift alerts
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY MONITORING — "things can break again" ═══ */}
      <section className="py-16 bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-gold mb-4">The hidden problem</div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 leading-tight">
                Fixing Compliance Once{' '}
                <span className="text-orange">Isn&apos;t Enough</span>
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Your web developer fixes the CDN routing issue today. Next month, a WordPress plugin update re-introduces a foreign analytics script. Your compliance score drops from 92 to 54 — and you don&apos;t know until it&apos;s too late.
              </p>
              <p className="text-gray-300 leading-relaxed mb-8">
                That&apos;s why one-time audits aren&apos;t enough. Compliance is a living system. It needs continuous watching.
              </p>
              <div className="space-y-3">
                {[
                  'Plugin and theme updates can re-introduce foreign scripts',
                  'Hosting provider changes can move data outside the US',
                  'New regulations mean new requirements to track',
                  'Third-party widgets change their infrastructure without notice',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <AlertTriangle size={14} className="text-orange flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-gold/70 mb-2">Without Monitoring</div>
                <div className="text-5xl font-display font-black text-red-400 mb-1">Silent Drift</div>
                <p className="text-sm text-gray-400">Compliance degrades. You find out from a regulator.</p>
              </div>
              <div className="w-full h-[2px] bg-white/10 my-6"></div>
              <div className="text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-gold/70 mb-2">With KairoLogic Monitoring</div>
                <div className="text-5xl font-display font-black text-green-400 mb-1">Always Sovereign</div>
                <p className="text-sm text-gray-400">Instant alerts. Auto re-scans. You sleep easy.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING — "$149 is cheap compared to a fine" ═══ */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-heading">
              Simple, <span className="text-gold">Transparent</span> Pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A fraction of what a single compliance violation could cost you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* One-Time Report */}
            <div className="border-2 border-gray-200 rounded-2xl p-8 hover:border-gold transition-colors relative">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">One-Time</div>
              <h3 className="text-2xl font-display font-bold text-navy mb-2">Compliance Report</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-5xl font-display font-black text-navy">$149</span>
                <span className="text-gray-400 text-sm">/report</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Know exactly where you stand and what to fix.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Full 12-point compliance scan',
                  'Professional PDF report',
                  'Data border map with IP geolocation',
                  'Remediation roadmap with tech fixes',
                  'SB 1188 & HB 149 statute mapping',
                  'Share with your web developer',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/scan">
                <button className="w-full bg-navy hover:bg-navy-light text-white font-semibold py-3 rounded-lg transition-colors">
                  Get My Report
                </button>
              </Link>
            </div>

            {/* Monitoring */}
            <div className="border-2 border-orange rounded-2xl p-8 relative shadow-xl shadow-orange/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                Most Popular
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-orange mb-4">Ongoing</div>
              <h3 className="text-2xl font-display font-bold text-navy mb-2">Compliance Monitoring</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-5xl font-display font-black text-navy">$149</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Fix it once. We make sure it stays fixed.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Compliance Report',
                  'Continuous automated re-scans',
                  'Instant drift alerts via email',
                  'Monthly compliance status reports',
                  'Regulatory update tracking',
                  'Priority support',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/scan">
                <button className="w-full btn-primary py-3 text-base">
                  Start Monitoring
                </button>
              </Link>
              <p className="text-center text-xs text-gray-400 mt-3">Cancel anytime. No long-term contracts.</p>
            </div>
          </div>

          {/* Cost comparison callout */}
          <div className="mt-12 max-w-3xl mx-auto bg-navy/5 border border-navy/10 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600">
              <strong className="text-navy">$149/month</strong> vs. <strong className="text-red-600">$50,000+</strong> per compliance violation.{' '}
              <span className="text-gray-500">That&apos;s 0.3% of the cost of a single fine — to make sure it never happens.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHO IT'S FOR ═══ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-heading">
              Built For Practices <span className="text-gold">Like Yours</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🦷', title: 'Dental Practices', desc: 'Solo and group dental offices managing patient portals and scheduling systems' },
              { icon: '🩺', title: 'Primary Care', desc: 'Family medicine and internal medicine clinics with EHR integrations' },
              { icon: '🧠', title: 'Behavioral Health', desc: 'Therapy and counseling practices handling sensitive PHI' },
              { icon: '👁️', title: 'Specialty Clinics', desc: 'Optometry, dermatology, chiropractic, and other specialty providers' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-display font-bold text-navy mb-2 text-sm">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 max-w-xl mx-auto">
              If you&apos;re a Texas healthcare provider with a website and no full-time IT or compliance team, KairoLogic was built for you.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 bg-gradient-to-br from-navy via-navy-light to-navy-dark text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Don&apos;t Wait for a Regulator to Tell You
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
            Run a free compliance scan right now. It takes 30 seconds, requires no signup, and you&apos;ll know exactly where your practice stands.
          </p>
          <Link href="/scan">
            <button className="btn-primary text-lg px-10 py-4 flex items-center gap-2 mx-auto shadow-xl shadow-orange/20">
              <Shield size={22} />
              RUN MY FREE SCAN
            </button>
          </Link>
          <p className="text-xs text-gray-500 mt-4">
            Free scan includes compliance score + category breakdown. Full report with remediation available for $149.
          </p>
        </div>
      </section>
    </div>
  );
}
