/**
 * components/dashboard/DashboardHome.tsx
 *
 * Client component for the dashboard home view.
 * Renders KPIs, top 3 workflows, top 3 alerts, payer sync, welcome banner.
 * Data is passed from the server component page.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/lib/design-tokens';
import { KPICard, WorkflowCard, AlertCard, PayerSyncPanel, Tooltip } from './ui';
import type { WorkflowStatus } from '@/lib/types/dashboard-schema';

interface KPIs {
  action_needed_count: number;
  in_progress_count: number;
  awaiting_count: number;
  resolved_count: number;
  unseen_alert_count: number;
}

interface WorkflowData {
  id: string;
  workflow_type: string;
  status: string;
  provider_name: string | null;
  finding_summary: string | null;
  finding_details: any;
  priority: number;
  overdue_at: string | null;
  created_at: string;
}

interface AlertData {
  id: string;
  severity: string;
  title: string;
  description: string | null;
  provider_name: string | null;
  created_at: string;
  is_seen: boolean;
}

interface PayerData {
  payer: string;
  status: string;
  color: string;
}

interface DashboardHomeProps {
  kpis: KPIs;
  workflows: WorkflowData[];
  alerts: AlertData[];
  payers: PayerData[];
  practiceId: string;
  practiceName: string;
  userName: string;
}

export default function DashboardHome({
  kpis, workflows, alerts, payers, practiceId, practiceName, userName,
}: DashboardHomeProps) {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(true);

  const totalWorkflows = kpis.action_needed_count + kpis.in_progress_count + kpis.awaiting_count + kpis.resolved_count;

  function navigateTo(sub: string) {
    router.push(`/practice/${practiceId}${sub}`);
  }

  return (
    <div>
      {/* Welcome banner */}
      {showWelcome && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyMid} 100%)`,
          borderRadius: 12, padding: '18px 20px', marginBottom: 16, color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>Welcome, {userName}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, background: 'rgba(212,160,23,.2)', color: colors.goldLight,
                padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase',
              }}>Free trial</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, maxWidth: 600 }}>
              We've found {totalWorkflows} data discrepancies across your providers and turned them into actionable
              workflows with pre-filled forms, tracking, and automatic confirmation. Everything updates automatically
              from NPPES, state boards, and payer directories.
            </div>
          </div>
          <button onClick={() => setShowWelcome(false)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer',
            fontSize: 18, padding: '0 0 0 12px', lineHeight: 1,
          }}>×</button>
        </div>
      )}

      {/* KPI bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <KPICard
          count={kpis.unseen_alert_count}
          label="New"
          status="new"
          tooltip={`${kpis.unseen_alert_count} new alerts since your last visit`}
          onClick={() => navigateTo('/alerts')}
        />
        <KPICard
          count={kpis.action_needed_count}
          label="Needs action"
          status="action_needed"
          tooltip={`${kpis.action_needed_count} workflows need your attention right now`}
          onClick={() => navigateTo('/workflows?status=action_needed')}
        />
        <KPICard
          count={kpis.in_progress_count}
          label="In progress"
          status="in_progress"
          tooltip={`${kpis.in_progress_count} workflows actively being tracked`}
          onClick={() => navigateTo('/workflows?status=in_progress')}
        />
        <KPICard
          count={kpis.awaiting_count}
          label="Awaiting"
          status="awaiting"
          tooltip={`${kpis.awaiting_count} workflows waiting on external confirmation`}
          onClick={() => navigateTo('/workflows?status=awaiting')}
        />
        <KPICard
          count={kpis.resolved_count}
          label="Resolved"
          status="resolved"
          tooltip={`${kpis.resolved_count} workflows auto-confirmed and closed`}
          onClick={() => navigateTo('/workflows?status=resolved')}
        />
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
        {/* Left: Active workflows */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400 }}>Active workflows</span>
            <button onClick={() => navigateTo('/workflows')} style={{
              background: 'none', border: 'none', color: colors.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>View all {totalWorkflows} workflows →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workflows.slice(0, 3).map(wf => (
              <WorkflowCard key={wf.id} workflow={wf} onClick={() => navigateTo(`/workflows?detail=${wf.id}`)} />
            ))}
            {workflows.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: colors.gray400, fontSize: 13 }}>
                No active workflows. All clear!
              </div>
            )}
          </div>
        </div>

        {/* Right: Alerts + Payer sync */}
        <div>
          {/* Alerts */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400 }}>Recent alerts</span>
              <button onClick={() => navigateTo('/alerts')} style={{
                background: 'none', border: 'none', color: colors.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>View all alerts →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.slice(0, 3).map(a => (
                <AlertCard key={a.id} alert={a} onClick={() => navigateTo('/alerts')} />
              ))}
              {alerts.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: colors.gray400, fontSize: 13 }}>
                  No recent alerts.
                </div>
              )}
            </div>
          </div>

          {/* Payer sync */}
          <div>
            <div style={{ marginBottom: 10 }}>
              <Tooltip text="Real-time payer directory monitoring via FHIR PDex Plan-Net APIs">
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400, cursor: 'help' }}>Payer sync status</span>
              </Tooltip>
            </div>
            <PayerSyncPanel payers={payers} />
          </div>
        </div>
      </div>
    </div>
  );
}
