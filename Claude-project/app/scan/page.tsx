'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    npi: '',
    url: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store data and navigate to results
    sessionStorage.setItem('scanData', JSON.stringify(formData));
    router.push(`/scan/results?npi=${formData.npi}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-orange/20 text-orange px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🔍 COMPLIANCE VERIFICATION
          </div>
          <h1 className="text-5xl font-display font-bold mb-4">
            Run Sentry Scan
          </h1>
          <p className="text-xl text-gray-300">
            Verify your compliance status in 60 seconds. Identify violations across SB 1188 and HB 149 requirements.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card">
            <h2 className="text-2xl font-display font-bold text-navy mb-6">
              Provider Information
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  Provider Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., August Dental Inc"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  NPI Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.npi}
                  onChange={(e) => setFormData({ ...formData, npi: e.target.value })}
                  className="input-field"
                  placeholder="10-digit NPI"
                  pattern="[0-9]{10}"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="input-field"
                  placeholder="https://yourpractice.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="your@email.com"
                />
                <p className="text-sm text-gray-600 mt-1">
                  We'll send your scan results to this address
                </p>
              </div>

              <button type="submit" className="btn-primary w-full text-lg">
                Start Compliance Scan
              </button>
            </form>
          </div>

          {/* What We Check */}
          <div className="mt-12">
            <h3 className="text-xl font-display font-bold text-navy mb-6 text-center">
              What We Check
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl mb-2">📍</div>
                <div className="font-semibold text-navy mb-1">Data Sovereignty (SB 1188)</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• IP geo-location</li>
                  <li>• CDN & edge cache</li>
                  <li>• MX record pathing</li>
                  <li>• Sub-processor audit</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-semibold text-navy mb-1">AI Transparency (HB 149)</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• AI disclosure text</li>
                  <li>• Dark pattern detection</li>
                  <li>• Diagnostic AI disclaimers</li>
                  <li>• Chatbot notices</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold text-navy mb-1">EHR Integrity</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Biological sex fields</li>
                  <li>• Parental access portal</li>
                  <li>• Metabolic health tracking</li>
                  <li>• Forbidden data fields</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl mb-2">⚖️</div>
                <div className="font-semibold text-navy mb-1">What You Get</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Risk score & level</li>
                  <li>• Critical violations</li>
                  <li>• Email summary</li>
                  <li>• Remediation options</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
