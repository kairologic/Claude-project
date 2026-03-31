'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { colors } from '@/lib/design-tokens';

interface FeedbackItem {
  id: string;
  type: 'issue' | 'feature';
  category: string;
  subject: string;
  description: string;
  urgency: string;
  status: string;
  submitted_by: string;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  feedback_id: string;
  author: string;
  author_role: string;
  message: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#E3F2FD', text: '#1565C0' },
  in_progress: { bg: '#FFF3E0', text: '#E65100' },
  resolved: { bg: '#E8F5E9', text: '#2E7D32' },
  closed: { bg: '#F5F5F5', text: '#616161' },
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function MyRequestsPage() {
  const params = useParams();
  const practiceId = params.id as string;
  const [requests, setRequests] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  useEffect(() => {
    fetchRequests();
  }, [practiceId]);

  async function fetchRequests() {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/feedback?practice_id=eq.${practiceId}&order=created_at.desc`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments(feedbackId: string) {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  }

  async function sendComment() {
    if (!newComment.trim() || !selectedRequest) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/feedback/${selectedRequest.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'Practice User',
          author_role: 'practice',
          message: newComment.trim(),
        }),
      });
      if (res.ok) {
        setNewComment('');
        fetchComments(selectedRequest.id);
      }
    } catch (err) {
      console.error('Failed to send comment:', err);
    } finally {
      setSendingComment(false);
    }
  }

  function selectRequest(req: FeedbackItem) {
    setSelectedRequest(req);
    setComments([]);
    fetchComments(req.id);
  }

  const filtered = requests.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'open') return r.status === 'open' || r.status === 'in_progress';
    return r.status === 'resolved' || r.status === 'closed';
  });

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.gray400 }}>Loading your requests...</div>;
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 140px)' }}>
      {/* Left panel - request list */}
      <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 12, border: `1px solid ${colors.gray200}`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.gray200}`, display: 'flex', gap: 8 }}>
          {(['all', 'open', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                background: filter === f ? colors.navy : colors.gray100,
                color: filter === f ? 'white' : colors.gray600,
              }}
            >
              {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Resolved'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: colors.gray400, fontSize: 14 }}>
              {requests.length === 0 ? 'No requests submitted yet' : 'No matching requests'}
            </div>
          ) : filtered.map(req => (
            <div
              key={req.id}
              onClick={() => selectRequest(req)}
              style={{
                padding: '14px 20px', borderBottom: `1px solid ${colors.gray100}`, cursor: 'pointer',
                background: selectedRequest?.id === req.id ? '#F0F4FF' : 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  color: req.type === 'issue' ? '#DC3545' : '#C8973F',
                }}>
                  {req.type === 'issue' ? 'Issue' : 'Feature'}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: (STATUS_COLORS[req.status] || STATUS_COLORS.open).bg,
                  color: (STATUS_COLORS[req.status] || STATUS_COLORS.open).text,
                }}>
                  {STATUS_LABELS[req.status] || req.status}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.navy, marginBottom: 4 }}>{req.subject}</div>
              <div style={{ fontSize: 12, color: colors.gray400 }}>
                {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}{req.category}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - detail + comments */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 12, border: `1px solid ${colors.gray200}`, overflow: 'hidden' }}>
        {!selectedRequest ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.gray400, fontSize: 14 }}>
            Select a request to view details
          </div>
        ) : (
          <>
            <div style={{ padding: 24, borderBottom: `1px solid ${colors.gray200}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    color: selectedRequest.type === 'issue' ? '#DC3545' : '#C8973F',
                  }}>
                    {selectedRequest.type === 'issue' ? 'Issue Report' : 'Feature Request'}
                  </span>
                  <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: colors.navy }}>{selectedRequest.subject}</h2>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                  background: (STATUS_COLORS[selectedRequest.status] || STATUS_COLORS.open).bg,
                  color: (STATUS_COLORS[selectedRequest.status] || STATUS_COLORS.open).text,
                }}>
                  {STATUS_LABELS[selectedRequest.status] || selectedRequest.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13, color: colors.gray500, marginBottom: 12 }}>
                <span>Category: {selectedRequest.category}</span>
                {selectedRequest.urgency && <span>Urgency: {selectedRequest.urgency}</span>}
                <span>Submitted: {new Date(selectedRequest.created_at).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: colors.navy, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedRequest.description}</p>
            </div>

            {/* Comments thread */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.navy, marginBottom: 12 }}>Conversation</h3>
              {comments.length === 0 ? (
                <div style={{ color: colors.gray400, fontSize: 13 }}>No comments yet. Start the conversation below.</div>
              ) : comments.map(c => (
                <div key={c.id} style={{
                  marginBottom: 12, padding: 12, borderRadius: 8,
                  background: c.author_role === 'admin' ? '#F0F4FF' : c.author_role === 'system' ? colors.gray50 : '#FAFAFA',
                  border: `1px solid ${colors.gray200}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.author_role === 'admin' ? '#1565C0' : c.author_role === 'system' ? colors.gray400 : colors.navy }}>
                      {c.author} {c.author_role === 'admin' ? '(Admin)' : c.author_role === 'system' ? '' : '(You)'}
                    </span>
                    <span style={{ fontSize: 11, color: colors.gray400 }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: c.author_role === 'system' ? colors.gray500 : colors.navy, fontStyle: c.author_role === 'system' ? 'italic' : 'normal' }}>
                    {c.message}
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div style={{ padding: '12px 24px', borderTop: `1px solid ${colors.gray200}`, display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendComment()}
                placeholder="Type a message..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${colors.gray200}`,
                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={sendComment}
                disabled={sendingComment || !newComment.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: colors.navy, color: 'white', fontSize: 13, fontWeight: 600,
                  fontFamily: 'inherit', opacity: sendingComment || !newComment.trim() ? 0.5 : 1,
                }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
