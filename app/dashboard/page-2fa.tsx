'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Activity, AlertTriangle, CheckCircle, Clock,
  Download, ExternalLink, Copy, RefreshCw, LogOut,
  ChevronRight, Bell, FileText, Map, Settings,
  BarChart3, Eye, Code, Calendar, Award
} from 'lucide-react';

// ─── Types ──────────────────────────────
interface DashboardData {
  provider: {
    npi: string; name: string; url: string; city: string;
    email: string; risk_score: number; risk_level: string;
    widget_status: string; subscription_status: string;
    last_scan_timestamp: string; latest_report_url: string; updated_at: string;
  };
  categories: Record<string, { name: string; score: number; percentage: number; level: string; passed: number; failed: number; }>;
  borderMap: Array<{
    domain: string; ip?: string; country: string; countryCode: string;
    city: string; isSovereign: boolean; purpose?: string;
  }>;
  scanHistory: Array<{
    id: string; scan_date: string; risk_score: number;
    risk_level: string; scan_type: string; findings_count: number;
  }>;
  violations: Array<{
    id: string; violation_name: string; violation_clause: string;
    technical_finding: string; recommended_fix: string;
    fix_priority: string; captured_at: string;
  }>;
  driftAlerts: Array<{
    id: string; type: string; severity: string; title: string;
    description: string; timestamp: string; resolved: boolean;
  }>;
  subscription: {
    tier: string; status: string; is_trial: boolean;
    trial_end: string | null; trial_days_remaining: number;
  };
}

