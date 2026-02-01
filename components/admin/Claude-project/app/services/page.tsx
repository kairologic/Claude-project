import Link from 'next/link';

export default function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-orange/20 text-orange px-4 py-2 rounded-full text-sm font-semibold mb-6">
            SB 1188 ENFORCEMENT ACTIVE
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6">
            SOVEREIGN <span className="text-gold">ARCHITECTURE.</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Four specialized protocols engineered for every stage of your compliance journey &mdash; from forensic discovery to fully managed sovereignty.
          </p>
        </div>
      </section>

      {/* Product 1: Sovereignty Audit & Forensic Report */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <span>&#x2696;</span>
                Discovery &amp; Evidence
              </div>
              <h2 className="text-4xl font-display font-bold text-navy mb-6">
                Sovereignty Audit &amp; Forensic Report
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                A comprehensive forensic audit of your digital infrastructure against Texas SB 1188 and HB 149 mandates. The Sentry Probe Engine performs recursive DOM traversal, DNS resolution, IP geolocation, and CDN analysis to map exactly where your patient data touches foreign nodes.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Data Border Mapping', desc: 'Complete endpoint geolocation showing every domestic and foreign data touchpoint' },
                  { title: 'SB 1188 / HB 149 Gap Analysis', desc: 'Violation-by-violation statutory alignment report with clause references' },
                  { title: 'Prioritized Remediation Roadmap', desc: 'Technical fixes ranked by severity, complexity, and statutory penalty risk' },
                  { title: 'Certified PDF Delivery', desc: 'Forensic-grade evidence document suitable for legal counsel and IT handoff' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-navy/5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-navy text-sm">&#x2713;</span>
                    </div>
                    <div>
                      <div className="font-semibold text-navy">{item.title}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 text-lg">&#x1F4C4;</span>
                  </div>
                  <div>
                    <div className="font-bold text-navy text-sm">Forensic Audit Report</div>
                    <div className="text-xs text-gray-500">PDF + JSON Delivery</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {['Data Sovereignty Analysis', 'AI Transparency Audit', 'Clinical Integrity Check', 'NPPES Database Sync', 'Technical Fix Library'].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500 flex-shrink-0">&#x2713;</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Engine: Sentry Probe v3.0 &bull; Texas-Based IP Rotation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product 2: Quick-Fix Blueprint */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200 order-2 lg:order-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100 mb-4">
                <div className="text-xs font-bold text-orange uppercase tracking-widest mb-4">Remediation Package</div>
                <div className="space-y-3">
                  {[
                    { feature: 'Instant Patch Kit', benefit: 'Immediate CSS/Code fixes for AI Transparency violations' },
                    { feature: 'Data Node Rerouting', benefit: 'Step-by-step guide to anchor drifting endpoints to US nodes' },
                    { feature: 'Disclosure Assets', benefit: 'Copy-paste templates for statutory legal disclosures' },
                    { feature: 'Priority Re-Scan', benefit: 'Instant verification of your new Sovereign status' },
                  ].map((item) => (
                    <div key={item.feature} className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                      <span className="text-orange flex-shrink-0 mt-0.5">&#x26A1;</span>
                      <div>
                        <div className="text-sm font-semibold text-navy">{item.feature}</div>
                        <div className="text-xs text-gray-500">{item.benefit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Targeted Fixes &bull; No Full Overhaul Required
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-orange/10 text-orange px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <span>&#x26A1;</span>
                Mid-Tier Bridge
              </div>
              <h2 className="text-4xl font-display font-bold text-navy mb-6">
                Quick-Fix Blueprint&trade;
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Designed for practices that have achieved Substantial Compliance but need to close specific technical gaps without a full architectural overhaul. The Blueprint delivers the exact code, configurations, and disclosure templates to move your score into the Sovereign zone.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Targeted Remediation Scripts', desc: 'Exact CSS blocks, robots.txt configs, and header configurations to prevent OCONUS scraper access' },
                  { title: 'Safe Harbor Checklist', desc: 'Step-by-step verification list -- once checked, your practice is ready for a Sovereignty Re-Scan' },
                  { title: 'API & Webhook Configuration Guide', desc: 'Reroute non-compliant data streams from foreign CDNs to domestic alternatives' },
                  { title: 'Statutory Disclosure Kit', desc: 'Pre-written, legally-aligned disclosure templates for AI Chatbots and Patient Portals meeting HB 149' },
                  { title: 'One-Click Re-Scan Validation Token', desc: 'Trigger the Sentry engine after applying fixes to confirm Sovereign status' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange text-sm">&#x2713;</span>
                    </div>
                    <div>
                      <div className="font-semibold text-navy">{item.title}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product 3: SentryGuard */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <span>&#x1F6E1;</span>
                Continuous Protection
              </div>
              <h2 className="text-4xl font-display font-bold text-navy mb-6">
                SentryGuard&trade;
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Ongoing defense for verified practices. SentryGuard provides 24/7 software monitoring to prevent accidental residency drift, ensuring your compliance status never degrades between audit cycles. Your practice earns the right to display the KairoLogic Trust Seal.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Dynamic Trust Seal', desc: 'Unique-ID website badge that updates in real-time based on your compliance posture' },
                  { title: 'Automated 30-Day Pulse Scans', desc: 'Monthly forensic re-scans to detect and alert you of any compliance drift' },
                  { title: 'Statutory Re-Certification Alerting', desc: 'Proactive notifications when legislative changes affect your compliance standing' },
                  { title: 'Drift Remediation Support', desc: 'Technical guidance and fix recommendations whenever a deviation is detected' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-sm">&#x2713;</span>
                    </div>
                    <div>
                      <div className="font-semibold text-navy">{item.title}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-green-100 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-green-600 text-4xl">&#x1F6E1;</span>
                </div>
                <div className="font-display font-bold text-2xl text-navy mb-1">Sentry Verified</div>
                <div className="text-sm text-gray-500 mb-6">Live Compliance Status</div>
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="text-4xl font-display font-bold text-green-600">98%</div>
                  <div className="text-xs text-green-700 uppercase tracking-wider font-semibold mt-1">Sovereign Compliant</div>
                </div>
                <div className="text-xs text-gray-400">Last Pulse Scan: 12 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product 4: KairoShield */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 order-2 lg:order-1">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10 mb-4">
                <div className="text-xs font-bold text-gold uppercase tracking-widest mb-4">Full-Service Architecture</div>
                <div className="space-y-3">
                  {[
                    'Sovereign Intake & Discovery Session',
                    'Custom Engineering Blueprint',
                    'GCP Dallas/Austin Node Provisioning',
                    'CDN Reconfiguration & DNS Migration',
                    'AI Disclosure Implementation',
                    'Sentry Widget Installation & Monitoring',
                    'Quarterly Forensic Security Audits',
                    'Managed HB 149 Statutory Updates',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-gold flex-shrink-0">&#x2713;</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center text-xs text-gray-500 uppercase tracking-wider font-semibold">
                White-Glove &bull; Managed Sovereign Hosting
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <span>&#x1F5A5;</span>
                Enterprise Grade
              </div>
              <h2 className="text-4xl font-display font-bold mb-6">
                KairoShield&trade;
              </h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                The gold standard of data sovereignty. KairoShield provides full-service implementation including managed Texas Sovereign hosting on dedicated, HIPAA-hardened nodes. We handle every aspect of your migration, monitoring, and ongoing compliance maintenance.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Managed Texas Sovereign Hosting', desc: 'Dedicated GCP infrastructure in Dallas/Austin with zero-drift software management' },
                  { title: 'Vetted MSP Implementation', desc: 'Matched with certified managed service providers for complex on-prem or hybrid migrations' },
                  { title: 'Bi-Annual Forensic Security Audits', desc: 'Scheduled deep-scan audits with certified compliance documentation' },
                  { title: 'Continuous Statutory Updates', desc: 'Managed updates as SB 1188 and HB 149 requirements evolve' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-gold text-sm">&#x2713;</span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{item.title}</div>
                      <div className="text-sm text-gray-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-display font-bold text-navy mb-6">
            Start With a Free Scan
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Understand your current compliance posture before choosing the right protocol. Our Sentry engine identifies every critical violation in under 60 seconds.
          </p>
          <Link href="/scan">
            <button className="bg-orange hover:bg-orange-dark text-white font-bold px-10 py-4 rounded-lg text-lg transition-colors">
              Run Free Compliance Scan
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
