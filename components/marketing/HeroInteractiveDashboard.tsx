'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──
interface TickerEvent {
  id: string;
  icon: string;
  text: string;
  category: string;
  timestamp: string;
}

interface ProviderLookupResult {
  tier: 1 | 2 | 3;
  provider?: {
    name: string;
    npi: string;
    specialty?: string;
    state?: string;
    practice_name?: string;
    practice_url?: string;
  };
  indicators?: {
    address_verified: boolean | null;
    license_current: boolean | null;
    payer_directories: { matched: number; total: number } | null;
    ehr_detected: string | null;
    accepting_patients: boolean | null;
    specialty_listed: boolean | null;
    compliance_score: number | null;
  };
  aggregate_stats?: {
    total_providers: number;
    states_covered: string[];
  };
  message: string;
}

interface Alert {
  id: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  provider: string;
  npi: string;
  detail: string;
  payer?: string;
  timestamp: string;
  relatedTopics: string[];
}

// ── Fallback ticker events (used when API fails) ──
const FALLBACK_TICKER: TickerEvent[] = [
  {
    id: 'f1',
    icon: '\u{1f50d}',
    text: '1,847 provider websites scanned today',
    category: 'scan',
    timestamp: 'today',
  },
  {
    id: 'f2',
    icon: '\u{1f4cd}',
    text: '12 address mismatches detected in TX this week',
    category: 'delta',
    timestamp: 'this week',
  },
  {
    id: 'f3',
    icon: '\u{1f504}',
    text: '20,575 payer directory records synced across 6 payers',
    category: 'payer',
    timestamp: 'latest sync',
  },
  {
    id: 'f4',
    icon: '\u{1f6e1}\ufe0f',
    text: '8 compliance findings generated this week',
    category: 'compliance',
    timestamp: 'this week',
  },
  {
    id: 'f5',
    icon: '\u{1f4cb}',
    text: '47 provider licenses expiring within 30 days',
    category: 'license',
    timestamp: 'active',
  },
  {
    id: 'f6',
    icon: '\u{1f916}',
    text: '36 EHR/AI tools detected across provider websites',
    category: 'ai_tool',
    timestamp: 'cumulative',
  },
  {
    id: 'f7',
    icon: '\u26a0\ufe0f',
    text: '23 payer directory mismatches awaiting resolution',
    category: 'payer',
    timestamp: 'active',
  },
  {
    id: 'f8',
    icon: '\u{1f4de}',
    text: '5 phone number discrepancies flagged',
    category: 'delta',
    timestamp: 'this week',
  },
];

// ── Indicator display config ──
const INDICATOR_CONFIG: {
  key: string;
  label: string;
  getStatus: (ind: ProviderLookupResult['indicators']) => 'pass' | 'fail' | 'unknown' | 'info';
  getValue: (ind: ProviderLookupResult['indicators']) => string;
}[] = [
  {
    key: 'address',
    label: 'Address Verified',
    getStatus: (ind) =>
      ind?.address_verified === true
        ? 'pass'
        : ind?.address_verified === false
          ? 'fail'
          : 'unknown',
    getValue: (ind) =>
      ind?.address_verified === true
        ? 'Verified'
        : ind?.address_verified === false
          ? 'Mismatch'
          : '\u2014',
  },
  {
    key: 'license',
    label: 'License Current',
    getStatus: (ind) =>
      ind?.license_current === true ? 'pass' : ind?.license_current === false ? 'fail' : 'unknown',
    getValue: (ind) =>
      ind?.license_current === true
        ? 'Current'
        : ind?.license_current === false
          ? 'Expired/Issue'
          : '\u2014',
  },
  {
    key: 'payer',
    label: 'Payer Directories',
    getStatus: (ind) => {
      if (!ind?.payer_directories) return 'unknown';
      return ind.payer_directories.matched >= ind.payer_directories.total ? 'pass' : 'fail';
    },
    getValue: (ind) =>
      ind?.payer_directories
        ? `${ind.payer_directories.matched}/${ind.payer_directories.total} matched`
        : '\u2014',
  },
  {
    key: 'ehr',
    label: 'EHR Detected',
    getStatus: (ind) => (ind?.ehr_detected ? 'info' : 'unknown'),
    getValue: (ind) => ind?.ehr_detected || '\u2014',
  },
  {
    key: 'accepting',
    label: 'Accepting Patients',
    getStatus: (ind) =>
      ind?.accepting_patients === true
        ? 'pass'
        : ind?.accepting_patients === false
          ? 'fail'
          : 'unknown',
    getValue: (ind) =>
      ind?.accepting_patients === true
        ? 'Yes'
        : ind?.accepting_patients === false
          ? 'No'
          : '\u2014',
  },
  {
    key: 'specialty',
    label: 'Specialty Listed',
    getStatus: (ind) => (ind?.specialty_listed ? 'pass' : 'unknown'),
    getValue: (ind) => (ind?.specialty_listed ? 'Yes' : '\u2014'),
  },
];

