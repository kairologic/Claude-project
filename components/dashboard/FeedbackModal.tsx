'use client';

import React, { useState, useRef, useEffect } from 'react';
import { colors } from '@/lib/design-tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

type FeedbackType = 'issue' | 'feature';

interface FeedbackModalProps {
  type: FeedbackType;
  onClose: () => void;
  practiceId: string;
  practiceName: string;
  userName: string;
  userEmail?: string;
}

const ISSUE_CATEGORIES = [
  'Login / Access',
  'Dashboard display',
  'Workflows',
  'Payer directory data',
  'Provider information',
  'Compliance scanning',
  'Reports / Export',
  'Alerts / Notifications',
  'Performance / Speed',
  'Other',
];

const FEATURE_CATEGORIES = [
  'New report type',
  'Dashboard enhancement',
  'Workflow improvement',
  'New payer support',
  'New state coverage',
  'Integration request',
  'Mobile access',
  'Notification options',
  'Other',
];

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low — cosmetic or minor annoyance' },
  { value: 'medium', label: 'Medium — impacts my workflow' },
  { value: 'high', label: 'High — blocking critical task' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function FeedbackModal({
  type,
  onClose,
  practiceId,
  practiceName,
  userName,
  userEmail,
}: FeedbackModalProps) {
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const isIssue = type === 'issue';
  const title = isIssue ? 'Report an Issue' : 'Request a Feature';
  const categories = isIssue ? ISSUE_CATEGORIES : FEATURE_CATEGORIES;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the ' + (isIssue ? 'issue' : 'feature'));
      return;
    }
    if (!category) {
      setError('Please select a category');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category,
          urgency: isIssue ? urgency : undefined,
          subject: subject.trim(),
          description: description.trim(),
          contactEmail: email.trim(),
          userName,
          practiceId,
          practiceName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Styles ──
  const s: Record<string, React.CSSProperties> = {
    backdrop: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 30, 61, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    },
    modal: {
      backgroundColor: colors.white,
      borderRadius: 12,
      width: 520,
      maxWidth: '90vw',
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    },
    header: {
      padding: '20px 24px 16px',
      borderBottom: `1px solid ${colors.gray200}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: colors.navy,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: 20,
      color: colors.gray400,
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: 6,
      lineHeight: 1,
      fontFamily: 'inherit',
    },
    body: {
      padding: '20px 24px',
      overflowY: 'auto',
      flex: 1,
    },
    fieldGroup: {
      marginBottom: 18,
    },
    label: {
      display: 'block',
      fontSize: 13,
      fontWeight: 600,
      color: colors.navy,
      marginBottom: 6,
    },
    sublabel: {
      fontSize: 11,
      fontWeight: 400,
      color: colors.gray400,
      marginLeft: 4,
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: 13,
      border: `1px solid ${colors.gray200}`,
      borderRadius: 8,
      fontFamily: 'inherit',
      color: colors.navy,
      backgroundColor: colors.gray50,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      fontSize: 13,
      border: `1px solid ${colors.gray200}`,
      borderRadius: 8,
      fontFamily: 'inherit',
      color: colors.navy,
      backgroundColor: colors.gray50,
      outline: 'none',
      boxSizing: 'border-box' as const,
      cursor: 'pointer',
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      fontSize: 13,
      border: `1px solid ${colors.gray200}`,
      borderRadius: 8,
      fontFamily: 'inherit',
      color: colors.navy,
      backgroundColor: colors.gray50,
      outline: 'none',
      boxSizing: 'border-box' as const,
      minHeight: 120,
      resize: 'vertical' as const,
      lineHeight: 1.5,
    },
    contextRow: {
      display: 'flex',
      gap: 12,
      padding: '10px 14px',
      backgroundColor: colors.gray50,
      borderRadius: 8,
      border: `1px solid ${colors.gray200}`,
      fontSize: 12,
      color: colors.gray600,
    },
    contextLabel: {
      fontWeight: 600,
      color: colors.navy,
    },
    footer: {
      padding: '16px 24px',
      borderTop: `1px solid ${colors.gray200}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    errorText: {
      fontSize: 12,
      color: '#DC3545',
      flex: 1,
    },
    cancelBtn: {
      padding: '10px 20px',
      fontSize: 13,
      fontWeight: 600,
      border: `1px solid ${colors.gray200}`,
      borderRadius: 8,
      backgroundColor: colors.white,
      color: colors.navy,
      cursor: 'pointer',
      fontFamily: 'inherit',
    },
    submitBtn: {
      padding: '10px 24px',
      fontSize: 13,
      fontWeight: 600,
      border: 'none',
      borderRadius: 8,
      backgroundColor: isIssue ? '#DC3545' : colors.gold,
      color: colors.white,
      cursor: 'pointer',
      fontFamily: 'inherit',
      opacity: submitting ? 0.6 : 1,
    },
    successWrap: {
      textAlign: 'center' as const,
      padding: '40px 24px',
    },
    successIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: colors.navy,
      marginBottom: 8,
    },
    successMsg: {
      fontSize: 13,
      color: colors.gray600,
      lineHeight: 1.6,
      marginBottom: 24,
    },
    doneBtn: {
      padding: '10px 32px',
      fontSize: 13,
      fontWeight: 600,
      border: 'none',
      borderRadius: 8,
      backgroundColor: colors.navy,
      color: colors.white,
      cursor: 'pointer',
      fontFamily: 'inherit',
    },
  };

  // ── Success state ──
  if (submitted) {
    return (
      <div style={s.backdrop} onClick={handleBackdropClick}>
        <div style={s.modal} ref={modalRef}>
          <div style={s.successWrap}>
            <div style={s.successIcon}>{isIssue ? '✅' : '🎉'}</div>
            <div style={s.successTitle}>
              {isIssue ? 'Issue Reported' : 'Feature Request Submitted'}
            </div>
            <div style={s.successMsg}>
              {isIssue
                ? 'Thank you for reporting this issue. Our team has been notified and will look into it.'
                : 'Thank you for the suggestion! We review every feature request and use them to prioritize our roadmap.'}
              {email && (
                <>
                  <br />
                  We&apos;ll follow up at <strong>{email}</strong> if we need more details.
                </>
              )}
            </div>
            <button style={s.doneBtn} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div style={s.backdrop} onClick={handleBackdropClick}>
      <div style={s.modal} ref={modalRef}>
        {/* Header */}
        <div style={s.header}>
          <h2 style={s.headerTitle}>
            <span>{isIssue ? '🐛' : '💡'}</span>
            {title}
          </h2>
          <button style={s.closeBtn} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={s.body}>
          {/* Submitter context (read-only) */}
          <div style={s.fieldGroup}>
            <div style={s.contextRow}>
              <div>
                <span style={s.contextLabel}>Submitted by:</span> {userName}
              </div>
              <div>
                <span style={s.contextLabel}>Practice:</span> {practiceName}
              </div>
            </div>
          </div>

          {/* Category */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Category</label>
            <select style={s.select} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency (issues only) */}
          {isIssue && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Urgency</label>
              <select style={s.select} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                {URGENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Subject</label>
            <input
              style={s.input}
              type="text"
              placeholder={
                isIssue ? 'Brief description of the issue' : 'What feature would you like?'
              }
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Description
              <span style={s.sublabel}>
                {isIssue
                  ? '(Steps to reproduce, what you expected vs. what happened)'
                  : '(How would this help your workflow? Any specific requirements?)'}
              </span>
            </label>
            <textarea
              style={s.textarea}
              placeholder={
                isIssue
                  ? '1. I went to...\n2. I clicked...\n3. I expected...\n4. Instead...'
                  : 'Describe the feature and how it would help your practice...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
            />
          </div>

          {/* Contact email */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Contact email
              <span style={s.sublabel}>(for follow-up)</span>
            </label>
            <input
              style={s.input}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <div style={s.errorText}>{error}</div>
          <button style={s.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button style={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : isIssue ? 'Report Issue' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
