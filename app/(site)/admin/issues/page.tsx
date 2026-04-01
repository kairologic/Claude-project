'use client';

/**
 * app/(site)/admin/issues/page.tsx
 *
 * Admin Issues & Feature Requests Dashboard
 * - Fetches from the `feedback` table via Supabase REST API
 * - Status updates with auto system comment
 * - Full conversation thread + admin reply
 * - KPI cards with real counts
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { colors, spacing, typography, shadows, transitions, radii } from '@/lib/design-tokens';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

interface FeedbackItem {
  id: string;
  practice_id: string | null;
  practice_name: string | null;
  type: 'issue' | 'feature';
  category: string | null;
  subject: string;
  description: string;
  urgency: string | null;
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  feedback_id: string;
  author: string;
  author_role: 'practice' | 'admin';
  message: string;
  created_at: string;
}

interface Stats {
  all: number;
  new: number;
  reviewed: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

type CategoryFilter = 'all' | 'issue' | 'feature';
type StatusFilter = 'all' | 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseHeaders = {
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
};

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  all:         { label: 'All',         color: colors.gray600, bg: colors.gray100 },
  new:         { label: 'New',         color: colors.blue,    bg: colors.bluePale },
  reviewed:    { label: 'Reviewed',    color: '#D97706',      bg: '#FFFBEB' },
  in_progress: { label: 'In Progress', color: '#C2410C',      bg: '#FFF7ED' },
  resolved:    { label: 'Resolved',    color: colors.green,   bg: colors.greenPale },
  closed:      { label: 'Closed',      color: colors.gray400, bg: colors.gray100 },
};

const urgencyConfig: Record<string, { color: string; bg: string }> = {
  low:      { color: '#0891B2', bg: '#ECFEFF' },
  medium:   { color: '#D97706', bg: '#FFFBEB' },
  high:     { color: colors.red, bg: colors.redPale },
  critical: { color: '#7C3AED', bg: '#F5F3FF' },
};

const categoryBadge = {
  issue:   { label: 'Issue',   color: colors.red,  bg: colors.redPale },
  feature: { label: 'Feature', color: colors.blue, bg: colors.bluePale },
};

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

function relativeTime(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function calcStats(data: FeedbackItem[]): Stats {
  return {
    all: data.length,
    new: data.filter(f => f.status === 'new').length,
    reviewed: data.filter(f => f.status === 'reviewed').length,
    in_progress: data.filter(f => f.status === 'in_progress').length,
    resolved: data.filter(f => f.status === 'resolved').length,
    closed: data.filter(f => f.status === 'closed').length,
  };
}

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export default function IssuesPage() {
  const router = useRouter();

  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<Stats>({ all: 0, new: 0, reviewed: 0, in_progress: 0, resolved: 0, closed: 0 });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-item UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Auth check
  useEffect(() => {
    const isAuthed = typeof window !== 'undefined' && sessionStorage.getItem('admin_auth');
    if (!isAuthed) router.push('/admin');
  }, [router]);

  // Fetch all feedback
  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/feedback?select=*&order=created_at.desc`,
        { headers: supabaseHeaders }
      );

      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          setFeedback([]);
          setStats({ all: 0, new: 0, reviewed: 0, in_progress: 0, resolved: 0, closed: 0 });
          return;
        }
        throw new Error(`Failed to fetch feedback: ${res.statusText}`);
      }

      const data: FeedbackItem[] = await res.json();
      setFeedback(data);
      setStats(calcStats(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setDropdownOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Update status via API
  const updateStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');

      setFeedback(prev => {
        const updated = prev.map(item =>
          item.id === feedbackId ? { ...item, status: newStatus as FeedbackItem['status'] } : item
        );
        setStats(calcStats(updated));
        return updated;
      });
      setDropdownOpen(null);

      // Refresh comments for expanded item (system comment was added)
      if (expandedId === feedbackId) {
        await fetchComments(feedbackId);
      }
    } catch {
      setError('Failed to update status');
    }
  };

  // Fetch comments for a feedback item
  const fetchComments = async (feedbackId: string) => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/comments`);
      if (!res.ok) return;
      const data: Comment[] = await res.json();
      setComments(prev => ({ ...prev, [feedbackId]: data }));
    } catch {
      // ignore
    }
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setCommentText('');
    } else {
      setExpandedId(id);
      setCommentText('');
      fetchComments(id);
    }
  };

  const handleAddComment = async (feedbackId: string) => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'Admin',
          author_role: 'admin',
          message: commentText.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const newComment: Comment = await res.json();
      setComments(prev => ({
        ...prev,
        [feedbackId]: [...(prev[feedbackId] || []), newComment],
      }));
      setCommentText('');
    } catch {
      // silent
    } finally {
      setSubmittingComment(false);
    }
  };

  // Filtered list
  const filteredFeedback = feedback.filter(item => {
    const matchCat = categoryFilter === 'all' || item.type === categoryFilter;
    const matchStat = statusFilter === 'all' || item.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = q === '' ||
      item.subject.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.practice_name || '').toLowerCase().includes(q) ||
      (item.submitted_by || '').toLowerCase().includes(q);
    return matchCat && matchStat && matchSearch;
  });

  // ── Render ──

  return (
    <div style={{ padding: spacing['4xl'], maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <h1 style={{ ...typography.h1, color: colors.navy, marginBottom: spacing.md }}>
          Issues &amp; Feature Requests
        </h1>
        <p style={{ ...typography.bodySmall, color: colors.gray600 }}>
          Monitor and manage feedback from practice users. Update status and reply to start a conversation.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: colors.redPale,
          border: `1px solid ${colors.red}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          <AlertCircle size={18} color={colors.red} />
          <p style={{ ...typography.body, color: colors.red }}>{error}</p>
        </div>
      )}

      {/* KPI cards */}
      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing['2xl'],
        }}>
          {([
            { key: 'all', label: 'Total' },
            { key: 'new', label: 'New' },
            { key: 'reviewed', label: 'Reviewed' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'resolved', label: 'Resolved' },
            { key: 'closed', label: 'Closed' },
          ] as const).map(s => (
            <div
              key={s.key}
              onClick={() => setStatusFilter(s.key === 'all' ? 'all' : s.key)}
              style={{
                backgroundColor: statusFilter === s.key ? statusConfig[s.key].bg : colors.white,
                border: `1px solid ${statusFilter === s.key ? statusConfig[s.key].color : colors.gray200}`,
                borderRadius: radii.md,
                padding: spacing.md,
                textAlign: 'center',
                cursor: 'pointer',
                transition: `all ${transitions.fast}`,
              }}
            >
              <div style={{ ...typography.h3, color: statusFilter === s.key ? statusConfig[s.key].color : colors.navy, marginBottom: spacing.xs }}>
                {stats[s.key]}
              </div>
              <div style={{ ...typography.caption, color: colors.gray600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{
        backgroundColor: colors.white,
        border: `1px solid ${colors.gray200}`,
        borderRadius: radii.md,
        padding: spacing.lg,
        marginBottom: spacing['2xl'],
      }}>
        {/* Search */}
        <div style={{ marginBottom: spacing.lg }}>
          <input
            type="text"
            placeholder="Search by subject, description, practice, or submitter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: spacing.md,
              border: `1px solid ${colors.gray300}`,
              borderRadius: radii.md,
              fontSize: typography.body.fontSize,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category + Status filters inline */}
        <div style={{ display: 'flex', gap: spacing['2xl'], flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...typography.caption, color: colors.gray600, fontWeight: 600, marginBottom: spacing.sm }}>TYPE</div>
            <div style={{ display: 'flex', gap: spacing.sm }}>
              {(['all', 'issue', 'feature'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    backgroundColor: categoryFilter === cat ? colors.navy : colors.gray100,
                    color: categoryFilter === cat ? colors.white : colors.navy,
                    border: 'none',
                    borderRadius: radii.full,
                    ...typography.bodySmall,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cat === 'all' ? 'All' : cat === 'issue' ? 'Issues' : 'Features'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...typography.caption, color: colors.gray600, fontWeight: 600, marginBottom: spacing.sm }}>STATUS</div>
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
              {(['all', 'new', 'reviewed', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    backgroundColor: statusFilter === s ? statusConfig[s].color : statusConfig[s].bg,
                    color: statusFilter === s ? colors.white : statusConfig[s].color,
                    border: 'none',
                    borderRadius: radii.full,
                    ...typography.bodySmall,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {statusConfig[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: spacing['3xl'], ...typography.body, color: colors.gray600 }}>
          Loading feedback...
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div style={{
          backgroundColor: colors.gray50,
          border: `1px dashed ${colors.gray300}`,
          borderRadius: radii.md,
          padding: spacing['3xl'],
          textAlign: 'center',
        }}>
          <p style={{ ...typography.body, color: colors.gray600 }}>
            {feedback.length === 0 ? 'No feedback submitted yet.' : 'No feedback matches your filters.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {filteredFeedback.map(item => {
            const isExpanded = expandedId === item.id;
            const itemComments = comments[item.id] || [];
            const typeCfg = categoryBadge[item.type];
            const sCfg = statusConfig[item.status];

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: colors.white,
                  border: `1px solid ${isExpanded ? colors.blue : colors.gray200}`,
                  borderRadius: radii.md,
                  boxShadow: isExpanded ? shadows.md : shadows.sm,
                  overflow: 'hidden',
                  transition: `all ${transitions.base}`,
                }}
              >
                {/* Header row */}
                <div style={{ padding: spacing.lg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' }}>
                    {/* Type badge */}
                    <span style={{
                      backgroundColor: typeCfg.bg, color: typeCfg.color,
                      padding: `2px 10px`, borderRadius: radii.full,
                      ...typography.caption, fontWeight: 600,
                    }}>
                      {typeCfg.label}
                    </span>

                    {/* Urgency */}
                    {item.urgency && urgencyConfig[item.urgency] && (
                      <span style={{
                        backgroundColor: urgencyConfig[item.urgency].bg,
                        color: urgencyConfig[item.urgency].color,
                        padding: `2px 10px`, borderRadius: radii.full,
                        ...typography.caption, fontWeight: 600,
                      }}>
                        {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
                      </span>
                    )}

                    {/* Status dropdown */}
                    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === item.id ? null : item.id)}
                        style={{
                          backgroundColor: sCfg.bg, color: sCfg.color,
                          padding: `2px 10px`, borderRadius: radii.full,
                          border: 'none', ...typography.caption, fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          fontFamily: 'inherit',
                        }}
                      >
                        {sCfg.label}
                        <ChevronDown size={12} />
                      </button>
                      {dropdownOpen === item.id && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, marginTop: 4,
                          backgroundColor: colors.white, border: `1px solid ${colors.gray300}`,
                          borderRadius: radii.md, boxShadow: shadows.lg, zIndex: 1000, minWidth: 160,
                        }}>
                          {(['new', 'reviewed', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(item.id, s)}
                              style={{
                                display: 'block', width: '100%',
                                padding: `${spacing.sm}px ${spacing.md}px`,
                                backgroundColor: item.status === s ? statusConfig[s].bg : colors.white,
                                color: item.status === s ? statusConfig[s].color : colors.navy,
                                border: 'none', textAlign: 'left',
                                ...typography.body, cursor: 'pointer',
                                borderBottom: `1px solid ${colors.gray200}`,
                                fontFamily: 'inherit',
                              }}
                              onMouseEnter={e => { (e.currentTarget).style.backgroundColor = colors.gray100; }}
                              onMouseLeave={e => { (e.currentTarget).style.backgroundColor = item.status === s ? statusConfig[s].bg : colors.white; }}
                            >
                              {statusConfig[s].label}{item.status === s ? ' ✓' : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span style={{ marginLeft: 'auto', ...typography.caption, color: colors.gray400 }}>
                      {relativeTime(item.created_at)}
                    </span>
                  </div>

                  {/* Subject + Practice row */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.sm }}>
                    <h3 style={{ ...typography.h3, color: colors.navy, margin: 0, flex: 1 }}>
                      {item.subject}
                    </h3>
                    <span style={{ ...typography.caption, color: colors.gray600, flexShrink: 0 }}>
                      {item.practice_name || 'Unknown Practice'}
                      {item.submitted_by && ` · ${item.submitted_by}`}
                    </span>
                  </div>

                  {/* Description preview (collapsed) */}
                  {!isExpanded && (
                    <p style={{ ...typography.body, color: colors.gray600, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.description}
                    </p>
                  )}

                  {/* Expand toggle */}
                  <button
                    onClick={() => handleExpand(item.id)}
                    style={{
                      marginTop: spacing.sm, background: 'none', border: 'none',
                      ...typography.caption, color: colors.blue, cursor: 'pointer',
                      padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {isExpanded ? '▲ Collapse' : '▼ View thread'}
                  </button>
                </div>

                {/* Expanded thread */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${colors.gray200}`, padding: spacing.lg, backgroundColor: colors.gray50 }}>
                    {/* Full description */}
                    <div style={{
                      backgroundColor: colors.white,
                      border: `1px solid ${colors.gray200}`,
                      borderRadius: radii.md,
                      padding: spacing.md,
                      ...typography.body,
                      color: colors.navy,
                      whiteSpace: 'pre-wrap',
                      marginBottom: spacing.xl,
                    }}>
                      {item.description}
                    </div>

                    {/* Meta strip */}
                    <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap', marginBottom: spacing.xl }}>
                      {item.category && (
                        <div style={{ ...typography.caption, color: colors.gray600 }}>
                          <strong>Category:</strong> {item.category}
                        </div>
                      )}
                      {item.urgency && (
                        <div style={{ ...typography.caption, color: colors.gray600 }}>
                          <strong>Urgency:</strong> {item.urgency}
                        </div>
                      )}
                      {item.practice_id && (
                        <div style={{ ...typography.caption, color: colors.gray400, fontFamily: 'monospace' }}>
                          ID: {item.practice_id}
                        </div>
                      )}
                    </div>

                    {/* Comments thread */}
                    {itemComments.length > 0 && (
                      <div style={{ marginBottom: spacing.xl }}>
                        <div style={{ ...typography.h4, color: colors.navy, marginBottom: spacing.md }}>
                          Conversation
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                          {itemComments.map(c => {
                            const isAdminComment = c.author_role === 'admin';
                            const isSystem = c.author === 'System';
                            if (isSystem) {
                              return (
                                <div key={c.id} style={{
                                  textAlign: 'center',
                                  ...typography.caption,
                                  color: colors.gray400,
                                  fontStyle: 'italic',
                                }}>
                                  {c.message} · {relativeTime(c.created_at)}
                                </div>
                              );
                            }
                            return (
                              <div key={c.id} style={{ display: 'flex', justifyContent: isAdminComment ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                  maxWidth: '75%',
                                  backgroundColor: isAdminComment ? '#EEF4FF' : colors.white,
                                  border: `1px solid ${isAdminComment ? '#C3D8FF' : colors.gray200}`,
                                  borderRadius: radii.md,
                                  padding: `${spacing.sm}px ${spacing.md}px`,
                                }}>
                                  <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ ...typography.caption, fontWeight: 700, color: isAdminComment ? colors.blue : colors.navy }}>
                                      {isAdminComment ? 'Admin' : c.author}
                                    </span>
                                    <span style={{ ...typography.caption, color: colors.gray400 }}>
                                      {relativeTime(c.created_at)}
                                    </span>
                                  </div>
                                  <p style={{ ...typography.bodySmall, color: colors.navy, margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {c.message}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Admin reply */}
                    <div>
                      <div style={{ ...typography.h4, color: colors.navy, marginBottom: spacing.sm }}>
                        Reply as Admin
                      </div>
                      <textarea
                        value={expandedId === item.id ? commentText : ''}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Type your reply to the practice..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${colors.gray200}`,
                          borderRadius: radii.md,
                          fontSize: 13,
                          fontFamily: 'inherit',
                          color: colors.navy,
                          backgroundColor: colors.white,
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          marginBottom: spacing.sm,
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(item.id)}
                        disabled={submittingComment || !commentText.trim()}
                        style={{
                          padding: '9px 20px',
                          backgroundColor: colors.navy,
                          color: colors.white,
                          border: 'none',
                          borderRadius: radii.md,
                          ...typography.body,
                          fontWeight: 600,
                          cursor: submittingComment || !commentText.trim() ? 'not-allowed' : 'pointer',
                          opacity: submittingComment || !commentText.trim() ? 0.5 : 1,
                          fontFamily: 'inherit',
                        }}
                      >
                        {submittingComment ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
