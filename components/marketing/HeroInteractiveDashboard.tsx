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
  payer_mismatch: '🏥',
  credential_expiry: '📋',
  oig_flag: '⚠️',
  nppes_drift: '🔄',
  website_drift: '🌐',
};

const SCAN_SOURCES = ['NPPES', 'OIG', 'TMB', 'Aetna', 'BCBS', 'Cigna', 'UHC', 'Web'];

// ── Helper: Animated counter hook ──
const useCounter = (target: number, duration: number = 800) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
};

// ── Main Component ──
export default function HeroInteractiveDashboard() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [freshQuestions, setFreshQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<HeroStatsData | null>(null);
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
  const scanTimeoutRef = useRef<NodeJS.Timeout>();
  const highlightTimeoutRef = useRef<NodeJS.Timeout>();

  // Animated counters
  const providersCount = useCounter(1847, 800);
  const alertsCount = useCounter(
    resolvedAlerts.size === 0 ? ALERTS.length : ALERTS.length - resolvedAlerts.size,
    600,
  );
  const complianceScore = useCounter(94, 800);

  // Fetch initial questions
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

    // Fetch fresh questions after 1s delay
    const freshTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/public/hero-questions/fresh');
        const data = await res.json();
        setFreshQuestions(data.questions || []);
      } catch (error) {
        console.error('Failed to fetch fresh questions:', error);
      }
    }, 1000);

    return () => clearTimeout(freshTimer);
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/public/hero-stats');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  // Handle question click
  const handleQuestionClick = useCallback(
    async (question: Question) => {
      if (questionsUsed >= 3 && !showGating) {
        setShowGating(true);
        return;
      }

      setSelectedQuestion(question);
      setLoading(true);
      setScanning(true);
      setScanProgress(0);
      setAnswer(null);

      // Simulate scan progress
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

        // Clear highlight after 2s
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedAlerts(new Set());
        }, 2000);
      } catch (error) {
        console.error('Failed to fetch answer:', error);
      } finally {
        setLoading(false);
      }
    },
    [questionsUsed, showGating],
  );

  // Reset everything
  const handleRefresh = () => {
    setSelectedQuestion(null);
    setAnswer(null);
    setQuestionsUsed(0);
    setShowGating(false);
    setScanning(false);
    setScanProgress(0);
    setResolvedAlerts(new Set());
    setHighlightedAlerts(new Set());
  };

  // Handle resolve alert
  const handleResolveAlert = (alertId: number) => {
    setResolvingAlert(alertId);
    setTimeout(() => {
      setResolvedAlerts((prev) => new Set(prev).add(alertId));
      setResolvingAlert(null);
    }, 1500);
  };

  // Reset resolved alerts when switching tabs (per spec)
  const handleTabChange = (tab: 'alerts' | 'providers' | 'payer') => {
    setResolvedAlerts(new Set());
    setActiveTab(tab);
  };

  // Calculate alert count
  const activeAlerts = ALERTS.filter((a) => !resolvedAlerts.has(a.id));
  const alertsCountDisplay = activeAlerts.length;

  return (
    <div style={{ width: '100%' }}>
      {/* ── Question Engine Section ── */}
      <div className="m-hero-interactive">
        {/* Search bar */}
        <div className="m-hero-search">
          <input
            type="text"
            placeholder="Ask about provider compliance, data discrepancies, or regulatory updates..."
          />
          <span style={{ opacity: 0.5 }}>🔍</span>
        </div>

        {/* Question chips */}
        <div className="m-hero-chips">
          {questions.map((q) => (
            <button
              key={q.id}
              onClick={() => handleQuestionClick(q)}
              style={{
                padding: '8px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '20px',
                background: selectedQuestion?.id === q.id ? '#fbbf24' : '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: selectedQuestion?.id === q.id ? '600' : '500',
                color: selectedQuestion?.id === q.id ? '#1f2937' : '#4b5563',
                transition: 'all 0.3s ease',
              }}
            >
              {q.question_text}
            </button>
          ))}

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#f3f4f6',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Fresh questions */}
        {freshQuestions.length > 0 && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
            <span style={{ fontWeight: '600', color: '#fbbf24' }}>Trending:</span>
            {freshQuestions.slice(0, 3).map((q) => (
              <button
                key={q.id}
                onClick={() => handleQuestionClick(q)}
                style={{
                  marginLeft: '8px',
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: '12px',
                  background: '#fef3c7',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#92400e',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                }}
              >
                {q.question_text}
              </button>
            ))}
          </div>
        )}

        {/* Live stats strip */}
        {stats && (
          <div className="m-hero-live-stats">
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#1f2937' }}>{stats.total_providers}</div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>Total Providers</div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#1f2937' }}>{stats.total_exclusions}</div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>Exclusions</div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#1f2937' }}>{stats.states_covered}</div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>States</div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#1f2937' }}>
                  {stats.specialties_indexed}
                </div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>Specialties</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Interactive Dashboard ── */}
      <div className="m-dashboard-interactive">
        {/* macOS Chrome */}
        <div
          style={{
            background: '#f5f5f5',
            borderRadius: '8px 8px 0 0',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {/* Window controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#EF4444',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#FBBF24',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10B981',
              }}
            />
          </div>

          {/* Title */}
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '500',
              color: '#4b5563',
            }}
          >
            KairoLogic Dashboard
          </div>

          {/* Scanning indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            {scanning && (
              <>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10B981',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                />
                <span>Scanning</span>
              </>
            )}
          </div>
        </div>

        {/* Dashboard content */}
        <div style={{ padding: '24px' }}>
          {/* Gating overlay */}
          {showGating && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                zIndex: 10,
                borderRadius: '0 0 8px 8px',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  textAlign: 'center',
                }}
              >
                You've used your 3 free questions.
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                Sign up for a free trial to unlock unlimited provider intelligence.
              </div>
              <a
                href="/contact"
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  background: '#FBBF24',
                  color: '#1f2937',
                  fontWeight: '600',
                  fontSize: '14px',
                  textDecoration: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Get Free Trial
              </a>
            </div>
          )}

          {/* Scan progress bar */}
          {scanning && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  height: '2px',
                  background: '#e5e7eb',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #FBBF24 0%, #10B981 100%)',
                    width: `${(scanProgress / SCAN_SOURCES.length) * 100}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                {SCAN_SOURCES.map((source, idx) => (
                  <span
                    key={source}
                    style={{
                      marginRight: '6px',
                      opacity: idx < Math.floor(scanProgress) ? 1 : 0.4,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Insight card (appears after scan) */}
          {answer && !loading && (
            <div
              style={{
                marginBottom: '16px',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #fbbf24',
                background: '#fffbeb',
                animation: 'slideIn 0.4s ease',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#92400e',
                  marginBottom: '8px',
                }}
              >
                ✨ AI Insight
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#1f2937',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
              >
                {selectedQuestion?.question_text}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#4b5563',
                  lineHeight: '1.5',
                  marginBottom: '12px',
                }}
              >
                {answer.summary}
              </div>
              {answer.stat_highlight && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>
                    {answer.stat_highlight.value}
                  </span>{' '}
                  {answer.stat_highlight.label}
                </div>
              )}
              <a
                href="#"
                style={{
                  fontSize: '13px',
                  color: '#FBBF24',
                  fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                See details →
              </a>
            </div>
          )}

          {/* Stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              onClick={() => handleTabChange('providers')}
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#d1d5db';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                Providers Monitored
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                {providersCount.toLocaleString()}
              </div>
            </div>

            <div
              onClick={() => handleTabChange('alerts')}
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#d1d5db';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                Active Alerts
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                {alertsCountDisplay}
              </div>
            </div>

            <div
              title="Based on 1,847 providers across 8 data sources"
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#ffffff',
                cursor: 'help',
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                Compliance Score
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                {complianceScore}%
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#ffffff',
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                Last Scan
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>2m ago</div>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '20px',
              gap: '24px',
            }}
          >
            <button
              onClick={() => handleTabChange('alerts')}
              style={{
                padding: '12px 0',
                border: 'none',
                background: 'none',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === 'alerts' ? '#1f2937' : '#9ca3af',
                cursor: 'pointer',
                borderBottom: activeTab === 'alerts' ? '3px solid #FBBF24' : 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              Compliance Alerts
              <span
                style={{
                  marginLeft: '6px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {alertsCountDisplay}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('providers')}
              style={{
                padding: '12px 0',
                border: 'none',
                background: 'none',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === 'providers' ? '#1f2937' : '#9ca3af',
                cursor: 'pointer',
                borderBottom: activeTab === 'providers' ? '3px solid #FBBF24' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Providers
            </button>

            <button
              onClick={() => handleTabChange('payer')}
              style={{
                padding: '12px 0',
                border: 'none',
                background: 'none',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === 'payer' ? '#1f2937' : '#9ca3af',
                cursor: 'pointer',
                borderBottom: activeTab === 'payer' ? '3px solid #FBBF24' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Payer Sync
              <span
                style={{
                  marginLeft: '6px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#ede9fe',
                  color: '#7c3aed',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                4
              </span>
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'alerts' && (
            <div>
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    background: highlightedAlerts.has(alert.id) ? '#fef3c7' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ fontSize: '20px' }}>{TYPE_ICONS[alert.type] || '🔔'}</div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '4px',
                      }}
                    >
                      {alert.provider}
                    </div>
                    <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '4px' }}>
                      {alert.detail}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{alert.timestamp}</div>
                  </div>

                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: SEVERITY_CONFIG[alert.severity].bg,
                      color: SEVERITY_CONFIG[alert.severity].color,
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    {SEVERITY_CONFIG[alert.severity].label}
                  </div>

                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    disabled={resolvingAlert === alert.id}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      background: resolvingAlert === alert.id ? '#f3f4f6' : '#ffffff',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#6b7280',
                      cursor: resolvingAlert === alert.id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {resolvingAlert === alert.id ? '...' : 'Resolve'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'providers' && (
            <div>
              {/* Providers table */}
              <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                      }}
                    >
                      NPI
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                      }}
                    >
                      Specialty
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PROVIDERS_TABLE.map((provider) => (
                    <tr key={provider.npi} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#1f2937' }}>
                        {provider.name}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                        {provider.npi}
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>
                        {provider.specialty}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background:
                                provider.statusColor === 'green'
                                  ? '#10B981'
                                  : provider.statusColor === 'amber'
                                    ? '#F59E0B'
                                    : '#EF4444',
                            }}
                          />
                          <span style={{ fontSize: '13px', color: '#4b5563' }}>
                            {provider.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cross-Source Data Accuracy */}
              <div style={{ marginTop: '24px' }}>
                <h4
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '12px',
                  }}
                >
                  Cross-Source Data Accuracy
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                        }}
                      >
                        Field
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                        }}
                      >
                        NPPES
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                        }}
                      >
                        UHC
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                        }}
                      >
                        Aetna
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                        }}
                      >
                        Cigna
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6b7280',
                        }}
                      >
                        BCBS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CROSS_SOURCE_DATA.map((row) => (
                      <tr key={row.field} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#1f2937',
                          }}
                        >
                          {row.field}
                        </td>
                        {(['nppes', 'uhc', 'aetna', 'cigna', 'bcbs'] as const).map((source) => {
                          const value = row[source];
                          const isMismatch =
                            (row.field === 'Address' && value !== row.nppes) ||
                            (row.field === 'Phone' && value !== row.nppes) ||
                            (row.field === 'Specialty' && value !== row.nppes);

                          return (
                            <td
                              key={source}
                              style={{
                                padding: '12px',
                                fontSize: '13px',
                                color: isMismatch ? '#EF4444' : '#4b5563',
                                background: isMismatch ? '#FEF2F2' : 'transparent',
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
            </div>
          )}

          {activeTab === 'payer' && (
            <div>
              {/* Payer cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                {PAYER_SYNC.map((payer) => (
                  <div
                    key={payer.name}
                    style={{
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${payer.color}`,
                      background: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                        {payer.name}
                      </div>
                      <div
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: payer.issues > 0 ? '#fee2e2' : '#ecfdf5',
                          color: payer.issues > 0 ? '#dc2626' : '#059669',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      >
                        {payer.issues} issue{payer.issues !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                      Status:{' '}
                      <span style={{ fontWeight: '600', color: '#1f2937' }}>{payer.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Last sync: <span style={{ color: '#1f2937' }}>{payer.lastSync}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compliance rules */}
              <div>
                <h4
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '12px',
                  }}
                >
                  Compliance Rules
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                        SB 1188
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Data sovereignty</div>
                    </div>
                    <div style={{ color: '#10B981', fontWeight: '600' }}>Active ✓</div>
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                        HB 149
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>AI transparency</div>
                    </div>
                    <div style={{ color: '#10B981', fontWeight: '600' }}>Active ✓</div>
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                        AB 3030
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>CA AI disclosure</div>
                    </div>
                    <div style={{ color: '#F59E0B', fontWeight: '600' }}>Monitoring</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard footer */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            <div>
              Showing {activeAlerts.length} of {ALERTS.length} alerts • Last updated 2 min ago
            </div>
            <button
              onClick={() => alert('Sign up for a free trial to access the full dashboard')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                color: '#FBBF24',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              View Full Dashboard →
            </button>
          </div>
        </div>
      </div>

      {/* Global styles for animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
