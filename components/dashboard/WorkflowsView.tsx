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
import { colors, statusColors, statusLabels, workflowTypeLabels } from '@/lib/design-tokens';
import { WorkflowCard } from './ui';
import WorkflowDetailPanel from './WorkflowDetailPanel';
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
type TypeFilterKey = 'all' | 'nppes_update' | 'payer_directory' | 'onboarding' | 'release' | 'license_renewal' | 'compliance';

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'action_needed', label: 'Needs action' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'resolved', label: 'Resolved' },
];

const typeFilters: { key: TypeFilterKey; label: string }[] = [
  { key: 'all', label: 'All types' },
  { key: 'nppes_update', label: 'NPPES Update' },
  { key: 'payer_directory', label: 'Payer Directory' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'release', label: 'Provider Release' },
  { key: 'license_renewal', label: 'License Renewal' },
  { key: 'compliance', label: 'Compliance' },
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
  const initialType = (searchParams.get('type') as TypeFilterKey) || 'all';
  const initialDetail = searchParams.get('detail') || null;
  const [activeFilter, setActiveFilter] = useState<FilterKey>(initialFilter);
  const [activeType, setActiveType] = useState<TypeFilterKey>(initialType);
  const [detailId, setDetailId] = useState<string | null>(initialDetail);

  // Count workflows by type (for badges)
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: workflows.length };
    for (const wf of workflows) {
      c[wf.workflow_type] = (c[wf.workflow_type] || 0) + 1;
    }
    return c;
  }, [workflows]);

  // Filter workflows
  const filtered = useMemo(() => {
    let list = activeFilter === 'all'
      ? workflows
      : workflows.filter(w => w.status === activeFilter);

    if (activeType !== 'all') {
      list = list.filter(w => w.workflow_type === activeType);
    }

    // Sort: overdue first, then by priority desc, then by date desc
    return [...list].sort((a, b) => {
      const aOverdue = a.overdue_at && new Date(a.overdue_at) < new Date() && a.status === 'action_needed' ? 1 : 0;
      const bOverdue = b.overdue_at && new Date(b.overdue_at) < new Date() && b.status === 'action_needed' ? 1 : 0;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [workflows, activeFilter, activeType]);

  function handleCardClick(id: string) {
    setDetailId(id);
  }

  function closeDetail() {
    setDetailId(null);
    // Clean URL param
    router.replace(`/practice/${practiceId}/workflows${activeFilter !== 'all' ? `?status=${activeFilter}` : ''}`, { scroll: false });
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

      {/* Type filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {typeFilters.map(f => {
          const count = typeCounts[f.key] || 0;
          const isActive = activeType === f.key;
          if (f.key !== 'all' && count === 0) return null;
          return (
            <button
              key={f.key}
              onClick={() => setActiveType(f.key)}
              style={{
                padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                border: `1px solid ${isActive ? colors.gold : colors.gray200}`,
                background: isActive ? colors.goldPale : '#fff',
                color: isActive ? colors.navy : colors.gray600,
                cursor: 'pointer', transition: 'all .1s', fontFamily: 'inherit',
              }}
              onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = colors.gold; }}
              onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = colors.gray200; }}
            >
              {f.label} {f.key !== 'all' && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div style={{ fontSize: 11, color: colors.gray400, marginBottom: 12 }}>
        Showing {filtered.length} workflow{filtered.length !== 1 ? 's' : ''}
        {activeFilter !== 'all' && ` · ${filters.find(f => f.key === activeFilter)?.label}`}
        {activeType !== 'all' && ` · ${typeFilters.find(f => f.key === activeType)?.label}`}
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

      {/* Detail panel */}
      {detailId && (
        <WorkflowDetailPanel
          workflowId={detailId}
          practiceId={practiceId}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
