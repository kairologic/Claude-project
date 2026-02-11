'use client';

import { useState, useEffect } from 'react';
import { Shield, FileText, Lock, CheckCircle, AlertTriangle, ExternalLink, Mail, Download, RefreshCw } from 'lucide-react';

const PRODUCTS = [
  {
    id: 'audit-report',
    name: 'Sovereignty Audit Report',
    price: '$149',
    type: 'One-time',
    description: 'Full forensic analysis + remediation roadmap + 3 months Shield FREE',
    link: 'https://buy.stripe.com/4gM5kDdpw0HP18x3057Re08',
    color: 'border-blue-500 bg-blue-50',
    icon: '📋',
    trialIncluded: true,
  },
  {
    id: 'safe-harbor',
    name: 'Safe Harbor™ Bundle',
    price: '$249',
    type: 'One-time',
    description: 'Everything in Audit Report + policies, AI disclosures, training, blueprint + 3 months Shield FREE',
    link: 'https://buy.stripe.com/00w28retAeyF6sRgQV7Re07',
    color: 'border-orange-500 bg-orange-50',
    icon: '🔧',
    trialIncluded: true,
  },
  {
    id: 'sentry-shield',
    name: 'Sentry Shield',
    price: '$79/mo',
    type: 'Recurring',
    description: 'Continuous compliance monitoring + free audit report + dashboard + quarterly reports',
    link: 'https://buy.stripe.com/aFa3cv3OW4Y54kJ3057Re06',
    color: 'border-green-500 bg-green-50',
    icon: '🛡',
    trialIncluded: false,
  },
];

interface WebhookEvent {
  id: string;
  type: string;
  created: string;
  product?: string;
  email?: string;
  amount?: number;
  status?: string;
}