// ── Simulated dashboard data ──
const ALERTS: Alert[] = [
  {
    id: 1,
    type: 'payer_mismatch',
    severity: 'high',
    provider: 'Dr. Sarah Chen',
    npi: '1234567890',
    detail: 'Address mismatch on Aetna directory',
    payer: 'Aetna',
    timestamp: '2 min ago',
    relatedTopics: ['address', 'payer', 'mismatch'],
  },
  {
    id: 2,
    type: 'credential_expiry',
    severity: 'medium',
    provider: 'Dr. James Wilson',
    npi: '9876543210',
    detail: 'TX Medical License expires in 14 days',
    timestamp: '5 min ago',
    relatedTopics: ['license', 'expiring', 'credential'],
  },
  {
    id: 3,
    type: 'oig_flag',
    severity: 'critical',
    provider: 'Dr. Maria Garcia',
    npi: '5551234567',
    detail: 'New OIG exclusion match detected',
    timestamp: '8 min ago',
    relatedTopics: ['oig', 'exclusion'],
  },
  {
    id: 4,
    type: 'nppes_drift',
    severity: 'low',
    provider: 'Dr. Robert Kim',
    npi: '4445556666',
    detail: 'Specialty taxonomy updated in NPPES',
    timestamp: '12 min ago',
    relatedTopics: ['npi', 'nppes', 'taxonomy'],
  },
  {
    id: 5,
    type: 'website_drift',
    severity: 'medium',
    provider: 'Dr. Lisa Park',
    npi: '7778889999',
    detail: 'Phone number differs on practice website',
    timestamp: '15 min ago',
    relatedTopics: ['website', 'phone', 'outdated'],
  },
];

const PROVIDERS_TABLE = [
  {
    name: 'Dr. Sarah Chen',
    npi: '1234567890',
    specialty: 'Internal Medicine',
    status: 'Issues Found',
    statusColor: 'red',
  },
  {
    name: 'Dr. James Wilson',
    npi: '9876543210',
    specialty: 'Cardiology',
    status: 'Expiring',
    statusColor: 'amber',
  },
  {
    name: 'Dr. Maria Garcia',
    npi: '5551234567',
    specialty: 'Family Medicine',
    status: 'OIG Flag',
    statusColor: 'red',
  },
  {
    name: 'Dr. Robert Kim',
    npi: '4445556666',
    specialty: 'Orthopedics',
    status: 'Active',
    statusColor: 'green',
  },
  {
    name: 'Dr. Lisa Park',
    npi: '7778889999',
    specialty: 'Pediatrics',
    status: 'Warning',
    statusColor: 'amber',
  },
];

