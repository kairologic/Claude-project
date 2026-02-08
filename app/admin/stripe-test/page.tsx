'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, FileText, CreditCard, ArrowRight, CheckCircle, AlertTriangle, ExternalLink, Zap, Lock, Globe, Brain, ChevronDown } from 'lucide-react';

/**
 * KairoLogic Stripe Test Page
 * ===========================
 * /app/admin/stripe-test/page.tsx
 * 
 * Test page to simulate Stripe Payment Link flows for all products.
 * Allows admins to:
 *   1. Select a product (Report, Safe Harbor, bundles, Watch, Shield)
 *   2. Enter a test NPI + email
 *   3. Generate a test Stripe Payment Link URL
 *   4. Simulate the success redirect (bypasses Stripe entirely)
 *   5. Test the full post-purchase flow (PDF, Safe Harbor materials, widget code)
 * 
 * This page should be accessible only to admins in production.
 */

const PRODUCTS = [
  {
    id: 'report',
    name: 'Sovereignty Audit Report',
    price: '$149',
    priceAmount: 149,
    description: 'Full forensic compliance report with remediation roadmap',
    icon: FileText,
    color: 'amber',
    includes: ['Forensic audit report (PDF)', 'Data border map', 'Remediation roadmap', 'Statutory clause mapping', 'Compliance attestation'],
    stripeProduct: 'audit-report',
  },
  {
    id: 'safe-harbor',
    name: 'Safe Harbor™ Bundle',
    price: '$249',
    priceAmount: 249,
    description: 'Complete remediation kit + audit report',
    icon: Shield,
    color: 'orange',
    badge: 'MOST POPULAR',
    includes: ['Everything in Audit Report', 'SB 1188 Policy Pack', 'AI Disclosure Kit', 'Evidence Ledger Templates', 'Staff Training Guide', 'Implementation Blueprint'],
    stripeProduct: 'safe-harbor',
  },
  {
    id: 'safe-harbor-watch',
    name: 'Safe Harbor™ + Sentry Watch',
    price: '$249 + $39/mo',
    priceAmount: 249,
    recurringAmount: 39,
    description: 'Safe Harbor bundle + monthly monitoring',
    icon: Shield,
    color: 'blue',
    includes: ['Everything in Safe Harbor™', 'Automated monthly re-scans', 'Compliance drift alerts', 'Monthly compliance reports'],
    stripeProduct: 'safe-harbor-watch',
  },
  {
    id: 'safe-harbor-shield',
    name: 'Safe Harbor™ + Sentry Shield',
    price: '$249 + $79/mo',
    priceAmount: 249,
    recurringAmount: 79,
    description: 'Safe Harbor bundle + premium monitoring + dashboard',
    icon: Shield,
    color: 'green',
    badge: 'BEST VALUE',
    includes: ['Everything in Safe Harbor™', 'Live compliance dashboard', 'Quarterly forensic reports', 'Annual certification seal', 'Priority support'],
    stripeProduct: 'safe-harbor-shield',
  },
  {
    id: 'watch',
    name: 'Sentry Watch',
    price: '$39/mo',
    priceAmount: 0,
    recurringAmount: 39,
    description: 'Basic compliance monitoring subscription',
    icon: Zap,
    color: 'blue',
    includes: ['Automated monthly re-scans', 'Compliance drift alerts', 'Monthly compliance reports', 'Infrastructure heartbeat'],
    stripeProduct: 'sentry-watch',
  },
  {
    id: 'shield',
    name: 'Sentry Shield + Free Report',
    price: '$79/mo',
    priceAmount: 0,
    recurringAmount: 79,
    description: 'Premium monitoring + free audit report',
    icon: Lock,
    color: 'green',
    includes: ['Free Sovereignty Audit Report', 'Live compliance dashboard', 'Quarterly forensic reports', 'Annual certification seal', 'Priority support'],
    stripeProduct: 'sentry-shield',
  },
];

