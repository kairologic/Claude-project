'use client';

import { useMemo, useState } from 'react';

interface Event {
  id: string;
  workflow_id: string;
  event_type: string;
  actor_type: string;
  actor_email: string | null;
  title: string;
  details: any;
  created_at: string;
}

interface WorkflowReference {
  id: string;
  workflow_type: string;
  provider_name: string | null;
  provider_npi: string | null;
}

interface Props {
  events: Event[];
  workflowMap: Record<string, WorkflowReference>;
  practiceId: string;
}

type EventTypeFilter = 'all' | 'created' | 'task_completed' | 'status_changed' | 'approved' | 'auto_confirmed' | 'overdue' | 'comment' | 'artifact_generated' | 'escalated';
type ActorTypeFilter = 'all' | 'user' | 'system' | 'automation';

// ─── Field label map for human-readable details ────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  address_line_1: 'Address', phone: 'Phone', taxonomy_desc: 'Specialty',
  primary_taxonomy_code: 'Taxonomy code', first_name: 'First name',
  last_name: 'Last name', name: 'Name', license_status: 'License status',
  credential: 'Credential', gender: 'Gender',
};

const STATUS_LABELS: Record<string, string> = {
  action_needed: 'Needs attention', in_progress: 'In progress',
  awaiting: 'Awaiting confirmation', resolved: 'Resolved',
  cancelled: 'Cancelled', pending: 'Pending', active: 'Active',
  completed: 'Completed', skipped: 'Skipped',
};

function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return phone;
}

function titleCaseValue(str: string | null | undefined): string {
  if (!str) return '';
  // If it looks like a phone number (all digits, 10-11 chars), format it
  if (/^\d{10,11}$/.test(str)) return formatPhoneNumber(str);
  // If already mixed case or short, return as-is
  if (str !== str.toUpperCase() || str.length < 3) return str;
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatDetailValue(key: string, value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'string') return String(value);
  // Format based on the key context
  if (key.includes('phone') || key === 'approved_value' && /^\d{10,11}$/.test(value)) {
    return formatPhoneNumber(value);
  }
  if (key.includes('address') || key.includes('city') || key.includes('name') || key.includes('specialty')) {
    return titleCaseValue(value);
  }
  if (key === 'approved_value') return titleCaseValue(value);
  if (key === 'status' || key === 'new_status' || key === 'old_status') {
    return STATUS_LABELS[value] || titleCaseValue(value);
  }
  return titleCaseValue(value);
}

function formatDetailKey(key: string): string {
  // Use known labels first
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  // Convert snake_case to Title Case
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    .replace('Is Nppes Correct', 'NPPES is correct?')
    .replace('Nppes', 'NPPES')
    .replace('Npi', 'NPI');
}

