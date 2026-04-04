'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──
interface Question {
  id: string;
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  click_count: number;
  is_active: boolean;
}

interface Answer {
  summary: string;
  stat_highlight: { value: string; label: string };
  gated: boolean;
  followUp?: string;
}

interface HeroStatsData {
  total_providers: string;
  total_exclusions: string;
  states_covered: string;
  specialties_indexed: string;
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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [showGating, setShowGating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'alerts' | 'providers' | 'payer'>('alerts');
  const [resolvedAlerts, setResolvedAlerts] = useState<Set<number>>(new Set());
  const [highlightedAlerts, setHighlightedAlerts] = useState<Set<number>>(new Set());
  const [resolvingAlert, setResolvingAlert] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout>();

  const providersCount = useCounter(1847, 800);
  const complianceScore = useCounter(94, 800);

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch('/api/public/hero-questions');
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch (error) {
        console.error('Failed to fetch questions:', error);
      }
    };
    fetchQuestions();
  }, []);

  // Handle question click
  const handleQuestionClick = useCallback(
    async (question: Question) => {
      if (questionsUsed >= 3) {
        setShowGating(true);
        return;
      }

      setSelectedQuestion(question);
      setLoading(true);
      setScanning(true);
      setScanProgress(0);
      setAnswer(null);

      const scanDuration = 2500;
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
      }, 100);

      try {
        const res = await fetch('/api/public/answer-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question.question_text }),
        });
        const data: Answer = await res.json();
        setAnswer(data);
        setQuestionsUsed((prev) => prev + 1);

        // Highlight related alerts
        const relatedIds = new Set<number>();
        ALERTS.forEach((alert) => {
          if (
            question.question_text.toLowerCase().includes('alert') ||
            alert.relatedTopics.some((topic) =>
              question.question_text.toLowerCase().includes(topic),
            )
          ) {
            relatedIds.add(alert.id);
          }
        });
        setHighlightedAlerts(relatedIds);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => setHighlightedAlerts(new Set()), 2000);
      } catch (error) {
        console.error('Failed to fetch answer:', error);
      } finally {
        setLoading(false);
      }
    },
    [questionsUsed],
  );

  const handleResolveAlert = (alertId: number) => {
    setResolvingAlert(alertId);
    setTimeout(() => {
      setResolvedAlerts((prev) => new Set(prev).add(alertId));
      setResolvingAlert(null);
    }, 1500);
  };

  const handleTabChange = (tab: 'alerts' | 'providers' | 'payer') => {
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
          {scanning && (
            <>
              <span className="m-scan-pulse" />
              <span>Scanning</span>
            </>
          )}
        </div>
      </div>

      {/* ── Embedded question bar (toolbar) ── */}
      <div className="m-dash-toolbar">
        <div className="m-dash-search-row">
          <span className="m-dash-search-icon">{'\u{1f50d}'}</span>
          <span className="m-dash-search-label">
            Ask about provider compliance, data discrepancies, or regulations
          </span>
          <span className="m-dash-questions-badge">{3 - questionsUsed} free</span>
        </div>
        <div className="m-dash-chips">
          {questions.slice(0, 3).map((q) => (
            <button
              key={q.id}
              onClick={() => handleQuestionClick(q)}
              className={`m-dash-chip ${selectedQuestion?.id === q.id ? 'm-dash-chip-active' : ''}`}
            >
              {q.question_text}
            </button>
          ))}
          {questions.length === 0 && (
            <>
              <span className="m-dash-chip m-dash-chip-skeleton" />
              <span className="m-dash-chip m-dash-chip-skeleton" />
              <span className="m-dash-chip m-dash-chip-skeleton" />
            </>
          )}
        </div>
      </div>

      {/* ── Dashboard content ── */}
      <div className="m-dash-content" style={{ position: 'relative' }}>
        {/* Gating overlay */}
        {showGating && (
          <div className="m-dash-gating">
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              You&apos;ve used your 3 free questions.
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Sign up for a free trial to unlock unlimited provider intelligence.
            </div>
            <a href="/signup" className="m-dash-gating-btn">
              Start Free Trial
            </a>
          </div>
        )}

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

        {/* AI Insight card */}
        {answer && !loading && (
          <div className="m-dash-insight">
            <div className="m-dash-insight-label">{'\u2728'} AI Insight</div>
            <div className="m-dash-insight-question">{selectedQuestion?.question_text}</div>
            <div className="m-dash-insight-answer">{answer.summary}</div>
            {answer.stat_highlight && (
              <div className="m-dash-insight-stat">
                <strong>{answer.stat_highlight.value}</strong> {answer.stat_highlight.label}
              </div>
            )}
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
      `}</style>
    </div>
  );
}