export default function StripeTestPage() {
  const [testNPI, setTestNPI] = useState('1234567890');
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [sessionResult, setSessionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  // Check for session_id in URL (after redirect from Stripe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');
    if (sid) {
      setSessionId(sid);
      fetchSession(sid);
    }
  }, []);

  const fetchSession = async (sid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe-session?session_id=${sid}`);
      const data = await res.json();
      setSessionResult(data);
    } catch (err) {
      setSessionResult({ error: 'Failed to fetch session' });
    }
    setLoading(false);
  };

  const getPaymentLink = (product: typeof PRODUCTS[0]) => {
    const params = new URLSearchParams({
      client_reference_id: testNPI,
      prefilled_email: testEmail,
    });
    return `${product.link}?${params.toString()}`;
  };

  const testWebhook = async (eventType: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          test: true,
          data: {
            object: {
              id: `cs_test_${Date.now()}`,
              client_reference_id: testNPI,
              customer_email: testEmail,
              metadata: { product: 'audit-report' },
              amount_total: 14900,
            }
          }
        }),
      });
      const data = await res.json();
      setWebhookEvents(prev => [{
        id: `evt_test_${Date.now()}`,
        type: eventType,
        created: new Date().toISOString(),
        product: 'audit-report',
        email: testEmail,
        status: res.ok ? 'success' : 'failed',
      }, ...prev]);
    } catch (err) {
      setWebhookEvents(prev => [{
        id: `evt_test_${Date.now()}`,
        type: eventType,
        created: new Date().toISOString(),
        status: 'error',
      }, ...prev]);
    }
    setLoading(false);
  };

  const testEmail_send = async (template: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_slug: template,
          npi: testNPI,
          email: testEmail,
          score: 58,
          product: 'audit-report',
        }),
      });
      const data = await res.json();
      alert(res.ok ? `Email sent: ${template}` : `Email failed: ${JSON.stringify(data)}`);
    } catch (err) {
      alert(`Email error: ${err}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy text-white py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-gold" />
            <h1 className="text-2xl font-bold">Stripe Test Harness</h1>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">LIVE MODE</span>
          </div>
          <p className="text-gray-400 text-sm">Test payment links, webhook events, email triggers, and download flows</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ═══ TEST PARAMETERS ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Test Parameters</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Test NPI</label>
              <input
                type="text"
                value={testNPI}
                onChange={(e) => setTestNPI(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Test Email</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">These will be passed as client_reference_id and prefilled_email to Stripe</p>
        </div>

        {/* ═══ PAYMENT LINKS ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Payment Links (Live)</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PRODUCTS.map((product) => (
              <div key={product.id} className={`rounded-xl border-2 p-5 ${product.color}`}>
                <div className="text-2xl mb-2">{product.icon}</div>
                <h3 className="font-bold text-navy text-sm">{product.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-xl font-black text-navy">{product.price}</span>
                  <span className="text-xs text-gray-400">{product.type}</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">{product.description}</p>
                {product.trialIncluded && (
                  <div className="text-xs font-bold text-green-600 mb-3">✦ Includes 3 months Shield trial</div>
                )}
                <a
                  href={getPaymentLink(product)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-navy hover:bg-navy-light text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors w-full"
                >
                  <ExternalLink size={14} />
                  Open Payment Link
                </a>
                <div className="mt-2 text-[10px] text-gray-400 break-all font-mono">{product.link}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-amber-700">Live Mode</span>
              <span className="text-amber-600">— These are real payment links. Use a real card or Stripe test cards will NOT work in live mode.</span>
            </div>
          </div>
        </div>

        {/* ═══ SESSION LOOKUP ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Session Lookup</h2>
          <p className="text-sm text-gray-500 mb-3">After a payment completes, paste the session_id to verify what our API returns:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="cs_live_..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={() => fetchSession(sessionId)}
              disabled={!sessionId || loading}
              className="bg-navy hover:bg-navy-light text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Fetch
            </button>
          </div>
          {sessionResult && (
            <pre className="mt-3 bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto max-h-64">
              {JSON.stringify(sessionResult, null, 2)}
            </pre>
          )}
        </div>

        {/* ═══ EMAIL TESTS ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Email Tests</h2>
          <p className="text-sm text-gray-500 mb-3">Send test emails to <strong>{testEmail}</strong>:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { slug: 'purchase-confirmation', label: 'Purchase Confirmation' },
              { slug: 'shield-trial-welcome', label: 'Shield Trial Welcome' },
              { slug: 'immediate-summary', label: 'Scan Summary' },
              { slug: 'trial-ending-soon', label: 'Trial Ending (3-day)' },
            ].map((tmpl) => (
              <button
                key={tmpl.slug}
                onClick={() => testEmail_send(tmpl.slug)}
                disabled={loading}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <Mail size={14} />
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ DOWNLOAD TESTS ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Download Tests</h2>
          <p className="text-sm text-gray-500 mb-3">Test report generation and asset downloads:</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/report/generate?npi=${testNPI}&format=pdf`}
              target="_blank"
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Download size={14} />
              PDF Report
            </a>
            <a
              href={`/api/report/generate?npi=${testNPI}&format=text`}
              target="_blank"
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Download size={14} />
              Text Report
            </a>
            <a
              href="/sample-report.pdf"
              target="_blank"
              className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Download size={14} />
              Sample Report PDF
            </a>
          </div>
        </div>

        {/* ═══ SUCCESS PAGE TEST ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Success Page Preview</h2>
          <p className="text-sm text-gray-500 mb-3">Preview the post-purchase success page for each product:</p>
          <div className="flex flex-wrap gap-2">
            {PRODUCTS.map((product) => (
              <a
                key={product.id}
                href={`/payment/success?session_id=test_${product.id}&product=${product.id}`}
                target="_blank"
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <CheckCircle size={14} />
                {product.name}
              </a>
            ))}
          </div>
        </div>

        {/* ═══ PRODUCT CONFIGURATION ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Product Configuration Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-600">Product</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Price</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Metadata Key</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Shield Trial</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Webhook Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2">Audit Report</td>
                  <td className="py-2 font-mono text-xs">$149 one-time</td>
                  <td className="py-2 font-mono text-xs text-blue-600">audit-report</td>
                  <td className="py-2 text-green-600 font-bold">90 days FREE</td>
                  <td className="py-2 text-xs">Create Shield subscription with trial_period_days=90</td>
                </tr>
                <tr>
                  <td className="py-2">Safe Harbor</td>
                  <td className="py-2 font-mono text-xs">$249 one-time</td>
                  <td className="py-2 font-mono text-xs text-blue-600">safe-harbor</td>
                  <td className="py-2 text-green-600 font-bold">90 days FREE</td>
                  <td className="py-2 text-xs">Create Shield subscription with trial_period_days=90</td>
                </tr>
                <tr>
                  <td className="py-2">Sentry Shield</td>
                  <td className="py-2 font-mono text-xs">$79/mo recurring</td>
                  <td className="py-2 font-mono text-xs text-blue-600">sentry-shield</td>
                  <td className="py-2 text-gray-400">No trial — immediate billing</td>
                  <td className="py-2 text-xs">Update registry, activate widget</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2 text-gray-400">Sentry Watch (hidden)</td>
                  <td className="py-2 font-mono text-xs text-gray-400">$39/mo recurring</td>
                  <td className="py-2 font-mono text-xs text-gray-400">sentry-watch</td>
                  <td className="py-2 text-gray-400">Downgrade only</td>
                  <td className="py-2 text-xs text-gray-400">No Payment Link — post-trial downgrade option</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ ENV VAR CHECKLIST ═══ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Environment Variable Checklist</h2>
          <div className="space-y-2 text-sm">
            {[
              { key: 'STRIPE_SECRET_KEY', desc: 'sk_live_... (live secret key)' },
              { key: 'STRIPE_WEBHOOK_SECRET', desc: 'whsec_... (live webhook signing secret)' },
              { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', desc: 'pk_live_... (live publishable key)' },
              { key: 'STRIPE_SHIELD_PRICE_ID', desc: 'price_... (Shield $79/mo recurring price)' },
              { key: 'STRIPE_WATCH_PRICE_ID', desc: 'price_... (Watch $39/mo recurring price)' },
            ].map((env) => (
              <div key={env.key} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
                <input type="checkbox" className="w-4 h-4 accent-green-500" />
                <code className="font-mono text-xs text-navy font-bold">{env.key}</code>
                <span className="text-gray-400 text-xs">{env.desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