function formatEventDetails(details: any, eventType: string): React.ReactNode {
  if (!details || typeof details !== 'object') return null;

  const entries = Object.entries(details).filter(([k]) =>
    // Skip internal/redundant fields
    !['id', 'workflow_id', 'provider_npi', 'practice_id', 'created_at', 'updated_at'].includes(k)
  );

  if (entries.length === 0) return null;

  // Detect field context from details to improve formatting of approved_value
  const fieldContext = details.field || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(([key, value]) => {
        // For approved_value, use the field context
        const effectiveKey = key === 'approved_value' && fieldContext === 'phone' ? 'phone' :
                             key === 'approved_value' && fieldContext === 'address_line_1' ? 'address' : key;
        // If value is itself an object, format it nicely
        const displayValue = typeof value === 'object' && value !== null
          ? Object.entries(value as Record<string, any>).map(([k, v]) => `${formatDetailKey(k)}: ${formatDetailValue(k, v)}`).join(', ')
          : formatDetailValue(effectiveKey, value);
        const displayKey = key === 'field' ? 'Field' : formatDetailKey(key);
        // For the 'field' key, use FIELD_LABELS
        const finalValue = key === 'field' ? (FIELD_LABELS[value as string] || titleCaseValue(value as string)) : displayValue;

        return (
          <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', minWidth: 120, flexShrink: 0 }}>
              {displayKey}
            </span>
            <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>
              {finalValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const EVENT_ICONS: Record<string, string> = {
  created: '✨',
  task_completed: '✓',
  status_changed: '→',
  approved: '✓',
  auto_confirmed: '🤖',
  overdue: '⚠',
  comment: '💬',
  artifact_generated: '📄',
  escalated: '🔺',
};

const EVENT_COLORS: Record<string, string> = {
  created: '#1e40af', // blue
  task_completed: '#16a34a', // green
  status_changed: '#ea580c', // orange
  approved: '#16a34a', // green
  auto_confirmed: '#7c3aed', // purple
  overdue: '#dc2626', // red
  comment: '#0891b2', // cyan
  artifact_generated: '#0369a1', // sky
  escalated: '#dc2626', // red
};

const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getDateGroupLabel = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const groupEventsByDate = (events: Event[]): Map<string, Event[]> => {
  const grouped = new Map<string, Event[]>();

  events.forEach(event => {
    const label = getDateGroupLabel(event.created_at);
    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label)!.push(event);
  });

  return grouped;
};

export default function AuditTrailView({ events, workflowMap, practiceId }: Props) {
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');
  const [actorTypeFilter, setActorTypeFilter] = useState<ActorTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesEventType = eventTypeFilter === 'all' || event.event_type === eventTypeFilter;
      const matchesActorType = actorTypeFilter === 'all' || event.actor_type === actorTypeFilter;
      const matchesSearch = searchQuery === '' ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (workflowMap[event.workflow_id]?.workflow_type || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesEventType && matchesActorType && matchesSearch;
    });
  }, [events, eventTypeFilter, actorTypeFilter, searchQuery, workflowMap]);

  const groupedEvents = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);

  const actorBadgeColor: Record<ActorTypeFilter, string> = {
    all: '#6b7280',
    user: '#3b82f6',
    system: '#8b5cf6',
    automation: '#ec4899',
  };

  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Workflow Audit Trail
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            View all workflow events and activities for this practice
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search events by title, type, or workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Filter Controls */}
        <div style={{ marginBottom: '32px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Event Type Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>
              Event Type
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value as EventTypeFilter)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Events</option>
              <option value="created">Created</option>
              <option value="task_completed">Task Completed</option>
              <option value="status_changed">Status Changed</option>
              <option value="approved">Approved</option>
              <option value="auto_confirmed">Auto Confirmed</option>
              <option value="overdue">Overdue</option>
              <option value="comment">Comment</option>
              <option value="artifact_generated">Artifact Generated</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          {/* Actor Type Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>
              Actor Type
            </label>
            <select
              value={actorTypeFilter}
              onChange={(e) => setActorTypeFilter(e.target.value as ActorTypeFilter)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Actors</option>
              <option value="user">User</option>
              <option value="system">System</option>
              <option value="automation">Automation</option>
            </select>
          </div>

          {/* Results Count */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          {filteredEvents.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>
                No events found matching your filters
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              {/* Timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: '7px',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  backgroundColor: '#e2e8f0',
                }}
              />

              {/* Events grouped by date */}
              {Array.from(groupedEvents.entries()).map(([dateLabel, dateEvents]) => (
                <div key={dateLabel} style={{ marginBottom: '40px' }}>
                  {/* Date Group Header */}
                  <div style={{ marginBottom: '16px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {dateLabel}
                    </span>
                  </div>

                  {/* Events in group */}
                  {dateEvents.map((event, index) => {
                    const workflow = workflowMap[event.workflow_id];
                    const isExpanded = expandedEventId === event.id;
                    const eventColor = EVENT_COLORS[event.event_type] || '#6b7280';
                    const eventIcon = EVENT_ICONS[event.event_type] || '•';

                    return (
                      <div
                        key={event.id}
                        style={{
                          marginBottom: '16px',
                          position: 'relative',
                        }}
                      >
                        {/* Timeline dot */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-31px',
                            top: '12px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: eventColor,
                            border: '3px solid #ffffff',
                            boxShadow: `0 0 0 1px ${eventColor}`,
                          }}
                        />

                        {/* Event Card */}
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                            el.style.borderColor = '#cbd5e1';
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.boxShadow = 'none';
                            el.style.borderColor = '#e2e8f0';
                          }}
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        >
                          {/* Top row: Icon, Title, Timestamp */}
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <span style={{ fontSize: '18px', flexShrink: 0 }}>{eventIcon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
                                  {event.title}
                                </h3>
                              </div>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: '0' }}>
                                {formatRelativeTime(event.created_at)}
                              </p>
                            </div>
                          </div>

                          {/* Middle row: Badges */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                            {/* Event Type Badge */}
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                backgroundColor: `${eventColor}15`,
                                color: eventColor,
                                fontSize: '11px',
                                fontWeight: '600',
                                borderRadius: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                              }}
                            >
                              {event.event_type.replace(/_/g, ' ')}
                            </span>

                            {/* Workflow Type Badge */}
                            {workflow && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 10px',
                                  backgroundColor: '#f8fafc',
                                  color: '#475569',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                }}
                              >
                                {workflow.workflow_type}
                              </span>
                            )}

                            {/* Provider Badge */}
                            {workflow?.provider_name && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 10px',
                                  backgroundColor: '#f8fafc',
                                  color: '#475569',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                }}
                              >
                                {workflow.provider_name}
                              </span>
                            )}

                            {/* Actor Badge */}
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                backgroundColor: `${actorBadgeColor[event.actor_type as ActorTypeFilter]}15`,
                                color: actorBadgeColor[event.actor_type as ActorTypeFilter],
                                fontSize: '11px',
                                fontWeight: '600',
                                borderRadius: '6px',
                                textTransform: 'capitalize',
                              }}
                            >
                              {event.actor_email || event.actor_type}
                            </span>
                          </div>

                          {/* Expandable Details */}
                          {isExpanded && event.details && (
                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '12px',
                                borderTop: '1px solid #e2e8f0',
                              }}
                            >
                              <p style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                Details
                              </p>
                              <div
                                style={{
                                  backgroundColor: '#f8fafc',
                                  padding: '10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#1e293b',
                                  overflow: 'auto',
                                  margin: '0',
                                  maxHeight: '300px',
                                }}
                              >
                                {formatEventDetails(event.details, event.event_type)}
                              </div>
                            </div>
                          )}

                          {/* Expand Indicator */}
                          {event.details && (
                            <div style={{ marginTop: '12px', textAlign: 'right' }}>
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: '#64748b',
                                  fontWeight: '500',
                                }}
                              >
                                {isExpanded ? '▼ Hide details' : '▶ Show details'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
