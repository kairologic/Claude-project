'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { colors, shadows, transitions, radii, spacing, typography } from '@/lib/design-tokens';

interface Alert {
  id: string;
  practice_id: string;
  title: string;
  description: string;
  severity: 'action' | 'warning' | 'info' | 'resolved';
  created_at: string;
  workflow_id?: string;
  practice_name?: string;
  provider_name?: string;
}

type SeverityFilter = 'all' | 'action' | 'warning' | 'info' | 'resolved';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const severityColors: Record<string, { badge: string; pale: string; label: string }> = {
  action: { badge: colors.red, pale: colors.redPale, label: 'Action Required' },
  warning: { badge: colors.gold, pale: colors.goldPale, label: 'Warning' },
  info: { badge: colors.blue, pale: colors.bluePale, label: 'Info' },
  resolved: { badge: colors.green, pale: colors.greenPale, label: 'Resolved' },
};

const filterOptions: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'action', label: 'Action' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'resolved', label: 'Resolved' },
];

function relativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<SeverityFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const isAuthed = typeof window !== 'undefined' && sessionStorage.getItem('admin_auth');
    if (!isAuthed) {
      router.push('/admin');
    }
  }, [router]);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/alerts?select=*,practices(name)`,
          {
            headers: {
              apikey: SUPABASE_ANON,
              Authorization: `Bearer ${SUPABASE_ANON}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch alerts: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform alerts to include practice and provider info
        const transformedAlerts: Alert[] = data.map((alert: any) => ({
          id: alert.id,
          practice_id: alert.practice_id,
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          created_at: alert.created_at,
          workflow_id: alert.workflow_id,
          practice_name: alert.practices?.name,
          provider_name: alert.provider_name,
        }));

        setAlerts(transformedAlerts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alerts');
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Apply filter
  useEffect(() => {
    if (selectedFilter === 'all') {
      setFilteredAlerts(alerts);
    } else {
      setFilteredAlerts(alerts.filter((alert) => alert.severity === selectedFilter));
    }
  }, [alerts, selectedFilter]);

  // Calculate stats
  const stats = {
    action: alerts.filter((a) => a.severity === 'action').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
    resolved: alerts.filter((a) => a.severity === 'resolved').length,
  };

  return (
    <div style={{ padding: spacing.lg }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ ...typography.h1, color: colors.navy, marginBottom: spacing.sm }}>
          Alerts & Notifications
        </h1>
        <p style={{ ...typography.body, color: colors.gray400 }}>
          Monitor and manage alerts across all practices
        </p>
      </div>

      {/* Stats Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.xl,
        }}
      >
        {[
          { label: 'Action Required', count: stats.action, severity: 'action' },
          { label: 'Warning', count: stats.warning, severity: 'warning' },
          { label: 'Info', count: stats.info, severity: 'info' },
          { label: 'Resolved', count: stats.resolved, severity: 'resolved' },
        ].map((stat) => (
          <div
            key={stat.severity}
            style={{
              padding: spacing.md,
              backgroundColor: severityColors[stat.severity].pale,
              borderRadius: radii.md,
              border: `1px solid ${severityColors[stat.severity].badge}`,
            }}
          >
            <div style={{ ...typography.caption, color: colors.gray400, marginBottom: spacing.xs }}>
              {stat.label}
            </div>
            <div style={{ ...typography.h1, color: severityColors[stat.severity].badge }}>
              {stat.count}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedFilter(option.value)}
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radii.full,
              border: 'none',
              backgroundColor:
                selectedFilter === option.value
                  ? colors.blue
                  : colors.white,
              color:
                selectedFilter === option.value
                  ? colors.white
                  : colors.navy,
              cursor: 'pointer',
              ...typography.body,
              transition: `${transitions.base}`,
              boxShadow: selectedFilter === option.value ? shadows.sm : 'none',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.gray400 }}>
          Loading alerts...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: spacing.lg,
            backgroundColor: severityColors.action.pale,
            borderRadius: radii.md,
            color: severityColors.action.badge,
            marginBottom: spacing.lg,
          }}
        >
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAlerts.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: `${spacing.xl} ${spacing.lg}`,
            backgroundColor: colors.white,
            borderRadius: radii.md,
          }}
        >
          <p style={{ ...typography.body, color: colors.gray400 }}>
            No alerts found for the selected filter
          </p>
        </div>
      )}

      {/* Alerts List */}
      {!loading && !error && filteredAlerts.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: spacing.lg,
          }}
        >
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: spacing.lg,
                backgroundColor: colors.white,
                border: `1px solid ${colors.gray200}`,
                borderRadius: radii.lg,
                boxShadow: shadows.sm,
                transition: transitions.base,
              }}
            >
              {/* Severity Badge and Title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: severityColors[alert.severity].badge,
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ ...typography.bodySmall, color: colors.navy, marginBottom: spacing.xs }}>
                    {alert.title}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      ...typography.caption,
                      color: severityColors[alert.severity].badge,
                      fontWeight: 600,
                    }}
                  >
                    {severityColors[alert.severity].label}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p style={{ ...typography.body, color: colors.gray400, marginBottom: spacing.md }}>
                {alert.description}
              </p>

              {/* Practice and Provider Info */}
              <div style={{ marginBottom: spacing.md }}>
                {alert.practice_name && (
                  <div style={{ ...typography.caption, color: colors.gray400, marginBottom: spacing.xs }}>
                    Practice: <span style={{ fontWeight: 600, color: colors.navy }}>{alert.practice_name}</span>
                  </div>
                )}
                {alert.provider_name && (
                  <div style={{ ...typography.caption, color: colors.gray400 }}>
                    Provider: <span style={{ fontWeight: 600, color: colors.navy }}>{alert.provider_name}</span>
                  </div>
                )}
              </div>

              {/* Timestamp and Link */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: spacing.md,
                  borderTop: `1px solid ${colors.gray200}`,
                }}
              >
                <span style={{ ...typography.caption, color: colors.gray400 }}>
                  {relativeTime(alert.created_at)}
                </span>
                {alert.workflow_id && (
                  <a
                    href={`/dashboard?workflow=${alert.workflow_id}`}
                    style={{
                      ...typography.caption,
                      color: colors.blue,
                      textDecoration: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: transitions.base,
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.textDecoration = 'none';
                    }}
                  >
                    View in Dashboard →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
