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
import { colors } from '@/lib/design-tokens';
import { AlertCard } from './ui';
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
      <div style={{ fontSize: 12, color: colors.gray400, marginBottom: 16 }}>
        {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        {newAlerts.length > 0 && <span> · <span style={{ color: colors.red, fontWeight: 600 }}>{newAlerts.length} new</span></span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* New alerts */}
        {newAlerts.length > 0 && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 6px',
              fontSize: 10, fontWeight: 700, color: colors.gray400,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {newAlerts.length} new since your last visit
              <div style={{ flex: 1, height: 1, background: colors.gray200 }} />
            </div>
            {newAlerts.map(a => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </>
        )}

        {/* Earlier alerts */}
        {seenAlerts.length > 0 && (
          <>
            {newAlerts.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 6px',
                fontSize: 10, fontWeight: 700, color: colors.gray400,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Earlier
                <div style={{ flex: 1, height: 1, background: colors.gray200 }} />
              </div>
            )}
            {seenAlerts.map(a => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </>
        )}

        {alerts.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center', color: colors.gray400, fontSize: 13,
            background: '#fff', borderRadius: 10, border: `1px solid ${colors.gray200}`,
          }}>
            No alerts yet. We'll notify you when we detect issues.
          </div>
        )}
      </div>
    </div>
  );
}