const CROSS_SOURCE_DATA = [
  {
    field: 'Address',
    nppes: '123 Main St',
    uhc: '123 Main St',
    aetna: '456 Oak Ave',
    cigna: '123 Main St',
    bcbs: '123 Main St',
  },
  {
    field: 'Phone',
    nppes: '(555) 123-4567',
    uhc: '(555) 123-4567',
    aetna: '(555) 123-4567',
    cigna: '(555) 999-0000',
    bcbs: '(555) 123-4567',
  },
  {
    field: 'Specialty',
    nppes: 'Internal Med',
    uhc: 'Internal Med',
    aetna: 'Family Med',
    cigna: 'Internal Med',
    bcbs: 'Internal Med',
  },
];

const PAYER_SYNC = [
  { name: 'Aetna', status: 'Synced', lastSync: '2 hours ago', issues: 3, color: '#7C3AED' },
  { name: 'BCBS', status: 'Synced', lastSync: '1 hour ago', issues: 0, color: '#2563EB' },
  { name: 'Cigna', status: 'Syncing...', lastSync: 'In progress', issues: 1, color: '#059669' },
  { name: 'UHC', status: 'Synced', lastSync: '30 min ago', issues: 0, color: '#D97706' },
];

const SEVERITY_CONFIG = {
  critical: { color: '#EF4444', bg: '#FEF2F2', label: 'CRITICAL' },
  high: { color: '#DC2626', bg: '#FEF2F2', label: 'HIGH' },
  medium: { color: '#F59E0B', bg: '#FFFBEB', label: 'MEDIUM' },
  low: { color: '#64748B', bg: '#F1F5F9', label: 'LOW' },
};

const TYPE_ICONS: Record<string, string> = {
  payer_mismatch: '\u{1f3e5}',
  credential_expiry: '\u{1f4cb}',
  oig_flag: '\u26a0\ufe0f',
  nppes_drift: '\u{1f504}',
  website_drift: '\u{1f310}',
};

const SCAN_SOURCES = ['NPPES', 'OIG', 'TMB', 'Aetna', 'BCBS', 'Cigna', 'UHC', 'Web'];

// ── Animated counter ──
const useCounter = (target: number, duration: number = 800) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return count;
};