// ─── Sidebar Nav Items ──────────────────
const NAV_ITEMS = [
  { section: 'Monitoring', items: [
    { key: 'overview', icon: BarChart3, label: 'Dashboard' },
    { key: 'border-map', icon: Map, label: 'Data Border Map' },
    { key: 'alerts', icon: Bell, label: 'Drift Alerts' },
    { key: 'history', icon: Calendar, label: 'Scan History' },
  ]},
  { section: 'Reports', items: [
    { key: 'audit', icon: FileText, label: 'Audit Report' },
    { key: 'quarterly', icon: FileText, label: 'Quarterly Report' },
    { key: 'certification', icon: Award, label: 'Annual Certification' },
  ]},
  { section: 'Tools', items: [
    { key: 'widget', icon: Code, label: 'Widget Settings' },
    { key: 'settings', icon: Settings, label: 'Settings' },
  ]},
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [session, setSession] = useState<{ token: string; npi: string; email: string } | null>(null);
  const [widgetCopied, setWidgetCopied] = useState(false);

  // 2FA PIN state
  const [pinRequired, setPinRequired] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [pendingNpi, setPendingNpi] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [trustDevice, setTrustDevice] = useState(true); // default checked

  // ─── Auth Flow ──────────────────────────
  useEffect(() => {
    const magicToken = searchParams.get('token');
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('kl_session') : null;

    if (magicToken) {
      // Verify magic link token
      verifyToken(magicToken);
    } else if (stored) {
      try {
        const s = JSON.parse(stored);
        if (s.token && s.npi) {
          setSession(s);
        } else {
          router.push('/dashboard/login');
        }
      } catch {
        router.push('/dashboard/login');
      }
    } else {
      router.push('/dashboard/login');
    }
  }, [searchParams, router]);

  const verifyToken = async (token: string) => {
    try {
      // Check for trusted device token in localStorage
      const deviceToken = typeof window !== 'undefined' ? localStorage.getItem('kl_device_token') : null;

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, device_token: deviceToken }),
      });
      const result = await res.json();

      if (res.ok && result.trusted_device && result.session_token) {
        // Trusted device — skip PIN, go straight to dashboard
        const s = { token: result.session_token, npi: result.npi, email: result.email };
        sessionStorage.setItem('kl_session', JSON.stringify(s));
        setSession(s);
        window.history.replaceState({}, '', '/dashboard');
      } else if (res.ok && result.requires_pin) {
        // New/untrusted device — show PIN entry
        setPinRequired(true);
        setPendingSessionId(result.pending_session_id);
        setEmailHint(result.email_hint);
        setPendingNpi(result.npi);
        setLoading(false);
        window.history.replaceState({}, '', '/dashboard');
      } else if (res.ok && result.session_token) {
        // Legacy fallback
        const s = { token: result.session_token, npi: result.npi, email: result.email };
        sessionStorage.setItem('kl_session', JSON.stringify(s));
        setSession(s);
        window.history.replaceState({}, '', '/dashboard');
      } else {
        setError(result.error || 'Invalid login link');
        setLoading(false);
      }
    } catch {
      setError('Failed to verify login link');
      setLoading(false);
    }
  };

  // ─── PIN Verification (2FA Step 2) ──────
  const verifyPin = async () => {
    if (!pin || pin.length !== 6) {
      setPinError('Please enter the 6-digit code');
      return;
    }
    setPinLoading(true);
    setPinError('');

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_session_id: pendingSessionId,
          pin,
          trust_device: trustDevice,
        }),
      });
      const result = await res.json();

      if (res.ok && result.session_token) {
        // Store session
        const s = { token: result.session_token, npi: result.npi, email: result.email };
        sessionStorage.setItem('kl_session', JSON.stringify(s));

        // Store device trust token in localStorage (survives browser close, 90 days)
        if (result.device_token) {
          localStorage.setItem('kl_device_token', result.device_token);
        }

        setSession(s);
        setPinRequired(false);
      } else if (result.locked) {
        setPinError('Too many attempts. Please request a new login link.');
        setAttemptsRemaining(0);
      } else {
        setPinError(result.error || 'Incorrect code');
        if (result.attempts_remaining !== undefined) {
          setAttemptsRemaining(result.attempts_remaining);
        }
        setPin('');
      }
    } catch {
      setPinError('Verification failed. Please try again.');
    }
    setPinLoading(false);
  };

  // ─── Fetch Dashboard Data ──────────────
  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/dashboard/${session.npi}`, {
        headers: { 'Authorization': `Bearer ${session.token}` },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('kl_session');
        router.push('/dashboard/login');
        return;
      }

      const result = await res.json();

      if (res.ok) {
        setData(result);
      } else {
        setError(result.error || 'Failed to load dashboard');
      }
    } catch {
      setError('Network error');
    }

    setLoading(false);
  }, [session, router]);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  const handleLogout = () => {
    sessionStorage.removeItem('kl_session');
    // Note: we keep kl_device_token in localStorage so they don't have to re-PIN next login.
    // To fully revoke device trust, they can click "Sign out & forget this device"
    router.push('/dashboard/login');
  };

  const handleFullLogout = () => {
    sessionStorage.removeItem('kl_session');
    localStorage.removeItem('kl_device_token');
    router.push('/dashboard/login');
  };

  const copyWidgetCode = () => {
    const code = `<!-- KairoLogic Sentry Compliance Widget -->\n<div id="kairologic-widget"></div>\n<script src="https://kairologic.net/sentry-widget.js" data-npi="${data?.provider.npi}" async></script>`;
    navigator.clipboard.writeText(code);
    setWidgetCopied(true);
    setTimeout(() => setWidgetCopied(false), 2000);
  };

  // ─── Loading / Error States ──────────────
  if (loading && !data && !pinRequired) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── PIN Entry Screen (2FA Step 2) ──────
  if (pinRequired && !session) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white mb-1">
              <span>KAIRO</span><span className="text-gold">LOGIC</span>
            </h1>
            <p className="text-[10px] text-gold uppercase tracking-[3px] font-semibold">Secure Dashboard Access</p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
            <div className="w-14 h-14 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Shield className="w-7 h-7 text-gold" />
            </div>

            <h2 className="text-lg font-bold text-white text-center mb-2">Enter Verification Code</h2>
            <p className="text-slate-400 text-xs text-center mb-6">
              We sent a 6-digit code to <strong className="text-white">{emailHint}</strong>
            </p>

            <div className="mb-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
                placeholder="000000"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-center text-2xl font-mono tracking-[8px] placeholder-white/20 focus:outline-none focus:border-gold/50 transition-colors"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            {pinError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-xs text-center">{pinError}</p>
              </div>
            )}

            {attemptsRemaining < 5 && attemptsRemaining > 0 && (
              <p className="text-amber-400 text-xs text-center mb-4">
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}

            <button
              onClick={verifyPin}
              disabled={pinLoading || pin.length !== 6 || attemptsRemaining === 0}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-gold text-navy hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pinLoading ? (
                <><div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> Verifying...</>
              ) : (
                'Verify & Continue'
              )}
            </button>

            <label className="flex items-center gap-3 mt-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold focus:ring-gold/50 cursor-pointer"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                Trust this device for 90 days
              </span>
            </label>

            <div className="mt-5 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-slate-500 text-[10px] mb-2">Code expires in 10 minutes</p>
              <a href="/dashboard/login" className="text-gold text-xs font-semibold hover:text-gold/80 transition-colors">
                Didn&apos;t receive it? Request a new link →
              </a>
            </div>
          </div>

          <p className="text-center text-slate-600 text-[10px] mt-6">
            🔒 Two-factor authentication protects your compliance data
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to Load Dashboard</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <Link href="/dashboard/login" className="inline-flex items-center gap-2 bg-gold text-navy font-bold px-6 py-3 rounded-lg">
            Back to Login <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { provider, categories, borderMap, scanHistory, violations, driftAlerts, subscription } = data;
  const score = provider.risk_score || 0;
  const openAlerts = driftAlerts.filter(a => !a.resolved).length;

  // ─── Score color helpers ──────────────
  const scoreColor = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = score >= 75 ? 'bg-green-500/10' : score >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10';
  const scoreLabel = score >= 75 ? 'Compliant' : score >= 50 ? 'Needs Work' : 'Violation Risk';
  const ringOffset = 377 - (score / 100) * 377;

  return (
    <div className="min-h-screen bg-navy flex">

      {/* ═══ SIDEBAR ═══ */}
      <div className="w-60 bg-[#0a1220] border-r border-white/[0.06] flex flex-col fixed inset-y-0 left-0 z-40">
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/">
            <h1 className="text-lg font-display font-extrabold">
              <span className="text-white">KAIRO</span>
              <span className="text-gold">LOGIC</span>
            </h1>
          </Link>
          <p className="text-gold text-[10px] font-bold uppercase tracking-[1.5px] mt-0.5">Sentry Shield</p>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {NAV_ITEMS.map(section => (
            <div key={section.section} className="mb-5">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-[1.2px] px-2 mb-1.5">
                {section.section}
              </div>
              {section.items.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    activeTab === item.key
                      ? 'bg-gold/10 text-gold font-bold'
                      : 'text-slate-400 hover:bg-white/[0.03] hover:text-white'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                  {item.key === 'alerts' && openAlerts > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{openAlerts}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              subscription.status === 'active' || subscription.is_trial
                ? 'bg-green-500/10 text-green-400'
                : 'bg-slate-500/10 text-slate-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {subscription.is_trial ? 'Shield Trial' : subscription.tier === 'shield' ? 'Shield Active' : subscription.tier === 'watch' ? 'Watch' : 'Inactive'}
            </span>
          </div>
          {subscription.is_trial && (
            <p className="text-[10px] text-slate-500">{subscription.trial_days_remaining} days remaining</p>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs mt-3 transition-colors">
            <LogOut size={12} /> Sign out
          </button>
          <button onClick={handleFullLogout} className="text-slate-600 hover:text-red-400 text-[10px] mt-1 transition-colors">
            Forget this device
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="ml-60 flex-1">

        {/* Top Bar */}
        <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-navy/80 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{provider.name}</h2>
            <p className="text-xs text-slate-500">NPI: {provider.npi} • {provider.url} • {provider.city}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white text-xs font-semibold transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <a href={provider.latest_report_url || '/sample-report.pdf'} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white text-xs font-semibold transition-colors">
              <Download size={13} /> Report
            </a>
            <button onClick={copyWidgetCode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gold text-navy text-xs font-bold transition-colors hover:bg-gold/90">
              <Code size={13} /> {widgetCopied ? 'Copied!' : 'Widget Code'}
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">

          {/* ═══ SUBSCRIPTION BANNER ═══ */}
          {subscription.is_trial && (
            <div className="flex items-center justify-between bg-green-500/5 border border-green-500/10 rounded-xl px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Sentry Shield — Active Trial</div>
                  <div className="text-xs text-slate-400">
                    24/7 monitoring • Last scan:{' '}
                    <span className="text-green-400 font-semibold">{formatTimeAgo(provider.last_scan_timestamp)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white font-semibold">Free Trial</div>
                <div className="text-[11px] text-slate-400">{subscription.trial_days_remaining} days remaining</div>
              </div>
            </div>
          )}

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && (
            <>
              {/* Score Hero */}
              <div className="grid grid-cols-[240px_1fr] gap-6">
                {/* Score Ring */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 text-center relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-green-500/5" />
                  <div className="relative w-36 h-36 mx-auto mb-4">
                    <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                      <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                      <circle cx="70" cy="70" r="60" fill="none" stroke={score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray="377" strokeDashoffset={ringOffset}
                        className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-mono font-extrabold text-white">{score}</span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${scoreColor}`}>{scoreLabel}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {scanHistory.length > 1 && (
                      <>
                        <span className="text-green-400 font-semibold">
                          +{score - (scanHistory[scanHistory.length - 1]?.risk_score || score)} pts
                        </span> since first scan
                      </>
                    )}
                  </div>
                </div>

                {/* Category Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(categories).length > 0 ? (
                    Object.entries(categories).map(([key, cat]: [string, any]) => (
                      <div key={key} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{cat.name}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            cat.percentage >= 75 ? 'bg-green-500/10 text-green-400' :
                            cat.percentage >= 50 ? 'bg-amber-500/10 text-amber-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {cat.percentage >= 75 ? 'Pass' : cat.percentage >= 50 ? 'Warn' : 'Fail'}
                          </span>
                        </div>
                        <div className="text-2xl font-mono font-extrabold text-white">
                          {cat.percentage}<span className="text-sm text-slate-500">%</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">{cat.passed} passed, {cat.failed} failed</div>
                        <div className="h-1 bg-white/[0.04] rounded-full mt-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${
                            cat.percentage >= 75 ? 'bg-green-500' : cat.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ width: `${cat.percentage}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {['Data Residency', 'AI Transparency', 'Clinical Integrity', 'Active Alerts'].map(name => (
                        <div key={name} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">{name}</div>
                          <div className="text-2xl font-mono font-extrabold text-white">—</div>
                          <div className="text-[11px] text-slate-500 mt-1">Run a scan to see results</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Recent Alerts + Scan History side by side */}
              <div className="grid grid-cols-2 gap-6">
                {/* Recent Scans */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Calendar size={15} /> Scan History
                  </h3>
                  {scanHistory.length > 0 ? scanHistory.slice(0, 5).map(scan => (
                    <div key={scan.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                      <div>
                        <div className="text-xs text-slate-300 font-medium">{formatDate(scan.scan_date)}</div>
                        <div className="text-[10px] text-slate-500">{scan.scan_type} scan • {scan.findings_count} findings</div>
                      </div>
                      <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md ${
                        scan.risk_score >= 75 ? 'bg-green-500/10 text-green-400' :
                        scan.risk_score >= 50 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {scan.risk_score} / 100
                      </span>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500 py-4">No scans yet</p>
                  )}
                </div>

                {/* Drift Alerts */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Bell size={15} /> Drift Alerts
                    {openAlerts > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{openAlerts}</span>}
                  </h3>
                  {driftAlerts.length > 0 ? driftAlerts.slice(0, 5).map(alert => (
                    <div key={alert.id} className="flex items-start gap-2.5 py-2.5 border-b border-white/[0.04] last:border-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        alert.resolved ? 'bg-green-500/10' : alert.severity === 'high' ? 'bg-red-500/10' : 'bg-amber-500/10'
                      }`}>
                        {alert.resolved ? <CheckCircle size={13} className="text-green-400" /> : <AlertTriangle size={13} className={alert.severity === 'high' ? 'text-red-400' : 'text-amber-400'} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-300 font-medium truncate">{alert.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatTimeAgo(alert.timestamp)}</div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500 py-4">No drift alerts</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═══ BORDER MAP TAB ═══ */}
          {activeTab === 'border-map' && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Map size={15} /> Data Border Map — Live</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Endpoint', 'IP Address', 'Location', 'Status', 'Last Check'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {borderMap.length > 0 ? borderMap.map((node, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-3 text-xs font-mono text-slate-300">{node.domain}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">{node.ip || '—'}</td>
                      <td className={`px-4 py-3 text-xs font-semibold ${node.isSovereign ? 'text-green-400' : 'text-red-400'}`}>
                        {node.isSovereign ? '🇺🇸' : '🌐'} {node.city}, {node.country}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${node.isSovereign ? 'text-green-400' : 'text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${node.isSovereign ? 'bg-green-400' : 'bg-red-400'}`} />
                          {node.isSovereign ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">{formatTimeAgo(provider.last_scan_timestamp)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">No border map data yet. Run a scan to populate.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══ ALERTS TAB ═══ */}
          {activeTab === 'alerts' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Bell size={15} /> All Drift Alerts</h3>
              {driftAlerts.length > 0 ? driftAlerts.map(alert => (
                <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-xl border ${
                  alert.resolved ? 'bg-green-500/5 border-green-500/10' : 'bg-white/[0.02] border-white/[0.06]'
                }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    alert.resolved ? 'bg-green-500/10' : alert.severity === 'high' ? 'bg-red-500/10' : 'bg-amber-500/10'
                  }`}>
                    {alert.resolved ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className={alert.severity === 'high' ? 'text-red-400' : 'text-amber-400'} />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white font-semibold">{alert.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{alert.description}</div>
                    <div className="text-[10px] text-slate-500 mt-2">{formatDate(alert.timestamp)} • {alert.severity} priority{alert.resolved ? ' • Resolved' : ''}</div>
                  </div>
                </div>
              )) : (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No drift alerts. Your site is stable.</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ SCAN HISTORY TAB ═══ */}
          {activeTab === 'history' && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Calendar size={15} /> Scan History</h3>
              </div>
              {scanHistory.length > 0 ? scanHistory.map(scan => (
                <div key={scan.id} className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] last:border-0">
                  <div>
                    <div className="text-sm text-slate-300 font-medium">{formatDate(scan.scan_date)}</div>
                    <div className="text-[11px] text-slate-500">{scan.scan_type} scan • {scan.findings_count} findings</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-mono text-sm font-bold ${
                      scan.risk_score >= 75 ? 'text-green-400' : scan.risk_score >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {scan.risk_score} / 100
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      scan.risk_score >= 75 ? 'bg-green-500/10 text-green-400' :
                      scan.risk_score >= 50 ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {scan.risk_level}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-8 text-center text-slate-500 text-sm">No scans recorded yet.</div>
              )}
            </div>
          )}

          {/* ═══ AUDIT REPORT TAB ═══ */}
          {activeTab === 'audit' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><FileText size={15} /> Audit Report</h3>

              {/* PDF Preview Card */}
              <div className="bg-white rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[25deg] text-3xl font-extrabold text-black/[0.03] pointer-events-none whitespace-nowrap">KAIROLOGIC</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-extrabold"><span className="text-navy">KAIRO</span><span className="text-gold">LOGIC</span></div>
                  <div className="text-[8px] text-gold font-bold uppercase tracking-[1.5px]">Sovereignty Audit Report</div>
                </div>
                <div className="bg-navy rounded-lg p-4 text-center mb-4">
                  <div className="text-3xl font-mono font-extrabold text-white">{score} <span className="text-lg text-slate-400">/ 100</span></div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${scoreColor}`}>{scoreLabel}</div>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mb-2">FINDINGS</div>
                {violations.slice(0, 5).map(v => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-slate-700">{v.violation_name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      v.fix_priority === 'Critical' ? 'bg-red-50 text-red-600' :
                      v.fix_priority === 'High' ? 'bg-amber-50 text-amber-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>{v.fix_priority.toUpperCase()}</span>
                  </div>
                ))}
              </div>

              <a href={provider.latest_report_url || '/sample-report.pdf'} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-navy-light border border-gold/20 text-gold font-bold py-3 rounded-lg hover:bg-navy-mid transition-colors">
                <Download size={16} /> Download Full Report (PDF)
              </a>
            </div>
          )}

          {/* ═══ WIDGET TAB ═══ */}
          {activeTab === 'widget' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Code size={15} /> Your Compliance Widget</h3>
              <p className="text-xs text-slate-400">Embed this on your website footer to show patients your compliance status.</p>

              {/* Widget Preview */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <div className="bg-[#0f172a] rounded-xl p-4 max-w-[260px]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full border-[3px] border-green-500 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-extrabold text-white">{score}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-xs font-bold text-white">Verified Compliant</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">TX SB 1188 &amp; HB 149</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Embed Code */}
              <div className="bg-[#0a1220] rounded-xl p-4 font-mono text-xs text-green-400 leading-relaxed overflow-x-auto">
                <span className="text-slate-500">&lt;!-- KairoLogic Sentry Compliance Widget --&gt;</span><br/>
                &lt;div id=&quot;kairologic-widget&quot;&gt;&lt;/div&gt;<br/>
                &lt;script src=&quot;https://kairologic.net/sentry-widget.js&quot;<br/>
                &nbsp;&nbsp;data-npi=&quot;{provider.npi}&quot; async&gt;<br/>
                &lt;/script&gt;
              </div>

              <div className="flex gap-2">
                <button onClick={copyWidgetCode}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.1] text-slate-300 hover:text-white font-semibold py-3 rounded-lg text-sm transition-colors">
                  <Copy size={14} /> {widgetCopied ? 'Copied!' : 'Copy Code'}
                </button>
                <Link href="/widget-install-test.html" target="_blank"
                  className="flex-1 flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.1] text-slate-300 hover:text-white font-semibold py-3 rounded-lg text-sm transition-colors">
                  <Eye size={14} /> Preview Live
                </Link>
              </div>
            </div>
          )}

          {/* ═══ PLACEHOLDER TABS ═══ */}
          {['quarterly', 'certification', 'settings'].includes(activeTab) && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-12 text-center">
              <Clock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">Coming Soon</h3>
              <p className="text-xs text-slate-500">
                {activeTab === 'quarterly' && 'Quarterly compliance reports will be generated automatically.'}
                {activeTab === 'certification' && 'Annual compliance certification will be available after 12 months of monitoring.'}
                {activeTab === 'settings' && 'Account settings, notification preferences, and billing management.'}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────
function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const now = new Date();
  const hrs = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-500">Loading dashboard...</p></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
