'use client';

import React, { useState } from 'react';
import {
  Shield, Play, CheckCircle, AlertTriangle, Database, Activity,
  ArrowRight, RefreshCw, Trash2, Eye, Zap, ExternalLink
} from 'lucide-react';

/**
 * Sentry Shield E2E Test Harness
 * 
 * Deploy to: app/admin/shield-test/page.tsx
 * Access at: /admin/shield-test
 * 
 * This page lets you:
 * 1. Create a test provider in the registry
 * 2. Seed compliance baselines
 * 3. Simulate drift events
 * 4. View results in Admin Drift tab and Provider Shield dashboard
 */

const TEST_NPI = '9999999901';
const TEST_PROVIDER = {
  name: 'Acme Family Medicine (TEST)',
  npi: TEST_NPI,
  url: 'https://acme-family-medicine.example.com',
  email: 'test@kairologic.net',
  city: 'Austin',
  zip: '78701',
  provider_type: 'physician',
};

const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

// Simulated baseline content matching what the widget would extract
const BASELINE_CONTENT: Record<string, string> = {
  ai_disclosure: 'this practice uses ai-powered tools for appointment scheduling and preliminary symptom assessment. all ai-assisted decisions are reviewed by licensed healthcare professionals.',
  privacy_policy: 'https://acme-family-medicine.example.com/privacy-policy::privacy policy',
  third_party_scripts: 'cdn.jsdelivr.net|fonts.googleapis.com|www.googletagmanager.com',
  data_collection_forms: 'https://acme-family-medicine.example.com/api/intake::email,patient_name,patient_phone',
  cookie_consent: 'div::cookie-consent-banner',
  hipaa_references: 'baa|business associate agreement|hipaa|phi|protected health information',
  meta_compliance: 'compliance::hipaa-compliant|data-residency::us-east-1',
};

// Simulated drift scenarios
const DRIFT_SCENARIOS = [
  {
    id: 'ai_removed',
    label: '🤖 AI Disclosure Removed',
    description: 'Simulates someone removing the AI disclosure text — CRITICAL severity',
    drifts: [{
      category: 'ai_disclosure',
      drift_type: 'content_removed',
      content_before: BASELINE_CONTENT.ai_disclosure,
      content_after: '',
    }],
  },
  {
    id: 'scripts_changed',
    label: '📜 New Third-Party Script Added',
    description: 'Simulates a new tracking script being added — HIGH severity',
    drifts: [{
      category: 'third_party_scripts',
      drift_type: 'content_changed',
      content_before: BASELINE_CONTENT.third_party_scripts,
      content_after: BASELINE_CONTENT.third_party_scripts + '|suspicious-analytics.com',
    }],
  },
  {
    id: 'privacy_changed',
    label: '🔒 Privacy Policy Link Changed',
    description: 'Simulates the privacy policy URL being changed — MEDIUM severity',
    drifts: [{
      category: 'privacy_policy',
      drift_type: 'content_changed',
      content_before: BASELINE_CONTENT.privacy_policy,
      content_after: 'https://external-site.com/generic-privacy::privacy policy',
    }],
  },
  {
    id: 'form_changed',
    label: '📋 SSN Field Added to Form',
    description: 'Simulates a sensitive field being added to the intake form — HIGH severity',
    drifts: [{
      category: 'data_collection_forms',
      drift_type: 'content_changed',
      content_before: BASELINE_CONTENT.data_collection_forms,
      content_after: 'https://acme-family-medicine.example.com/api/intake::email,patient_name,patient_phone,patient_ssn',
    }],
  },
  {
    id: 'hipaa_removed',
    label: '🏥 HIPAA References Removed',
    description: 'Simulates HIPAA/BAA text being deleted — MEDIUM severity',
    drifts: [{
      category: 'hipaa_references',
      drift_type: 'content_removed',
      content_before: BASELINE_CONTENT.hipaa_references,
      content_after: '',
    }],
  },
  {
    id: 'multi_drift',
    label: '💥 Multiple Changes (Worst Case)',
    description: 'AI disclosure removed + new scripts + form action changed — simulates a bad deploy',
    drifts: [
      {
        category: 'ai_disclosure',
        drift_type: 'content_removed',
        content_before: BASELINE_CONTENT.ai_disclosure,
        content_after: '',
      },
      {
        category: 'third_party_scripts',
        drift_type: 'content_changed',
        content_before: BASELINE_CONTENT.third_party_scripts,
        content_after: 'cdn.jsdelivr.net|fonts.googleapis.com|malware-cdn.io|crypto-miner.xyz',
      },
      {
        category: 'data_collection_forms',
        drift_type: 'content_changed',
        content_before: BASELINE_CONTENT.data_collection_forms,
        content_after: 'https://unknown-server.com/collect::email,patient_name,patient_phone,patient_ssn,credit_card',
      },
    ],
  },
];

