/**
 * components/dashboard/WorkflowDetailPanel.tsx
 *
 * Slide-over panel showing full workflow detail:
 * - Header with type, title, status, progress
 * - Task checklist (done/active/pending) — NEW 4-step structure
 * - Step 1: Review & Approve (merged comparison + approval radio cards)
 * - Step 2: Download pre-filled NPPES form (active after approval)
 * - Step 3: Submit to NPPES (optional, independent)
 * - Step 4: Monitor & Auto-confirm (automated, parallel with step 3)
 * - Source comparison table
 * - Document/artifact link
 * - Timeline of events
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

  // Download state
  const [downloadGenerating, setDownloadGenerating] = useState(false);

  const supabase = createBrowserSupabaseClient();

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
  const findingField = workflow?.finding_details?.field || 'value';

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

    if (!isNppesCorrect) {
      // 3. Activate download_form (step 2) — sequential dependency
      const downloadTask = tasks.find(t => t.task_type === 'download_form');
      if (downloadTask) {
        await supabase
          .from('workflow_tasks')
          .update({ status: 'active' })
          .eq('id', downloadTask.id);
      }

      // 4. Activate monitor_auto_confirm (step 4) — parallel, always starts
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

    // 5. Log event
    await supabase.from('workflow_events').insert({
      workflow_id: workflow.id,
      event_type: 'approved',
      actor_type: 'user',
      title: isNppesCorrect ? 'NPPES data confirmed correct' : `Correction approved: ${chosenValue}`,
      details: { approved_value: chosenValue, is_nppes_correct: isNppesCorrect },
    });

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

      // Log event
      await supabase.from('workflow_events').insert({
        workflow_id: workflow.id,
        event_type: 'form_downloaded',
        actor_type: 'user',
        title: 'NPPES update form downloaded',
        details: { download_count: currentCount + 1 },
      });

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

  // ── Build comparison data from finding_details ─────────────────────────
  const details = workflow?.finding_details || {};
  const comparisonRows = details.nppes_value && details.website_value ? [
    {
      field: details.field === 'address_line_1' ? 'Address' : details.field === 'phone' ? 'Phone' : details.field || 'Value',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Badge status={workflow.status} label={isOverdue ? 'Overdue' : undefined} />
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
                {tasks.map(t => {
                  const isDone = t.status === 'completed';
                  const isActive = t.status === 'active';
                  const checkColor = isDone ? colors.green : isActive ? colors.gold : colors.gray200;
                  const checkMark = isDone ? '✓' : isActive ? '●' : '';

                  return (
                    <div key={t.id} style={{ marginBottom: 6 }}>
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                        border: `1px solid ${isActive ? colors.gold + '40' : colors.gray200}`,
                        borderRadius: 8,
                        background: isActive ? colors.goldPale + '30' : 'transparent',
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, border: `2px solid ${checkColor}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          fontSize: 10, marginTop: 1, color: '#fff',
                          background: isDone ? colors.green : 'transparent',
                        }}>{checkMark}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, color: isDone ? colors.gray400 : colors.navy,
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>
                            {t.title}
                            {t.task_type === 'monitor_auto_confirm' && (
                              <span style={{
                                marginLeft: 6, fontSize: 9, fontWeight: 700, color: colors.blue,
                                background: colors.bluePale, padding: '1px 6px', borderRadius: 4,
                              }}>AUTO</span>
                            )}
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
                            Which {findingField === 'address_line_1' ? 'address' : findingField} is correct?
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
                                  placeholder={`Enter correct ${findingField === 'address_line_1' ? 'address' : findingField}...`}
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

                      {/* ── Step 2: Download form button ── */}
                      {isActive && t.task_type === 'download_form' && (
                        <div style={{
                          marginTop: 8, padding: 14, background: colors.gray50,
                          border: `1px solid ${colors.gray200}`, borderRadius: 8,
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, background: colors.navy,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 16, flexShrink: 0,
                          }}>📄</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>
                              NPPES Update Form — {workflow?.provider_name}
                            </div>
                            <div style={{ fontSize: 10, color: colors.gray400, marginTop: 2 }}>
                              Pre-filled with your approved {findingField === 'address_line_1' ? 'address' : findingField} correction
                            </div>
                          </div>
                          <button onClick={handleDownload} disabled={downloadGenerating} style={{
                            padding: '7px 14px', background: colors.navy, color: '#fff', border: 'none',
                            borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: downloadGenerating ? 'wait' : 'pointer',
                            fontFamily: 'inherit', opacity: downloadGenerating ? 0.6 : 1,
                          }}>
                            {downloadGenerating ? 'Generating...' : 'Download PDF'}
                          </button>
                        </div>
                      )}

                      {/* Step 2: Already downloaded */}
                      {isDone && t.task_type === 'download_form' && (
                        <div style={{
                          marginTop: 8, padding: '8px 14px', borderRadius: 8,
                          background: colors.greenPale, border: `1px solid ${colors.green}`,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ fontSize: 14, color: colors.green }}>✓</span>
                          <span style={{ fontSize: 11, color: colors.green, fontWeight: 600 }}>
                            Downloaded {t.metadata?.download_count || 1}x
                          </span>
                          <button onClick={handleDownload} style={{
                            marginLeft: 'auto', padding: '4px 10px', background: 'transparent',
                            color: colors.navy, border: `1px solid ${colors.gray200}`, borderRadius: 4,
                            fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>Download again</button>
                        </div>
                      )}

                      {/* ── Step 3: Submit to NPPES ── */}
                      {isActive && t.task_type === 'submit_nppes' && (
                        <div style={{
                          marginTop: 8, padding: 14, background: colors.gray50,
                          border: `1px solid ${colors.gray200}`, borderRadius: 8,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <a
                              href="https://nppes.cms.hhs.gov/"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: 11, fontWeight: 600, color: colors.blue,
                                textDecoration: 'underline',
                              }}
                            >
                              Open NPPES Portal →
                            </a>
                          </div>
                          <div style={{ fontSize: 10, color: colors.gray400, marginBottom: 10 }}>
                            Upload your pre-filled form at the NPPES portal. Then mark as submitted below.
                            This step is optional. We monitor NPPES automatically regardless.
                          </div>
                          <button onClick={handleMarkSubmitted} disabled={submitMarking} style={{
                            padding: '7px 14px', background: '#fff', color: colors.navy,
                            border: `1.5px solid ${colors.navy}`, borderRadius: 6, fontSize: 11,
                            fontWeight: 700, cursor: submitMarking ? 'wait' : 'pointer', fontFamily: 'inherit',
                          }}>
                            {submitMarking ? 'Saving...' : 'Mark as submitted'}
                          </button>
                        </div>
                      )}

                      {/* Step 3: Already submitted */}
                      {isDone && t.task_type === 'submit_nppes' && (
                        <div style={{
                          marginTop: 8, padding: '8px 14px', borderRadius: 8,
                          background: colors.greenPale, border: `1px solid ${colors.green}`,
                          fontSize: 11, color: colors.green, fontWeight: 600,
                        }}>
                          ✓ Marked submitted {t.metadata?.marked_submitted_at
                            ? new Date(t.metadata.marked_submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : ''}
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
