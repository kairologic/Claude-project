# KairoLogic Deep QA Test Plan

## Overview

This test suite provides comprehensive coverage of the KairoLogic healthcare compliance platform.
Tests are organized by concern: smoke (critical paths), navigation (routing/links), forms (user input),
and auth (authentication/authorization).

## Test Structure

```
tests/
  e2e/
    smoke.spec.ts       # Critical path verification (~25 tests)
    navigation.spec.ts  # Link integrity + routing (~40 tests)
    forms.spec.ts       # Form submission + validation (~20 tests)
    auth.spec.ts        # Authentication lifecycle (~25 tests)
  helpers/
    linkUtils.ts        # Link collection, classification, validation
    assertUtils.ts      # Page health, element, accessibility assertions
  claude/
    TEST_PLAN.md        # This file
    COVERAGE_MAP.json   # Route-to-test mapping
    FAILURE_REVIEW.md   # Failure diagnosis template
  playwright.config.ts  # Playwright configuration
```

## Critical User Flows

### Flow 1: Public Marketing Site
- Landing page loads with CTA buttons
- Navigation across all marketing pages
- Footer consistency across pages
- Contact / trial form submission
- Scan page NPI lookup
- Registry browsing

### Flow 2: Authentication
- Sign-in with valid credentials -> dashboard redirect
- Sign-in with invalid credentials -> error message
- Password reset flow
- Session persistence across navigation
- Auth guard on all protected routes
- Auth guard on all API endpoints

### Flow 3: Dashboard (Authenticated)
- Dashboard home loads with KPIs
- Sidebar navigation to all sub-pages
- Roster view with active providers
- Payer directory grid
- Workflow list and detail panels
- Alerts view
- Settings page

### Flow 4: Admin Portal
- Admin dashboard loads
- Practice list with status indicators
- Practice detail with scan controls
- Alert management

## Non-Negotiable Rules

1. **Every clickable element must be tested** — if it's in the DOM, it gets asserted
2. **Every action must assert a result** — no fire-and-forget clicks
3. **No sleeps** — zero `waitForTimeout` calls; use `waitForURL`, `waitForLoadState`, or expect with timeout
4. **data-testid required for all new UI** — new components must have data-testid attributes
5. **No hardcoded waits** — all timeouts are in playwright.config.ts or explicit expect options

## Expansion Strategy

For every new feature added to KairoLogic:

1. **Happy path** — the feature works as designed
2. **Failure path** — what happens when the API is down, input is invalid, or auth fails
3. **State persistence check** — does the feature survive a page reload
4. **Auth boundary check** — is it properly guarded from unauthenticated access

## Running Tests

```bash
# Full suite
npx playwright test --config=tests/playwright.config.ts

# Smoke tests only (quick validation)
npx playwright test --config=tests/playwright.config.ts --project=smoke

# Desktop browser tests
npx playwright test --config=tests/playwright.config.ts --project=desktop

# Mobile tests
npx playwright test --config=tests/playwright.config.ts --project=mobile

# Specific spec file
npx playwright test --config=tests/playwright.config.ts tests/e2e/auth.spec.ts

# With UI (headed mode)
npx playwright test --config=tests/playwright.config.ts --headed

# View HTML report
npx playwright show-report tests/results/html-report
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BASE_URL` | No | `http://localhost:3000` | App base URL |
| `TEST_USER_EMAIL` | For auth tests | `admin@kairologic.net` | Test user email |
| `TEST_USER_PASSWORD` | For auth tests | (none) | Test user password |
| `NEXT_PUBLIC_SUPABASE_URL` | For env-dependent pages | (none) | Supabase project URL |
| `CI` | Auto-set in CI | (none) | Enables CI-specific config |

## Claude's Role

Claude **does**:
- Generate and update test files
- Expand coverage when new features are added
- Analyze failures and propose fixes
- Enforce test rules (no sleeps, every action asserts)
- Update COVERAGE_MAP.json when routes change

Claude **does not**:
- Click UI manually
- Approve broken tests
- Assume UI correctness without assertions
- Skip tests to make the suite pass

## Branch Protection Requirements

- [ ] All Playwright tests pass
- [ ] Coverage map updated for new routes
- [ ] No new untested routes added
- [ ] FAILURE_REVIEW.md updated for any new failures
