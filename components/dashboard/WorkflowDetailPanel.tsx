/**
 * components/dashboard/WorkflowDetailPanel.tsx
 *
 * Slide-over panel showing full workflow detail:
 * - Header with type, title, status, progress
 * - Task checklist — simplified 3-step NPPES flow:
 *   Step 1: Review & Approve (compare + pick correct value)
 *   Step 2: Download & Submit (PDF + NPPES portal + single "I've submitted" button)
 *   Step 3: Monitor & Auto-confirm (automated, parallel with step 2)
 * - Source comparison table
 * - Timeline of events
 * - Cancel workflow button
 * - Full audit trail with actor tracking
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { colors, statusColors, statusLabels, workflowTypeLabels, statusBgColors } from '@/lib/design-tokens';
import { Badge, Tooltip } from './ui';
import { createBrowserSupabaseClient } from '@/lib/auth/auth-client';
import type { WorkflowStatus } from '@/lib/types/dashboard-schema';

interface TaskData {
  id: string;
  task_order: number;
  task_type: string;
  title: string;
  description: string | null;
  status: string;
  metadata: any;
  completed_at: string | null;
  confirmed_at: string | null;
}

interface EventData {
  id: string;
  event_type: string;
  actor_type: string;
  title: string;
  details: any;
  created_at: string;
}

interface WorkflowDetail {
  id: string;
  workflow_type: string;
  status: string;
  provider_npi: string | null;
  provider_name: string | null;
  finding_summary: string | null;
  finding_details: any;
  priority: number;
  overdue_at: string | null;
  created_at: string;
  approved_value: string | null;
  approved_at: string | null;
  target_completion: string | null;
}

interface WorkflowDetailPanelProps {
  workflowId: string | null;
  practiceId: string;
  onClose: () => void;
}

export default function WorkflowDetailPanel({ workflowId, practiceId, onClose }: WorkflowDetailPanelProps) {
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval state
  const [approvalSelection, setApprovalSelection] = useState<number | 'custom' | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);
  const [approvalResult, setApprovalResult] = useState<{ type: string; value: string } | null>(null);

  // Submit state
  const [submitMarking, setSubmitMarking] = useState(false);

  // Cancel/delete state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Download state
  const [downloadGenerating, setDownloadGenerating] = useState(false);

  // Current user for audit trail
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

  const supabase = createBrowserSupabaseClient();

  // Fetch current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUser({ id: data.user.id, email: data.user.email || '' });
    });
  }, []);

  /** Helper: create an audit event with user tracking */
  function logEvent(eventType: string, title: string, details: Record<string, any> = {}) {
    return supabase.from('workflow_events').insert({
      workflow_id: workflow!.id,
      event_type: eventType,
      actor_type: 'user',
      actor_id: currentUser?.id || null,
      actor_email: currentUser?.email || null,
      title,
      details,
    });
  }

  // ── Fetch workflow details ──────────────────────────────────────────────
  useEffect(() => {
    if (!workflowId) return;
    setLoading(true);
    setApprovalSelection(null);
    setCustomValue('');
    setApprovalSubmitted(false);
    setApprovalResult(null);

    async function fetchDetail() {
      const { data: wf } = await supabase
        .from('workflow_instances')
        .select('id, workflow_type, status, provider_npi, provider_name, finding_summary, finding_details, priority, overdue_at, created_at, approved_value, approved_at, target_completion')
        .eq('id', workflowId)
        .single();

      const { data: taskData } = await supabase
        .from('workflow_tasks')
        .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
        .eq('workflow_id', workflowId)
        .order('task_order', { ascending: true });

      const { data: eventData } = await supabase
        .from('workflow_events')
        .select('id, event_type, actor_type, title, details, created_at')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: true });

      setWorkflow(wf);
      setTasks(taskData || []);
      setEvents(eventData || []);

      // Check if already approved
      if (wf?.approved_value) {
        setApprovalSubmitted(true);
        setApprovalResult({ type: 'approved', value: wf.approved_value });
      }

      setLoading(false);
    }

    fetchDetail();
  }, [workflowId]);

  // Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!workflowId) return null;

  // ── Progress (task-based) ───────────────────────────────────────────────
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const borderColor = workflow ? (statusColors[workflow.status as WorkflowStatus] || colors.gray400) : colors.gray400;
  const typeInfo = workflow ? (workflowTypeLabels[workflow.workflow_type] || { label: workflow.workflow_type, tooltip: '' }) : { label: '', tooltip: '' };
  const isOverdue = workflow?.overdue_at && new Date(workflow.overdue_at) < new Date() && workflow.status === 'action_needed';

  // Check if all human tasks done and a monitor task is active (pending verification state)
  const activeMonitorTask = tasks.find(t => ['monitor_auto_confirm', 'monitor_board'].includes(t.task_type) && t.status === 'active');
  const humanTasksDone = tasks.filter(t => !['monitor_auto_confirm', 'monitor_board'].includes(t.task_type)).every(t => t.status === 'completed' || t.status === 'skipped');
  const isPendingVerification = activeMonitorTask && humanTasksDone;
  const pendingVerificationLabel = workflow?.workflow_type === 'license_renewal' ? 'Pending TMB verification'
    : workflow?.workflow_type === 'payer_directory' ? 'Pending payer verification'
    : 'Pending NPPES verification';

  // Due text
  let dueText = '';
  if (workflow) {
    if (isOverdue && workflow.overdue_at) {
      const days = Math.floor((Date.now() - new Date(workflow.overdue_at).getTime()) / 86400000);
      dueText = `Overdue by ${days} day${days !== 1 ? 's' : ''}`;
    } else if (workflow.overdue_at) {
      const days = Math.floor((new Date(workflow.overdue_at).getTime() - Date.now()) / 86400000);
      dueText = days > 0 ? `Due in ${days} days` : 'Due today';
    }
  }

  // ── Approval handlers (Step 1: review_approve) ─────────────────────────
  const reviewApproveTask = tasks.find(t => t.task_type === 'review_approve' && t.status === 'active');
  const approvalOptions = reviewApproveTask?.metadata?.options || [];
  // findingField replaced by fieldLabel (see FIELD_LABELS below)

  function selectOption(idx: number | 'custom') {
    setApprovalSelection(idx);
    if (idx !== 'custom') setCustomValue('');
  }

  const confirmEnabled = approvalSelection !== null && (approvalSelection !== 'custom' || customValue.trim().length > 5);

  async function handleApprove() {
    if (!confirmEnabled || !workflow) return;

    let chosenValue = '';
    let isNppesCorrect = false;

    if (approvalSelection === 'custom') {
      chosenValue = customValue.trim();
    } else {
      const opt = approvalOptions[approvalSelection as number];
      chosenValue = opt?.value || '';
      isNppesCorrect = opt?.source?.includes('NPPES');
    }

    // 1. Update workflow instance with approved value
    await supabase
      .from('workflow_instances')
      .update({
        approved_value: chosenValue,
        approved_at: new Date().toISOString(),
        status: isNppesCorrect ? 'resolved' : 'in_progress',
        completed_reason: isNppesCorrect ? 'nppes_correct' : null,
        completed_at: isNppesCorrect ? new Date().toISOString() : null,
      })
      .eq('id', workflow.id);

    // 2. Complete the review_approve task
    if (reviewApproveTask) {
      await supabase
        .from('workflow_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...reviewApproveTask.metadata,
            approved_value: chosenValue,
            approved_source: isNppesCorrect ? 'nppes' : approvalSelection === 'custom' ? 'custom' : 'website',
          },
        })
        .eq('id', reviewApproveTask.id);
    }

    if (isNppesCorrect) {
      // NPPES is correct — skip all remaining tasks (nothing to download/submit/monitor)
      const remainingTaskIds = tasks
        .filter(t => t.id !== reviewApproveTask?.id && t.status !== 'completed')
        .map(t => t.id);
      if (remainingTaskIds.length > 0) {
        await supabase.from('workflow_tasks')
          .update({ status: 'skipped', metadata: { skip_reason: 'nppes_correct' } })
          .in('id', remainingTaskIds);
      }
    } else {
      // 3. Activate download_submit (merged step 2) — or fallback to download_form for legacy tasks
      const dsTask = tasks.find(t => t.task_type === 'download_submit') || tasks.find(t => t.task_type === 'download_form');
      if (dsTask) {
        await supabase
          .from('workflow_tasks')
          .update({ status: 'active' })
          .eq('id', dsTask.id);
      }

      // 4. Activate monitor_auto_confirm (step 3) — parallel, always starts
      const monitorTask = tasks.find(t => t.task_type === 'monitor_auto_confirm');
      if (monitorTask) {
        await supabase
          .from('workflow_tasks')
          .update({
            status: 'active',
            metadata: {
              ...monitorTask.metadata,
              expected_value: chosenValue,
            },
          })
          .eq('id', monitorTask.id);
      }
    }

    // 5. Log event with user tracking
    await logEvent(
      'approved',
      isNppesCorrect ? 'NPPES data confirmed correct' : `Correction approved: ${chosenValue}`,
      { approved_value: chosenValue, is_nppes_correct: isNppesCorrect }
    );

    setApprovalSubmitted(true);
    setApprovalResult({
      type: isNppesCorrect ? 'nppes_correct' : 'approved',
      value: chosenValue,
    });

    // 6. Refetch tasks to update UI
    const { data: freshTasks } = await supabase
      .from('workflow_tasks')
      .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
      .eq('workflow_id', workflow.id)
      .order('task_order', { ascending: true });
    if (freshTasks) setTasks(freshTasks);

    // Update local workflow state
    setWorkflow(prev => prev ? {
      ...prev,
      approved_value: chosenValue,
      approved_at: new Date().toISOString(),
      status: isNppesCorrect ? 'resolved' : 'in_progress',
    } : null);
  }

  // ── Download handler (Step 2: download_form) ───────────────────────────
  const downloadTask = tasks.find(t => t.task_type === 'download_form');
  const isDownloadActive = downloadTask?.status === 'active';

  async function handleDownload() {
    if (!workflow || !downloadTask) return;
    setDownloadGenerating(true);

    try {
      // Call API to generate PDF
      const res = await fetch(`/api/workflows/${workflow.id}/generate-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practiceId,
          approved_value: workflow.approved_value,
          field: workflow.finding_details?.field,
          provider_npi: workflow.provider_npi,
          provider_name: workflow.provider_name,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate form');

      // Download the PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NPPES_Update_${workflow.provider_name?.replace(/\s+/g, '_')}_${workflow.finding_details?.field || 'correction'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update task metadata (increment download count)
      const currentCount = downloadTask.metadata?.download_count || 0;
      await supabase
        .from('workflow_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...downloadTask.metadata,
            download_count: currentCount + 1,
            first_downloaded_at: downloadTask.metadata?.first_downloaded_at || new Date().toISOString(),
          },
        })
        .eq('id', downloadTask.id);

      // Activate submit_nppes (step 3) if not already active
      const submitTask = tasks.find(t => t.task_type === 'submit_nppes');
      if (submitTask && submitTask.status === 'pending') {
        await supabase
          .from('workflow_tasks')
          .update({ status: 'active' })
          .eq('id', submitTask.id);
      }

      // Log event with user tracking
      await logEvent('form_downloaded', 'NPPES update form downloaded', { download_count: currentCount + 1 });

      // Refetch tasks
      const { data: freshTasks } = await supabase
        .from('workflow_tasks')
        .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
        .eq('workflow_id', workflow.id)
        .order('task_order', { ascending: true });
      if (freshTasks) setTasks(freshTasks);

    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadGenerating(false);
    }
  }

  // ── Submit handler (Step 3: submit_nppes) ──────────────────────────────
  const submitTask = tasks.find(t => t.task_type === 'submit_nppes');
  const isSubmitActive = submitTask?.status === 'active';
  const isSubmitDone = submitTask?.status === 'completed';

  async function handleMarkSubmitted() {
    if (!workflow || !submitTask) return;
    setSubmitMarking(true);

    await supabase
      .from('workflow_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...submitTask.metadata,
          marked_submitted_at: new Date().toISOString(),
        },
      })
      .eq('id', submitTask.id);

    await supabase.from('workflow_events').insert({
      workflow_id: workflow.id,
      event_type: 'submitted',
      actor_type: 'user',
      title: 'NPPES form marked as submitted',
      details: {},
    });

    // Refetch tasks
    const { data: freshTasks } = await supabase
      .from('workflow_tasks')
      .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
      .eq('workflow_id', workflow.id)
      .order('task_order', { ascending: true });
    if (freshTasks) setTasks(freshTasks);

    setSubmitMarking(false);
  }

  // ── Download & Submit combined handler (new simplified step 2) ──────────
  async function handleDownloadSubmitComplete() {
    if (!workflow) return;
    setSubmitMarking(true);

    // Find the download_submit task (or fallback to submit_nppes for legacy)
    const dsTask = tasks.find(t => t.task_type === 'download_submit') || tasks.find(t => t.task_type === 'submit_nppes');
    if (dsTask) {
      await supabase.from('workflow_tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: { ...dsTask.metadata, submitted_at: new Date().toISOString() },
      }).eq('id', dsTask.id);
    }

    // Also complete download_form if it still exists as a separate legacy task
    const dlTask = tasks.find(t => t.task_type === 'download_form' && t.status !== 'completed');
    if (dlTask) {
      await supabase.from('workflow_tasks').update({
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('id', dlTask.id);
    }

    // Log event with user tracking
    await logEvent('submitted', 'NPPES correction form submitted', { submitted_at: new Date().toISOString() });

    // Refetch tasks
    const { data: freshTasks } = await supabase
      .from('workflow_tasks')
      .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
      .eq('workflow_id', workflow.id)
      .order('task_order', { ascending: true });
    if (freshTasks) setTasks(freshTasks);

    setSubmitMarking(false);
  }

  // ── Reopen workflow handler ────────────────────────────────────────────
  const [reopening, setReopening] = useState(false);

  async function handleReopenWorkflow() {
    if (!workflow) return;
    setReopening(true);

    // Reset workflow status to action_needed
    await supabase.from('workflow_instances')
      .update({
        status: 'action_needed',
        approved_value: null,
        approved_at: null,
        completed_at: null,
      })
      .eq('id', workflow.id);

    // Reset first task (review_approve) back to active
    const reviewTask = tasks.find(t => t.task_type === 'review_approve');
    if (reviewTask) {
      await supabase.from('workflow_tasks')
        .update({ status: 'active', completed_at: null, metadata: reviewTask.metadata })
        .eq('id', reviewTask.id);
    }

    // Reset all other tasks back to pending
    const otherTaskIds = tasks.filter(t => t.id !== reviewTask?.id).map(t => t.id);
    if (otherTaskIds.length > 0) {
      await supabase.from('workflow_tasks')
        .update({ status: 'pending', completed_at: null })
        .in('id', otherTaskIds);
    }

    // Log event
    await logEvent('reopened', 'Workflow reopened for re-review', {});

    // Reset UI state
    setApprovalSubmitted(false);
    setApprovalResult(null);
    setApprovalSelection(null);
    setCustomValue('');

    // Refetch everything
    const { data: freshWf } = await supabase
      .from('workflow_instances')
      .select('id, workflow_type, status, provider_npi, provider_name, finding_summary, finding_details, priority, overdue_at, created_at, approved_value, approved_at, target_completion')
      .eq('id', workflow.id)
      .single();
    if (freshWf) setWorkflow(freshWf);

    const { data: freshTasks } = await supabase
      .from('workflow_tasks')
      .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
      .eq('workflow_id', workflow.id)
      .order('task_order', { ascending: true });
    if (freshTasks) setTasks(freshTasks);

    setReopening(false);
  }

  // ── Cancel/Delete workflow handler ──────────────────────────────────────
  async function handleCancelWorkflow() {
    if (!workflow) return;
    setCancelling(true);

    // Cancel all non-completed tasks
    await supabase.from('workflow_tasks')
      .update({ status: 'skipped' })
      .eq('workflow_id', workflow.id)
      .in('status', ['pending', 'active']);

    // Mark workflow as cancelled
    await supabase.from('workflow_instances')
      .update({ status: 'cancelled' })
      .eq('id', workflow.id);

    // Log event with user tracking
    await logEvent('cancelled', 'Workflow cancelled', { reason: 'User cancelled' });

    // Dismiss related alerts
    await supabase.from('alerts')
      .update({ is_active: false })
      .eq('workflow_id', workflow.id);

    // If this was an onboarding workflow, remove any practice_providers entry with onboarding status
    if (workflow.workflow_type === 'onboarding' && workflow.provider_npi) {
      await supabase.from('practice_providers')
        .delete()
        .eq('practice_website_id', practiceId)
        .eq('npi', workflow.provider_npi)
        .eq('roster_status', 'onboarding');
    }

    setCancelling(false);
    setShowCancelConfirm(false);
    onClose();
    // Refresh the page to reflect changes
    window.location.reload();
  }

  // ── Field label helper ──────────────────────────────────────────────────
  const FIELD_LABELS: Record<string, string> = {
    address_line_1: 'Address',
    phone: 'Phone',
    taxonomy_desc: 'Specialty',
    primary_taxonomy_code: 'Taxonomy code',
    first_name: 'First name',
    last_name: 'Last name',
    name: 'Name',
    license_status: 'License status',
    credential: 'Credential',
    gender: 'Gender',
  };

  // ── Build comparison data from finding_details ─────────────────────────
  const details = workflow?.finding_details || {};
  const fieldLabel = FIELD_LABELS[details.field] || details.field || 'Value';
  const comparisonRows = details.nppes_value && details.website_value ? [
    {
      field: fieldLabel,
      website: details.website_value,
      nppes: details.nppes_value,
    },
  ] : [];

  // ── Monitor task info (Step 4) ─────────────────────────────────────────
  const monitorTask = tasks.find(t => t.task_type === 'monitor_auto_confirm');

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,30,46,.4)', zIndex: 200,
        backdropFilter: 'blur(2px)',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 540, background: '#fff',
        zIndex: 201, boxShadow: '-8px 0 32px rgba(0,0,0,.15)', overflowY: 'auto',
        animation: 'slideInRight .25s ease',
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: colors.gray400, fontSize: 13 }}>Loading...</div>
        ) : workflow ? (
          <>
            {/* ── Header ──────────────────────────────────────────── */}
            <div style={{
              padding: 20, borderBottom: `1px solid ${colors.gray200}`,
              position: 'sticky', top: 0, background: '#fff', zIndex: 1,
            }}>
              <button onClick={onClose} style={{
                position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
                fontSize: 20, cursor: 'pointer', color: colors.gray400, padding: '4px 8px', borderRadius: 6,
              }}>×</button>

              <Tooltip text={typeInfo.tooltip}>
                <span style={{ fontSize: 10, fontWeight: 700, color: colors.gold, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'help' }}>
                  {typeInfo.label}
                </span>
              </Tooltip>

              <div style={{ fontSize: 15, fontWeight: 800, color: colors.navy, margin: '6px 0 4px', paddingRight: 30 }}>
                {workflow.provider_name || 'Unknown'} — {workflow.finding_summary}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <Badge status={workflow.status} label={isOverdue ? 'Overdue' : undefined} />
                {isPendingVerification && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                    background: colors.bluePale, color: colors.blue,
                  }}>
                    {pendingVerificationLabel}
                  </span>
                )}
                <span style={{ fontSize: 11, color: colors.gray400 }}>
                  {dueText} · Created {new Date(workflow.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Task-based progress bar */}
              {workflow.status !== 'resolved' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: colors.gray200, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: borderColor, borderRadius: 3, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 10, color: colors.gray400, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {completedTasks}/{totalTasks}
                  </span>
                </div>
              )}
            </div>

            {/* ── Body ────────────────────────────────────────────── */}
            <div style={{ padding: 20 }}>

              {/* ── Task Checklist ──────────────────────────────────── */}
              <div style={{ marginBottom: 24 }}>
                <div style={sectionTitle}>Task checklist</div>
                {tasks.filter(t => t.status !== 'skipped').map(t => {
                  const isDone = t.status === 'completed';
                  const isActive = t.status === 'active';
                  const isMonitorTask = ['monitor_auto_confirm', 'monitor_board'].includes(t.task_type);
                  const checkColor = isDone ? colors.green : isActive ? colors.gold : colors.gray200;
                  const checkMark = isDone ? '✓' : isActive && !isMonitorTask ? '●' : '';

                  // Contextual title overrides based on workflow type
                  const contextTitle = (() => {
                    if (t.task_type === 'review_approve' && workflow?.workflow_type === 'license_renewal') {
                      return isDone ? 'Renewal application prepared' : 'Prepare renewal application';
                    }
                    return t.title;
                  })();

                  // Monitor tasks render differently — no checkbox, status indicator
                  if (isMonitorTask) {
                    const monitorLabel = workflow?.workflow_type === 'license_renewal' ? 'TMB'
                      : workflow?.workflow_type === 'payer_directory' ? 'payer directory'
                      : 'NPPES';
                    return (
                      <div key={t.id} style={{ marginBottom: 6 }}>
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                          border: `1px solid ${isDone ? colors.green + '40' : isActive ? colors.blue + '40' : colors.gray200}`,
                          borderRadius: 8,
                          background: isDone ? colors.greenPale + '30' : isActive ? colors.bluePale + '20' : 'transparent',
                        }}>
                          {/* Animated radar icon instead of checkbox */}
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            fontSize: isDone ? 10 : 12, marginTop: 1, color: isDone ? '#fff' : colors.blue,
                            background: isDone ? colors.green : colors.bluePale,
                          }}>{isDone ? '✓' : '📡'}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 600,
                              color: isDone ? colors.gray400 : colors.navy,
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}>
                              {isDone ? `${monitorLabel.charAt(0).toUpperCase() + monitorLabel.slice(1)} update verified` : contextTitle}
                              <span style={{
                                marginLeft: 6, fontSize: 9, fontWeight: 700, color: colors.blue,
                                background: colors.bluePale, padding: '1px 6px', borderRadius: 4,
                              }}>AUTOMATED</span>
                            </div>
                            <div style={{ fontSize: 10, color: colors.gray400, marginTop: 2 }}>
                              {isDone
                                ? `Update confirmed ${t.completed_at ? new Date(t.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`
                                : isActive
                                  ? `Monitoring ${monitorLabel} for updates — you'll be notified when confirmed`
                                  : t.description}
                            </div>
                            {isActive && (
                              <div style={{
                                marginTop: 8, padding: '8px 12px', borderRadius: 6,
                                background: colors.bluePale, border: `1px solid ${colors.blue}20`,
                                fontSize: 11, color: colors.blue, fontWeight: 500,
                              }}>
                                ⏳ Pending {monitorLabel} verification
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={t.id} style={{ marginBottom: 6 }}>
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                        border: `1px solid ${isActive ? colors.gold + '40' : colors.gray200}`,
                        borderRadius: 8,
                        background: isActive ? colors.goldPale + '30' : 'transparent',
                      }}>
                        <div
                          onClick={isActive && t.task_type === 'submit_nppes' ? () => handleMarkSubmitted() : undefined}
                          style={{
                            width: 18, height: 18, borderRadius: 4, border: `2px solid ${checkColor}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            fontSize: 10, marginTop: 1, color: '#fff',
                            background: isDone ? colors.green : 'transparent',
                            cursor: isActive && t.task_type === 'submit_nppes' ? 'pointer' : 'default',
                          }}
                        >{checkMark}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, color: isDone ? colors.gray400 : colors.navy,
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>
                            {contextTitle}
                            {t.task_type === 'submit_nppes' && (
                              <span style={{
                                marginLeft: 6, fontSize: 9, fontWeight: 700, color: colors.gray400,
                                background: colors.gray100, padding: '1px 6px', borderRadius: 4,
                              }}>OPTIONAL</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: colors.gray400, marginTop: 2 }}>{t.description}</div>
                        </div>
                      </div>

                      {/* ── Step 1: Review & Approve (active, not yet submitted) ── */}
                      {isActive && t.task_type === 'review_approve' && !approvalSubmitted && (
                        <div style={{
                          marginTop: 8, padding: 14, background: colors.gray50,
                          border: `1px solid ${colors.gray200}`, borderRadius: 8,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: colors.navy, marginBottom: 10 }}>
                            Which {fieldLabel.toLowerCase()} is correct?
                          </div>

                          {approvalOptions.map((opt: any, i: number) => (
                            <div key={i} onClick={() => selectOption(i)} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                              border: `1.5px solid ${approvalSelection === i ? colors.blue : colors.gray200}`,
                              borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                              background: approvalSelection === i ? colors.bluePale : '#fff',
                              transition: 'all .15s',
                            }}>
                              <div style={{
                                width: 16, height: 16, borderRadius: '50%', border: `2px solid ${approvalSelection === i ? colors.blue : colors.gray200}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                              }}>
                                {approvalSelection === i && <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.blue }} />}
                              </div>
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.gray400 }}>{opt.source}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>{opt.value || '—'}</div>
                              </div>
                            </div>
                          ))}

                          {/* Custom option */}
                          <div onClick={() => selectOption('custom')} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                            border: `1.5px solid ${approvalSelection === 'custom' ? colors.blue : colors.gray200}`,
                            borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                            background: approvalSelection === 'custom' ? colors.bluePale : '#fff', transition: 'all .15s',
                          }}>
                            <div style={{
                              width: 16, height: 16, borderRadius: '50%', border: `2px solid ${approvalSelection === 'custom' ? colors.blue : colors.gray200}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                            }}>
                              {approvalSelection === 'custom' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.blue }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.gray400 }}>Enter a different value</div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: colors.gray400 }}>Both are wrong or need editing</div>
                              {approvalSelection === 'custom' && (
                                <input
                                  type="text" value={customValue}
                                  onChange={e => setCustomValue(e.target.value)}
                                  placeholder={`Enter correct ${fieldLabel.toLowerCase()}...`}
                                  autoFocus
                                  style={{
                                    width: '100%', marginTop: 6, padding: '7px 10px', borderRadius: 6,
                                    border: `1px solid ${colors.gray200}`, fontSize: 12, fontFamily: 'inherit',
                                    color: colors.navy, outline: 'none',
                                  }}
                                  onFocus={e => e.currentTarget.style.borderColor = colors.blue}
                                  onBlur={e => e.currentTarget.style.borderColor = colors.gray200}
                                />
                              )}
                            </div>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <button onClick={handleApprove} disabled={!confirmEnabled} style={{
                              padding: '8px 18px', background: colors.navy, color: '#fff', border: 'none',
                              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: confirmEnabled ? 'pointer' : 'not-allowed',
                              fontFamily: 'inherit', opacity: confirmEnabled ? 1 : 0.4, transition: 'all .15s',
                            }}>Confirm &amp; generate form</button>
                          </div>
                        </div>
                      )}

                      {/* ── Step 1: Approval result (already approved) ── */}
                      {(isDone || isActive) && t.task_type === 'review_approve' && approvalSubmitted && approvalResult && (
                        <div style={{
                          marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                          borderRadius: 8,
                          background: approvalResult.type === 'nppes_correct' ? colors.bluePale : colors.greenPale,
                          border: `1px solid ${approvalResult.type === 'nppes_correct' ? colors.blue : colors.green}`,
                        }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: approvalResult.type === 'nppes_correct' ? colors.blue : colors.green }}>✓</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: approvalResult.type === 'nppes_correct' ? colors.blue : colors.green }}>
                              {approvalResult.type === 'nppes_correct' ? 'NPPES is correct — no update needed' : 'Correction approved'}
                            </div>
                            <div style={{ fontSize: 11, color: colors.gray600, marginTop: 2 }}>
                              {approvalResult.type === 'nppes_correct'
                                ? 'Your website may need updating to match.'
                                : `Approved value: ${approvalResult.value}`}
                            </div>
                            {approvalResult.type === 'approved' && (
                              <div style={{ fontSize: 11, color: colors.green, marginTop: 4 }}>Pre-filled NPPES form is now ready for download below ↓</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Step 2: Submit to NPPES ── */}
                      {isActive && t.task_type === 'download_submit' && (
                        <div style={{
                          marginTop: 8, padding: 14, background: colors.gray50,
                          border: `1px solid ${colors.gray200}`, borderRadius: 8,
                        }}>
                          {/* Primary action: Go to NPPES Portal */}
                          <a
                            href="https://nppes.cms.hhs.gov/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              width: '100%', padding: '10px 14px', background: colors.navy, color: '#fff',
                              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                              textDecoration: 'none', marginBottom: 10,
                            }}
                          >
                            Open NPPES Portal →
                          </a>

                          {/* Secondary: Download pre-filled form (optional) */}
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', background: '#fff', border: `1px solid ${colors.gray200}`,
                            borderRadius: 6, marginBottom: 12,
                          }}>
                            <div style={{ fontSize: 11, color: colors.gray400 }}>
                              Need a pre-filled form?
                            </div>
                            <button onClick={handleDownload} disabled={downloadGenerating} style={{
                              padding: '4px 12px', background: 'transparent', color: colors.navy,
                              border: `1px solid ${colors.gray200}`, borderRadius: 4,
                              fontSize: 11, fontWeight: 600, cursor: downloadGenerating ? 'wait' : 'pointer',
                              fontFamily: 'inherit', opacity: downloadGenerating ? 0.6 : 1,
                            }}>
                              {downloadGenerating ? 'Generating...' : 'Download PDF'}
                            </button>
                          </div>

                          {/* Confirm submission */}
                          <button onClick={handleDownloadSubmitComplete} disabled={submitMarking} style={{
                            width: '100%', padding: '9px 14px', background: colors.green, color: '#fff',
                            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                            cursor: submitMarking ? 'wait' : 'pointer', fontFamily: 'inherit',
                            opacity: submitMarking ? 0.6 : 1,
                          }}>
                            {submitMarking ? 'Saving...' : "I've submitted to NPPES"}
                          </button>
                          <div style={{ fontSize: 10, color: colors.gray400, marginTop: 6, textAlign: 'center' }}>
                            We'll monitor NPPES automatically to confirm your update was applied.
                          </div>
                        </div>
                      )}

                      {/* Step 2: Already completed */}
                      {isDone && t.task_type === 'download_submit' && (
                        <div style={{
                          marginTop: 8, padding: '10px 14px', borderRadius: 8,
                          background: colors.greenPale, border: `1px solid ${colors.green}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, color: colors.green }}>✓</span>
                            <span style={{ fontSize: 11, color: colors.green, fontWeight: 600 }}>
                              Submitted to NPPES {t.metadata?.submitted_at
                                ? new Date(t.metadata.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : ''}
                            </span>
                          </div>
                          <button onClick={handleDownload} style={{
                            padding: '4px 10px', background: 'transparent',
                            color: colors.navy, border: `1px solid ${colors.gray200}`, borderRadius: 4,
                            fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>Re-download PDF</button>
                        </div>
                      )}

                      {/* Legacy support: old download_form tasks — show portal link + optional PDF */}
                      {isActive && t.task_type === 'download_form' && (
                        <div style={{
                          marginTop: 8, padding: 14, background: colors.gray50,
                          border: `1px solid ${colors.gray200}`, borderRadius: 8,
                        }}>
                          <a
                            href="https://nppes.cms.hhs.gov/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              width: '100%', padding: '10px 14px', background: colors.navy, color: '#fff',
                              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                              textDecoration: 'none', marginBottom: 10,
                            }}
                          >
                            Open NPPES Portal →
                          </a>
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', background: '#fff', border: `1px solid ${colors.gray200}`,
                            borderRadius: 6,
                          }}>
                            <div style={{ fontSize: 11, color: colors.gray400 }}>
                              Need a pre-filled form?
                            </div>
                            <button onClick={handleDownload} disabled={downloadGenerating} style={{
                              padding: '4px 12px', background: 'transparent', color: colors.navy,
                              border: `1px solid ${colors.gray200}`, borderRadius: 4,
                              fontSize: 11, fontWeight: 600, cursor: downloadGenerating ? 'wait' : 'pointer',
                              fontFamily: 'inherit', opacity: downloadGenerating ? 0.6 : 1,
                            }}>
                              {downloadGenerating ? 'Generating...' : 'Download PDF'}
                            </button>
                          </div>
                        </div>
                      )}
                      {isDone && t.task_type === 'download_form' && (
                        <div style={{
                          marginTop: 8, padding: '8px 14px', borderRadius: 8,
                          background: colors.greenPale, border: `1px solid ${colors.green}`,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ fontSize: 14, color: colors.green }}>✓</span>
                          <span style={{ fontSize: 11, color: colors.green, fontWeight: 600 }}>Downloaded</span>
                          <button onClick={handleDownload} style={{
                            marginLeft: 'auto', padding: '4px 10px', background: 'transparent',
                            color: colors.navy, border: `1px solid ${colors.gray200}`, borderRadius: 4,
                            fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>Download again</button>
                        </div>
                      )}
                      {/* Legacy submit_nppes: no expanded UI — checkbox click completes it */}
                      {/* Legacy: completed submit_nppes tasks */}
                      {isDone && t.task_type === 'submit_nppes' && (
                        <div style={{
                          marginTop: 8, padding: '8px 14px', borderRadius: 8,
                          background: colors.greenPale, border: `1px solid ${colors.green}`,
                          fontSize: 11, color: colors.green, fontWeight: 600,
                        }}>
                          ✓ Submitted
                        </div>
                      )}

                      {/* ── Submit renewal to TMB ── */}
                      {isActive && t.task_type === 'submit_renewal' && (
                        <div style={{
                          marginTop: 8, padding: 14, background: colors.gray50,
                          border: `1px solid ${colors.gray200}`, borderRadius: 8,
                        }}>
                          <a
                            href="https://profile.tmb.state.tx.us/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              width: '100%', padding: '10px 14px', background: colors.navy, color: '#fff',
                              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                              textDecoration: 'none', marginBottom: 10,
                            }}
                          >
                            Open TMB Portal →
                          </a>
                          <button
                            onClick={async () => {
                              await supabase.from('workflow_tasks').update({
                                status: 'completed', completed_at: new Date().toISOString(),
                              }).eq('id', t.id);
                              await logEvent('task_completed', `Submitted renewal to TMB`, {});
                              // Activate monitor_board step
                              const nextTask = tasks.find(nt => nt.task_order > t.task_order && nt.status === 'pending');
                              if (nextTask) {
                                await supabase.from('workflow_tasks').update({ status: 'active' }).eq('id', nextTask.id);
                              }
                              // Refetch tasks
                              const { data: freshTasks } = await supabase
                                .from('workflow_tasks')
                                .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
                                .eq('workflow_id', workflow!.id)
                                .order('task_order', { ascending: true });
                              if (freshTasks) setTasks(freshTasks);
                            }}
                            style={{
                              width: '100%', padding: '9px 14px', background: colors.green, color: '#fff',
                              border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            I've submitted the renewal
                          </button>
                          <div style={{ fontSize: 10, color: colors.gray400, marginTop: 6, textAlign: 'center' }}>
                            After submission, we'll monitor TMB for your updated license status.
                          </div>
                        </div>
                      )}
                      {isDone && t.task_type === 'submit_renewal' && (
                        <div style={{
                          marginTop: 8, padding: '8px 14px', borderRadius: 8,
                          background: colors.greenPale, border: `1px solid ${colors.green}`,
                          fontSize: 11, color: colors.green, fontWeight: 600,
                        }}>
                          ✓ Submitted to TMB {t.completed_at
                            ? new Date(t.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : ''}
                        </div>
                      )}

                      {/* ── Generic active task: Mark complete button ── */}
                      {isActive && !['review_approve', 'download_form', 'download_submit', 'submit_nppes', 'submit_renewal', 'monitor_auto_confirm', 'monitor_board'].includes(t.task_type) && (
                        <div style={{
                          marginTop: 8, padding: 14, background: colors.gray50,
                          border: `1px solid ${colors.gray200}`, borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <div>
                            {t.metadata?.portal_url && (
                              <a href={t.metadata.portal_url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 11, fontWeight: 600, color: colors.blue, textDecoration: 'underline', marginRight: 12 }}>
                                Open portal →
                              </a>
                            )}
                            {t.metadata?.template_content && (
                              <div style={{ fontSize: 11, color: colors.gray600, marginTop: 4, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto' }}>
                                {t.metadata.template_content}
                              </div>
                            )}
                            {!t.metadata?.portal_url && !t.metadata?.template_content && (
                              <div style={{ fontSize: 11, color: colors.gray400 }}>
                                Complete this step and mark it done below.
                              </div>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              await supabase.from('workflow_tasks').update({
                                status: 'completed', completed_at: new Date().toISOString(),
                              }).eq('id', t.id);
                              await logEvent('task_completed', `Completed: ${t.title}`, {});
                              // Activate next pending task
                              const nextTask = tasks.find(nt => nt.task_order > t.task_order && nt.status === 'pending');
                              if (nextTask) {
                                await supabase.from('workflow_tasks').update({ status: 'active' }).eq('id', nextTask.id);
                              }

                              // Check if all tasks are now completed
                              const remainingPending = tasks.filter(
                                nt => nt.id !== t.id && nt.status !== 'completed' && nt.status !== 'skipped'
                              );
                              const isLastTask = remainingPending.length === 0;

                              if (isLastTask && workflow) {
                                // Mark workflow as resolved
                                await supabase.from('workflow_instances')
                                  .update({ status: 'resolved', completed_at: new Date().toISOString() })
                                  .eq('id', workflow.id);

                                await supabase.from('workflow_events').insert({
                                  workflow_id: workflow.id, event_type: 'completed', actor_type: 'system',
                                  actor_id: currentUser?.id || null, actor_email: currentUser?.email || null,
                                  title: 'Workflow completed — all tasks done', details: {},
                                });

                                // For onboarding: add provider to roster now
                                if (workflow.workflow_type === 'onboarding' && workflow.provider_npi) {
                                  // Check if already on roster
                                  const { data: existing } = await supabase
                                    .from('practice_providers')
                                    .select('id')
                                    .eq('practice_website_id', practiceId)
                                    .eq('npi', workflow.provider_npi)
                                    .maybeSingle();

                                  if (!existing) {
                                    await supabase.from('practice_providers').insert({
                                      practice_website_id: practiceId,
                                      npi: workflow.provider_npi,
                                      provider_name: workflow.provider_name,
                                      roster_status: 'active',
                                    });
                                  } else {
                                    // Update existing to active if it was still onboarding
                                    await supabase.from('practice_providers')
                                      .update({ roster_status: 'active' })
                                      .eq('id', existing.id);
                                  }

                                  await supabase.from('workflow_events').insert({
                                    workflow_id: workflow.id, event_type: 'roster_added', actor_type: 'system',
                                    actor_id: currentUser?.id || null, actor_email: currentUser?.email || null,
                                    title: `${workflow.provider_name} added to roster`,
                                    details: { npi: workflow.provider_npi },
                                  });
                                }
                              }

                              // Refetch
                              const { data: freshTasks } = await supabase
                                .from('workflow_tasks')
                                .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
                                .eq('workflow_id', workflow!.id)
                                .order('task_order', { ascending: true });
                              if (freshTasks) setTasks(freshTasks);

                              // Refresh workflow status
                              if (isLastTask) {
                                const { data: freshWf } = await supabase
                                  .from('workflow_instances')
                                  .select('id, workflow_type, status, provider_npi, provider_name, finding_summary, finding_details, priority, overdue_at, created_at, approved_value, approved_at, target_completion')
                                  .eq('id', workflow!.id)
                                  .single();
                                if (freshWf) setWorkflow(freshWf);
                              }
                            }}
                            style={{
                              padding: '7px 14px', background: colors.navy, color: '#fff', border: 'none',
                              borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'inherit', whiteSpace: 'nowrap',
                            }}
                          >
                            Mark complete
                          </button>
                        </div>
                      )}

                      {/* ── Step 4: Monitor & Auto-confirm ── */}
                      {isActive && t.task_type === 'monitor_auto_confirm' && (
                        <div style={{
                          marginTop: 8, padding: 14,
                          background: colors.bluePale, border: `1px solid ${colors.blue}20`,
                          borderRadius: 8,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', background: colors.blue,
                              animation: 'pulse 2s infinite',
                            }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: colors.blue }}>
                              Monitoring NPPES weekly sync
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: colors.gray400 }}>
                            We check every week for your correction to appear in the NPPES registry.
                            This step closes automatically when confirmed.
                            {monitorTask?.metadata?.last_polled_at && (
                              <span> · Last checked: {new Date(monitorTask.metadata.last_polled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            )}
                          </div>
                          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── Complete Workflow button ── */}
                {(() => {
                  const visibleTasks = tasks.filter(t => t.status !== 'skipped');
                  const humanTasksDone = visibleTasks
                    .filter(t => t.task_type !== 'monitor_auto_confirm')
                    .every(t => t.status === 'completed');
                  const isStillInProgress = workflow?.status === 'in_progress' || workflow?.status === 'action_needed';

                  if (humanTasksDone && isStillInProgress && visibleTasks.length > 0) {
                    return (
                      <button
                        onClick={async () => {
                          if (!workflow) return;
                          // Complete any remaining auto tasks
                          const pendingAuto = tasks.filter(t => t.task_type === 'monitor_auto_confirm' && t.status !== 'completed' && t.status !== 'skipped');
                          for (const at of pendingAuto) {
                            await supabase.from('workflow_tasks').update({
                              status: 'completed', completed_at: new Date().toISOString(),
                              metadata: { ...at.metadata, manually_completed: true },
                            }).eq('id', at.id);
                          }
                          // Resolve workflow
                          await supabase.from('workflow_instances')
                            .update({ status: 'resolved', completed_at: new Date().toISOString() })
                            .eq('id', workflow.id);
                          await logEvent('completed', 'Workflow manually completed', { manually_completed: true });

                          // For onboarding: add provider to roster
                          if (workflow.workflow_type === 'onboarding' && workflow.provider_npi) {
                            const { data: existing } = await supabase
                              .from('practice_providers')
                              .select('id')
                              .eq('practice_website_id', practiceId)
                              .eq('npi', workflow.provider_npi)
                              .maybeSingle();
                            if (!existing) {
                              await supabase.from('practice_providers').insert({
                                practice_website_id: practiceId, npi: workflow.provider_npi,
                                provider_name: workflow.provider_name, roster_status: 'active',
                              });
                            } else {
                              await supabase.from('practice_providers')
                                .update({ roster_status: 'active' }).eq('id', existing.id);
                            }
                            await logEvent('roster_added', `${workflow.provider_name} added to roster`, { npi: workflow.provider_npi });
                          }

                          // Refresh
                          const { data: freshTasks } = await supabase
                            .from('workflow_tasks')
                            .select('id, task_order, task_type, title, description, status, metadata, completed_at, confirmed_at')
                            .eq('workflow_id', workflow.id)
                            .order('task_order', { ascending: true });
                          if (freshTasks) setTasks(freshTasks);
                          const { data: freshWf } = await supabase
                            .from('workflow_instances')
                            .select('id, workflow_type, status, provider_npi, provider_name, finding_summary, finding_details, priority, overdue_at, created_at, approved_value, approved_at, target_completion')
                            .eq('id', workflow.id)
                            .single();
                          if (freshWf) setWorkflow(freshWf);
                        }}
                        style={{
                          width: '100%', padding: '11px 18px', marginTop: 12,
                          background: colors.green, color: '#fff', border: 'none',
                          borderRadius: 8, fontSize: 13, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'opacity .15s',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      >
                        Complete workflow
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* ── Source Comparison ───────────────────────────────── */}
              {comparisonRows.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={sectionTitle}>Source comparison</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr>
                        {['Field', 'Website', 'NPPES'].map(h => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '8px 10px', background: colors.gray100,
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.04em', color: colors.gray400, borderBottom: `1px solid ${colors.gray200}`,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.gray100}`, color: colors.navy, fontWeight: 600 }}>{row.field}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.gray100}`, color: colors.red, fontWeight: 600, background: colors.redPale }}>{row.website}</td>
                          <td style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.gray100}`, color: colors.red, fontWeight: 600, background: colors.redPale }}>{row.nppes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Timeline ───────────────────────────────────────── */}
              {events.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={sectionTitle}>Timeline</div>
                  {events.map((ev, i) => {
                    const dotColor = ev.event_type === 'created' ? colors.blue
                      : ev.event_type === 'approved' ? colors.green
                      : ev.event_type === 'form_downloaded' ? colors.navy
                      : ev.event_type === 'submitted' ? colors.gold
                      : ev.event_type === 'overdue' ? colors.red
                      : ev.event_type === 'auto_confirmed' ? colors.green
                      : colors.gold;

                    return (
                      <div key={ev.id} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
                        {i < events.length - 1 && (
                          <div style={{
                            position: 'absolute', left: 7, top: 18, bottom: 0,
                            width: 1.5, background: colors.gray200,
                          }} />
                        )}
                        <div style={{
                          width: 15, height: 15, borderRadius: '50%', background: dotColor,
                          flexShrink: 0, marginTop: 2,
                        }} />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: colors.navy }}>{ev.title}</div>
                          <div style={{ fontSize: 10, color: colors.gray400 }}>
                            {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {ev.actor_type === 'system' ? ' · System' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── NPI Reference ──────────────────────────────────── */}
              {workflow.provider_npi && (
                <div style={{ marginBottom: 24 }}>
                  <div style={sectionTitle}>Provider reference</div>
                  <div style={{
                    padding: '10px 14px', background: colors.gray50, borderRadius: 8,
                    border: `1px solid ${colors.gray200}`, fontSize: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: colors.gray400, fontWeight: 600 }}>Provider</span>
                      <span style={{ color: colors.navy, fontWeight: 600 }}>{workflow.provider_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.gray400, fontWeight: 600 }}>NPI</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: colors.navy }}>{workflow.provider_npi}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Cancel / Delete Workflow ─────────────────────────── */}
              {workflow.status !== 'cancelled' && workflow.status !== 'resolved' && (
                <div style={{
                  marginBottom: 24, padding: 16, borderRadius: 8,
                  border: `1px solid ${colors.gray200}`, background: colors.gray50,
                }}>
                  {!showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      style={{
                        width: '100%', padding: '8px 14px', background: 'transparent',
                        color: colors.red, border: `1.5px solid ${colors.red}30`,
                        borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all .15s',
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = colors.redPale; }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {workflow.workflow_type === 'onboarding' ? 'Cancel onboarding' : 'Cancel workflow'}
                    </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.red, marginBottom: 8 }}>
                        {workflow.workflow_type === 'onboarding'
                          ? 'Cancel this onboarding? The provider will not be added to your roster.'
                          : 'Cancel this workflow? All pending tasks will be skipped.'}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={handleCancelWorkflow}
                          disabled={cancelling}
                          style={{
                            padding: '7px 16px', background: colors.red, color: '#fff',
                            border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            cursor: cancelling ? 'wait' : 'pointer', fontFamily: 'inherit',
                            opacity: cancelling ? 0.6 : 1,
                          }}
                        >
                          {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          style={{
                            padding: '7px 16px', background: '#fff', color: colors.navy,
                            border: `1px solid ${colors.gray200}`, borderRadius: 6,
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Keep workflow
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resolved / Cancelled — with Reopen option */}
              {(workflow.status === 'resolved' || workflow.status === 'cancelled') && (
                <div style={{
                  marginBottom: 24, padding: 16, borderRadius: 8,
                  background: workflow.status === 'resolved' ? colors.greenPale : colors.gray100,
                  border: `1px solid ${workflow.status === 'resolved' ? colors.green : colors.gray200}`,
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, textAlign: 'center', marginBottom: 10,
                    color: workflow.status === 'resolved' ? colors.green : colors.gray400,
                  }}>
                    {workflow.status === 'resolved'
                      ? (workflow.finding_details?.field && approvalResult?.type === 'nppes_correct'
                        ? 'Resolved — NPPES data is correct'
                        : 'Workflow completed')
                      : 'This workflow has been cancelled'}
                  </div>
                  <button
                    onClick={handleReopenWorkflow}
                    disabled={reopening}
                    style={{
                      width: '100%', padding: '8px 14px', background: '#fff',
                      color: colors.navy, border: `1.5px solid ${colors.gray200}`,
                      borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: reopening ? 'wait' : 'pointer',
                      fontFamily: 'inherit', opacity: reopening ? 0.6 : 1,
                    }}
                  >
                    {reopening ? 'Reopening...' : 'Reopen workflow'}
                  </button>
                  <div style={{ fontSize: 10, color: colors.gray400, marginTop: 6, textAlign: 'center' }}>
                    Made a mistake? Reopen to start from the review step.
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: colors.gray400, fontSize: 13 }}>Workflow not found</div>
        )}
      </div>
    </>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: colors.gray400, marginBottom: 10,
};
