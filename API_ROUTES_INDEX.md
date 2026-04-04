# KairoLogic Dashboard API Routes - Complete Index

## Overview

This document indexes all 17 API route handlers built for the KairoLogic dashboard using Next.js 14 App Router.

**Created:** March 23, 2026
**Framework:** Next.js 14 App Router
**Auth:** Supabase Admin Client (service role key - bypasses RLS)
**Database:** Supabase PostgreSQL

---

## Settings API Routes (11 routes)

### 1. Practice Settings

**File:** `/app/api/settings/practice/route.ts`

```
GET  /api/settings/practice?practice_id={id}
PUT  /api/settings/practice
```

**GET** - Fetch practice profile

- Query: `practice_id` (required)
- Response: Full practice_websites record

**PUT** - Update practice profile

- Body: `{ practice_id, name?, npi?, address?, city?, state?, zip?, url?, primary_phone?, primary_fax?, practice_specialties? }`
- Response: Updated practice_websites record

---

### 2. Team Management

#### 2a. List Team Members

**File:** `/app/api/settings/team/route.ts`

```
GET  /api/settings/team?practice_id={id}
```

- Query: `practice_id` (required)
- Response: Array of practice_team_members

#### 2b. Invite Team Member

**File:** `/app/api/settings/team/invite/route.ts`

```
POST /api/settings/team/invite
```

- Body: `{ practice_id, email, role, invited_by? }`
- Creates pending team member record
- Sends invitation via Supabase Auth
- Response: Created team_member record

#### 2c. Manage Team Member

**File:** `/app/api/settings/team/[id]/route.ts`

```
DELETE /api/settings/team/{id}
PATCH  /api/settings/team/{id}
```

**DELETE** - Remove team member from practice

- Response: Success message

**PATCH** - Update team member role

- Body: `{ role }`
- Response: Updated team_member record

#### 2d. Resend Invitation

**File:** `/app/api/settings/team/[id]/resend/route.ts`

```
POST /api/settings/team/{id}/resend
```

- Resends invitation email for pending members
- Response: Success message

---

### 3. Notification Preferences

**File:** `/app/api/settings/notifications/route.ts`

```
GET /api/settings/notifications?practice_id={id}
PUT /api/settings/notifications
```

**GET** - Fetch notification preferences

- Query: `practice_id` (required)
- Response: notification_preferences record or empty object

**PUT** - Update notification preferences

- Body: `{ practice_id, ...preference_fields }`
- Creates or updates preferences
- Response: Updated record

---

### 4. Payer Directory Management

#### 4a. List Payers

**File:** `/app/api/settings/payers/route.ts`

```
GET /api/settings/payers
```

- Lists all active payer_directory_endpoints
- Includes latest snapshot date for each payer
- Response: Array of payers with metadata

#### 4b. Sync Payer Data

**File:** `/app/api/settings/payers/sync/route.ts`

```
POST /api/settings/payers/sync
```

- Body: `{ practice_id, payer_codes? }`
- Triggers asynchronous payer sync
- Returns 202 Accepted
- TODO: Implement actual FHIR sync logic

#### 4c. Request New Payer

**File:** `/app/api/settings/payers/request/route.ts`

```
POST /api/settings/payers/request
```

- Body: `{ practice_id, payer_name, email?, reason? }`
- Creates payer_requests record
- Response: Created request record

---

### 5. AI Agent Settings

**File:** `/app/api/settings/agent/route.ts`

```
GET /api/settings/agent?practice_id={id}
PUT /api/settings/agent
```

**GET** - Fetch AI agent configuration

- Query: `practice_id` (required)
- Response: practice_agent_settings record

**PUT** - Update AI agent settings

- Body: `{ practice_id, ...settings_fields }`
- Response: Updated record

---

### 6. Account Management

**File:** `/app/api/settings/account/password/route.ts`

```
PUT /api/settings/account/password
```

- Body: `{ user_id, new_password }`
- Updates password via Supabase Auth Admin API
- Validates: password length >= 8 characters
- Response: Success message

---

### 7. Auth - Complete Invite

**File:** `/app/api/auth/complete-invite/route.ts`

```
POST /api/auth/complete-invite
```

- Body: `{ token, user_id, display_name? }`
- Updates team member from pending → active
- Sets accepted_at timestamp
- Links auth user to team member
- Response: Updated team_member record

---

## Reports API Routes (3 routes)

### 8. Generate Report

**File:** `/app/api/reports/generate/route.ts`

```
POST /api/reports/generate
```

- Body: `{ practice_id, report_type, filters? }`
- Supported report types:
  - `provider_roster` - List providers with issue counts
  - `data_accuracy` - Mismatch summary by field and type
  - `payer_directory_status` - Payer sync status
  - `compliance_status` - Compliance workflow summary
  - `credential_expiry` - Credential/license expiry tracking
  - `workflow_activity` - Workflow type/status breakdown
  - `payer_comparison` - Cross-payer NPI comparison
- Response: `{ rows, rowCount, report_type, generated_at }`

---

### 9. Preview Report with Pagination

