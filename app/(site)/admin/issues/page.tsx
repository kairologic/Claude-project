'use client';

/**
 * app/(site)/admin/issues/page.tsx
 *
 * Admin Issues & Feature Requests Dashboard
 * - Displays feedback from the feedback table (issues and feature requests)
 * - Filters by category, status, and search
 * - Allows inline status updates
 * - Shows practice name and priority indicators
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { colors, spacing, typography, shadows, transitions, radii } from '@/lib/design-tokens';

// ════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ════════════════════════════════════════════════════════════════════

interface Feedback {
  id: string;
  practice_id: string;
  user_id: string | null;
  category: 'issue' | 'feature';
  subject: string;
  description: string;
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';
  priority: string | null;
  created_at: string;
  updated_at: string;
  practice_name?: string;
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

// ════════════════════════════════════════════════════════════════════
// STATUS & CATEGORY CONFIG
// ════════════════════════════════════════════════════════════════════

const statusConfig: Record<StatusFilter, { label: string; color: string; bg: string }> = {
  all: { label: 'All', color: colors.gray600, bg: colors.gray100 },
  new: { label: 'New', color: colors.gold, bg: colors.goldPale },
  reviewed: { label: 'Reviewed', color: colors.blue, bg: colors.bluePale },
  in_progress: { label: 'In Progress', color: colors.gold, bg: colors.goldPale },
  resolved: { label: 'Resolved', color: colors.green, bg: colors.greenPale },
  closed: { label: 'Closed', color: colors.gray400, bg: colors.gray100 },
};

const categoryConfig: Record<'issue' | 'feature', { label: string; color: string; bg: string }> = {
  issue: { label: 'Issue', color: colors.red, bg: colors.redPale },
  feature: { label: 'Feature', color: colors.blue, bg: colors.bluePale },
};

// ════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════

/**
 * Calculate relative time (e.g., "2 hours ago", "3 days ago")
 */
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

  return date.toLocaleDateString();
}

/**
 * Truncate text to N lines
 */
