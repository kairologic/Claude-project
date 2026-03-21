'use client';

import { useMemo, useState } from 'react';

interface Event {
  id: string;
  workflow_id: string;
  event_type: string;
  actor_type: string;
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
                              {event.actor_type}
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
                              <pre
                                style={{
                                  backgroundColor: '#f8fafc',
                                  padding: '10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  color: '#1e293b',
                                  overflow: 'auto',
                                  margin: '0',
                                  maxHeight: '300px',
                                  fontFamily: 'Monaco, Courier New, monospace',
                                }}
                              >
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
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
