/**
 * components/dashboard/WorkflowsView.tsx
 *
 * Client component for the Workflows page.
 * Filter bar with pill toggles + full workflow card list.
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { colors, statusColors, statusLabels } from '@/lib/design-tokens';
import { WorkflowCard } from './ui';
import type { WorkflowStatus } from '@/lib/types/dashboard-schema';

interface WorkflowData {
  id: string;
  workflow_type: string;
  status: string;
  provider_name: string | null;
  provider_npi: string | null;
  finding_summary: string | null;
  finding_details: any;
  priority: number;
  overdue_at: string | null;
  created_at: string;
}

interface WorkflowsViewProps {
  workflows: WorkflowData[];
  practiceId: string;
  counts: {
    all: number;
    action_needed: number;
    in_progress: number;
    awaiting: number;
    resolved: number;
  };
}

type FilterKey = 'all' | 'action_needed' | 'in_progress' | 'awaiting' | 'resolved';

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'action_needed', label: 'Needs action' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'resolved', label: 'Resolved' },
];

export default function WorkflowsView(props: WorkflowsViewProps) {
  return (
    <Suspense>
      <WorkflowsViewInner {...props} />
    </Suspense>
  );
}

function WorkflowsViewInner({ workflows, practiceId, counts }: WorkflowsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('status') as FilterKey) || 'all';
  const [activeFilter, setActiveFilter] = useState<FilterKey>(initialFilter);

  // Filter workflows
  const filtered = useMemo(() => {
    const list = activeFilter === 'all'
      ? workflows
      : workflows.filter(w => w.status === activeFilter);

    // Sort: overdue first, then by priority desc, then by date desc
    return [...list].sort((a, b) => {
      const aOverdue = a.overdue_at && new Date(a.overdue_at) < new Date() && a.status === 'action_needed' ? 1 : 0;
      const bOverdue = b.overdue_at && new Date(b.overdue_at) < new Date() && b.status === 'action_needed' ? 1 : 0;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [workflows, activeFilter]);

  function handleCardClick(id: string) {
    // Phase 3D: will open detail panel
    router.push(`/practice/${practiceId}/workflows?detail=${id}`);
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(f => {
          const count = f.key === 'all' ? counts.all : counts[f.key];
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                border: `1px solid ${isActive ? colors.navy : colors.gray200}`,
                background: isActive ? colors.navy : '#fff',
                color: isActive ? '#fff' : colors.gray600,
                cursor: 'pointer', transition: 'all .1s', fontFamily: 'inherit',
              }}
              onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = colors.navy; }}
              onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = colors.gray200; }}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div style={{ fontSize: 11, color: colors.gray400, marginBottom: 12 }}>
        Showing {filtered.length} workflow{filtered.length !== 1 ? 's' : ''}
        {activeFilter !== 'all' && ` · ${filters.find(f => f.key === activeFilter)?.label}`}
      </div>

      {/* Workflow list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(wf => (
          <WorkflowCard key={wf.id} workflow={wf} onClick={handleCardClick} />
        ))}
        {filtered.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center', color: colors.gray400, fontSize: 13,
            background: '#fff', borderRadius: 10, border: `1px solid ${colors.gray200}`,
          }}>
            No workflows match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
