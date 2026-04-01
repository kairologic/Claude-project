'use client';

/**
 * app/(dashboard)/practice/[id]/requests/page.tsx
 *
 * "My Requests" — practice user view of all their submitted feedback.
 * Shows a list of issues and feature requests, with full thread/conversation.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { colors, spacing, typography, shadows, radii, transitions } from '@/lib/design-tokens';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

interface FeedbackItem {
  id: string;
  practice_id: string;
  practice_name: string;
  type: 'issue' | 'feature';
  category: string | null;
  subject: string;
  description: string;
  urgency: string | null;
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';
  submitted_by: string;
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

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseHeaders = {
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
};

const statusConfig = {
  new:         { label: 'New',         color: colors.blue,    bg: colors.bluePale },
  reviewed:    { label: 'Reviewed',    color: '#D97706',      bg: '#FFFBEB' },
  in_progress: { label: 'In Progress', color: '#C2410C',      bg: '#FFF7ED' },
  resolved:    { label: 'Resolved',    color: colors.green,   bg: colors.greenPale },
  closed:      { label: 'Closed',      color: colors.gray400, bg: colors.gray100 },
} as const;

const typeConfig = {
  issue:   { label: 'Issue',   color: colors.red,  bg: colors.redPale },
  feature: { label: 'Feature', color: colors.blue, bg: colors.bluePale },
} as const;

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

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export default function MyRequestsPage() {
  const params = useParams();
  const practiceId = params.id as string;

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  // Track items whose status changed since last viewed
  const [newStatusIds, setNewStatusIds] = useState<Set<string>>(new Set());

  // Load "last seen" state from localStorage
  const getLastSeen = useCallback((id: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`feedback_seen_${id}`);
  }, []);

  const markSeen = useCallback((item: FeedbackItem) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`feedback_seen_${item.id}`, item.updated_at);
    setNewStatusIds(prev => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  }, []);

  // Fetch feedback for this practice
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/feedback?practice_id=eq.${practiceId}&order=created_at.desc`,
          { headers: supabaseHeaders }
        );
        if (!res.ok) {
          if (res.status === 400 || res.status === 404) {
            setItems([]);
            return;
          }
          throw new Error(`Failed to fetch requests: ${res.statusText}`);
        }
        const data: FeedbackItem[] = await res.json();
        setItems(data);

        // Check which items have unseen status changes
        const changed = new Set<string>();
        for (const item of data) {
          const lastSeen = getLastSeen(item.id);
          if (lastSeen && item.updated_at > lastSeen) {
            changed.add(item.id);
          }
        }
        setNewStatusIds(changed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requests');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [practiceId, getLastSeen]);

  // Fetch comments when an item is expanded
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

  const handleExpand = (item: FeedbackItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      setCommentText('');
    } else {
      setExpandedId(item.id);
      setCommentText('');
      fetchComments(item.id);
      markSeen(item);
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
          author: 'Practice User',
          author_role: 'practice',
          message: commentText.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
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

  // ── Render ──

  return (
    <div style={{ padding: spacing['4xl'], maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <h1 style={{ ...typography.h1, color: colors.navy, marginBottom: spacing.sm }}>
          My Requests
        </h1>
        <p style={{ ...typography.bodySmall, color: colors.gray600 }}>
          Track your submitted issues and feature requests. Click any item to view the conversation thread.
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
          color: colors.red,
          ...typography.body,
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: spacing['3xl'], color: colors.gray600, ...typography.body }}>
          Loading your requests...
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div style={{
          backgroundColor: colors.gray50,
          border: `1px dashed ${colors.gray300}`,
          borderRadius: radii.md,
          padding: spacing['3xl'],
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: spacing.md }}>📬</div>
          <p style={{ ...typography.body, color: colors.gray600 }}>
            No requests submitted yet.
          </p>
          <p style={{ ...typography.bodySmall, color: colors.gray400, marginTop: spacing.sm }}>
            Use &ldquo;Report an Issue&rdquo; or &ldquo;Request a Feature&rdquo; from the Help menu in the sidebar.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {items.map(item => {
            const isExpanded = expandedId === item.id;
            const hasNew = newStatusIds.has(item.id);
            const statusCfg = statusConfig[item.status];
            const typeCfg = typeConfig[item.type];
            const itemComments = comments[item.id] || [];

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
                {/* Summary row — click to expand */}
                <button
                  onClick={() => handleExpand(item)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: `${spacing.lg}px`,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Type badge */}
                  <span style={{
                    backgroundColor: typeCfg.bg,
                    color: typeCfg.color,
                    padding: `2px 10px`,
                    borderRadius: radii.full,
                    ...typography.caption,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {typeCfg.label}
                  </span>

                  {/* Status badge + notification dot */}
                  <span style={{ position: 'relative', flexShrink: 0 }}>
                    <span style={{
                      backgroundColor: statusCfg.bg,
                      color: statusCfg.color,
                      padding: `2px 10px`,
                      borderRadius: radii.full,
                      ...typography.caption,
                      fontWeight: 600,
                    }}>
                      {statusCfg.label}
                    </span>
                    {hasNew && (
                      <span style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: colors.red,
                        border: `2px solid ${colors.white}`,
                      }} />
                    )}
                  </span>

                  {/* Subject */}
                  <span style={{ ...typography.body, color: colors.navy, fontWeight: 600, flex: 1 }}>
                    {item.subject}
                  </span>

                  {/* Date */}
                  <span style={{ ...typography.caption, color: colors.gray400, flexShrink: 0 }}>
                    {relativeTime(item.created_at)}
                  </span>

                  {/* Expand arrow */}
                  <span style={{
                    color: colors.gray400,
                    fontSize: 12,
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: `transform ${transitions.fast}`,
                    flexShrink: 0,
                  }}>
                    ▼
                  </span>
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${colors.gray200}`, padding: spacing.lg }}>
                    {/* Meta */}
                    <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap', marginBottom: spacing.lg }}>
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
                      <div style={{ ...typography.caption, color: colors.gray600 }}>
                        <strong>Submitted:</strong> {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{
                      backgroundColor: colors.gray50,
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

                    {/* Comments thread */}
                    {itemComments.length > 0 && (
                      <div style={{ marginBottom: spacing.xl }}>
                        <div style={{ ...typography.h4, color: colors.navy, marginBottom: spacing.md }}>
                          Conversation
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                          {itemComments.map(c => {
                            const isAdmin = c.author_role === 'admin';
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
                              <div
                                key={c.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: isAdmin ? 'flex-start' : 'flex-end',
                                }}
                              >
                                <div style={{
                                  maxWidth: '75%',
                                  backgroundColor: isAdmin ? colors.bluePale : colors.goldPale,
                                  border: `1px solid ${isAdmin ? '#C3D8FF' : '#F0D8A0'}`,
                                  borderRadius: radii.md,
                                  padding: `${spacing.sm}px ${spacing.md}px`,
                                }}>
                                  <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ ...typography.caption, fontWeight: 700, color: isAdmin ? colors.blue : colors.navy }}>
                                      {isAdmin ? 'KairoLogic Support' : c.author}
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

                    {/* Add comment */}
                    <div>
                      <div style={{ ...typography.h4, color: colors.navy, marginBottom: spacing.sm }}>
                        Add a reply
                      </div>
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Type your message..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${colors.gray200}`,
                          borderRadius: radii.md,
                          fontSize: 13,
                          fontFamily: 'inherit',
                          color: colors.navy,
                          backgroundColor: colors.gray50,
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