// ── Main Component ──
export default function HeroInteractiveDashboard() {
  // ── Ticker state ──
  const [tickerEvents, setTickerEvents] = useState<TickerEvent[]>(FALLBACK_TICKER);
  const [activeTickerIdx, setActiveTickerIdx] = useState(0);

  // ── Provider lookup state ──
  const [searchInput, setSearchInput] = useState('');
  const [lookupResult, setLookupResult] = useState<ProviderLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // ── Dashboard state (unchanged) ──
  const [activeTab, setActiveTab] = useState<'alerts' | 'providers' | 'payer'>('alerts');
  const [resolvedAlerts, setResolvedAlerts] = useState<Set<number>>(new Set());
  const [highlightedAlerts, setHighlightedAlerts] = useState<Set<number>>(new Set());
  const [resolvingAlert, setResolvingAlert] = useState<number | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const providersCount = useCounter(1847, 800);
  const complianceScore = useCounter(94, 800);

  // Fetch ticker events on mount
  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const res = await fetch('/api/public/ticker-events');
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          setTickerEvents(data.events);
        }
      } catch {
        // Keep fallback events
      }
    };
    fetchTicker();
  }, []);

  // Auto-rotate ticker every 3 seconds (only when no lookup result shown)
  useEffect(() => {
    if (lookupResult) return;
    const interval = setInterval(() => {
      setActiveTickerIdx((prev) => (prev + 1) % tickerEvents.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tickerEvents.length, lookupResult]);

  // Handle provider lookup submission
  const handleSearchSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchInput.trim()) return;

      setHasInteracted(true);
      setLookupLoading(true);
      setLookupResult(null);
      setScanning(true);
      setScanProgress(0);

      // Scan animation
      const scanDuration = 1800;
      const scanStart = Date.now();
      const scanInterval = setInterval(() => {
        const elapsed = Date.now() - scanStart;
        const progress = Math.min(
          (elapsed / scanDuration) * SCAN_SOURCES.length,
          SCAN_SOURCES.length,
        );
        setScanProgress(progress);
        if (elapsed >= scanDuration) {
          clearInterval(scanInterval);
          setScanning(false);
        }
      }, 80);

      try {
        const res = await fetch(
          `/api/public/provider-lookup?q=${encodeURIComponent(searchInput.trim())}`,
        );
        const data: ProviderLookupResult = await res.json();
        setLookupResult(data);
      } catch {
        setLookupResult({
          tier: 3,
          aggregate_stats: { total_providers: 57503, states_covered: ['TX', 'CA'] },
          message: 'Lookup temporarily unavailable. We monitor 57,503+ providers across TX and CA.',
        });
      } finally {
        setLookupLoading(false);
      }
    },
    [searchInput],
  );

  // Clear lookup to return to ticker
  const handleClearLookup = useCallback(() => {
    setLookupResult(null);
    setSearchInput('');
  }, []);

  const handleResolveAlert = (alertId: number) => {
    setResolvingAlert(alertId);
    setTimeout(() => {
      setResolvedAlerts((prev) => new Set(prev).add(alertId));
      setResolvingAlert(null);
    }, 1500);
  };

  const handleTabChange = (tab: 'alerts' | 'providers' | 'payer') => {
    setHasInteracted(true);
    setResolvedAlerts(new Set());
    setActiveTab(tab);
  };

  const activeAlerts = ALERTS.filter((a) => !resolvedAlerts.has(a.id));

  return (
    <div className="m-dashboard-interactive">
      {/* ── macOS Chrome title bar ── */}
      <div className="m-dash-titlebar">
        <div className="m-dash-dots">
          <span className="m-dot m-dot-red" />
          <span className="m-dot m-dot-yellow" />
          <span className="m-dot m-dot-green" />
        </div>
        <div className="m-dash-title">KairoLogic Dashboard</div>
        <div className="m-dash-scan-indicator">
          {scanning ? (
            <>
              <span className="m-scan-pulse" />
              <span>Scanning</span>
            </>
          ) : (
            <span className="m-dash-interactive-badge">Interactive Demo</span>
          )}
        </div>
      </div>

      {/* ── Provider lookup bar (toolbar) ── */}
      <div className="m-dash-toolbar">
        <form className="m-dash-search-row" onSubmit={handleSearchSubmit}>
          <span className="m-dash-search-icon">{'\u{1f50d}'}</span>
          <input
            type="text"
            className="m-dash-search-input"
            placeholder="Look up any provider — enter name or NPI"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {lookupResult ? (
            <button
              type="button"
              onClick={handleClearLookup}
              className="m-dash-questions-badge"
              style={{ cursor: 'pointer', border: 'none', background: '#f3f4f6' }}
            >
              {'\u2715'} Clear
            </button>
          ) : (
            <span className="m-dash-questions-badge">Free lookup</span>
          )}
        </form>
        {!hasInteracted && (
          <div className="m-dash-chips-row">
            <span className="m-dash-try-hint">Try:</span>
            <div className="m-dash-chips">
              {['Rekha Kalidindi', 'Sarah Chen', '1234567890'].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setSearchInput(example);
                    // Auto-submit after setting
                    setTimeout(() => {
                      const form = document.querySelector('.m-dash-search-row') as HTMLFormElement;
                      form?.requestSubmit();
                    }, 50);
                  }}
                  className="m-dash-chip m-dash-chip-pulse"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Dashboard content ── */}
      <div className="m-dash-content" style={{ position: 'relative' }}>
        {/* Scan progress */}
        {scanning && (
          <div className="m-dash-scan-bar">
            <div className="m-dash-scan-track">
              <div
                className="m-dash-scan-fill"
                style={{ width: `${(scanProgress / SCAN_SOURCES.length) * 100}%` }}
              />
            </div>
            <div className="m-dash-scan-sources">
              {SCAN_SOURCES.map((source, idx) => (
                <span key={source} style={{ opacity: idx < Math.floor(scanProgress) ? 1 : 0.35 }}>
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Provider Lookup Result Card (Tier 1 or 2) ── */}
        {lookupResult && !lookupLoading && lookupResult.tier <= 2 && lookupResult.provider && (
          <div
            className="m-dash-insight"
            style={{
              background: lookupResult.tier === 1 ? '#f0fdf4' : '#fffbeb',
              border: lookupResult.tier === 1 ? '1px solid #bbf7d0' : '1px solid #fde68a',
            }}
          >
            <div
              className="m-dash-insight-label"
              style={{ color: lookupResult.tier === 1 ? '#166534' : '#92400e' }}
            >
              {lookupResult.tier === 1 ? '\u2705 Actively Monitored' : '\u{1f4cb} Found in NPPES'}
            </div>
            <div className="m-dash-insight-question">
              {lookupResult.provider.name}
              {lookupResult.provider.npi && (
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8, fontSize: 12 }}>
                  NPI: {lookupResult.provider.npi}
                </span>
              )}
            </div>
            {lookupResult.provider.practice_name && (
              <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 6 }}>
                {lookupResult.provider.practice_name}
                {lookupResult.provider.state && ` \u00b7 ${lookupResult.provider.state}`}
              </div>
            )}
            {lookupResult.provider.specialty && (
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                {lookupResult.provider.specialty}
              </div>
            )}

            {/* Tier 1: Indicator checklist */}
            {lookupResult.tier === 1 && lookupResult.indicators && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px 16px',
                  marginTop: 4,
                }}
              >
                {INDICATOR_CONFIG.map((cfg) => {
                  const status = cfg.getStatus(lookupResult.indicators!);
                  const value = cfg.getValue(lookupResult.indicators!);
                  const icon =
                    status === 'pass'
                      ? '\u2705'
                      : status === 'fail'
                        ? '\u274c'
                        : status === 'info'
                          ? '\u{1f4a1}'
                          : '\u2014';
                  return (
                    <div
                      key={cfg.key}
                      style={{
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 0',
                        color: status === 'unknown' ? '#9ca3af' : '#374151',
                      }}
                    >
                      <span style={{ width: 16, textAlign: 'center' }}>{icon}</span>
                      <span style={{ fontWeight: 500 }}>{cfg.label}:</span>
                      <span
                        style={{
                          color:
                            status === 'pass'
                              ? '#16a34a'
                              : status === 'fail'
                                ? '#dc2626'
                                : status === 'info'
                                  ? '#2563eb'
                                  : '#9ca3af',
                          filter: status === 'unknown' ? 'blur(3px)' : 'none',
                        }}
                      >
                        {status === 'unknown' ? 'Hidden' : value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tier 2: Limited data notice */}
            {lookupResult.tier === 2 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px 16px',
                  marginTop: 4,
                }}
              >
                {INDICATOR_CONFIG.map((cfg) => (
                  <div
                    key={cfg.key}
                    style={{
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '2px 0',
                      color: '#9ca3af',
                    }}
                  >
                    <span style={{ width: 16, textAlign: 'center' }}>{'\u2014'}</span>
                    <span style={{ fontWeight: 500 }}>{cfg.label}:</span>
                    <span style={{ filter: 'blur(3px)' }}>Hidden</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
              {lookupResult.message}
            </div>
            <a
              href="/signup"
              style={{
                display: 'inline-block',
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: '#2563eb',
                padding: '6px 14px',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              Get Full Report {'\u2192'}
            </a>
          </div>
        )}

        {/* ── Tier 3: No match card ── */}
        {lookupResult && !lookupLoading && lookupResult.tier === 3 && (
          <div
            className="m-dash-insight"
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
          >
            <div className="m-dash-insight-label" style={{ color: '#6b7280' }}>
              {'\u{1f50d}'} Provider Not Found
            </div>
            <div className="m-dash-insight-answer">{lookupResult.message}</div>
            <a
              href="/signup"
              style={{
                display: 'inline-block',
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: '#2563eb',
                padding: '6px 14px',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              Start Free Trial {'\u2192'}
            </a>
          </div>
        )}

        {/* ── Live Activity Ticker (default state, hidden when lookup result shown) ── */}
        {!lookupResult && !scanning && (
          <div
            className="m-dash-insight"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              minHeight: 60,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="m-dash-insight-label" style={{ color: '#475569' }}>
              {'\u{26a1}'} Live Activity
            </div>
            <div style={{ position: 'relative', height: 24 }}>
              {tickerEvents.map((evt, idx) => (
                <div
                  key={evt.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    fontSize: 13,
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: idx === activeTickerIdx ? 1 : 0,
                    transform: idx === activeTickerIdx ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                  }}
                >
                  <span>{evt.icon}</span>
                  <span>{evt.text}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                    {evt.timestamp}
                  </span>
                </div>
              ))}
            </div>
            {/* Ticker dots */}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
              {tickerEvents.slice(0, 8).map((_, idx) => (
                <span
                  key={idx}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: idx === activeTickerIdx % 8 ? '#2563eb' : '#cbd5e1',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="m-dash-stats-row">
          <div className="m-dash-stat" onClick={() => handleTabChange('providers')}>
            <div className="m-dash-stat-label">Providers Monitored</div>
            <div className="m-dash-stat-value">{providersCount.toLocaleString()}</div>
          </div>
          <div className="m-dash-stat" onClick={() => handleTabChange('alerts')}>
            <div className="m-dash-stat-label">Active Alerts</div>
            <div className="m-dash-stat-value">{activeAlerts.length}</div>
          </div>
          <div className="m-dash-stat">
            <div className="m-dash-stat-label">Compliance Score</div>
            <div className="m-dash-stat-value" style={{ color: '#10B981' }}>
              {complianceScore}%
            </div>
          </div>
          <div className="m-dash-stat">
            <div className="m-dash-stat-label">Last Scan</div>
            <div className="m-dash-stat-value m-dash-stat-sm">2m ago</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="m-dash-tabs">
          <button
            onClick={() => handleTabChange('alerts')}
            className={`m-dash-tab ${activeTab === 'alerts' ? 'm-dash-tab-active' : ''}`}
          >
            Compliance Alerts
            <span className="m-dash-tab-badge m-badge-red">{activeAlerts.length}</span>
          </button>
          <button
            onClick={() => handleTabChange('providers')}
            className={`m-dash-tab ${activeTab === 'providers' ? 'm-dash-tab-active' : ''}`}
          >
            Providers
          </button>
          <button
            onClick={() => handleTabChange('payer')}
            className={`m-dash-tab ${activeTab === 'payer' ? 'm-dash-tab-active' : ''}`}
          >
            Payer Sync
            <span className="m-dash-tab-badge m-badge-purple">4</span>
          </button>
        </div>

        {/* ── Alerts Tab ── */}
        {activeTab === 'alerts' && (
          <div className="m-dash-tab-content">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="m-dash-alert-row"
                style={{ background: highlightedAlerts.has(alert.id) ? '#fef3c7' : '#fff' }}
              >
                <div className="m-dash-alert-icon">{TYPE_ICONS[alert.type] || '\u{1f514}'}</div>
                <div className="m-dash-alert-body">
                  <div className="m-dash-alert-provider">{alert.provider}</div>
                  <div className="m-dash-alert-detail">{alert.detail}</div>
                  <div className="m-dash-alert-time">{alert.timestamp}</div>
                </div>
                <div
                  className="m-dash-severity"
                  style={{
                    background: SEVERITY_CONFIG[alert.severity].bg,
                    color: SEVERITY_CONFIG[alert.severity].color,
                  }}
                >
                  {SEVERITY_CONFIG[alert.severity].label}
                </div>
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  disabled={resolvingAlert === alert.id}
                  className="m-dash-resolve-btn"
                >
                  {resolvingAlert === alert.id ? '...' : 'Resolve'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Providers Tab ── */}
        {activeTab === 'providers' && (
          <div className="m-dash-tab-content">
            <table className="m-dash-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>NPI</th>
                  <th>Specialty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS_TABLE.map((p) => (
                  <tr key={p.npi}>
                    <td>{p.name}</td>
                    <td className="m-dash-td-muted">{p.npi}</td>
                    <td>{p.specialty}</td>
                    <td>
                      <span
                        className="m-dash-status-dot"
                        style={{
                          background:
                            p.statusColor === 'green'
                              ? '#10B981'
                              : p.statusColor === 'amber'
                                ? '#F59E0B'
                                : '#EF4444',
                        }}
                      />
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="m-dash-subsection-title">Cross-Source Data Accuracy</h4>
            <table className="m-dash-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>NPPES</th>
                  <th>UHC</th>
                  <th>Aetna</th>
                  <th>Cigna</th>
                  <th>BCBS</th>
                </tr>
              </thead>
              <tbody>
                {CROSS_SOURCE_DATA.map((row) => (
                  <tr key={row.field}>
                    <td style={{ fontWeight: 600 }}>{row.field}</td>
                    {(['nppes', 'uhc', 'aetna', 'cigna', 'bcbs'] as const).map((source) => {
                      const value = row[source];
                      const isMismatch = value !== row.nppes;
                      return (
                        <td
                          key={source}
                          style={{
                            color: isMismatch ? '#EF4444' : undefined,
                            background: isMismatch ? '#FEF2F2' : undefined,
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Payer Sync Tab ── */}
        {activeTab === 'payer' && (
          <div className="m-dash-tab-content">
            <div className="m-dash-payer-grid">
              {PAYER_SYNC.map((payer) => (
                <div
                  key={payer.name}
                  className="m-dash-payer-card"
                  style={{ borderLeftColor: payer.color }}
                >
                  <div className="m-dash-payer-header">
                    <span className="m-dash-payer-name">{payer.name}</span>
                    <span
                      className={`m-dash-payer-issues ${payer.issues > 0 ? 'm-issues-bad' : 'm-issues-ok'}`}
                    >
                      {payer.issues} issue{payer.issues !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="m-dash-payer-meta">
                    Status: <strong>{payer.status}</strong>
                  </div>
                  <div className="m-dash-payer-meta">Last sync: {payer.lastSync}</div>
                </div>
              ))}
            </div>

            <h4 className="m-dash-subsection-title">Compliance Rules</h4>
            <div className="m-dash-rules">
              <div className="m-dash-rule-row">
                <div>
                  <div className="m-dash-rule-name">SB 1188</div>
                  <div className="m-dash-rule-desc">Data sovereignty</div>
                </div>
                <div style={{ color: '#10B981', fontWeight: 600 }}>Active {'\u2713'}</div>
              </div>
              <div className="m-dash-rule-row">
                <div>
                  <div className="m-dash-rule-name">HB 149</div>
                  <div className="m-dash-rule-desc">AI transparency</div>
                </div>
                <div style={{ color: '#10B981', fontWeight: 600 }}>Active {'\u2713'}</div>
              </div>
              <div className="m-dash-rule-row">
                <div>
                  <div className="m-dash-rule-name">AB 3030</div>
                  <div className="m-dash-rule-desc">CA AI disclosure</div>
                </div>
                <div style={{ color: '#F59E0B', fontWeight: 600 }}>Monitoring</div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard footer */}
        <div className="m-dash-footer">
          <span>
            Showing {activeAlerts.length} of {ALERTS.length} alerts &bull; Last updated 2 min ago
          </span>
          <a href="/signup" className="m-dash-footer-link">
            View Full Dashboard &rarr;
          </a>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
        @keyframes chipPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); } 50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.3); } }
      `}</style>
    </div>
  );
}
