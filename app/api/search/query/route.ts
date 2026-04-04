import { NextRequest, NextResponse } from 'next/server';
import { withPracticeAccess, API_ERRORS } from '@/lib/api/with-auth';
import type { PracticeContext } from '@/lib/api/with-auth';

interface SearchQueryRequest {
  query: string;
}

interface ClaudeDataResponse {
  type: 'data';
  sql: string;
  explanation: string;
  columns: string[];
  chartType?: string;
}

interface ClaudeHelpResponse {
  type: 'help';
  answer: string;
  relatedQueries?: string[];
}

type ClaudeResponse = ClaudeDataResponse | ClaudeHelpResponse;

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
 *
 * Secured with withPracticeAccess: requires authenticated user with access to the practice.
 */
const POST_HANDLER = withPracticeAccess(async (request: NextRequest, ctx: PracticeContext) => {
  try {
    const body: SearchQueryRequest = await request.json();
    const { query } = body;
    const practice_id = ctx.practiceId;

    if (!query) {
      return API_ERRORS.badRequest('Missing required field: query');
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[Search Query POST] Missing ANTHROPIC_API_KEY');
      return API_ERRORS.internal('AI service not configured');
    }

    const supabase = ctx.supabase;

    // Step 1: Send query to Claude with system prompt containing schema
    // Use Haiku (fast + cheap) first, fall back to Sonnet if it fails validation/parse
    const systemPrompt = buildSystemPrompt();
    let claudeResponse: string;
    let parsedResponse: ClaudeResponse;
    let usedModel: string = 'haiku';

    try {
      claudeResponse = await callClaudeAPI(query, systemPrompt, 'claude-haiku-4-5-20251001');
    } catch (aiError: any) {
      console.error('[Search Query POST] Haiku API error:', aiError?.message || aiError);
      return API_ERRORS.internal(
        'AI service error: ' + (aiError?.message || 'Failed to reach Claude API'),
      );
    }

    // Step 2: Parse Claude's response — if Haiku fails, retry with Sonnet
    try {
      parsedResponse = parseClaudeResponse(claudeResponse);
      // For data queries, also validate SQL before accepting Haiku's result
      if (parsedResponse.type === 'data') {
        validateSQL(parsedResponse.sql);
      }
    } catch (haikuError: any) {
      console.warn(
        '[Search Query POST] Haiku response failed validation, retrying with Sonnet:',
        haikuError?.message,
      );
      usedModel = 'sonnet';
      try {
        claudeResponse = await callClaudeAPI(query, systemPrompt, 'claude-sonnet-4-20250514');
        parsedResponse = parseClaudeResponse(claudeResponse);
      } catch (sonnetError: any) {
        console.error(
          '[Search Query POST] Sonnet fallback also failed:',
          sonnetError?.message,
          'Raw:',
          claudeResponse?.slice(0, 300),
        );
        return API_ERRORS.internal('Failed to parse AI response');
      }
    }

    console.log(`[Search Query POST] Used model: ${usedModel} for query: "${query.slice(0, 80)}"`);

    // ── BRANCH: Help response (no SQL needed) ──
    if (parsedResponse.type === 'help') {
      // Log the help query
      try {
        await supabase.from('search_queries').insert({
          practice_id,
          user_query: query,
          generated_sql: null,
          result_count: 0,
          status: 'help',
        });
      } catch (logError) {
        console.error('[Search Query POST] Error logging help query:', logError);
      }

      return NextResponse.json({
        success: true,
        type: 'help',
        practice_id,
        query,
        answer: parsedResponse.answer,
        relatedQueries: parsedResponse.relatedQueries || [],
        executed_at: new Date().toISOString(),
      });
    }

    // ── BRANCH: Data query (SQL path) ──
    // SQL was already validated during parse (and triggers Sonnet fallback if invalid)
    // Re-validate here as a safety net
    try {
      validateSQL(parsedResponse.sql);
    } catch (valError: any) {
      console.error('[Search Query POST] SQL validation:', valError?.message);
      return API_ERRORS.badRequest('Query validation failed: ' + valError?.message);
    }

    // Step 4: Inject practice_id filter and execute query
    let rows: any[] = [];
    try {
      const { sql: filteredSQL, params } = injectPracticeFilter(parsedResponse.sql, practice_id);
      console.log('[Search Query POST] Executing parameterized query for practice');
      rows = await executeQuery(supabase, filteredSQL, params[0]);
    } catch (execError: any) {
      console.error('[Search Query POST] SQL exec error:', execError?.message || execError);
      return API_ERRORS.internal(
        'Failed to execute query: ' + (execError?.message || 'Unknown DB error'),
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
    }

    // Step 6: Return results
    return NextResponse.json({
      success: true,
      type: 'data',
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
    return API_ERRORS.internal();
  }
});

export { POST_HANDLER as POST };

/**
 * Build system prompt with database schema
 */
function buildSystemPrompt(): string {
  return `You are KairoLogic AI — an intelligent assistant for a healthcare provider credentialing and compliance platform.

You handle TWO types of requests:

TYPE 1 — DATA QUERIES: Questions asking for specific data (counts, lists, lookups).
→ Generate a PostgreSQL SELECT statement.
→ Return JSON with "type": "data".

TYPE 2 — HELP / HOW-TO: Questions about how the platform works, what features do, terminology, or guidance.
→ Provide a clear, helpful answer from the knowledge base below.
→ Return JSON with "type": "help".

DECISION RULE:
- If the user is asking for specific records, counts, lists, or anything that requires looking at database rows → TYPE 1 (data).
- If the user is asking "what is", "how do I", "explain", "help me understand", "what does X mean", "how does Y work" → TYPE 2 (help).
- If ambiguous, prefer TYPE 2 (help) and suggest a data query they can try.

═══════════════════════════════════════════
RESPONSE FORMATS
═══════════════════════════════════════════

FOR TYPE 1 (data queries), return:
{
  "type": "data",
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what this query does",
  "columns": ["col1", "col2", ...],
  "chartType": "table|bar|line|pie"
}

FOR TYPE 2 (help queries), return:
{
  "type": "help",
  "answer": "Your helpful answer in markdown. Use **bold**, bullet lists, and short paragraphs for readability.",
  "relatedQueries": ["suggested follow-up question 1", "suggested follow-up question 2"]
}

═══════════════════════════════════════════
KNOWLEDGE BASE — PLATFORM HELP
═══════════════════════════════════════════

## What is KairoLogic?
KairoLogic is a provider data integrity platform that monitors healthcare practice websites, NPPES records, state license boards, and payer directories to detect mismatches and compliance risks. It helps practice managers keep their provider data accurate across all sources, preventing claim denials and compliance violations.

## Dashboard Overview
The main dashboard shows a summary of your practice's provider data health:
- **Needs Attention**: Providers with unresolved issues (mismatches, license problems, expired credentials).
- **In Progress**: Issues that have active workflows being worked on.
- **Monitoring**: Resolved issues being watched for recurrence.
- **All Clear**: Providers with no detected issues.
- **Health Score**: Each provider gets a score from 0-100 based on data accuracy across all sources. Lower scores mean more issues.

## Workflows
Workflows are structured task sequences that guide you through resolving a detected issue. Each workflow has:
- **Type**: What kind of issue it addresses (NPPES update, payer directory correction, license renewal, onboarding, release, compliance, credentialing).
- **Status**: Where it stands — action_needed (needs your attention), in_progress (being worked on), awaiting (waiting on external party), resolved (completed), or cancelled.
- **Tasks**: Individual steps within the workflow (e.g., "Verify correct address", "Submit NPPES update form", "Confirm change reflected").
- **Priority**: How urgent the issue is.
- **Provider**: Which provider the workflow is for.

### Workflow Types Explained
- **NPPES Update**: Correct a provider's NPPES record (address, phone, name, taxonomy). Triggered when a mismatch is detected between your website and NPPES.
- **Payer Directory**: Fix a provider's listing in a payer directory (UHC, BCBS, Aetna, Cigna, Humana). Triggered by payer directory mismatch detection.
- **License Renewal**: Track and manage upcoming license expirations. Triggered 90 days before expiration.
- **Onboarding**: Add a new provider to your practice roster and ensure all credentialing data is set up.
- **Release / Departure**: Manage a provider leaving your practice — update all external records.
- **Compliance**: Address regulatory compliance issues (AI transparency, data sovereignty, missing disclosures).
- **Credentialing Onboarding**: Full credentialing workflow for a new provider joining your practice.

## Provider Roster
The roster shows all providers associated with your practice:
- **Active**: Currently practicing at your location.
- **Onboarding**: New providers being set up.
- **Departing**: Providers in the process of leaving.
- **Departed**: Former providers no longer at your practice.

Each provider card shows their NPI, specialty, health score, and any active flags (address mismatch, phone mismatch, license issue, etc.).

## Alerts
Alerts notify you of detected issues ranked by severity:
- **Action**: Requires immediate attention (e.g., suspended license, deceased provider still listed).
- **Warning**: Should be addressed soon (e.g., license expiring in 30 days, address mismatch).
- **Info**: Informational (e.g., NPPES record updated, monitoring event).
- **Resolved**: Previously active alert that has been resolved.

## NPPES Monitoring
KairoLogic continuously monitors the National Plan and Provider Enumeration System (NPPES) for changes to your providers' records. When a change is detected (address, phone, name, taxonomy), it creates an **nppes_delta_event** and may trigger a workflow if the change creates a mismatch with your website data.

## Payer Directory Monitoring
KairoLogic checks major payer directories (UnitedHealthcare, BCBS, Aetna, Cigna, Humana) to verify your providers are listed correctly. Mismatches between NPPES, your website, and payer directories are flagged with specific field-level details.

## Provider Health Score
Each provider gets a health score from 0-100:
- **90-100**: All clear — no issues detected.
- **70-89**: Minor issues — one or two mismatches or monitoring items.
- **50-69**: Needs attention — multiple mismatches or a license concern.
- **Below 50**: Critical — significant data integrity problems requiring immediate action.

The score factors in: open issues count, mismatch flags (address, phone, name, taxonomy), license status, and active workflow count.

## NL Search (This Feature)
You're using it right now! Ask questions in plain English:
- **Data questions**: "Show me providers with expired licenses", "How many NPPES fixes this month?" → Returns live data from your database.
- **Help questions**: "How do workflows work?", "What does health score mean?" → Returns an explanation like this one.

## Settings
- **Practice Profile**: Update your practice name, address, phone, specialties.
- **Team & Access**: Invite team members, manage roles and permissions.
- **Notifications**: Configure alert preferences, email frequency, quiet hours.
- **Payer Connections**: View status of payer directory integrations.

## Common Terms
- **NPI**: National Provider Identifier — unique 10-digit number for each healthcare provider.
- **NPPES**: National Plan and Provider Enumeration System — the federal database of all NPIs.
- **PECOS**: Provider Enrollment, Chain, and Ownership System — Medicare enrollment database.
- **Mismatch**: When data about a provider differs between two or more sources (website vs NPPES vs payer directory).
- **Delta Event**: A detected change in a provider's NPPES record.
- **Roster Status**: Whether a provider is active, onboarding, departing, or departed at your practice.

═══════════════════════════════════════════
DATA QUERY RULES (TYPE 1 ONLY)
═══════════════════════════════════════════

IMPORTANT RULES:
1. Only generate SELECT statements - NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or TRUNCATE
2. Always limit results to 500 rows: append "LIMIT 500"
3. Do NOT include practice_id filtering - that will be added automatically
4. Return response with "type": "data" in the JSON

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
async function callClaudeAPI(
  userQuery: string,
  systemPrompt: string,
  model: string = 'claude-haiku-4-5-20251001',
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
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

  const parsed = JSON.parse(jsonMatch[0]);

  // Help response
  if (parsed.type === 'help') {
    if (!parsed.answer) {
      throw new Error('Missing required field in help response: answer');
    }
    return parsed as ClaudeHelpResponse;
  }

  // Data response (default if type is missing or "data")
  if (!parsed.sql || !parsed.explanation || !parsed.columns) {
    throw new Error('Missing required fields in data response: sql, explanation, columns');
  }
  return { ...parsed, type: 'data' } as ClaudeDataResponse;
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
 * Returns { sql, params } for parameterized query execution.
 */
function injectPracticeFilter(sql: string, practice_id: string): { sql: string; params: string[] } {
  // Validate practice_id is a valid UUID (already done by middleware, but defense-in-depth)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(practice_id)) {
    throw new Error('Invalid practice_id format');
  }

  // Determine the correct column based on tables used
  const usesWebsiteId = [
    'practice_providers',
    'nppes_delta_events',
    'v_provider_health',
    'v_dashboard_kpis',
  ];

  // Check if any table using practice_website_id appears in the query
  const lowerSql = sql.toLowerCase();
  const colName = usesWebsiteId.some((t) => lowerSql.includes(t))
    ? 'practice_website_id'
    : 'practice_id';

  // Try to find the table alias for the practice-filtered table
  // e.g. "practice_providers pp" → alias is "pp", so use "pp.practice_website_id"
  let prefix = '';
  if (colName === 'practice_website_id') {
    for (const tbl of usesWebsiteId) {
      const aliasMatch = sql.match(new RegExp(`${tbl}\\s+(\\w{1,4})\\b`, 'i'));
      if (
        aliasMatch &&
        aliasMatch[1].toLowerCase() !== 'on' &&
        aliasMatch[1].toLowerCase() !== 'where' &&
        aliasMatch[1].toLowerCase() !== 'set'
      ) {
        prefix = aliasMatch[1] + '.';
        break;
      }
    }
  } else {
    const aliasMatch =
      sql.match(/workflow_instances\s+(\w{1,4})\b/i) || sql.match(/alerts\s+(\w{1,4})\b/i);
    if (aliasMatch && !['on', 'where', 'set', 'and', 'or'].includes(aliasMatch[1].toLowerCase())) {
      prefix = aliasMatch[1] + '.';
    }
  }

  // Use $1 placeholder for parameterized query
  const filterClause = `${prefix}${colName} = $1`;
  const hasWhere = /WHERE\s+/i.test(sql);
  const hasGroupOrOrder = /\b(GROUP\s+BY|ORDER\s+BY)\b/i.test(sql);
  const hasLimit = /LIMIT\s+\d+/i.test(sql);

  let finalSql: string;
  if (hasWhere) {
    if (hasGroupOrOrder) {
      finalSql = sql.replace(/(GROUP\s+BY|ORDER\s+BY)/i, `AND ${filterClause} $1`);
    } else if (hasLimit) {
      finalSql = sql.replace(/(LIMIT\s+\d+)/i, `AND ${filterClause} $1`);
    } else {
      finalSql = sql + ` AND ${filterClause}`;
    }
  } else {
    if (hasGroupOrOrder) {
      finalSql = sql.replace(/(GROUP\s+BY|ORDER\s+BY)/i, `WHERE ${filterClause} $1`);
    } else if (hasLimit) {
      finalSql = sql.replace(/(LIMIT\s+\d+)/i, `WHERE ${filterClause} $1`);
    } else {
      finalSql = sql + ` WHERE ${filterClause}`;
    }
  }

  return { sql: finalSql, params: [practice_id] };
}

/**
 * Execute query against Supabase with parameterized queries
 */
async function executeQuery(supabase: any, sql: string, practice_id?: string): Promise<any[]> {
  // If practice_id is provided separately, pass it as a parameter
  // Otherwise assume sql already has parameterized query built-in
  if (practice_id) {
    const { data, error } = await supabase.rpc('execute_query', {
      query: sql,
      params: [practice_id],
    });

    if (error) {
      throw error;
    }

    return data || [];
  } else {
    // Legacy support: raw SQL without parameters
    const { data, error } = await supabase.rpc('execute_query', { query: sql });

    if (error) {
      throw error;
    }

    return data || [];
  }
}

// Timeout wrapper
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  let timeoutHandle!: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Query timeout exceeded')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}