export default function ShieldTestPage() {
  const [log, setLog] = useState<Array<{ time: string; msg: string; type: string }>>([]);
  const [running, setRunning] = useState(false);

  function addLog(msg: string, type: string = 'info') {
    setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  }

  function clearLog() { setLog([]); }

  // ── SHA-256 hash ──
  async function sha256(str: string): Promise<string> {
    const buffer = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Step 1: Create Test Provider ──
  async function createTestProvider() {
    setRunning(true);
    addLog('Creating test provider in registry...', 'info');

    try {
      const res = await fetch(`${API_BASE}/api/admin/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...TEST_PROVIDER,
          id: `TEST-${Date.now()}`,
          subscription_tier: 'shield',
          subscription_status: 'active',
          widget_status: 'active',
          is_visible: true,
          is_paid: true,
          risk_score: 85,
          status_label: 'Verified Sovereign',
        }),
      });

      if (res.ok) {
        addLog(`✅ Test provider created: ${TEST_PROVIDER.name} (NPI: ${TEST_NPI})`, 'success');
        addLog(`   subscription_tier: shield`, 'success');
      } else {
        // Try direct Supabase upsert
        addLog('⚠️ Admin API failed, trying direct insert...', 'warn');
        await createProviderDirect();
      }
    } catch (err: any) {
      addLog(`⚠️ API error: ${err.message}. Trying direct insert...`, 'warn');
      await createProviderDirect();
    }
    setRunning(false);
  }

  async function createProviderDirect() {
    try {
      // Use the widget API pattern to verify connectivity
      const checkRes = await fetch(`${API_BASE}/api/widget/baseline?npi=${TEST_NPI}&page_url=/`);
      const checkData = await checkRes.json();
      addLog(`API connectivity check: ${checkRes.ok ? 'OK' : 'Failed'}`, checkRes.ok ? 'success' : 'error');

      addLog('', 'info');
      addLog('⚠️ Cannot create provider directly from browser. Please run this SQL in Supabase:', 'warn');
      addLog('', 'info');
      addLog(`INSERT INTO registry (id, npi, name, url, email, city, zip, provider_type, subscription_tier, subscription_status, widget_status, is_visible, is_paid, risk_score, status_label)`, 'sql');
      addLog(`VALUES ('TEST-${Date.now()}', '${TEST_NPI}', '${TEST_PROVIDER.name}', '${TEST_PROVIDER.url}', '${TEST_PROVIDER.email}', '${TEST_PROVIDER.city}', '${TEST_PROVIDER.zip}', '${TEST_PROVIDER.provider_type}', 'shield', 'active', 'active', true, true, 85, 'Verified Sovereign')`, 'sql');
      addLog(`ON CONFLICT (npi) DO UPDATE SET subscription_tier = 'shield', subscription_status = 'active', widget_status = 'active', is_paid = true, risk_score = 85, status_label = 'Verified Sovereign';`, 'sql');
    } catch (e) {
      addLog('❌ Connectivity check failed', 'error');
    }
  }

  // ── Step 2: Seed Baselines ──
  async function seedBaselines() {
    setRunning(true);
    addLog('Seeding compliance baselines for test provider...', 'info');

    try {
      const categories: Record<string, { hash: string; content: string }> = {};

      for (const [cat, content] of Object.entries(BASELINE_CONTENT)) {
        const hash = await sha256(content);
        categories[cat] = { hash, content: content.substring(0, 500) };
        addLog(`  Hashed ${cat}: ${hash.substring(0, 16)}...`, 'info');
      }

      const res = await fetch(`${API_BASE}/api/widget/baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npi: TEST_NPI,
          page_url: '/',
          categories,
          framework: 'tx_sb1188_hb149',
        }),
      });

      const data = await res.json();
      if (data.ok) {
        addLog(`✅ Baselines seeded: ${data.upserted} categories`, 'success');
      } else {
        addLog(`❌ Baseline seed failed: ${JSON.stringify(data)}`, 'error');
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`, 'error');
    }
    setRunning(false);
  }

  // ── Step 3: Send Heartbeat ──
  async function sendHeartbeat() {
    setRunning(true);
    addLog('Sending widget heartbeat...', 'info');

    try {
      const categoryHashes: Record<string, string> = {};
      for (const [cat, content] of Object.entries(BASELINE_CONTENT)) {
        categoryHashes[cat] = await sha256(content);
      }

      const res = await fetch(`${API_BASE}/api/widget/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npi: TEST_NPI,
          page_url: '/',
          widget_mode: 'shield',
          category_hashes: categoryHashes,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        addLog('✅ Heartbeat sent — widget is now "live" in dashboard', 'success');
      } else {
        addLog(`❌ Heartbeat failed: ${JSON.stringify(data)}`, 'error');
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`, 'error');
    }
    setRunning(false);
  }

  // ── Step 4: Trigger Drift Event ──
  async function triggerDrift(scenarioId: string) {
    const scenario = DRIFT_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    setRunning(true);
    addLog(`🚨 Triggering drift: ${scenario.label}`, 'drift');

    try {
      // Hash the before/after content
      const drifts = [];
      for (const drift of scenario.drifts) {
        const previousHash = drift.content_before ? await sha256(drift.content_before) : null;
        const currentHash = drift.content_after ? await sha256(drift.content_after) : await sha256('');

        drifts.push({
          category: drift.category,
          drift_type: drift.drift_type,
          previous_hash: previousHash,
          current_hash: currentHash,
          content_before: drift.content_before,
          content_after: drift.content_after,
        });

        addLog(`  → ${drift.category}: ${drift.drift_type}`, 'drift');
      }

      const res = await fetch(`${API_BASE}/api/widget/drift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npi: TEST_NPI,
          page_url: '/',
          widget_mode: 'shield',
          drifts,
          timestamp: new Date().toISOString(),
          user_agent: 'KairoLogic Test Harness',
        }),
      });

      const data = await res.json();
      if (data.ok) {
        addLog(`✅ Drift reported: ${data.inserted} events inserted, ${data.deduplicated} deduplicated`, 'success');
        if (data.inserted > 0) {
          addLog(`   Check Admin Dashboard → Drift tab to see the events`, 'info');
          addLog(`   Check /dashboard/${TEST_NPI} for provider view`, 'info');
        }
      } else {
        addLog(`❌ Drift report failed: ${JSON.stringify(data)}`, 'error');
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`, 'error');
    }
    setRunning(false);
  }

  // ── Step 5: Check Status ──
  async function checkStatus() {
    setRunning(true);
    addLog('Checking system status...', 'info');

    try {
      // Check baselines
      const baseRes = await fetch(`${API_BASE}/api/widget/baseline?npi=${TEST_NPI}&page_url=/`);
      const baseData = await baseRes.json();
      const baseCount = baseData.baselines ? Object.keys(baseData.baselines).length : 0;
      addLog(`📋 Baselines: ${baseCount} categories ${baseCount > 0 ? '✅' : '❌ (need to seed)'}`, baseCount > 0 ? 'success' : 'warn');

      // Check drift events
      const driftRes = await fetch(`${API_BASE}/api/widget/drift?npi=${TEST_NPI}`);
      const driftData = await driftRes.json();
      const eventCount = driftData.events ? driftData.events.length : 0;
      const newCount = driftData.events ? driftData.events.filter((e: any) => e.status === 'new').length : 0;
      addLog(`🚨 Drift events: ${eventCount} total, ${newCount} new/open`, eventCount > 0 ? 'warn' : 'success');

      // Check shield dashboard access
      const dashRes = await fetch(`${API_BASE}/api/shield/dashboard?npi=${TEST_NPI}`);
      const dashData = await dashRes.json();
      if (dashData.error === 'access_denied') {
        addLog(`🔒 Shield dashboard: ACCESS DENIED — provider needs subscription_tier = 'shield'`, 'error');
        addLog(`   Run this SQL: UPDATE registry SET subscription_tier = 'shield' WHERE npi = '${TEST_NPI}';`, 'sql');
      } else if (dashData.error === 'provider_not_found') {
        addLog(`🔒 Shield dashboard: PROVIDER NOT FOUND — run Step 1 first`, 'error');
      } else if (dashData.provider) {
        addLog(`✅ Shield dashboard: accessible (tier: ${dashData.provider.subscription_tier}, access: ${dashData.provider.access_type})`, 'success');
        addLog(`   Heartbeats tracked: ${dashData.heartbeats?.length || 0}`, 'info');
      }

    } catch (err: any) {
      addLog(`❌ Status check error: ${err.message}`, 'error');
    }
    setRunning(false);
  }

  // ── Cleanup ──
  async function cleanup() {
    addLog('🧹 To clean up test data, run in Supabase SQL Editor:', 'warn');
    addLog(`DELETE FROM drift_events WHERE npi = '${TEST_NPI}';`, 'sql');
    addLog(`DELETE FROM compliance_baselines WHERE npi = '${TEST_NPI}';`, 'sql');
    addLog(`DELETE FROM widget_heartbeats WHERE npi = '${TEST_NPI}';`, 'sql');
    addLog(`DELETE FROM registry WHERE npi = '${TEST_NPI}';`, 'sql');
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A192F] to-[#1a365d] text-white rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={24} className="text-[#C5A059]" />
            <h1 className="text-xl font-bold">Sentry Shield — E2E Test Harness</h1>
          </div>
          <p className="text-xs text-slate-400">
            Test the complete drift detection pipeline: widget → API → database → admin dashboard → provider dashboard
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded font-mono">Test NPI: {TEST_NPI}</span>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded font-mono">Provider: {TEST_PROVIDER.name}</span>
          </div>
        </div>

        {/* Test Flow */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Play size={16} className="text-blue-500" /> Test Flow (run in order)
          </h2>

          {/* Step 1 */}
          <div className="border border-slate-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-xs font-bold text-slate-700">Create Test Provider</h3>
              </div>
              <button onClick={createTestProvider} disabled={running}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Database size={10} /> Create Provider
              </button>
            </div>
            <p className="text-[10px] text-slate-500 ml-8">
              Creates &ldquo;{TEST_PROVIDER.name}&rdquo; in the registry with subscription_tier=&lsquo;shield&rsquo;.
              If API fails, SQL will be shown to run manually.
            </p>
          </div>

          {/* Step 2 */}
          <div className="border border-slate-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-xs font-bold text-slate-700">Seed Compliance Baselines</h3>
              </div>
              <button onClick={seedBaselines} disabled={running}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">
                <CheckCircle size={10} /> Seed Baselines
              </button>
            </div>
            <p className="text-[10px] text-slate-500 ml-8">
              Creates the &ldquo;known good&rdquo; baseline for 7 compliance categories.
              This is normally done after a full scan.
            </p>
          </div>

          {/* Step 3 */}
          <div className="border border-slate-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-xs font-bold text-slate-700">Send Widget Heartbeat</h3>
              </div>
              <button onClick={sendHeartbeat} disabled={running}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50">
                <Activity size={10} /> Send Heartbeat
              </button>
            </div>
            <p className="text-[10px] text-slate-500 ml-8">
              Simulates the widget phoning home. Creates a heartbeat record so the widget shows as &ldquo;LIVE&rdquo; in dashboards.
            </p>
          </div>

          {/* Step 4 */}
          <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">4</span>
              <h3 className="text-xs font-bold text-slate-700">Trigger Drift Events</h3>
            </div>
            <p className="text-[10px] text-slate-500 ml-8 mb-3">
              Simulate compliance changes. Each scenario sends drift events to the API just like the real widget would.
            </p>
            <div className="ml-8 space-y-2">
              {DRIFT_SCENARIOS.map(scenario => (
                <div key={scenario.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">{scenario.label}</div>
                    <div className="text-[10px] text-slate-500">{scenario.description}</div>
                  </div>
                  <button onClick={() => triggerDrift(scenario.id)} disabled={running}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 flex-shrink-0">
                    <Zap size={10} /> Trigger
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Step 5 */}
          <div className="border border-slate-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">5</span>
                <h3 className="text-xs font-bold text-slate-700">Verify Results</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={checkStatus} disabled={running}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white text-[10px] font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  <Eye size={10} /> Check Status
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 ml-8 mb-3">
              Check system status, then verify in the dashboards:
            </p>
            <div className="ml-8 flex flex-wrap gap-2">
              <a href="/admin/dashboard" target="_blank"
                className="flex items-center gap-1 px-3 py-1.5 bg-[#0A192F] text-white text-[10px] font-bold rounded-lg hover:bg-[#1a365d]">
                <Shield size={10} /> Admin Dashboard → Drift Tab <ExternalLink size={8} />
              </a>
              <a href={`/dashboard/${TEST_NPI}`} target="_blank"
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700">
                <Shield size={10} /> Provider Shield Dashboard <ExternalLink size={8} />
              </a>
            </div>
          </div>

          {/* Cleanup */}
          <div className="border border-red-200 bg-red-50/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 size={14} className="text-red-500" />
                <h3 className="text-xs font-bold text-red-700">Cleanup Test Data</h3>
              </div>
              <button onClick={cleanup}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700">
                <Trash2 size={10} /> Show Cleanup SQL
              </button>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Event Log</h2>
            <button onClick={clearLog} className="text-[10px] text-slate-400 hover:text-slate-600">Clear</button>
          </div>
          <div className="bg-[#0f172a] p-4 max-h-[400px] overflow-y-auto font-mono text-[11px] leading-relaxed"
               style={{ minHeight: '120px' }}>
            {log.length === 0 ? (
              <span className="text-slate-500">Run steps 1-5 above to test the drift engine...</span>
            ) : (
              log.map((entry, i) => (
                <div key={i} className={
                  entry.type === 'success' ? 'text-green-400' :
                  entry.type === 'error' ? 'text-red-400' :
                  entry.type === 'warn' ? 'text-amber-400' :
                  entry.type === 'drift' ? 'text-purple-400 font-bold' :
                  entry.type === 'sql' ? 'text-cyan-300 bg-cyan-900/20 px-2 py-0.5 rounded my-0.5 inline-block' :
                  'text-slate-400'
                }>
                  {entry.msg ? `[${entry.time}] ${entry.msg}` : ''}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Quick Reference: End-to-End Test Flow</h2>
          <div className="text-[11px] text-slate-600 space-y-3">
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <strong>Create test provider</strong> — Inserts a provider with NPI {TEST_NPI} and subscription_tier=&lsquo;shield&rsquo; into the registry.
                If the button fails (no admin API for inserts), copy the SQL from the log and run it in Supabase SQL Editor.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <strong>Seed baselines</strong> — POSTs compliance content hashes to <code className="bg-slate-100 px-1 rounded">/api/widget/baseline</code>. 
                This establishes the &ldquo;known good&rdquo; state that drift is measured against. Without baselines, no drift can be detected.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <strong>Send heartbeat</strong> — POSTs to <code className="bg-slate-100 px-1 rounded">/api/widget/heartbeat</code>.
                Creates a heartbeat record so the widget shows as &ldquo;LIVE&rdquo; in both Admin Drift tab and Provider Shield dashboard.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <div>
                <strong>Trigger drift</strong> — POSTs simulated drift events to <code className="bg-slate-100 px-1 rounded">/api/widget/drift</code>. 
                Each scenario mimics a real compliance change. The API assigns severity, deduplicates, and triggers alerts for critical/high events.
                Events are deduplicated within 1 hour — wait or use a different scenario to see new events.
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
              <div>
                <strong>Verify in dashboards</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside text-slate-500">
                  <li><strong>Admin Dashboard → Drift tab:</strong> See all events, heartbeats, acknowledge/resolve events, bulk resolve</li>
                  <li><strong>Provider Dashboard (/dashboard/{TEST_NPI}):</strong> See compliance score, open alerts, widget status, event details, monitored categories</li>
                  <li>In Admin, try changing an event status to &ldquo;resolved&rdquo; — it should move to the Resolved filter in both dashboards</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