export default function StripeTestPage() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[1]); // Default to Safe Harbor
  const [npi, setNpi] = useState('2422423223');
  const [email, setEmail] = useState('test@kairologic.com');
  const [practiceName, setPracticeName] = useState('August Dental');
  const [testMode, setTestMode] = useState<'link' | 'simulate'>('simulate');
  const [showIncludes, setShowIncludes] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Generate Stripe Payment Link with pre-filled data
  // NOTE: Replace these with your actual Stripe Payment Link URLs
  const STRIPE_LINKS: Record<string, string> = {
    'report': 'https://buy.stripe.com/test_REPLACE_REPORT_LINK',
    'safe-harbor': 'https://buy.stripe.com/test_REPLACE_SAFEHARBOR_LINK',
    'safe-harbor-watch': 'https://buy.stripe.com/test_REPLACE_SH_WATCH_LINK',
    'safe-harbor-shield': 'https://buy.stripe.com/test_REPLACE_SH_SHIELD_LINK',
    'watch': 'https://buy.stripe.com/test_REPLACE_WATCH_LINK',
    'shield': 'https://buy.stripe.com/test_REPLACE_SHIELD_LINK',
  };

  const getPaymentLink = () => {
    const base = STRIPE_LINKS[selectedProduct.id] || '#';
    const params = new URLSearchParams({
      client_reference_id: npi,
      prefilled_email: email,
    });
    return `${base}?${params.toString()}`;
  };

  const getSuccessUrl = () => {
    const params = new URLSearchParams({
      product: selectedProduct.id,
      npi,
      email,
    });
    return `/payment/success?${params.toString()}`;
  };

  // Simulate the full post-purchase flow without Stripe
  const handleSimulate = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      // Step 1: Check if scan report exists for this NPI
      const reportRes = await fetch(`/api/report?npi=${npi}`);
      const reportData = reportRes.ok ? await reportRes.json() : null;
      const hasReport = reportData?.reports?.length > 0;

      setSimResult({
        success: true,
        product: selectedProduct,
        npi,
        email,
        practiceName,
        hasExistingReport: hasReport,
        reportCount: reportData?.reports?.length || 0,
        latestReport: reportData?.reports?.[0] || null,
        successUrl: getSuccessUrl(),
        paymentLink: getPaymentLink(),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setSimResult({
        success: false,
        error: err.message,
      });
    } finally {
      setSimulating(false);
    }
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; ring: string }> = {
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-600',  badge: 'bg-amber-100 text-amber-800',  ring: 'ring-amber-500' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-800', ring: 'ring-orange-500' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-800',   ring: 'ring-blue-500' },
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-600',  badge: 'bg-green-100 text-green-800',  ring: 'ring-green-500' },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#00234E] to-slate-950 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="text-xl font-bold tracking-tight">
                  KAIRO<span className="text-[#C5A059]">LOGIC</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">Admin</span>
              </div>
              <h1 className="text-sm text-slate-400 mt-1">Stripe Payment Link Tester</h1>
            </div>
            <Link href="/admin/dashboard" className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ═══ LEFT: Product Selector ═══ */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#C5A059]" />
              Select Product to Test
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRODUCTS.map((product) => {
                const colors = colorMap[product.color] || colorMap.amber;
                const isSelected = selectedProduct.id === product.id;
                const IconComp = product.icon;
                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? `bg-slate-800/80 border-[#C5A059] ring-2 ring-[#C5A059]/30`
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {product.badge && (
                      <span className="absolute -top-2 right-3 text-[9px] font-black bg-[#C5A059] text-[#00234E] px-2 py-0.5 rounded-full tracking-wider">
                        {product.badge}
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#C5A059]/20' : 'bg-slate-800'}`}>
                        <IconComp className={`w-4 h-4 ${isSelected ? 'text-[#C5A059]' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {product.name}
                          </span>
                          <span className={`text-sm font-black ${isSelected ? 'text-[#C5A059]' : 'text-slate-500'}`}>
                            {product.price}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{product.description}</p>
                        
                        {/* Expandable includes */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowIncludes(showIncludes === product.id ? null : product.id);
                          }}
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 mt-2 transition-colors"
                        >
                          <ChevronDown className={`w-3 h-3 transition-transform ${showIncludes === product.id ? 'rotate-180' : ''}`} />
                          {product.includes.length} items included
                        </button>
                        
                        {showIncludes === product.id && (
                          <div className="mt-2 space-y-1">
                            {product.includes.map((item, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-3 left-3">
                        <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ RIGHT: Test Configuration ═══ */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#C5A059]" />
              Test Configuration
            </h2>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              {/* Test NPI */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Test NPI
                </label>
                <input
                  type="text"
                  value={npi}
                  onChange={(e) => setNpi(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="2422423223"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                />
              </div>

              {/* Practice Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Practice Name
                </label>
                <input
                  type="text"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  placeholder="August Dental"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Test Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@kairologic.com"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                />
              </div>

              {/* Mode toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Test Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTestMode('simulate')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      testMode === 'simulate'
                        ? 'bg-[#C5A059] text-[#00234E]'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Simulate (No Stripe)
                  </button>
                  <button
                    onClick={() => setTestMode('link')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      testMode === 'link'
                        ? 'bg-[#C5A059] text-[#00234E]'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Real Stripe Link
                  </button>
                </div>
              </div>

              {/* Selected product summary */}
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Selected:</span>
                  <span className="text-xs font-bold text-[#C5A059]">{selectedProduct.price}</span>
                </div>
                <div className="text-sm font-bold text-white">{selectedProduct.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  stripe_product: {selectedProduct.stripeProduct}
                </div>
              </div>

              {/* Action buttons */}
              {testMode === 'simulate' ? (
                <div className="space-y-2">
                  <button
                    onClick={handleSimulate}
                    disabled={!npi || simulating}
                    className="w-full bg-[#C5A059] hover:bg-[#d4b168] disabled:bg-slate-700 disabled:text-slate-500 text-[#00234E] font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {simulating ? (
                      <><div className="w-4 h-4 border-2 border-[#00234E] border-t-transparent rounded-full animate-spin" /> Checking...</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Run Simulation</>
                    )}
                  </button>
                  <Link
                    href={getSuccessUrl()}
                    target="_blank"
                    className="w-full bg-[#00234E] hover:bg-[#003366] border border-[#C5A059]/30 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Success Page Directly
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <a
                    href={getPaymentLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#C5A059] hover:bg-[#d4b168] text-[#00234E] font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    Open Stripe Payment Link
                  </a>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-300 font-semibold">Update Payment Links</p>
                        <p className="text-[10px] text-amber-400/70 mt-1">
                          Replace the placeholder URLs in STRIPE_LINKS with your actual Stripe Payment Link URLs from the Stripe Dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* URL Preview */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {testMode === 'simulate' ? 'Success Page URL' : 'Payment Link URL'}
              </h3>
              <div className="bg-slate-800 rounded-lg p-3 overflow-x-auto">
                <code className="text-[10px] text-green-400 font-mono break-all">
                  {testMode === 'simulate' ? getSuccessUrl() : getPaymentLink()}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SIMULATION RESULTS ═══ */}
        {simResult && (
          <div className={`mt-8 rounded-xl border overflow-hidden ${
            simResult.success 
              ? 'bg-green-950/30 border-green-800/50' 
              : 'bg-red-950/30 border-red-800/50'
          }`}>
            <div className={`px-6 py-3 border-b ${
              simResult.success ? 'bg-green-900/30 border-green-800/50' : 'bg-red-900/30 border-red-800/50'
            }`}>
              <div className="flex items-center gap-2">
                {simResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
                <h3 className="text-sm font-bold text-white">
                  {simResult.success ? 'Simulation Complete' : 'Simulation Failed'}
                </h3>
                <span className="ml-auto text-[10px] text-slate-500 font-mono">{simResult.timestamp}</span>
              </div>
            </div>
            <div className="p-6">
              {simResult.success ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Product</div>
                    <div className="text-sm font-bold text-white">{simResult.product.name}</div>
                    <div className="text-xs text-[#C5A059] mt-1">{simResult.product.price}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Provider</div>
                    <div className="text-sm font-bold text-white">{simResult.practiceName}</div>
                    <div className="text-xs text-slate-400 mt-1">NPI: {simResult.npi}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Existing Report</div>
                    <div className={`text-sm font-bold ${simResult.hasExistingReport ? 'text-green-400' : 'text-amber-400'}`}>
                      {simResult.hasExistingReport ? `Yes (${simResult.reportCount})` : 'None found'}
                    </div>
                    {simResult.latestReport && (
                      <div className="text-xs text-slate-400 mt-1">
                        ID: {simResult.latestReport.report_id}
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Score</div>
                    {simResult.latestReport ? (
                      <>
                        <div className={`text-2xl font-black ${
                          simResult.latestReport.sovereignty_score >= 80 ? 'text-green-400' :
                          simResult.latestReport.sovereignty_score >= 50 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {simResult.latestReport.sovereignty_score}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {simResult.latestReport.compliance_status}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-500">No scan data</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-400">{simResult.error}</div>
              )}

              {simResult.success && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={simResult.successUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 bg-[#C5A059] text-[#00234E] font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-[#d4b168] transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Go to Success Page →
                  </Link>
                  {simResult.hasExistingReport && (
                    <Link
                      href={`/payment/success?product=${selectedProduct.id}&npi=${npi}&email=${email}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Test PDF Download
                    </Link>
                  )}
                  {!simResult.hasExistingReport && (
                    <Link
                      href={`/scan?npi=${npi}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-amber-500 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Run Scan First (No Report Found)
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ FLOW DIAGRAM ═══ */}
        <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#C5A059]" />
            Purchase Flow Reference
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center">
            {[
              { step: '1', label: 'Scan completes', detail: 'Report saved to scan_reports', icon: Globe },
              { step: '2', label: 'User clicks Buy', detail: 'Stripe Payment Link opens', icon: CreditCard },
              { step: '3', label: 'Payment succeeds', detail: 'Webhook fires → DB updated', icon: CheckCircle },
              { step: '4', label: 'Success page loads', detail: 'Fetches report by NPI', icon: FileText },
              { step: '5', label: 'PDF downloads', detail: 'jsPDF client-side generation', icon: Shield },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                  <div className="w-7 h-7 rounded-full bg-[#00234E] border border-[#C5A059]/40 flex items-center justify-center mx-auto mb-2">
                    <span className="text-[10px] font-black text-[#C5A059]">{s.step}</span>
                  </div>
                  <s.icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-white">{s.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{s.detail}</div>
                </div>
                {i < 4 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 text-slate-600">→</div>
                )}
              </div>
            ))}
          </div>

          {/* Webhook product mapping */}
          <div className="mt-6 bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Stripe Webhook Product Detection (from route.ts)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] font-mono">
              {[
                { product: 'audit-report', trigger: 'amount >= $149 OR name contains "audit"', price: '$149' },
                { product: 'safe-harbor', trigger: 'amount >= $249 OR name contains "safe harbor"', price: '$249' },
                { product: 'safe-harbor-watch', trigger: 'metadata.product OR "safe harbor" + "watch"', price: '$249 + $39/mo' },
                { product: 'safe-harbor-shield', trigger: 'metadata.product OR "safe harbor" + "shield"', price: '$249 + $79/mo' },
                { product: 'sentry-watch', trigger: 'name contains "watch" OR "sentry watch"', price: '$39/mo' },
                { product: 'sentry-shield', trigger: 'name contains "shield"', price: '$79/mo' },
              ].map((p) => (
                <div key={p.product} className="bg-slate-900/60 rounded p-2">
                  <div className="text-[#C5A059] font-bold">{p.product}</div>
                  <div className="text-slate-500 mt-1">{p.price}</div>
                  <div className="text-slate-600 mt-0.5 text-[9px]">{p.trigger}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-600">
          KairoLogic Stripe Test Console • For admin use only • Do not expose in production
        </div>
      </div>
    </div>
  );
}
