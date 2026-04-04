/**
 * lib/reports/query-engine.ts
 *
 * Dynamic report query engine. Takes a report definition + user-selected
 * fields/filters and builds + executes the appropriate Supabase query.
 * Handles computed fields, nested joins, and pagination.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { REPORT_REGISTRY, type ReportDefinition, type FieldDefinition } from './report-definitions';

// ─── Request / Response types ───────────────────────────────────────────────

export interface ReportQueryRequest {
  report_type: string;
  practice_id: string;
  /** Selected field keys. If empty/missing, uses default fields. */
  fields?: string[];
  /** Filter values keyed by filter definition key */
  filters?: Record<string, any>;
  /** Sort field key */
  sort?: string;
  /** Sort direction */
  sort_direction?: 'asc' | 'desc';
  /** Page number (1-indexed) */
  page?: number;
  /** Page size (default 50, max 1000) */
  page_size?: number;
}

export interface ReportQueryResult {
  report_type: string;
  report_name: string;
  columns: { key: string; label: string; type: string }[];
  rows: Record<string, any>[];
  total_count: number;
  page: number;
  page_size: number;
  generated_at: string;
}

// ─── Query engine ───────────────────────────────────────────────────────────

export async function executeReportQuery(
  supabase: SupabaseClient,
  request: ReportQueryRequest,
): Promise<ReportQueryResult> {
  const definition = REPORT_REGISTRY[request.report_type];
  if (!definition) {
    throw new Error(`Unknown report type: ${request.report_type}`);
  }

  // Resolve selected fields (default to fields marked default: true)
  const selectedKeys = request.fields?.length
    ? request.fields
    : definition.fields.filter((f) => f.default).map((f) => f.key);

  // Validate all requested fields exist
  const fieldMap = new Map(definition.fields.map((f) => [f.key, f]));
  const selectedFields: FieldDefinition[] = [];
  for (const key of selectedKeys) {
    const field = fieldMap.get(key);
    if (field) selectedFields.push(field);
  }

  if (selectedFields.length === 0) {
    throw new Error('No valid fields selected');
  }

  // Build the Supabase select expression from the definition's base select
  // We always fetch the full base select to have data for computed fields
  let query = supabase
    .from(definition.baseTable)
    .select(definition.baseSelect.trim(), { count: 'exact' });

  // Apply practice scoping
  if (definition.practiceScoped && request.practice_id) {
    if (definition.practiceColumn?.includes('.')) {
      // Nested column (e.g., workflow_instances.practice_id)
      // Supabase handles this via the inner join filter
      const [relation, col] = definition.practiceColumn.split('.');
      query = query.eq(`${relation}.${col}`, request.practice_id);
    } else {
      query = query.eq(definition.practiceColumn || 'practice_id', request.practice_id);
    }
  }

  // For compliance_findings, scope to compliance workflow_type only
  if (request.report_type === 'compliance_findings') {
    query = query.eq('workflow_type', 'compliance');
  }

  // Apply user filters
  if (request.filters) {
    for (const filterDef of definition.filters) {
      const value = request.filters[filterDef.key];
      if (value === undefined || value === null || value === '') continue;

      const col = filterDef.column;
      switch (filterDef.operator) {
        case 'eq':
          query = query.eq(col, value);
          break;
        case 'in':
          if (Array.isArray(value) && value.length > 0) {
            query = query.in(col, value);
          }
          break;
        case 'gte':
          query = query.gte(col, value);
          break;
        case 'lte':
          query = query.lte(col, value);
          break;
        case 'ilike':
          query = query.ilike(col, `%${value}%`);
          break;
        case 'like':
          query = query.like(col, `%${value}%`);
          break;
        case 'between':
          // Expects { from, to }
          if (value.from) query = query.gte(col, value.from);
          if (value.to) query = query.lte(col, value.to);
          break;
      }
    }
  }

  // Sort
  const sortField = request.sort || definition.defaultSort;
  const sortDir = request.sort_direction || definition.defaultSortDirection;
  query = query.order(sortField, { ascending: sortDir === 'asc' });

  // Pagination
  const page = Math.max(1, request.page || 1);
  const pageSize = Math.min(1000, Math.max(1, request.page_size || 50));
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  // Execute
  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Report query failed: ${error.message}`);
  }

  // Transform rows: project selected fields, compute derived values
  const rows = (data || []).map((row) => projectRow(row, selectedFields, definition));

  // Build column metadata for the response
  const columns = selectedFields.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
  }));

  return {
    report_type: definition.type,
    report_name: definition.name,
    columns,
    rows,
    total_count: count || 0,
    page,
    page_size: pageSize,
    generated_at: new Date().toISOString(),
  };
}

// ─── Row projection + computed fields ───────────────────────────────────────

function projectRow(
  raw: Record<string, any>,
  selectedFields: FieldDefinition[],
  definition: ReportDefinition,
): Record<string, any> {
  const projected: Record<string, any> = {};

  for (const field of selectedFields) {
    if (field.column === '_computed') {
      projected[field.key] = computeField(field.key, raw, definition);
    } else if (field.column.includes('.')) {
      // Nested field (e.g., workflow_instances.provider_npi)
      const parts = field.column.split('.');
      const relation = parts[0];
      const col = parts[1];
      const nested = raw[relation];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        projected[field.key] = nested[col];
      } else if (Array.isArray(nested) && nested.length > 0) {
        projected[field.key] = nested[0][col];
      } else {
        projected[field.key] = null;
      }
    } else {
      projected[field.key] = raw[field.column] ?? null;
    }
  }

  return projected;
}

function computeField(key: string, raw: Record<string, any>, _definition: ReportDefinition): any {
  switch (key) {
    // Workflow Status report computed fields
    case 'task_count': {
      const tasks = raw.workflow_tasks;
      return Array.isArray(tasks) ? tasks.length : 0;
    }
    case 'tasks_completed': {
      const tasks = raw.workflow_tasks;
      return Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'completed').length : 0;
    }
    case 'age_days': {
      const created = raw.created_at ? new Date(raw.created_at) : null;
      if (!created) return null;
      return Math.floor((Date.now() - created.getTime()) / 86400000);
    }
    case 'resolution_days': {
      const created = raw.created_at ? new Date(raw.created_at) : null;
      const completed = raw.completed_at ? new Date(raw.completed_at) : null;
      if (!created || !completed) return null;
      return Math.floor((completed.getTime() - created.getTime()) / 86400000);
    }

    // Compliance Findings computed fields
    case 'compliance_category': {
      const details = raw.finding_details;
      if (details && typeof details === 'object') {
        return details.category || details.compliance_category || null;
      }
      // Infer from finding_summary
      const summary = (raw.finding_summary || '').toLowerCase();
      if (
        summary.includes('data sovereignty') ||
        summary.includes('sb 1188') ||
        summary.includes('dr-')
      )
        return 'Data Sovereignty';
      if (
        summary.includes('ai transparency') ||
        summary.includes('hb 149') ||
        summary.includes('ai-')
      )
        return 'AI Transparency';
      if (summary.includes('clinical') || summary.includes('er-')) return 'Clinical Integrity';
      return 'General';
    }
    case 'regulation': {
      const details = raw.finding_details;
      if (details && typeof details === 'object') {
        return details.regulation || null;
      }
      const summary = (raw.finding_summary || '').toLowerCase();
      if (summary.includes('sb 1188') || summary.includes('data sovereignty')) return 'SB 1188';
      if (summary.includes('hb 149') || summary.includes('ai transparency')) return 'HB 149';
      if (summary.includes('ab 3030')) return 'AB 3030';
      return null;
    }
    case 'severity': {
      const details = raw.finding_details;
      if (details && typeof details === 'object') {
        return details.severity || null;
      }
      return null;
    }

    // Credential Expiry computed fields
    case 'days_until_expiry': {
      const expDate = raw.expiration_date ? new Date(raw.expiration_date) : null;
      if (!expDate) return null;
      return Math.ceil((expDate.getTime() - Date.now()) / 86400000);
    }

    default:
      return null;
  }
}

// ─── CSV generation ─────────────────────────────────────────────────────────

/**
 * Converts a report result to CSV string.
 * Handles quoting, escaping, dates, and JSON fields.
 */
export function reportToCSV(result: ReportQueryResult): string {
  const { columns, rows } = result;

  // Header row
  const header = columns.map((c) => escapeCSV(c.label)).join(',');

  // Data rows
  const dataRows = rows.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key];
        return escapeCSV(formatCSVValue(value, col.type));
      })
      .join(',');
  });

  return [header, ...dataRows].join('\n');
}

function formatCSVValue(value: any, type: string): string {
  if (value === null || value === undefined) return '';
  if (type === 'json') return JSON.stringify(value);
  if (type === 'datetime' || type === 'date') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toISOString();
  }
  if (type === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── PDF generation helpers ─────────────────────────────────────────────────

/**
 * Returns structured data ready for jsPDF-autotable.
 * The actual PDF rendering happens in the API route (server-side jsPDF).
 */
export function reportToPDFData(result: ReportQueryResult): {
  title: string;
  subtitle: string;
  columns: string[];
  columnKeys: string[];
  rows: string[][];
  generated_at: string;
  total_count: number;
} {
  const { columns, rows, report_name, generated_at, total_count } = result;

  // For PDF, skip JSON columns (too wide) and truncate long text
  const pdfColumns = columns.filter((c) => c.type !== 'json');

  return {
    title: report_name,
    subtitle: `Generated ${new Date(generated_at).toLocaleDateString()} · ${total_count} records`,
    columns: pdfColumns.map((c) => c.label),
    columnKeys: pdfColumns.map((c) => c.key),
    rows: rows.map((row) =>
      pdfColumns.map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return '';
        if (col.type === 'datetime') {
          return new Date(value).toLocaleString();
        }
        const str = String(value);
        return str.length > 80 ? str.slice(0, 77) + '...' : str;
      }),
    ),
    generated_at,
    total_count,
  };
}
