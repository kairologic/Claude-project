/**
 * components/dashboard/AlertsView.tsx
 *
 * Alerts page with:
 * - New alerts pinned to top with divider
 * - Earlier alerts below
 * - NEW badges on unseen alerts
 * - Marks alerts as seen on mount
 */

'use client';

import { useEffect } from 'react';
import { colors, shadows, transitions, radii, spacing, typography } from '@/lib/design-tokens';
import { AlertCard } from './ui';
import { EmptyState, StaggeredList } from './ui';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';

interface AlertData {
  id: string;
  severity: string;
  title: string;
  description: string | null;
  provider_name: string | null;
  workflow_id: string | null;
  created_at: string;
  is_seen: boolean;
}

interface AlertsViewProps {
  alerts: AlertData[];
  practiceId: string;
  userId: string;
}

export default function AlertsView({ alerts, practiceId, userId }: AlertsViewProps) {
  const newAlerts = alerts.filter(a => !a.is_seen);
  const seenAlerts = alerts.filter(a => a.is_seen);

  // Mark all unseen alerts as seen on mount
  useEffect(() => {
    async function markSeen() {
      if (newAlerts.length === 0) return;
      const supabase = createBrowserSupabaseClient();

      const inserts = newAlerts.map(a => ({
        user_id: userId,
        alert_id: a.id,
      }));

      await supabase.from('user_alert_reads').upsert(inserts, {
        onConflict: 'user_id,alert_id',
      });
    }

    markSeen();
  }, []);

  return (
    <div>
      {/* Summary */}
      <div style={{ ...typography.bodySmall, color: colors.gray400, marginBottom: spacing.lg }}>
        {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        {newAlerts.length > 0 && <span> · <span style={{ color: colors.red, fontWeight: 600 }}>{newAlerts.length} new</span></span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {/* New alerts */}
        {newAlerts.length > 0 && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: spacing.sm, margin: `${spacing.xs}px 0 ${spacing.xs}px`,
              ...typography.label,
              color: colors.gray400,
            }}>
              {newAlerts.length} new since your last visit
              <div style={{ flex: 1, height: 1, background: colors.gray200 }} />
            </div>
            <StaggeredList>
              {newAlerts.map(a => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </StaggeredList>
          </>
        )}

        {/* Earlier alerts */}
        {seenAlerts.length > 0 && (
          <>
            {newAlerts.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm, margin: `${spacing.md}px 0 ${spacing.xs}px`,
                ...typography.label,
                color: colors.gray400,
              }}>
                Earlier
                <div style={{ flex: 1, height: 1, background: colors.gray200 }} />
              </div>
            )}
            <StaggeredList key="seen-alerts">
              {seenAlerts.map(a => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </StaggeredList>
          </>
        )}

        {alerts.length === 0 && (
          <EmptyState icon="🔔" title="No alerts yet" description="We'll notify you when we detect issues with your providers." />
        )}
      </div>
    </div>
  );
}
