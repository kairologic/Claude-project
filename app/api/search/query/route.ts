import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

interface SearchQueryRequest {
  practice_id: string;
  query: string;
}

interface ClaudeResponse {
  sql: string;
  explanation: string;
  columns: string[];
  chartType?: string;
}

/**
 * POST /api/search/query
 * Natural language search with Claude AI
 * Body: { practice_id, query }
 *
 * Process:
 * 1. Send query to Claude with database schema
 * 2. Parse Claude's SQL response
 * 3. Validate SQL (SELECT only, whitelist tables)
 * 4. Execute query with practice_id filter
 * 5. Log to search_queries table
 * 6. Return results
 */
export async function POST(request: NextRequest) {
  try {
    const body: SearchQueryRequest = await request.json();
    const { practice_id, query } = body;

    if (!practice_id || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: practice_id, query' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[Search Query POST] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Verify practice exists
    const { data: practice } = await supabase
      .from('practice_websites')
      .select('id')
      .eq('id', practice_id)
      .single();

    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 }
      );
    }

    // Step 1: Send query to Claude with system prompt containing schema
    const systemPrompt = buildSystemPrompt();
    let claudeResponse: string;
    try {
      claudeResponse = await callClaudeAPI(query, systemPrompt);
    } catch (aiError: any) {
      console.error('[Search Query POST] Claude API error:', aiError?.message || aiError);
      return NextResponse.json(
        { error: 'AI service error: ' + (aiError?.message || 'Failed to reach Claude API') },
        { status: 500 }
      );
    }

    // Step 2: Parse Claude's response
    let parsedResponse: ClaudeResponse;
    try {
      parsedResponse = parseClaudeResponse(claudeResponse);
    } catch (parseError: any) {
      console.error('[Search Query POST] Parse error:', parseError?.message, 'Raw:', claudeResponse?.slice(0, 300));
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Step 3: Validate SQL
    try {
      validateSQL(parsedResponse.sql);
    } catch (valError: any) {
      console.error('[Search Query POST] SQL validation:', valError?.message);
      return NextResponse.json(
        { error: 'Query validation failed: ' + valError?.message },
        { status: 400 }
      );
    }

    // Step 4: Inject practice_id filter and execute query
    let rows: any[] = [];
    try {
      const filteredSQL = injectPracticeFilter(parsedResponse.sql, practice_id);
      console.log('[Search Query POST] Executing:', filteredSQL);
      rows = await executeQuery(supabase, filteredSQL);
    } catch (execError: any) {
      console.error('[Search Query POST] SQL exec error:', execError?.message || execError);
      return NextResponse.json(
        { error: 'Failed to execute query: ' + (execError?.message || 'Unknown DB error') },
        { status: 500 }
      );
    }

    // Step 5: Log search query
    try {
      await supabase.from('search_queries').insert({
        practice_id,
        user_query: query,
        generated_sql: parsedResponse.sql,
        result_count: rows.length,
        status: 'success',
      });
    } catch (logError) {
      console.error('[Search Query POST] Error logging search:', logError);
      // Continue - logging failure shouldn't fail the response
    }

    // Step 6: Return results (field "data" matches SearchBar interface)
    return NextResponse.json({
      success: true,
      practice_id,
      query,
      explanation: parsedResponse.explanation,
      columns: parsedResponse.columns,
      chartType: parsedResponse.chartType || 'table',
      sql: parsedResponse.sql,
      rowCount: rows.length,
      data: rows,
      executed_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Search Query POST] Unhandled error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt with database schema
 */
function buildSystemPrompt(): string {
  return `You are a SQL expert assistant for a healthcare provider management database.

Your task is to convert natural language queries into valid PostgreSQL SELECT statements.

IMPORTANT RULES:
1. Only generate SELECT statements - NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or TRUNCATE
2. Always limit results to 500 rows: append "LIMIT 500"
3. Do NOT include practice_id filtering - that will be added automatically
4. Return response in this exact JSON format:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what this query does",
  "columns": ["col1", "col2", ...],
  "chartType": "table|bar|line|pie"
}

DATABASE SCHEMA:

Core Tables:
- practice_providers: id, practice_website_id (FK→practice_websites.id), npi, provider_name, roster_status (active/onboarding/departing/departed), has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch, has_license_issue, license_issue_type, active_mismatch_count, web_address, web_phone, web_specialty, added_date, departed_date, created_at, updated_at
- provider_licenses: id, npi, license_number, state, board_name, licensee_name, license_type, license_status, specialty, city, issue_date, expiration_date, last_renewal, has_disciplinary_action, source, first_name, last_name, created_at
- providers: npi, first_name, last_name, credential, taxonomy_desc, address_line_1, city, state, zip_code, phone (NPPES data — 1.8M rows, always filter by npi)
- workflow_instances: id, practice_id, workflow_type, status, provider_npi, provider_name, priority, trigger_source, finding_summary, approved_value, target_completion, overdue_at, completed_at, created_at, updated_at
- workflow_tasks: id, workflow_id, task_order, task_type, title, description, status, assigned_to, completed_by, completed_at, due_date, metadata, created_at, updated_at
- workflow_events: id, workflow_id, event_type, actor_id, actor_type, title, details, created_at
- alerts: id, practice_id, severity, title, description, workflow_id, provider_npi, provider_name, source, is_active, resolved_at, created_at
- nppes_delta_events: id, npi, practice_website_id, field_name, old_value, new_value, detection_source, resolved, resolved_at, detected_at, created_at (NPPES change log — address/phone/name changes detected)
- payer_directory_endpoints: payer_code, payer_name, fhir_base_url, auth_type, rate_limit_rpm, coverage_type, state_scope, is_active
- payer_directory_snapshots: id, npi, payer_code, snapshot_date, listed_name_full, listed_city, listed_state, listed_phone, listed_specialty_display, listed_accepting_patients
- payer_directory_mismatches: id, npi, payer_code, snapshot_id, field_name, mismatch_type, nppes_value, website_value, payer_value, priority, resolved_at, created_at
- practice_websites: id, name, npi, address, city, state, zip, url, primary_phone, primary_fax, practice_specialties, created_at

Views (pre-joined, use for provider-level questions):
- v_provider_health: npi, practice_website_id, provider_name, specialty, credential, open_issues, monitoring, resolved, total_workflows, health_score (0-100), roster_status, has_address_mismatch, has_phone_mismatch, has_taxonomy_mismatch, has_name_mismatch, has_license_issue, has_active_license_renewal, has_active_payer_directory, has_active_onboarding, has_active_compliance, has_active_credentialing, has_active_departure
- v_dashboard_kpis: practice_website_id, needs_attention, in_progress, monitoring_count, all_clear, total_providers

IMPORTANT:
- practice_providers uses "practice_website_id" (NOT "practice_id") as the practice FK
- nppes_delta_events uses "practice_website_id" (NOT "practice_id")
- v_provider_health uses "practice_website_id" (NOT "practice_id")
- workflow_instances and alerts use "practice_id" which maps to practice_websites.id
- The practice_id filter injected automatically matches practice_websites.id. For tables using practice_website_id, use that column name instead.

Enums:
- workflow_status: action_needed, in_progress, awaiting, resolved, cancelled
- workflow_type: nppes_update, payer_directory, onboarding, release, license_renewal, compliance, credentialing_onboarding
- roster_status: active, onboarding, departing, departed
- task_status: pending, active, completed, skipped
- alert_severity: action, warning, info, resolved

Examples:
- Q: "List all providers whose license is expiring"
  A: {"sql": "SELECT pl.npi, pl.licensee_name, pl.state, pl.license_number, pl.license_status, pl.expiration_date FROM provider_licenses pl JOIN practice_providers pp ON pp.npi = pl.npi WHERE pl.expiration_date <= CURRENT_DATE + INTERVAL '90 days' AND pl.expiration_date >= CURRENT_DATE AND pp.roster_status = 'active' ORDER BY pl.expiration_date ASC LIMIT 500", "explanation": "Active providers with licenses expiring within 90 days, ordered soonest first", "columns": ["npi", "licensee_name", "state", "license_number", "license_status", "expiration_date"], "chartType": "table"}

- Q: "How many providers need address change?"
  A: {"sql": "SELECT provider_name, npi, web_address FROM practice_providers WHERE has_address_mismatch = true AND roster_status = 'active' LIMIT 500", "explanation": "Active providers flagged with an address mismatch between NPPES and the practice website", "columns": ["provider_name", "npi", "web_address"], "chartType": "table"}

- Q: "How many NPPES fixes did we do last 30 days?"
  A: {"sql": "SELECT COUNT(*) as fixes_count FROM nppes_delta_events WHERE resolved = true AND resolved_at >= CURRENT_DATE - INTERVAL '30 days' LIMIT 500", "explanation": "Count of NPPES changes that were resolved in the last 30 days", "columns": ["fixes_count"], "chartType": "table"}

- Q: "Show me all pending workflows"
  A: {"sql": "SELECT id, workflow_type, status, provider_name, created_at FROM workflow_instances WHERE status = 'action_needed' ORDER BY created_at DESC LIMIT 500", "explanation": "Lists all workflows with action_needed status", "columns": ["id", "workflow_type", "status", "provider_name", "created_at"], "chartType": "table"}

- Q: "Provider health summary"
  A: {"sql": "SELECT provider_name, npi, health_score, open_issues, roster_status, has_license_issue, has_address_mismatch FROM v_provider_health ORDER BY health_score ASC LIMIT 500", "explanation": "All providers ranked by health score (lowest first = most issues)", "columns": ["provider_name", "npi", "health_score", "open_issues", "roster_status", "has_license_issue", "has_address_mismatch"], "chartType": "table"}

Generate the response now.`;
}

/**
 * Call Claude API with fetch
 */
async function callClaudeAPI(userQuery: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userQuery,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  const textContent = data.content[0];

  if (!textContent || textContent.type !== 'text') {
    throw new Error('Unexpected Claude response format');
  }

  return textContent.text;
}

/**
 * Parse Claude's JSON response
 */
function parseClaudeResponse(responseText: string): ClaudeResponse {
  // Extract JSON from the response (may contain explanatory text)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as ClaudeResponse;

  if (!parsed.sql || !parsed.explanation || !parsed.columns) {
    throw new Error('Missing required fields in Claude response: sql, explanation, columns');
  }

  return parsed;
}

/**
 * Validate SQL for security
 */
function validateSQL(sql: string): void {
  const upperSQL = sql.toUpperCase().trim();

  // Check for disallowed statements
  const disallowedPatterns = [
    /INSERT\s+INTO/i,
    /UPDATE\s+/i,
    /DELETE\s+FROM/i,
    /DROP\s+/i,
    /ALTER\s+/i,
    /CREATE\s+/i,
    /TRUNCATE\s+/i,
    /EXEC\s+/i,
    /EXECUTE\s+/i,
  ];

  for (const pattern of disallowedPatterns) {
    if (pattern.test(sql)) {
      throw new Error(`SQL validation failed: Disallowed statement detected`);
    }
  }

  // Check for SELECT
  if (!upperSQL.startsWith('SELECT')) {
    throw new Error('SQL validation failed: Only SELECT statements are allowed');
  }

  // Check whitelist of tables
  const allowedTables = [
    'workflow_instances',
    'workflow_tasks',
    'workflow_events',
    'alerts',
    'practice_providers',
    'providers',
    'provider_licenses',
    'nppes_delta_events',
    'v_provider_health',
    'v_dashboard_kpis',
    'payer_directory_endpoints',
    'payer_directory_snapshots',
    'payer_directory_mismatches',
    'practice_websites',
    'practice_team_members',
  ];

  const tablePattern = /FROM\s+(\w+)|JOIN\s+(\w+)|INTO\s+(\w+)/gi;
  let match;
  while ((match = tablePattern.exec(sql)) !== null) {
    const tableName = match[1] || match[2] || match[3];
    if (!allowedTables.includes(tableName)) {
      throw new Error(`SQL validation failed: Table '${tableName}' is not allowed`);
    }
  }

  // Enforce query timeout
  if (sql.length > 5000) {
    throw new Error('SQL validation failed: Query too long (max 5000 chars)');
  }
}

/**
 * Inject practice filter into SQL.
 * Tables use either practice_id or practice_website_id — detect which.
 */
function injectPracticeFilter(sql: string, practice_id: string): string {
  // Determine the correct column based on tables used
  const usesWebsiteId = [
    'practice_providers',
    'nppes_delta_events',
    'v_provider_health',
    'v_dashboard_kpis',
  ];

  // Check if any table using practice_website_id appears in the query
  const colName = usesWebsiteId.some(t => sql.toLowerCase().includes(t))
    ? 'practice_website_id'
    : 'practice_id';

  const filterClause = `${colName} = '${practice_id}'`;
  const hasWhere = /WHERE\s+/i.test(sql);
  const hasGroupOrOrder = /\b(GROUP\s+BY|ORDER\s+BY)\b/i.test(sql);
  const hasLimit = /LIMIT\s+\d+/i.test(sql);

  if (hasWhere) {
    if (hasLimit) {
      return sql.replace(/(LIMIT\s+\d+)/i, `AND ${filterClause} $1`);
    } else if (hasGroupOrOrder) {
      return sql.replace(/(GROUP\s+BY|ORDER\s+BY)/i, `AND ${filterClause} $1`);
    } else {
      return sql + ` AND ${filterClause}`;
    }
  } else {
    if (hasGroupOrOrder) {
      return sql.replace(/(GROUP\s+BY|ORDER\s+BY)/i, `WHERE ${filterClause} $1`);
    } else if (hasLimit) {
      return sql.replace(/(LIMIT\s+\d+)/i, `WHERE ${filterClause} $1`);
    } else {
      return sql + ` WHERE ${filterClause}`;
    }
  }
}

/**
 * Execute query against Supabase
 */
async function executeQuery(supabase: any, sql: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('execute_query', { query: sql });

  if (error) {
    throw error;
  }

  return data || [];
}

// Timeout wrapper
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  let timeoutHandle!: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error('Query timeout exceeded')),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}