**File:** `/app/api/reports/preview/route.ts`

```
POST /api/reports/preview
```

- Body: `{ practice_id, report_type, filters?, page?, pageSize? }`
- Same report types as generate route
- Supports pagination (default: page 1, pageSize 20)
- Response: `{ rows, totalCount, page, pageSize }`

---

### 10. Schedule Report

**File:** `/app/api/reports/schedule/route.ts`

```
GET  /api/reports/schedule?practice_id={id}
POST /api/reports/schedule
```

**GET** - List scheduled reports

- Query: `practice_id` (required)
- Response: Array of scheduled_reports

**POST** - Create scheduled report

- Body: `{ practice_id, report_type, schedule_type, schedule_cron?, recipient_email?, enabled? }`
- Schedule types: `daily`, `weekly`, `monthly`, `custom`
- For custom: requires `schedule_cron` (cron expression)
- Response: Created scheduled_reports record

---

## Search API Routes (2 routes)

### 11. Natural Language Query

**File:** `/app/api/search/query/route.ts`

```
POST /api/search/query
```

- Body: `{ practice_id, query }`
- **Process:**
  1. Sends query to Claude API with database schema
  2. Claude generates validated SQL
  3. SQL validation: SELECT only, table whitelist
  4. Executes query with practice_id filter
  5. Logs to search_queries table
  6. Returns results with explanation
- Response: `{ rows, explanation, columns, chartType, sql, executed_at }`

**Security Features:**

- Regex validation: rejects INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE
- Table whitelist: only allowed tables can be queried
- LIMIT 500 enforced
- 5 second query timeout
- practice_id filter injected automatically

**System Prompt Includes:**

- Full database schema (tables, columns, enums)
- Allowed table whitelist
- Response format requirements
- Example queries

---

### 12. Recent Searches

**File:** `/app/api/search/recent/route.ts`

```
GET /api/search/recent?practice_id={id}&limit={n}
```

- Query: `practice_id` (required), `limit` (optional, default 20, max 100)
- Response: `{ practice_id, count, searches: [] }`
- Fetches last N search_queries for practice

---

## Common Patterns

### Error Handling

All routes implement consistent error handling:

```typescript
try {
  // route logic
} catch (error) {
  console.error('[Route Name] Error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

### Validation

All routes validate:

- Required fields present
- practice_id exists (where applicable)
- Enum values in allowed set
- Data types and constraints

### Practice Isolation

All routes filter by practice_id to ensure data isolation:

- GET requests verify practice exists
- Write operations locked to practice_id
- Admin client bypasses RLS, manual filtering ensures isolation

### Response Format

Standard JSON responses:

```typescript
// Success
{ success: true, message: "...", data: {...} }

// Error
{ error: "Description", status: 4xx|5xx }

// List
{ count: N, items: [...] }

// Paginated
{ rows: [...], totalCount: N, page: 1, pageSize: 20 }
```

---

## Database Tables Referenced

1. **practice_websites** - Practice profile data
2. **practice_team_members** - Team member records with roles
3. **notification_preferences** - Per-practice notification settings
4. **practice_agent_settings** - AI agent configuration
5. **payer_directory_endpoints** - Payer FHIR endpoints
6. **payer_directory_snapshots** - Flattened FHIR provider data
7. **payer_directory_mismatches** - Data accuracy findings
8. **payer_requests** - Feature requests from practices
9. **workflow_instances** - Main workflow records
10. **workflow_tasks** - Task breakdown for workflows
11. **workflow_events** - Audit trail for workflows
12. **alerts** - Alert/finding records
13. **scheduled_reports** - Scheduled report configurations
14. **search_queries** - Search history and logging

---

## Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key (service role)
- `NEXT_PUBLIC_APP_URL` - App URL for invite redirects (default: http://localhost:3000)
- `ANTHROPIC_API_KEY` - Claude API key (for search queries)

---

## HTTP Status Codes Used

- `200` - OK (GET, successful PUT/PATCH)
- `201` - Created (POST successful)
- `202` - Accepted (async operations like payer sync)
- `400` - Bad Request (validation errors)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate team member)
- `500` - Internal Server Error (exceptions)

---

## Example Requests

### Invite Team Member

```bash
curl -X POST http://localhost:3000/api/settings/team/invite \
  -H "Content-Type: application/json" \
  -d '{
    "practice_id": "abc-123",
    "email": "user@example.com",
    "role": "editor",
    "invited_by": "admin-user-id"
  }'
```

### Generate Provider Roster Report

```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "practice_id": "abc-123",
    "report_type": "provider_roster",
    "filters": { "status": "action_needed" }
  }'
```

### Natural Language Search

```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{
    "practice_id": "abc-123",
    "query": "How many workflows are overdue?"
  }'
```

---

## Notes

- All routes use `createAdminSupabaseClient()` which bypasses RLS
- Manual practice_id filtering ensures data isolation
- Claude API calls include comprehensive system prompt with schema
- Report generation reuses query logic with pagination support
- Search queries are logged for audit and analytics
- Invitation emails use Supabase Auth admin API
