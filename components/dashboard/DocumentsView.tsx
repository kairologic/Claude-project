/**
 * components/dashboard/DocumentsView.tsx
 *
 * Documents page (formerly Artifacts).
 * Shows generated PDFs, checklists, templates linked to workflows.
 */

'use client';

import { colors } from '@/lib/design-tokens';

interface DocumentData {
  id: string;
  name: string;
  artifact_type: string;
  category: string;
  workflow_id: string | null;
  workflow_type: string | null;
  provider_name: string | null;
  file_size_kb: number | null;
  created_at: string;
}

interface DocumentsViewProps {
  documents: DocumentData[];
  practiceId: string;
}

const typeIcons: Record<string, string> = {
  pdf: '📄',
  checklist: '📋',
  template: '📝',
  guide: '📘',
  link: '🔗',
};

const typeBadgeColors: Record<string, { bg: string; color: string }> = {
  pdf: { bg: colors.redPale, color: colors.red },
  checklist: { bg: colors.bluePale, color: colors.blue },
  template: { bg: colors.goldPale, color: colors.gold },
  guide: { bg: colors.greenPale, color: colors.green },
  link: { bg: colors.gray100, color: colors.gray600 },
};

const categoryLabels: Record<string, string> = {
  auto_generated: 'Auto-generated',
  template: 'Template',
  upload: 'Upload',
};

export default function DocumentsView({ documents, practiceId }: DocumentsViewProps) {
  return (
    <div>
      {/* Summary */}
      <div style={{ fontSize: 12, color: colors.gray400, marginBottom: 16 }}>
        {documents.length} document{documents.length !== 1 ? 's' : ''}
        {documents.length > 0 && (
          <span>
            {' · '}
            {documents.filter(d => d.artifact_type === 'pdf').length} PDFs,{' '}
            {documents.filter(d => d.artifact_type === 'checklist').length} checklists,{' '}
            {documents.filter(d => d.artifact_type === 'template').length} templates
          </span>
        )}
      </div>

      {documents.length > 0 ? (
        <div style={{
          background: '#fff', borderRadius: 10, border: `1px solid ${colors.gray200}`, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 0.7fr 1.2fr 0.8fr',
            padding: '10px 16px', background: colors.gray100, borderBottom: `1px solid ${colors.gray200}`,
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.gray400,
          }}>
            <span>Document</span><span>Type</span><span>Source</span><span>Workflow</span><span>Date</span>
          </div>

          {/* Rows */}
          {documents.map(doc => {
            const icon = typeIcons[doc.artifact_type] || '📄';
            const badgeColor = typeBadgeColors[doc.artifact_type] || typeBadgeColors.pdf;
            const catLabel = categoryLabels[doc.category] || doc.category;

            return (
              <div key={doc.id} style={{
                display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 0.7fr 1.2fr 0.8fr',
                padding: '10px 16px', alignItems: 'center',
                borderBottom: `1px solid ${colors.gray100}`,
                cursor: 'pointer', transition: 'background .1s',
              }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.background = colors.gray50}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.navy }}>{doc.name}</div>
                    {doc.file_size_kb && (
                      <div style={{ fontSize: 10, color: colors.gray400 }}>{doc.file_size_kb} KB</div>
                    )}
                  </div>
                </div>

                {/* Type badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                  background: badgeColor.bg, color: badgeColor.color,
                  display: 'inline-block', width: 'fit-content', textTransform: 'uppercase',
                }}>
                  {doc.artifact_type}
                </span>

                {/* Category */}
                <span style={{ fontSize: 10, color: colors.gray400, fontWeight: 500 }}>
                  {catLabel}
                </span>

                {/* Workflow link */}
                <span style={{ fontSize: 11, color: colors.blue, fontWeight: 500 }}>
                  {doc.provider_name
                    ? `${doc.provider_name}`
                    : doc.workflow_type
                      ? doc.workflow_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : '—'}
                </span>

                {/* Date */}
                <span style={{ fontSize: 11, color: colors.gray400 }}>
                  {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: 40, textAlign: 'center', background: '#fff', borderRadius: 10,
          border: `1px solid ${colors.gray200}`,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy, marginBottom: 4 }}>
            No documents yet
          </div>
          <div style={{ fontSize: 12, color: colors.gray400, lineHeight: 1.5, maxWidth: 360, margin: '0 auto' }}>
            Documents are generated automatically when you approve corrections. Pre-filled NPPES forms, correction packets, and checklists will appear here.
          </div>
        </div>
      )}
    </div>
  );
}
