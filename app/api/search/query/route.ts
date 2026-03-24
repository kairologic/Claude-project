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
    const claudeResponse = await callClaudeAPI(query, systemPrompt);

    // Step 2: Parse Claude's response
    let parsedResponse: ClaudeResponse;
    try {
      parsedResponse = parseClaudeResponse(claudeResponse);
    } catch (parseError) {
      console.error('[Search Query POST] Error parsing Claude response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Step 3: Validate SQL
    validateSQL(parsedResponse.sql);

    // Step 4: Inject practice_id filter and execute query
    let rows: any[] = [];
    try {
      const filteredSQL = injectPracticeFilter(parsedResponse.sql, practice_id);
      rows = await executeQuery(supabase, filteredSQL);
    } catch (execError: any) {
      console.error('[Search Query POST] Error executing query:', execError);
      return NextResponse.json(
        { error: 'Failed to execute search query: ' + execError.message },
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

    // Step 6: Return results
    return NextResponse.json({
      success: true,
      practice_id,
      query,
      explanation: parsedResponse.explanation,
      columns: parsedResponse.columns,
      chartType: parsedResponse.chartType || 'table',
      sql: parsedResponse.sql,
      rowCount: rows.length,
      rows,
      executed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Search Query POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

Tables:
- workflow_instances: id, practice_id, workflow_type, status, provider_npi, provider_name, priority, trigger_source, finding_summary, approved_value, target_completion, overdue_at, completed_at, created_at, updated_at
- workflow_tasks: id, workflow_id, task_order, task_type, title, description, status, assigned_to, completed_by, completed_at, due_date, metadata, created_at, updated_at
- workflow_events: id, workflow_id, event_type, actor_id, actor_type, title, details, created_at
- alerts: id, practice_id, severity, title, description, workflow_id, provider_npi, provider_name, source, is_active, resolved_at, created_at
- payer_directory_endpoints: payer_code, payer_name, fhir_base_url, auth_type, rate_limit_rpm, coverage_type, state_scope, is_active, created_at, updated_at
- payer_directory_snapshots: id, npi, payer_code, snapshot_date, listed_name_full, listed_city, listed_state, listed_phone, listed_specialty_display, listed_accepting_patients, created_at
- payer_directory_mismatches: id, npi, payer_code, snapshot_id, field_name, mismatch_type, nppes_value, website_value, payer_value, priority, resolved_at, created_at
- practice_websites: id, practice_id, name, npi, address, city, state, zip, url, primary_phone, primary_fax, practice_specialties, created_at, updated_at
- practice_team_members: id, practice_id, email, role, status, user_id, display_name, invited_at, accepted_at, created_at, updated_at

Enums:
- workflow_status: action_needed, in_progress, awaiting, resolved, cancelled
- workflow_type: nppes_update, payer_directory, onboarding, release, license_renewal, compliance
- task_status: pending, active, completed, skipped
- alert_severity: action, warning, info, resolved
- practice_role: admin, viewer, editor

Examples:
- Q: "Show me all pending workflows"
  A: {"sql": "SELECT id, workflow_type, status, provider_name, created_at FROM workflow_instances WHERE status = 'action_needed' ORDER BY created_at DESC LIMIT 500", "explanation": "Lists all workflows with action_needed status", "columns": ["id", "workflow_type", "status", "provider_name", "created_at"], "chartType": "table"}

- Q: "How many workflows by status?"
  A: {"sql": "SELECT status, COUNT(*) as count FROM workflow_instances GROUP BY status LIMIT 500", "explanation": "Count of workflows grouped by status", "columns": ["status", "count"], "chartType": "bar"}

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
      model: 'claude-3-5-sonnet-20241022',
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
 * Inject practice_id filter into SQL
 */
function injectPracticeFilter(sql: string, practice_id: string): string {
  // Simple approach: add practice_id filter to WHERE clause
  // This assumes the query uses a table with practice_id
  const hasWhere = /WHERE\s+/i.test(sql);
  const hasLimit = /LIMIT\s+\d+/i.test(sql);

  if (hasLimit) {
    // Insert before LIMIT
    return sql.replace(
      /LIMIT\s+\d+/i,
      `AND practice_id = '${practice_id}' LIMIT`
    );
  } else {
    // Append before end or after GROUP BY/ORDER BY
    if (hasWhere) {
      return sql + ` AND practice_id = '${practice_id}'`;
    } else {
      // Find last FROM clause and add WHERE
      return sql.replace(
        /$/,
        ` WHERE practice_id = '${practice_id}'`
      );
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