function truncateText(text: string, lines: number = 2): string {
  const lineArray = text.split('\n').slice(0, lines);
  const truncated = lineArray.join('\n');
  return truncated.length > 150 ? truncated.substring(0, 150) + '...' : truncated;
}

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export default function IssuesPage() {
  const router = useRouter();

  // State
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<Stats>({
    all: 0,
    new: 0,
    reviewed: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const isAuthed = typeof window !== 'undefined' && sessionStorage.getItem('admin_auth');
    if (!isAuthed) {
      router.push('/admin');
    }
  }, [router]);

  // Fetch feedback data
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        setError('');

        const headers = {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type': 'application/json',
        };

        // Fetch all feedback
        const feedbackResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/feedback?select=*`,
          { headers }
        );

        if (!feedbackResponse.ok) {
          throw new Error(`Failed to fetch feedback: ${feedbackResponse.statusText}`);
        }

        const feedbackData = (await feedbackResponse.json()) as Feedback[];

        // Fetch practice names for each feedback
        const feedbackWithPracticeNames = await Promise.all(
          feedbackData.map(async (item) => {
            try {
              const practiceResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/practices?id=eq.${item.practice_id}&select=name`,
                { headers }
              );

              if (practiceResponse.ok) {
                const practiceData = await practiceResponse.json();
                return {
                  ...item,
                  practice_name: practiceData[0]?.name || 'Unknown Practice',
                };
              }
              return { ...item, practice_name: 'Unknown Practice' };
            } catch {
              return { ...item, practice_name: 'Unknown Practice' };
            }
          })
        );

        setFeedback(feedbackWithPracticeNames);

        // Calculate stats
        const newStats: Stats = {
          all: feedbackWithPracticeNames.length,
          new: feedbackWithPracticeNames.filter((f) => f.status === 'new').length,
          reviewed: feedbackWithPracticeNames.filter((f) => f.status === 'reviewed').length,
          in_progress: feedbackWithPracticeNames.filter((f) => f.status === 'in_progress')
            .length,
          resolved: feedbackWithPracticeNames.filter((f) => f.status === 'resolved').length,
          closed: feedbackWithPracticeNames.filter((f) => f.status === 'closed').length,
        };
        setStats(newStats);
      } catch (err) {
        console.error('Error fetching feedback:', err);
        setError(err instanceof Error ? err.message : 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  // Update feedback status
  const updateStatus = async (feedbackId: string, newStatus: StatusFilter) => {
    if (newStatus === 'all') return;

    try {
      const headers = {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback?id=eq.${feedbackId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: newStatus,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state
      setFeedback((prev) =>
        prev.map((item) =>
          item.id === feedbackId ? { ...item, status: newStatus as Feedback['status'] } : item
        )
      );

      // Recalculate stats
      const updatedFeedback = feedback.map((item) =>
        item.id === feedbackId ? { ...item, status: newStatus as Feedback['status'] } : item
      );
      const newStats: Stats = {
        all: updatedFeedback.length,
        new: updatedFeedback.filter((f) => f.status === 'new').length,
        reviewed: updatedFeedback.filter((f) => f.status === 'reviewed').length,
        in_progress: updatedFeedback.filter((f) => f.status === 'in_progress').length,
        resolved: updatedFeedback.filter((f) => f.status === 'resolved').length,
        closed: updatedFeedback.filter((f) => f.status === 'closed').length,
      };
      setStats(newStats);

      setDropdownOpen(null);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  // Filter feedback
  const filteredFeedback = feedback.filter((item) => {
    const matchesCategory =
      categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch =
      search === '' ||
      item.subject.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      (item.practice_name || '').toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // ────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: spacing['4xl'], maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <h1 style={{ ...typography.h1, color: colors.navy, marginBottom: spacing.md }}>
          Issues & Feature Requests
        </h1>
        <p style={{ ...typography.bodySmall, color: colors.gray600 }}>
          Monitor and manage feedback from practice users. Update status to track progress.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            backgroundColor: colors.redPale,
            border: `1px solid ${colors.red}`,
            borderRadius: radii.md,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <AlertCircle size={18} color={colors.red} />
          <p style={{ ...typography.body, color: colors.red }}>{error}</p>
        </div>
      )}

      {/* Stats bar */}
      {!loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: spacing.md,
            marginBottom: spacing['2xl'],
          }}
        >
          {[
            { key: 'all', label: 'All', count: stats.all },
            { key: 'new', label: 'New', count: stats.new },
            { key: 'reviewed', label: 'Reviewed', count: stats.reviewed },
            { key: 'in_progress', label: 'In Progress', count: stats.in_progress },
            { key: 'resolved', label: 'Resolved', count: stats.resolved },
            { key: 'closed', label: 'Closed', count: stats.closed },
          ].map((stat) => (
            <div
              key={stat.key}
              style={{
                backgroundColor: colors.white,
                border: `1px solid ${colors.gray200}`,
                borderRadius: radii.md,
                padding: spacing.md,
                textAlign: 'center',
              }}
            >
              <div style={{ ...typography.h3, color: colors.navy, marginBottom: spacing.xs }}>
                {stat.count}
              </div>
              <div style={{ ...typography.caption, color: colors.gray600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          backgroundColor: colors.white,
          border: `1px solid ${colors.gray200}`,
          borderRadius: radii.md,
          padding: spacing.lg,
          marginBottom: spacing['2xl'],
        }}
      >
        {/* Search */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ ...typography.h4, color: colors.navy, display: 'block', marginBottom: spacing.sm }}>
            Search
          </label>
          <input
            type="text"
            placeholder="Search by subject, description, or practice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: spacing.md,
              border: `1px solid ${colors.gray300}`,
              borderRadius: radii.md,
              fontSize: typography.body.fontSize,
              fontFamily: 'inherit',
              transition: `border-color ${transitions.fast}`,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.blue;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.gray300;
            }}
          />
        </div>

        {/* Category filter tabs */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ ...typography.h4, color: colors.navy, display: 'block', marginBottom: spacing.sm }}>
            Category
          </label>
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            {(['all', 'issue', 'feature'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  backgroundColor: categoryFilter === cat ? colors.blue : colors.gray100,
                  color: categoryFilter === cat ? colors.white : colors.navy,
                  border: 'none',
                  borderRadius: radii.full,
                  ...typography.body,
                  cursor: 'pointer',
                  transition: `all ${transitions.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (categoryFilter !== cat) {
                    (e.target as HTMLButtonElement).style.backgroundColor = colors.gray200;
                  }
                }}
                onMouseLeave={(e) => {
                  if (categoryFilter !== cat) {
                    (e.target as HTMLButtonElement).style.backgroundColor = colors.gray100;
                  }
                }}
              >
                {cat === 'all' ? 'All' : cat === 'issue' ? 'Issues' : 'Feature Requests'}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter pills */}
        <div>
          <label style={{ ...typography.h4, color: colors.navy, display: 'block', marginBottom: spacing.sm }}>
            Status
          </label>
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            {(
              [
                'all',
                'new',
                'reviewed',
                'in_progress',
                'resolved',
                'closed',
              ] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  backgroundColor:
                    statusFilter === status ? statusConfig[status].color : statusConfig[status].bg,
                  color: statusFilter === status ? colors.white : statusConfig[status].color,
                  border: 'none',
                  borderRadius: radii.full,
                  ...typography.body,
                  cursor: 'pointer',
                  transition: `all ${transitions.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (statusFilter !== status) {
                    (e.currentTarget).style.backgroundColor = statusConfig[status].color;
                    (e.currentTarget).style.color = colors.white;
                  }
                }}
                onMouseLeave={(e) => {
                  if (statusFilter !== status) {
                    (e.currentTarget).style.backgroundColor = statusConfig[status].bg;
                    (e.currentTarget).style.color = statusConfig[status].color;
                  }
                }}
              >
                {statusConfig[status].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Issues list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: spacing['3xl'] }}>
          <p style={{ ...typography.body, color: colors.gray600 }}>Loading feedback...</p>
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div
          style={{
            backgroundColor: colors.gray50,
            border: `1px dashed ${colors.gray300}`,
            borderRadius: radii.md,
            padding: spacing['3xl'],
            textAlign: 'center',
          }}
        >
          <p style={{ ...typography.body, color: colors.gray600 }}>
            {feedback.length === 0
              ? 'No feedback yet'
              : 'No feedback matches your filters'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {filteredFeedback.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: colors.white,
                border: `1px solid ${colors.gray200}`,
                borderRadius: radii.md,
                padding: spacing.lg,
                boxShadow: shadows.sm,
                transition: `all ${transitions.base}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget).style.boxShadow = shadows.md;
                (e.currentTarget).style.borderColor = colors.gray300;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget).style.boxShadow = shadows.sm;
                (e.currentTarget).style.borderColor = colors.gray200;
              }}
            >
              {/* Top row: badges and metadata */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  marginBottom: spacing.md,
                  flexWrap: 'wrap',
                }}
              >
                {/* Category badge */}
                <div
                  style={{
                    backgroundColor: categoryConfig[item.category].bg,
                    color: categoryConfig[item.category].color,
                    padding: `${spacing.xs}px ${spacing.md}px`,
                    borderRadius: radii.full,
                    ...typography.caption,
                    fontWeight: 600,
                  }}
                >
                  {categoryConfig[item.category].label}
                </div>

                {/* Status badge with dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() =>
                      setDropdownOpen(dropdownOpen === item.id ? null : item.id)
                    }
                    style={{
                      backgroundColor: statusConfig[item.status].bg,
                      color: statusConfig[item.status].color,
                      padding: `${spacing.xs}px ${spacing.md}px`,
                      borderRadius: radii.full,
                      border: 'none',
                      ...typography.caption,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.xs,
                      transition: `all ${transitions.fast}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget).style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget).style.opacity = '1';
                    }}
                  >
                    {statusConfig[item.status].label}
                    <ChevronDown size={14} />
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen === item.id && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: spacing.xs,
                        backgroundColor: colors.white,
                        border: `1px solid ${colors.gray300}`,
                        borderRadius: radii.md,
                        boxShadow: shadows.lg,
                        zIndex: 1000,
                        minWidth: 150,
                      }}
                    >
                      {(
                        [
                          'new',
                          'reviewed',
                          'in_progress',
                          'resolved',
                          'closed',
                        ] as const
                      ).map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(item.id, status)}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: `${spacing.sm}px ${spacing.md}px`,
                            backgroundColor:
                              item.status === status ? statusConfig[status].bg : colors.white,
                            color: item.status === status ? statusConfig[status].color : colors.navy,
                            border: 'none',
                            textAlign: 'left',
                            ...typography.body,
                            cursor: 'pointer',
                            transition: `all ${transitions.fast}`,
                            borderBottom: `1px solid ${colors.gray200}`,
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget).style.backgroundColor = colors.gray100;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget).style.backgroundColor =
                              item.status === status ? statusConfig[status].bg : colors.white;
                          }}
                        >
                          {statusConfig[status].label}
                          {item.status === status && ' ✓'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority indicator */}
                {item.priority && (
                  <div
                    style={{
                      backgroundColor: colors.goldPale,
                      color: colors.gold,
                      padding: `${spacing.xs}px ${spacing.md}px`,
                      borderRadius: radii.full,
                      ...typography.caption,
                      fontWeight: 600,
                    }}
                  >
                    Priority: {item.priority}
                  </div>
                )}

                {/* Created timestamp */}
                <div style={{ marginLeft: 'auto', ...typography.caption, color: colors.gray600 }}>
                  {getRelativeTime(item.created_at)}
                </div>
              </div>

              {/* Subject line */}
              <h3
                style={{
                  ...typography.h3,
                  color: colors.navy,
                  marginBottom: spacing.sm,
                }}
              >
                {item.subject}
              </h3>

              {/* Description */}
              <p
                style={{
                  ...typography.body,
                  color: colors.gray600,
                  marginBottom: spacing.md,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {truncateText(item.description, 2)}
              </p>

              {/* Practice name */}
              <div style={{ ...typography.caption, color: colors.gray600 }}>
                From: <strong>{item.practice_name}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
