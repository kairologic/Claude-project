import Link from 'next/link';

export default function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-orange/10 text-orange px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🔒 SB 1188 ENFORCEMENT ACTIVE
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-navy mb-6">
            SOVEREIGN ARCHITECTURE.
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the protocol tier that aligns with your technical velocity and internal IT capability.
          </p>
        </div>
      </section>

      {/* Service Tiers */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* PDF Report */}
            <div className="card hover:scale-105 transition-transform duration-200">
              <div className="mb-6">
                <div className="text-4xl mb-3">📄</div>
                <h3 className="text-2xl font-display font-bold text-navy mb-2">
                  Full PDF Report
                </h3>
                <p className="text-gray-600">
                  Comprehensive technical remediation plan with code-level fixes.
                </p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-display font-bold text-navy">$1,250</span>
                  <span className="text-gray-600">one-time</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Complete scan results (all 12 compliance checks)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Detailed violation evidence with statutory references</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Step-by-step technical fixes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Priority-ranked remediation roadmap</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Code snippets for DNS, CDN, and server configuration</span>
                </li>
              </ul>
              
              <Link href="/scan">
                <button className="btn-secondary w-full">
                  Purchase Report
                </button>
              </Link>
            </div>

            {/* Technical Consultation */}
            <div className="card hover:scale-105 transition-transform duration-200 border-2 border-orange">
              <div className="bg-orange text-white text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">
                RECOMMENDED
              </div>
              
              <div className="mb-6">
                <div className="text-4xl mb-3">👨‍💻</div>
                <h3 className="text-2xl font-display font-bold text-navy mb-2">
                  Technical Consultation
                </h3>
                <p className="text-gray-600">
                  90-minute technical briefing with remediation strategy session.
                </p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-display font-bold text-navy">$3,000</span>
                  <span className="text-gray-600">one-time</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Everything in PDF Report</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">90-minute live video consultation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Custom remediation timeline</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Infrastructure-specific guidance (AWS, GCP, Azure)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Q&A with compliance specialists</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">30-day email support</span>
                </li>
              </ul>
              
              <Link href="/consultation">
                <button className="btn-primary w-full">
                  Schedule Consultation
                </button>
              </Link>
            </div>

            {/* Full Service */}
            <div className="card hover:scale-105 transition-transform duration-200">
              <div className="mb-6">
                <div className="text-4xl mb-3">🛡</div>
                <h3 className="text-2xl font-display font-bold text-navy mb-2">
                  Full Service Implementation
                </h3>
                <p className="text-gray-600">
                  White-glove compliance transformation with ongoing monitoring.
                </p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-navy">Custom Pricing</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Starting at $15,000</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Everything in Consultation</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Complete technical implementation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">CDN reconfiguration & DNS migration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">AI disclosure implementation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Sentry Widget installation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Quarterly compliance audits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">Ongoing monitoring & alerts</span>
                </li>
              </ul>
              
              <Link href="/contact">
                <button className="btn-outline w-full">
                  Request Quote
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sentry Widget */}
      <section className="py-20 bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-display font-bold mb-6">
                The Sentry Verified Widget
              </h2>
              <p className="text-xl text-gray-300 mb-6">
                Display your compliance status with a live, verifiable badge on your website footer. The Sentry Widget updates in real-time based on your latest scan results.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Real-time compliance verification</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Builds patient trust</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Automatic status updates</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white text-navy rounded-xl p-8">
              <div className="text-sm text-gray-600 mb-2">LIVE PREVIEW</div>
              <div className="bg-navy text-white rounded-lg p-6 text-center">
                <div className="text-3xl mb-2">🛡</div>
                <div className="font-display font-bold text-lg mb-1">Sentry Verified</div>
                <div className="text-sm text-gray-400">Last Scan: Jan 27, 2026</div>
                <div className="mt-4 text-green-400 font-bold">98% Compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-display font-bold text-navy mb-6">
            Start With a Free Scan
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Understand your current compliance status before choosing a service tier. Our comprehensive scan identifies all critical violations.
          </p>
          <Link href="/scan">
            <button className="btn-primary text-lg">
              Run Free Compliance Scan
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
