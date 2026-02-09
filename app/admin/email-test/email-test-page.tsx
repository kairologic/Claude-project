'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertTriangle, CheckCircle, XCircle, Loader2, Send, Settings, Database, Zap } from 'lucide-react';

/**
 * KairoLogic Email Diagnostics & Test Page
 * =========================================
 * /app/admin/email-test/page.tsx
 * 
 * Diagnoses:
 *   1. SES SMTP credentials configured?
 *   2. Email templates exist in DB?
 *   3. Can we actually send a test email?
 *   4. Test each email flow (scan results, purchase, claim)
 */

interface DiagResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

interface SendResult {
  success: boolean;
  sent: boolean;
  template: string;
  recipient: string;
  error?: string;
}

export default function EmailTestPage() {
  const [diagResults, setDiagResults] = useState<DiagResult[]>([]);
  const [diagRunning, setDiagRunning] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testNpi, setTestNpi] = useState('2422423223');
  const [testTemplate, setTestTemplate] = useState('immediate-summary');
  const [rawResponse, setRawResponse] = useState('');

  // Run full diagnostics
  const runDiagnostics = async () => {
    setDiagRunning(true);
    setDiagResults([]);
    const results: DiagResult[] = [];

    // 1. Check if email API endpoint is reachable
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_slug: '__test_ping__' }),
      });
      const data = await res.json();
      if (res.status === 404 && data.error === 'Template not found') {
        results.push({ check: 'Email API endpoint', status: 'pass', detail: 'API reachable, template lookup works' });
      } else if (res.status === 400) {
        results.push({ check: 'Email API endpoint', status: 'pass', detail: 'API reachable (validation working)' });
      } else {
        results.push({ check: 'Email API endpoint', status: 'warn', detail: `Unexpected response: ${res.status} - ${JSON.stringify(data)}` });
      }
    } catch (err: any) {
      results.push({ check: 'Email API endpoint', status: 'fail', detail: `API unreachable: ${err.message}` });
    }

    // 2. Check SES config via diagnostic endpoint
    try {
      const res = await fetch('/api/email/diagnose');
      if (res.ok) {
        const data = await res.json();
        results.push({
          check: 'SES SMTP credentials',
          status: data.smtp_configured ? 'pass' : 'fail',
          detail: data.smtp_configured
            ? `Host: ${data.smtp_host}, User: ${data.smtp_user_prefix}...`
            : 'SES_SMTP_USER and/or SES_SMTP_PASS not set in Vercel env vars'
        });
        results.push({
          check: 'SES sender email',
          status: data.from_email ? 'pass' : 'warn',
          detail: `From: ${data.from_email || 'NOT SET'} (${data.from_name || 'no name'})`
        });
        results.push({
          check: 'SES SMTP region',
          status: 'warn',
          detail: `Host: ${data.smtp_host} — Verify this matches your SES region`
        });
      } else {
        results.push({ check: 'SES SMTP config', status: 'fail', detail: 'Diagnostic endpoint not deployed yet. Add /api/email/diagnose route.' });
      }
    } catch {
      results.push({ check: 'SES SMTP config', status: 'warn', detail: 'Diagnostic endpoint not available — check env vars manually in Vercel dashboard' });
    }

    // 3. Check email templates in DB
    try {
      const templateSlugs = ['immediate-summary', 'purchase-success', 'sentryshield-activation', 'technical-consultation', 'registry-claim-confirm', 'registry-claim-verify'];
      for (const slug of templateSlugs) {
        const res = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_slug: slug }),
        });
        const data = await res.json();
        if (res.status === 404) {
          results.push({ check: `Template: ${slug}`, status: 'fail', detail: 'Template not found in email_templates table' });
        } else if (res.status === 200 && data.error === 'No recipient email') {
          results.push({ check: `Template: ${slug}`, status: 'pass', detail: 'Template exists (no recipient = expected for test)' });
        } else if (data.sent === true || data.success === true) {
          results.push({ check: `Template: ${slug}`, status: 'pass', detail: 'Template exists and active' });
        } else {
          results.push({ check: `Template: ${slug}`, status: 'warn', detail: `Response: ${JSON.stringify(data).substring(0, 100)}` });
        }
      }
    } catch (err: any) {
      results.push({ check: 'Template check', status: 'fail', detail: `Failed: ${err.message}` });
    }

    setDiagResults(results);
    setDiagRunning(false);
  };

  // Send a test email
  const sendTestEmail = async () => {
    if (!testEmail) return;
    setSending(true);
    setSendResult(null);
    setRawResponse('');

    try {
      const payload: any = {
        template_slug: testTemplate,
        npi: testNpi,
        variables: {
          email: testEmail,
          practice_name: 'Test Practice (Email Diagnostic)',
          practice_manager_name: 'Test Admin',
        },
      };

      // Add scan-specific vars for immediate-summary
      if (testTemplate === 'immediate-summary') {
        payload.score = 72;
        payload.risk_level = 'Moderate Risk';
        payload.findings_summary = '❌ AI-01: No AI disclosure found\n⚠️ DR-04: 3 foreign sub-processors\n✅ DR-01: Primary domain US-based';
        payload.findings_count = 11;
        payload.fail_count = 3;
        payload.warn_count = 2;
        payload.pass_count = 6;
      }

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setRawResponse(JSON.stringify(data, null, 2));
      setSendResult(data as SendResult);
    } catch (err: any) {
      setRawResponse(JSON.stringify({ error: err.message }, null, 2));
      setSendResult({ success: false, sent: false, template: testTemplate, recipient: testEmail, error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#00234E] to-slate-950 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="text-xl font-bold tracking-tight">
                  KAIRO<span className="text-[#C5A059]">LOGIC</span>
                </div>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">Email Debug</span>
              </div>
              <h1 className="text-sm text-slate-400 mt-1">Email Diagnostics & Test Console</h1>
            </div>
            <Link href="/admin/dashboard" className="text-xs text-slate-400 hover:text-white transition-colors">← Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ═══ DIAGNOSTICS ═══ */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#C5A059]" />
              <h2 className="text-sm font-bold text-white">System Diagnostics</h2>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={diagRunning}
              className="bg-[#C5A059] hover:bg-[#d4b168] disabled:bg-slate-700 text-[#00234E] disabled:text-slate-500 font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              {diagRunning ? <><Loader2 className="w-3 h-3 animate-spin" /> Running...</> : <><Zap className="w-3 h-3" /> Run Diagnostics</>}
            </button>
          </div>
          <div className="p-6">
            {diagResults.length === 0 && !diagRunning && (
              <p className="text-sm text-slate-500 text-center py-4">Click "Run Diagnostics" to check email infrastructure</p>
            )}
            {diagRunning && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-5 h-5 text-[#C5A059] animate-spin" />
                <span className="text-sm text-slate-400">Checking email infrastructure...</span>
              </div>
            )}
            {diagResults.length > 0 && (
              <div className="space-y-2">
                {diagResults.map((r, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    r.status === 'pass' ? 'bg-green-950/30 border-green-800/30' :
                    r.status === 'fail' ? 'bg-red-950/30 border-red-800/30' :
                    'bg-amber-950/30 border-amber-800/30'
                  }`}>
                    {r.status === 'pass' ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> :
                     r.status === 'fail' ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /> :
                     <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white">{r.check}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 break-all">{r.detail}</div>
                    </div>
                  </div>
                ))}
                
                {/* Summary */}
                <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Summary</div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-400">{diagResults.filter(r => r.status === 'pass').length} passed</span>
                    <span className="text-red-400">{diagResults.filter(r => r.status === 'fail').length} failed</span>
                    <span className="text-amber-400">{diagResults.filter(r => r.status === 'warn').length} warnings</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ REQUIRED ENV VARS ═══ */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#C5A059]" />
            <h2 className="text-sm font-bold text-white">Required Vercel Environment Variables</h2>
          </div>
          <div className="p-6">
            <div className="bg-slate-800/60 rounded-lg p-4 font-mono text-xs space-y-1.5">
              {[
                { key: 'SES_SMTP_HOST', value: 'email-smtp.us-east-2.amazonaws.com', note: '← Check your SES region!' },
                { key: 'SES_SMTP_PORT', value: '587', note: '' },
                { key: 'SES_SMTP_USER', value: 'AKIAQ7VOG7KZZS7QSO3S', note: '← Your SMTP user' },
                { key: 'SES_SMTP_PASS', value: 'BKK4em058Ka+O5XKTOsrH...', note: '← Your SMTP password' },
                { key: 'SES_FROM_EMAIL', value: 'compliance@kairologic.com', note: '← Must be verified in SES' },
                { key: 'SES_FROM_NAME', value: 'KairoLogic Compliance', note: '' },
              ].map(({ key, value, note }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[#C5A059] w-40">{key}</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-green-400">{value}</span>
                  {note && <span className="text-slate-600 ml-2">{note}</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300">
                  <strong>Critical checklist:</strong>
                  <ol className="mt-1 space-y-1 text-amber-400/80 list-decimal list-inside">
                    <li>All 4 SES vars must be set in Vercel → Settings → Environment Variables</li>
                    <li>SES region in SMTP host must match where you created SMTP credentials</li>
                    <li><code>compliance@kairologic.com</code> (or <code>kairologic.com</code> domain) must be verified in SES</li>
                    <li>SES must be out of sandbox mode (or test recipient must be verified too)</li>
                    <li>Redeploy after adding/changing env vars</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SEND TEST EMAIL ═══ */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#C5A059]" />
            <h2 className="text-sm font-bold text-white">Send Test Email</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recipient Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Test NPI</label>
                <input
                  type="text"
                  value={testNpi}
                  onChange={(e) => setTestNpi(e.target.value)}
                  placeholder="2422423223"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Template</label>
                <select
                  value={testTemplate}
                  onChange={(e) => setTestTemplate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
                >
                  <option value="immediate-summary">Scan Results (immediate-summary)</option>
                  <option value="purchase-success">Purchase Success (purchase-success)</option>
                  <option value="sentryshield-activation">Shield Activation (sentryshield-activation)</option>
                  <option value="technical-consultation">Consultation (technical-consultation)</option>
                  <option value="registry-claim-confirm">Claim Confirm (registry-claim-confirm)</option>
                  <option value="registry-claim-verify">Claim Verify (registry-claim-verify)</option>
                </select>
              </div>
            </div>

            <button
              onClick={sendTestEmail}
              disabled={!testEmail || sending}
              className="w-full bg-[#C5A059] hover:bg-[#d4b168] disabled:bg-slate-700 disabled:text-slate-500 text-[#00234E] font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Mail className="w-4 h-4" /> Send Test Email</>}
            </button>

            {sendResult && (
              <div className={`mt-4 p-4 rounded-lg border ${
                sendResult.sent ? 'bg-green-950/30 border-green-800/30' : 'bg-red-950/30 border-red-800/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {sendResult.sent ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className="text-sm font-bold text-white">{sendResult.sent ? 'Email Sent!' : 'Email Failed'}</span>
                </div>
                {sendResult.error && <p className="text-xs text-red-400">{sendResult.error}</p>}
              </div>
            )}

            {rawResponse && (
              <div className="mt-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Raw API Response</div>
                <pre className="bg-slate-800 rounded-lg p-3 text-[10px] text-green-400 font-mono overflow-x-auto">{rawResponse}</pre>
              </div>
            )}
          </div>
        </div>

        {/* ═══ TEMPLATE STATUS REFERENCE ═══ */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#C5A059]" />
            <h2 className="text-sm font-bold text-white">Email Template Map</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { slug: 'immediate-summary', trigger: 'After scan completes', to: 'Provider + Admin', seeded: true, calledBy: 'RiskScanWidget.tsx' },
                { slug: 'purchase-success', trigger: 'Stripe payment (report/safe-harbor)', to: 'Provider', seeded: false, calledBy: 'Stripe webhook' },
                { slug: 'sentryshield-activation', trigger: 'Stripe payment (watch/shield)', to: 'Provider', seeded: true, calledBy: 'Stripe webhook' },
                { slug: 'technical-consultation', trigger: 'Consultation booked', to: 'Provider', seeded: true, calledBy: 'Contact form' },
                { slug: 'registry-claim-confirm', trigger: 'Provider claims listing', to: 'Provider', seeded: false, calledBy: 'registry-claim route (NOT IMPLEMENTED)' },
                { slug: 'registry-claim-verify', trigger: 'Admin verifies claim', to: 'Provider', seeded: false, calledBy: 'Admin dashboard (NOT IMPLEMENTED)' },
              ].map((t) => (
                <div key={t.slug} className={`p-3 rounded-lg border ${t.seeded ? 'bg-slate-800/40 border-slate-700/50' : 'bg-red-950/20 border-red-800/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-xs text-[#C5A059] font-bold">{t.slug}</code>
                    {t.seeded ? (
                      <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">IN DB</span>
                    ) : (
                      <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">MISSING</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <div>Trigger: {t.trigger}</div>
                    <div>To: {t.to}</div>
                    <div>Called by: <span className="text-slate-400">{t.calledBy}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-600">
          KairoLogic Email Debug Console • For admin use only
        </div>
      </div>
    </div>
  );
}
