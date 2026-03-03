# CODE_EXPLAIN.md — KairoLogic Platform

## 1. Title & Scope

This document describes the structure, logic, and functionality of every module and file in the **KairoLogic Platform** repository. It is intended as the single source of truth for developers, reviewers, and automated tooling.

**Scope**: All source code, configuration, scripts, tests, database migrations, and static assets under the repository root.

---

## 2. Repo Overview

### Purpose

KairoLogic is a **Texas healthcare compliance platform** that helps healthcare providers comply with **Texas SB 1188** (Data Sovereignty — patient data must stay within U.S. borders) and **Texas HB 149** (AI Transparency — AI interactions with patients must be disclosed).

The platform provides:
- **Free compliance scans** — automated website scanning for data-residency violations, AI disclosure gaps, and NPI integrity mismatches.
- **Paid audit reports** ($149) — forensic PDF reports with remediation roadmaps.
- **Safe Harbor bundles** ($249) — audit report + policy pack + AI disclosure kit + staff training.
- **Sentry Shield monitoring** ($79/mo) — continuous 24/7 compliance drift monitoring with a live dashboard and embeddable trust widget.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 3.4 + custom brand tokens |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| Payments | Stripe (checkout sessions, subscriptions, webhooks) |
| Email | Amazon SES via Nodemailer (SMTP) |
| External APIs | NPPES (NPI Registry), NLM Clinical Tables, Browserless.io |
| Testing (e2e) | Playwright (content, structure, visual regression, links, functionality) |
| Testing (unit) | Vitest 4.x (checks engine, utils, CDN detection, report codes) |
| Deployment | Vercel (auto-deploy from GitHub) |
| CI | GitHub Actions (`page-tests.yml`) |
| Analytics | Apollo.io (tracking), Snitcher (visitor identification) |

### Entry Points

| Entry | Path | Description |
|-------|------|-------------|
| Application root | `app/layout.tsx` | Root layout with Header, Footer, TopBanner, analytics scripts |
| Homepage | `app/page.tsx` | Marketing hero, pricing, CTAs |
| Scan API (v3.1) | `app/api/scan/route.ts` | Primary compliance scanner endpoint |
| Scan Engine (v2) | `app/api/scan/run/route.ts` | NPI-integrity check engine |
| Stripe Webhook | `app/api/stripe/webhook/route.ts` | Payment + subscription lifecycle |
| Widget API | `app/api/widget/[npi]/route.ts` | Embeddable trust badge status |
| Dev server | `npm run dev` | Next.js development server |

---

## 3. Build / Run / Test Quickstart

### Prerequisites
- Node.js 20+
- npm

### Install
```bash
npm install
```

### Environment Variables

Create `.env.local` at the repo root:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Email (Amazon SES)
SES_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SES_SMTP_PORT=587
SES_SMTP_USER=your_ses_user
SES_SMTP_PASS=your_ses_pass
SES_FROM_EMAIL=compliance@kairologic.net
SES_FROM_NAME=KairoLogic Compliance

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_SHIELD_PRICE_ID=price_...
STRIPE_WATCH_PRICE_ID=price_...

# Campaign Landing Pages
REPORT_CODE_SECRET=your_random_32_byte_hex_string

# Optional
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BROWSERLESS_API_KEY=your_browserless_key
NEXT_PUBLIC_BASE_URL=https://kairologic.net
ADMIN_PASSWORD=your_admin_password
BASE_URL=http://localhost:3000
```

### Run

```bash
npm run dev        # Development server at http://localhost:3000
npm run build      # Production build
npm run start      # Production server
```

### Test

```bash
# ── Unit Tests (Vitest — no server required, ~1.5s) ──
npm run test:unit            # Run all 137 unit tests
npm run test:unit:watch      # Watch mode for development

# ── E2E Tests (Playwright — requires dev server) ──
npm test                     # Run all Playwright e2e tests
npm run test:content         # Static content tests only
npm run test:structure       # Page structure tests only
npm run test:links           # Broken link tests only
npm run test:functionality   # Functionality tests only
npm run test:visual          # Visual regression tests only
npm run test:guide           # Dashboard guide tests only
npm run test:update-snapshots  # Update visual regression baselines
npm run test:report          # Show Playwright HTML report
```

### Lint

```bash
npm run lint       # Next.js ESLint
```

---

## 4. Architecture & Flow

See the Mermaid diagram at [`docs/architecture.mmd`](./docs/architecture.mmd).

### High-Level Data Flow

```
Patient/Provider → Browser
    → Next.js Pages (SSR/CSR)
    → API Routes
        → Check Engine (checks/) or Scan API (app/api/scan/)
            → External APIs (NPPES, NLM, Browserless)
            → Supabase (store results, registry, reports)
        → Stripe (payments, subscriptions)
        → Amazon SES (emails)
    → Widget (public/sentry.js) → Widget API → Supabase
```

### Scan Flow

1. User enters NPI + URL on `/scan`
2. Frontend calls `POST /api/scan` (Sentry Scanner v3.1)
3. Scanner crawls the website via `lib/crawler.ts` (direct fetch → Browserless fallback)
4. Runs 12 compliance checks across 3 categories:
   - **Data Sovereignty (DR-01..04)**: Foreign data routing, CDN endpoints, form handlers
   - **AI Transparency (AI-01..04)**: AI disclosure presence, chatbot detection
   - **Clinical Integrity (ER-01..04)**: EHR system security indicators
5. Weighted scoring → composite risk score (0-100)
6. Results displayed on `/scan/results` with severity badges
7. Optionally: `POST /api/scan/run` triggers NPI-integrity checks via Check Engine v2

### Payment Flow

1. User clicks purchase CTA → redirects to Stripe Checkout
2. Stripe sends `checkout.session.completed` webhook to `POST /api/stripe/webhook`
3. Webhook identifies product (audit-report, safe-harbor, sentry-shield, sentry-watch)
4. Updates `registry` table (is_paid, subscription_status, widget_status)
5. Logs purchase to `purchases` table
6. Auto-creates Shield subscription with 90-day trial (for report/safe-harbor purchases)
7. Sends product-specific email via `POST /api/email/send`

---

## 5. Module / File Index

### Core Application Files

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `app/layout.tsx` | Root layout: meta, Header, Footer, TopBanner, analytics | `RootLayout` | `next`, analytics scripts | Layout |
| `app/page.tsx` | Homepage: hero, pricing, CTAs, video modal | `HomePage` | `lucide-react`, `next/link` | Marketing |
| `app/globals.css` | Global Tailwind styles + custom brand utilities | CSS classes | `tailwindcss` | Styling |

### Pages (app/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `app/scan/page.tsx` | Scan input form (NPI + URL) | Page component | — | Scan |
| `app/scan/results/page.tsx` | Scan results display + verified mode | Page component | — | Scan |
| `app/scan/results/scan-results-page.tsx` | Scan results page component | Page component | — | Scan |
| `app/registry/page.tsx` | Provider registry search | Page component | — | Registry |
| `app/registry/claim/page.tsx` | Registry claim form | Page component | — | Registry |
| `app/compliance/page.tsx` | SB 1188 / HB 149 info | Page component | — | Compliance |
| `app/services/page.tsx` | Service tiers and pricing | Page component | — | Marketing |
| `app/contact/page.tsx` | Contact form | Page component | — | Marketing |
| `app/patients/page.tsx` | Patient-facing info | Page component | — | Patient |
| `app/consultation/page.tsx` | Consultation booking | Page component | — | Sales |
| `app/intake/page.tsx` | Patient intake form | Page component | — | Patient |
| `app/intake/success/page.tsx` | Intake success confirmation | Page component | — | Patient |
| `app/payment/success/page.tsx` | Payment success + deliverables | Page component | — | Payments |
| `app/report/[code]/page.tsx` | Email campaign landing page — personalized compliance findings + product cards | Page component | `lucide-react`, `next/image` | Campaign |
| `app/privacy/page.tsx` | Privacy policy | Page component | — | Legal |
| `app/terms/page.tsx` | Terms of service | Page component | — | Legal |
| `app/dashboard/login/page.tsx` | Provider dashboard login | Page component | — | Auth |

### Admin Pages

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `app/admin/page.tsx` | Admin login page | Page component | — | Admin |
| `app/admin/dashboard/page.tsx` | Admin dashboard (tabbed: providers, prospects, email, assets, CMS, drift) | Page component | — | Admin |
| `app/admin/email-test/page.tsx` | Email template testing | Page component | — | Admin |
| `app/admin/shield-test/page.tsx` | Shield dashboard test harness | Page component | — | Admin |
| `app/admin/stripe-test/page.tsx` | Stripe integration test | Page component | — | Admin |

### API Routes (app/api/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `app/api/scan/route.ts` | Sentry Scanner v3.1 — full compliance scan (12 checks, 3 categories) | `POST` | `lib/crawler` | Scan |
| `app/api/scan/run/route.ts` | Check Engine v2 runner — NPI-integrity scans | `POST` | `checks/engine` | Scan |
| `app/api/validate-scan/route.ts` | Scan validation endpoint | `POST` | — | Scan |
| `app/api/stripe/webhook/route.ts` | Stripe webhook — payment + subscription lifecycle (v3) | `POST`, `OPTIONS` | Stripe API | Payments |
| `app/api/stripe-session/route.ts` | Create Stripe checkout session | `POST` | Stripe API | Payments |
| `app/api/email/send/route.ts` | Template-based email sending via SES | `POST` | `nodemailer`, SES | Email |
| `app/api/email/diagnose/route.ts` | Email delivery diagnostics | `GET` | — | Email |
| `app/api/auth/magic-link/route.ts` | Passwordless login via magic link | `POST` | `nodemailer`, `crypto` | Auth |
| `app/api/auth/verify/route.ts` | Magic link token verification | `POST` | — | Auth |
| `app/api/auth/verify-pin/route.ts` | 2FA PIN verification | `POST` | — | Auth |
| `app/api/contact/route.ts` | Contact form handler — sends email via SES | `POST` | `nodemailer` | Contact |
| `app/api/report/route.ts` | Report generation endpoint | `POST` | — | Reports |
| `app/api/prospects/route.ts` | Prospects management API | `GET`, `POST` | — | CRM |
| `app/api/prospects-route.ts` | Alternate prospects route | — | — | CRM |
| `app/api/registry-claim/route.ts` | Registry claim processing | `POST` | — | Registry |
| `app/api/widget/[npi]/route.ts` | Widget status by NPI (public) | `GET` | — | Widget |
| `app/api/widget/baseline/route.ts` | Widget baseline snapshot | `POST` | — | Widget |
| `app/api/widget/drift/route.ts` | Widget drift detection | `POST` | — | Widget |
| `app/api/widget/heartbeat/route.ts` | Widget heartbeat ping | `POST` | — | Widget |
| `app/api/shield/dashboard/route.ts` | Shield dashboard data endpoint | `GET` | — | Dashboard |
| `app/api/admin/bulk-scan/route.ts` | Admin bulk scan trigger | `POST` | — | Admin |
| `app/api/admin/generate-asset/route.ts` | Admin asset generation | `POST` | — | Admin |
| `app/api/report-lookup/route.ts` | Campaign report code lookup — resolves HMAC code to provider data + scan findings | `GET` | Supabase REST | Campaign |
| `app/api/fillout/webhook/route.ts` | Fillout form webhook | `POST` | — | Integrations |

### Check Engine (checks/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `checks/index.ts` | Barrel export for entire check engine | Re-exports all | — | Check Engine |
| `checks/types.ts` | Type definitions: `CheckModule`, `CheckContext`, `CheckResult`, `NpiOrgRecord`, `NpiProviderRecord`, `SiteSnapshot`, `ScanSession` | Types | — | Check Engine |
| `checks/registry.ts` | Check registry: `CHECK_REGISTRY` array, `getChecksForTier()`, `getChecksByCategory()`, `getCheckById()`, `CATEGORY_META` | Functions, constants | — | Check Engine |
| `checks/engine.ts` | Scan runner: `runScan()` — orchestrates check execution, scoring, result storage, mismatch alert management | `runScan` | Supabase REST | Check Engine |
| `checks/npi-checks.ts` | NPI integrity checks: `npiAddressCheck` (NPI-01), `npiPhoneCheck` (NPI-02), `npiTaxonomyCheck` (NPI-03) | `CheckModule` instances | — | Check Engine |
| `checks/roster-checks.ts` | Roster checks: `rosterCountCheck` (RST-01), `rosterNameCheck` (RST-02) | `CheckModule` instances | — | Check Engine |
| `checks/fetchers.ts` | External API fetchers: `fetchNpiOrg()` (NLM), `fetchNpiFromNppes()` (NPPES), `fetchNpiOrgBest()`, `fetchNpiProvidersByGeo()` | Functions | NLM API, NPPES API | Check Engine |
| `checks/crawler.ts` | Site snapshot crawler: `crawlSite()` — extracts address, phone, specialties, provider names, content hash | `crawlSite` | `crypto` | Check Engine |
| `checks/utils.ts` | Normalization utilities: address/phone/name matching, specialty synonyms, Levenshtein distance | Functions | — | Check Engine |

### Library (lib/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `lib/supabase.ts` | Supabase client (lazy singleton) + all database types (`Registry`, `ViolationEvidence`, `ScanHistory`, `EmailTemplate`, `Purchase`, `CalendarSlot`) | `getSupabase`, types | `@supabase/supabase-js` | Data |
| `lib/crawler.ts` | Adaptive web crawler v1.0: direct fetch → Browserless.io fallback, SPA detection, HTML-to-text | `crawlPage`, `stripHtmlToText`, `CrawlResult` | — | Crawling |
| `lib/report-code.ts` | HMAC-SHA256 report code generation + lookup for email campaign landing pages. Uses `REPORT_CODE_SECRET` env var with empty-string fallback (previously used non-null assertion which crashed if env var was missing) | `generateReportCode`, `findNpiByCode` | `crypto` | Campaign |

### Services (services/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `services/assetsService.ts` | Asset CRUD: `getAllAssets`, `getAssetsByType`, `createAsset`, `updateAsset`, `deleteAsset`, `searchAssets`, `getAssetStats` | Functions, `Asset` type | `lib/supabase` | Admin |
| `services/pageContentService.ts` | CMS content CRUD: `getPageContent`, `getContentSection`, `updateContentSection`, `bulkUpdateContent` | Functions, `PageContent` type | `lib/supabase` | CMS |
| `services/reportService.ts` | Report generation (text, HTML, JSON, PDF download): `generateTextReport`, `generateHTMLReport`, `downloadTextReport` | Functions, `ReportData` type | `lib/supabase` | Reports |
| `services/scanReportService.ts` | Scan report management: `getReportsForProvider`, `getReportById`, `markReportEmailed`, `attachPdfToReport`, `getReportStats` | Functions, `ScanReportFull` type | Supabase REST | Reports |

### React Hooks (hooks/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `hooks/useCMSContent.tsx` | CMS hooks: `useCMSContent` (single section), `usePageCMS` (full page), `useCMSSection` (typed), `CMSText` / `CMSHtml` components | Hooks, components | `services/pageContentService` | CMS |

### Components (components/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `components/layout/Header.tsx` | Site header with navigation | `Header` | `next/link`, `lucide-react` | Layout |
| `components/layout/Footer.tsx` | Site footer with links and contact | `Footer` | — | Layout |
| `components/layout/TopBanner.tsx` | Dismissible top announcement banner | `TopBanner` | — | Layout |
| `components/RiskScanWidget.tsx` | Internal scan widget component (large, ~50KB) | `RiskScanWidget` | — | Scan |
| `components/PDFReportGenerator.tsx` | Client-side PDF report generation | `PDFReportGenerator` | `jspdf`, `jspdf-autotable` | Reports |
| `components/admin/AssetsTab.tsx` | Admin asset management tab | `AssetsTab` | `services/assetsService` | Admin |
| `components/admin/DriftTab.tsx` | Admin drift monitoring tab | `DriftTab` | — | Admin |
| `components/admin/EmailTemplatesTab.tsx` | Admin email template management | `EmailTemplatesTab` | — | Admin |
| `components/admin/PageContentTab.tsx` | Admin CMS editor tab | `PageContentTab` | `services/pageContentService` | Admin |
| `components/admin/ProspectsTab.tsx` | Admin prospects/CRM tab | `ProspectsTab` | — | Admin |
| `components/admin/ProviderDetailModal.tsx` | Admin provider detail modal | `ProviderDetailModal` | `services/scanReportService` | Admin |

### Scripts (scripts/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `scripts/batch-scan-v2.ts` | Batch scanning of multiple providers from registry | CLI script | `checks/engine` | Operations |
| `scripts/import-verified-registry.ts` | Import verified provider data from JSON | CLI script | Supabase REST | Data Import |
| `scripts/seed-article-47-states.js` | Seed "47 States Healthcare AI Bills" article | CLI script | Supabase REST | Content |
| `scripts/safe-harbor/generate_ai_kit.py` | Generate AI disclosure kit deliverable | Python script | — | Safe Harbor |
| `scripts/safe-harbor/generate_evidence_ledger.py` | Generate evidence ledger template | Python script | — | Safe Harbor |
| `scripts/safe-harbor/generate_impl_guide.py` | Generate implementation guide | Python script | — | Safe Harbor |
| `scripts/safe-harbor/generate_policy_pdf.py` | Generate SB 1188 policy PDF | Python script | — | Safe Harbor |
| `scripts/safe-harbor/generate_roadmap.py` | Generate compliance roadmap | Python script | — | Safe Harbor |
| `scripts/safe-harbor/generate_staff_guide.py` | Generate staff training guide | Python script | — | Safe Harbor |

### Public Assets (public/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `public/sentry.js` | Embeddable compliance trust widget (loads via `<script>` tag on provider sites) | Widget JS | Widget API | Widget |
| `public/demo.html` | Product demo page | Static HTML | — | Demo |
| `public/shield-demo.html` | Shield dashboard demo | Static HTML | — | Demo |
| `public/shield-dashboard-mock.html` | Shield dashboard mock layout | Static HTML | — | Demo |
| `public/widget-demo.html` | Widget integration demo | Static HTML | — | Demo |
| `public/widget-embed-test.html` | Widget embed test page | Static HTML | — | Testing |
| `public/widget-test.html` | Widget test harness | Static HTML | — | Testing |
| `public/sentry-test.html` | Sentry integration test | Static HTML | — | Testing |

### E2E Tests (e2e/)

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `e2e/static-content.spec.ts` | Verify static text content on all pages | Playwright test suite | `@playwright/test` | QA |
| `e2e/page-structure.spec.ts` | Verify page DOM structure (headings, forms, nav) | Playwright test suite | `@playwright/test` | QA |
| `e2e/broken-links.spec.ts` | Check for broken internal/external links | Playwright test suite | `@playwright/test` | QA |
| `e2e/functionality.spec.ts` | Test interactive functionality (forms, buttons) | Playwright test suite | `@playwright/test` | QA |
| `e2e/visual-regression.spec.ts` | Screenshot-based visual regression tests | Playwright test suite | `@playwright/test` | QA |
| `e2e/dashboard-guide.spec.ts` | Dashboard guide walkthrough tests | Playwright test suite | `@playwright/test` | QA |

### Unit Tests (Vitest)

| Path | Purpose | Test Count | External Deps | Owner/Area |
|------|---------|------------|---------------|------------|
| `checks/utils.unit.test.ts` | Tests for `normalizeAddress`, `addressesMatch`, `normalizePhone`, `phonesMatch`, `normalizeName`, `fuzzyNameMatch`, `specialtyMatches`, `levenshtein` | 43 | `vitest` | Check Engine |
| `checks/registry.unit.test.ts` | Tests for `CHECK_REGISTRY`, `getChecksForTier`, `getChecksByCategory`, `getCheckById`, `CATEGORY_META` | 15 | `vitest` | Check Engine |
| `checks/npi-checks.unit.test.ts` | Tests for NPI-01 (address), NPI-02 (phone), NPI-03 (taxonomy) check modules with pass/fail/inconclusive scenarios | 18 | `vitest` | Check Engine |
| `checks/roster-checks.unit.test.ts` | Tests for RST-01 (roster count) and RST-02 (roster name matching) with variance thresholds | 13 | `vitest` | Check Engine |
| `checks/crawler.unit.test.ts` | Tests for `crawlSite` with mocked `fetch` — address/phone/specialty/provider extraction from HTML and JSON-LD | 12 | `vitest` | Check Engine |
| `lib/cdn-detection.unit.test.ts` | Tests for `detectCDNByIP` (CIDR ranges), `detectCDNByHeaders`, `isKnownUSSaaS`, `isKnownUSMailProvider` | 27 | `vitest` | CDN Detection |
| `lib/report-code.unit.test.ts` | Tests for `generateReportCode` (determinism, format) and `findNpiByCode` (lookup) | 9 | `vitest` | Campaign |

### Database Migrations

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `database-migration.sql` | v1: Registry enhancements, email_templates, page_content, assets, calendar_slots, purchases, scan_history, email_logs, RLS policies | SQL DDL | Supabase | Database |
| `database-migration-v2.sql` | v2: provider_type, scan_results, violation_evidence, page_content redesign with seed data | SQL DDL | Supabase | Database |
| `database-migration-scan-reports.sql` | scan_reports table: forensic audit report storage with PDF blob support | SQL DDL | Supabase | Database |
| `migration-v12-part1-registry.sql` | v12 part 1: Registry table extensions | SQL DDL | Supabase | Database |
| `migration-v12-part2-email-table.sql` | v12 part 2: Email template table refinements | SQL DDL | Supabase | Database |
| `migration-v12-part3-seed-templates.sql` | v12 part 3: Seed email templates | SQL DML | Supabase | Database |
| `database-migration-campaign-outreach.sql` | campaign_outreach table for email campaign tracking + report code lookup | SQL DDL | Supabase | Database |
| `database-seed-page-content.sql` | CMS content seed data (~100+ sections) | SQL DML | Supabase | Database |

### Configuration Files

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `package.json` | Dependencies + scripts | npm config | — | Config |
| `tsconfig.json` | TypeScript config (strict, bundler resolution, `@/*` alias) | TS config | — | Config |
| `next.config.js` | Next.js config (image domains: kairologic.net) | Next config | — | Config |
| `tailwind.config.js` | Tailwind config: brand colors (navy, gold, orange), fonts (Inter, Montserrat) | TW config | — | Config |
| `postcss.config.js` | PostCSS: Tailwind + Autoprefixer | PostCSS config | — | Config |
| `playwright.config.ts` | Playwright config: chromium + mobile-chrome, webServer, e2e dir | Playwright config | — | Config |
| `vitest.config.ts` | Vitest config: node environment, `@/` path alias, `**/*.unit.test.ts` include pattern | Vitest config | — | Config |
| `vercel.json` | Vercel deployment config (nextjs framework) | Vercel config | — | Config |
| `.gitignore` | Ignored paths: node_modules, .next, out, Playwright artifacts | — | — | Config |

### Root-Level Standalone Files

| Path | Purpose | Key Exports/Classes | External Deps | Owner/Area |
|------|---------|---------------------|---------------|------------|
| `RiskScanWidget.tsx` | Standalone copy of risk scan widget (development reference) | Component | — | Dev |
| `dashboard-page.tsx` | Standalone admin dashboard page (development reference) | Component | — | Dev |
| `page.tsx` | Standalone homepage (development reference) | Component | — | Dev |
| `scan-results-page.tsx` | Standalone scan results page (development reference) | Component | — | Dev |
| `prospects-route.ts` | Standalone prospects route (development reference) | API route | — | Dev |
| `verified-tx-import.json` | Verified Texas provider import data (674KB) | JSON data | — | Data |
| `supabase-templates/purchase-success-template.html` | Email template for purchase success | HTML template | — | Email |

---

## 6. Detailed Module Notes

### 6.1 Check Engine (`checks/`)

**Responsibilities**: Plugin-based compliance checking system for NPI integrity verification.

**Public API**:
- `runScan(npi, url, tier, triggeredBy, siteSnapshot?)` — orchestrates full scan
- `getChecksForTier(tier)` — returns checks available for free/report/shield tier
- `CHECK_REGISTRY` — ordered array of all registered check modules

**Key Logic**:
- Checks are `CheckModule` objects with `id`, `category`, `severity`, `tier`, and an async `run(context)` method
- Engine pre-fetches shared data (NPI org, provider roster) into a `CheckContext.cache` to avoid duplicate API calls
- All checks run in parallel with 15-second per-check timeout
- Composite score = average of non-inconclusive check scores
- Risk levels: Sovereign (>=75), Drift (50-74), Violation (<50)
- Mismatch alerts are upserted (new or increment occurrence count) for failing NPI checks
- Auto-resolves alerts when checks pass again

**I/O**:
- Input: NPI string, URL string, subscription tier
- Output: `ScanSession` object with composite score, risk level, individual check results
- Side effects: Writes to `scan_sessions`, `check_results`, `mismatch_alerts`, `registry` tables

**Edge Cases**:
- If NPI org data is unavailable, individual checks return `inconclusive`
- If site snapshot is not provided, crawler-dependent checks skip gracefully
- Provider roster only fetched for `report` and `shield` tiers

### 6.2 Adaptive Web Crawler (`lib/crawler.ts`)

**Responsibilities**: Two-strategy page content fetcher for compliance scanning.

**Public API**:
- `crawlPage(url)` — returns `CrawlResult` with HTML, text, strategy used
- `stripHtmlToText(html)` — extracts plain text from HTML

**Key Logic**:
- Strategy 1: Direct `fetch()` with browser-like headers (15s timeout)
- Strategy 2: Browserless.io REST API for JS-rendered SPAs (30s timeout)
- SPA detection via indicators (`<div id="root"></div>`, `__next_data__`, etc.) + minimum text length (200 chars)
- Falls back gracefully: partial content > no content

**Environment Variables**: `BROWSERLESS_API_KEY` (optional — degrades gracefully without it)

### 6.3 Site Snapshot Crawler (`checks/crawler.ts`)

**Responsibilities**: Healthcare-specific website data extraction for compliance checks.

**Public API**:
- `crawlSite(url)` — returns `SiteSnapshot` with structured data

**Key Logic**:
- Address extraction: JSON-LD → microdata → regex patterns → Texas-specific patterns
- Phone extraction: `tel:` links → schema.org → JSON-LD → text patterns
- Specialty extraction: keyword matching against 50+ healthcare specialty terms
- Provider name extraction: schema.org → JSON-LD → credential patterns (MD, DO, NP, etc.)
- Content hash (SHA-256, truncated to 16 chars) for drift detection

### 6.4 Sentry Scanner v3.1 (`app/api/scan/route.ts`)

**Responsibilities**: Primary compliance scanning API with 12-point check system.

**Key Logic**:
- 12 checks across 3 categories: Data Sovereignty (DR-01..04), AI Transparency (AI-01..04), Clinical Integrity (ER-01..04)
- Priority Matrix scoring: `critical` severity = 3x weight, `high` = 2x, `medium`/`low` = 1x
- PHI context classification: `direct` (form handlers), `indirect` (analytics), `none` (static assets)
- Page context detection: identifies patient portals, intake forms, contact pages
- Data Border Map: geo-evidence for visualization (domain → IP → country)
- Category-level scores + composite score
- Results persisted to Supabase + email notifications

### 6.5 Stripe Webhook (`app/api/stripe/webhook/route.ts`)

**Responsibilities**: Payment + subscription lifecycle management.

**Key Logic**:
- Product identification cascade: metadata → client_reference_id → line items → amount fallback
- 4 products: audit-report, safe-harbor, sentry-shield, sentry-watch
- Auto-creates Shield subscription with 90-day trial for report/safe-harbor purchases
- Handles: `checkout.session.completed`, `customer.subscription.deleted/updated`, `customer.subscription.trial_will_end`, `invoice.payment_failed`
- Updates registry, logs purchases, sends product-specific emails, logs to prospects

### 6.6 CMS System (`services/pageContentService.ts` + `hooks/useCMSContent.tsx`)

**Responsibilities**: Dynamic website content management without code deployment.

**Public API**:
- `getPageContent(page)`, `getContentSection(page, section)`, `updateContentSection()`, `bulkUpdateContent()`
- React hooks: `useCMSContent(page, section, fallback)`, `usePageCMS(page)`, `useCMSSection(page, section)`
- Helper components: `CMSText`, `CMSHtml`

**Data Model**: `page_content` table with `page`, `section`, `content`, `content_type` (text/html/json/markdown/image_url)

---

## 7. Config & Secrets

### Environment Variables Reference

| Variable | Required | Used By | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `lib/supabase.ts`, multiple API routes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | `lib/supabase.ts`, multiple API routes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | `checks/engine.ts`, webhook routes | Supabase service role key (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Yes (prod) | `app/api/stripe/webhook/route.ts` | Stripe secret key |
| `STRIPE_SHIELD_PRICE_ID` | Yes (prod) | `app/api/stripe/webhook/route.ts` | Stripe recurring price ID for Shield ($79/mo) |
| `STRIPE_WATCH_PRICE_ID` | No | `app/api/stripe/webhook/route.ts` | Stripe recurring price ID for Watch ($39/mo) |
| `SES_SMTP_HOST` | Yes (email) | `app/api/email/send/route.ts`, `app/api/auth/magic-link/route.ts`, `app/api/contact/route.ts` | Amazon SES SMTP host |
| `SES_SMTP_PORT` | Yes (email) | Same as above | Amazon SES SMTP port (587) |
| `SES_SMTP_USER` | Yes (email) | Same as above | Amazon SES SMTP username |
| `SES_SMTP_PASS` | Yes (email) | Same as above | Amazon SES SMTP password |
| `SES_FROM_EMAIL` | No | Same as above | Sender email address (default: compliance@kairologic.net) |
| `SES_FROM_NAME` | No | Same as above | Sender display name (default: KairoLogic Compliance) |
| `BROWSERLESS_API_KEY` | No | `lib/crawler.ts` | Browserless.io API key for JS-rendered sites |
| `NEXT_PUBLIC_BASE_URL` | No | `app/api/auth/magic-link/route.ts` | Public base URL (default: https://kairologic.net) |
| `ADMIN_PASSWORD` | No | Admin pages | Admin dashboard password |
| `REPORT_CODE_SECRET` | Yes (campaign) | `lib/report-code.ts` | 32-byte hex secret for HMAC-based report code generation |
| `BASE_URL` | No | Playwright tests, CI | Test server base URL (default: http://localhost:3000) |
| `CI` | Auto | `playwright.config.ts` | Set by GitHub Actions |

### Feature Flags

No explicit feature flag system. Tier-based gating is controlled by the `tier` field on `registry` entries: `free`, `report`, `shield`.

---

## 8. Observability

### Logs

- All API routes log to `console.log` / `console.error` with tagged prefixes:
  - `[Engine]` — Check engine operations
  - `[Fetcher]` — External API calls (NPPES, NLM)
  - `[Crawler]` — Web crawling operations
  - `[Email]` — Email sending (SES)
  - `[Stripe Webhook]` — Payment processing
  - `[Magic Link]` — Auth operations
  - `[CMS]` — Content management
  - `[ASSETS]` — Asset management
  - `[ScanReportService]` — Report operations
  - `[Contact]` — Contact form
  - `[API]` / `[API Scan]` — Scan API

### Metrics

No dedicated metrics collection. Supabase table counts serve as basic metrics:
- `scan_sessions` — scan volume
- `check_results` — check execution counts
- `purchases` — payment counts via `getReportStats()`
- `mismatch_alerts` — open compliance issues

### Traces

No distributed tracing. Scan duration is captured in `CrawlResult.duration` and `ScanSession.started_at` / `completed_at`.

---

## 9. Data & Schemas

### Database Tables (Supabase PostgreSQL)

| Table | Key Columns | Purpose | Migration |
|-------|-------------|---------|-----------|
| `registry` | `id`, `npi`, `name`, `url`, `risk_score`, `risk_level`, `widget_status`, `subscription_status`, `is_paid` | Texas provider directory (481K+ records) | `database-migration.sql` |
| `scan_sessions` | `id`, `npi`, `url`, `tier`, `composite_score`, `risk_level`, `checks_total/passed/failed/warned` | Scan execution sessions | Check Engine v2 |
| `check_results` | `scan_id`, `npi`, `check_id`, `status`, `score`, `evidence`, `remediation_steps` | Individual check results | Check Engine v2 |
| `mismatch_alerts` | `npi`, `check_id`, `dimension`, `severity`, `npi_value`, `site_value`, `status` | NPI integrity mismatch alerts | Check Engine v2 |
| `scan_reports` | `npi`, `report_id`, `sovereignty_score`, `findings`, `pdf_base64`, `emailed_at`, `payment_confirmed` | Forensic audit reports with PDF storage | `database-migration-scan-reports.sql` |
| `scan_history` | `registry_id`, `npi`, `risk_score`, `violations`, `scan_type` | Historical scan records (legacy) | `database-migration.sql` |
| `scan_results` | `npi`, `risk_score`, `sb1188_findings`, `hb149_findings`, `technical_fixes` | Detailed scan results (v2) | `database-migration-v2.sql` |
| `violation_evidence` | `registry_id`, `violation_id`, `violation_clause`, `technical_finding`, `fix_priority` | Violation evidence details | `database-migration-v2.sql` |
| `email_templates` | `slug`, `name`, `subject`, `html_body`, `event_type`, `is_active` | Email templates for automated comms | `database-migration.sql` |
| `page_content` | `page`, `section`, `content`, `content_type` | CMS content sections | `database-migration-v2.sql` |
| `assets` | `name`, `type`, `url`, `content`, `category` | Digital asset library | `database-migration.sql` |
| `purchases` | `npi`, `product_type`, `amount`, `stripe_payment_intent`, `email` | Payment transaction records | `database-migration.sql` |
| `prospects` | `source`, `contact_name`, `email`, `status`, `priority`, `form_data` | CRM prospect tracking | — |
| `calendar_slots` | `date`, `start_time`, `end_time`, `is_available`, `booked_by` | Consultation calendar | `database-migration.sql` |
| `email_logs` | `recipient`, `template_id`, `status`, `sent_at` | Email audit trail | `database-migration.sql` |
| `dashboard_tokens` | `token`, `email`, `npi`, `expires_at`, `used_at` | Magic link auth tokens | `app/api/auth/magic-link/route.ts` |
| `campaign_outreach` | `npi`, `report_code`, `email_sent_to`, `sent_at`, `campaign_name`, `opened`, `purchased` | Email campaign tracking + report code lookup | `database-migration-campaign-outreach.sql` |

### Key TypeScript Types (lib/supabase.ts)

- `Registry` — provider record with all fields
- `ViolationEvidence` — violation finding with fix priority/complexity
- `ScanHistory` — historical scan record
- `EmailTemplate` — email template with variables
- `Purchase` — payment transaction
- `CalendarSlot` — consultation booking slot

### Key TypeScript Types (checks/types.ts)

- `CheckModule` — plugin interface for compliance checks
- `CheckContext` — shared context passed to checks (NPI data, site snapshot, provider roster)
- `CheckResult` — individual check outcome (status, score, detail, evidence, remediation)
- `ScanSession` — complete scan session with all results
- `NpiOrgRecord` — NPI organization data from NPPES/NLM
- `NpiProviderRecord` — Individual provider NPI data
- `SiteSnapshot` — Crawled website data (address, phone, specialties, providers)

---

## 10. Testing Strategy

### Test Frameworks

| Framework | Purpose | Config | Files |
|-----------|---------|--------|-------|
| **Vitest 4.x** | Unit tests for core business logic (no server required) | `vitest.config.ts` | `**/*.unit.test.ts` (7 files, 137 tests) |
| **Playwright** | E2E tests against running dev server | `playwright.config.ts` | `e2e/*.spec.ts` (6 files) |

### Unit Test Suites (Vitest)

| Suite | File | Tests | What It Tests |
|-------|------|-------|---------------|
| Utils | `checks/utils.unit.test.ts` | 43 | Address normalization & matching, phone normalization & matching, name normalization & fuzzy matching, specialty synonym resolution, Levenshtein distance |
| Registry | `checks/registry.unit.test.ts` | 15 | Tier-based check filtering (free/report/shield), category grouping, check ID lookup, category metadata |
| NPI Checks | `checks/npi-checks.unit.test.ts` | 18 | NPI-01 address verification (match, mismatch, secondary address, inconclusive), NPI-02 phone (match, format normalization), NPI-03 taxonomy (synonym matching) |
| Roster Checks | `checks/roster-checks.unit.test.ts` | 13 | RST-01 count variance thresholds (<=10% pass, 11-30% warn, >30% fail), RST-02 name matching (fuzzy match, evidence) |
| Crawler | `checks/crawler.unit.test.ts` | 12 | crawlSite with mocked fetch: phone from tel: links, address from JSON-LD, specialty keyword detection, provider names from schema.org, content hash generation |
| CDN Detection | `lib/cdn-detection.unit.test.ts` | 27 | IP CIDR matching (Cloudflare, CloudFront, Fastly, Vercel), HTTP header detection, US SaaS allowlist, US mail provider recognition |
| Report Codes | `lib/report-code.unit.test.ts` | 9 | HMAC-SHA256 code generation (format, determinism, uniqueness), NPI-to-code reverse lookup |

### E2E Test Suites (Playwright)

| Suite | File | Coverage | What It Tests |
|-------|------|----------|---------------|
| Static Content | `e2e/static-content.spec.ts` | All public pages | Text content, headings, copy accuracy |
| Page Structure | `e2e/page-structure.spec.ts` | All public pages | DOM structure, navigation, forms, semantic HTML |
| Broken Links | `e2e/broken-links.spec.ts` | All public pages | Internal and external link validity |
| Functionality | `e2e/functionality.spec.ts` | Interactive features | Form submissions, button clicks, navigation |
| Visual Regression | `e2e/visual-regression.spec.ts` | All public pages | Screenshot comparison against baselines |
| Dashboard Guide | `e2e/dashboard-guide.spec.ts` | Admin dashboard | Dashboard walkthrough flow |

### Browser Matrix (Playwright)

- Chromium (Desktop Chrome)
- Mobile Chrome (Pixel 5 viewport)

### CI Integration

Tests run on every push and PR via `.github/workflows/page-tests.yml`:
1. Builds the app with Supabase env vars from secrets
2. Runs all 5 test suites sequentially
3. Uploads Playwright report as artifact (14-day retention)
4. Uploads screenshot diffs on failure

### Coverage Hotspots

**Strong coverage**:
- Check engine core logic: utils, registry, NPI checks, roster checks, crawler (137 unit tests)
- CDN detection: IP ranges, headers, SaaS/mail provider allowlists
- Report code generation and lookup
- All public page content and structure (e2e)
- Visual regression across all pages (e2e, desktop + mobile)
- Broken link detection (e2e)
- Navigation flows (e2e)

**Weak / Missing coverage**:
- No unit tests for `checks/engine.ts` (scan orchestration) or `checks/fetchers.ts` (external API calls)
- No API route integration tests
- No Stripe webhook integration tests
- No email sending tests (SES mocked only in manual testing)
- No test coverage for admin dashboard functionality
- No test for CMS content rendering
- No load/performance testing

---

## 11. Known Gaps & TODOs

### Code Quality
- [ ] `scanReportService.ts` has hardcoded Supabase URL and anon key at the top of the file — should use env vars consistently
- [ ] Root-level standalone files (`RiskScanWidget.tsx`, `dashboard-page.tsx`, `page.tsx`, `scan-results-page.tsx`, `prospects-route.ts`) appear to be development copies — consider removing or documenting their purpose
- [x] ~~No unit tests for the check engine (`checks/`) — critical business logic lacks test coverage~~ → Added 137 Vitest unit tests covering utils, registry, NPI checks, roster checks, crawler, CDN detection, and report codes
- [x] ~~`lib/report-code.ts` used non-null assertion (`!`) for `REPORT_CODE_SECRET` env var — would crash at runtime if env var was missing~~ → Fixed to use empty-string fallback
- [ ] No unit tests for `checks/engine.ts` (scan orchestration) or `checks/fetchers.ts` (external API calls)
- [ ] No API integration tests for any route handlers

### Security
- [ ] Stripe webhook does not verify `Stripe-Signature` header — relies on JSON parsing only
- [ ] Admin authentication uses a simple password check (no session/JWT management visible)
- [ ] `scanReportService.ts` contains a hardcoded Supabase anon key
- [ ] RLS policies on some tables allow `anon` full access (`FOR ALL TO anon USING (true)`)

### Architecture
- [ ] Data Residency checks (DR-01..04), AI Transparency checks (AI-01..04), and Clinical Integrity checks (ER-01..04) exist in the scan API route but not yet migrated to the Check Engine v2 plugin architecture
- [ ] Two separate crawler implementations (`lib/crawler.ts` and `checks/crawler.ts`) with overlapping functionality
- [ ] No scheduled/cron jobs for automated re-scanning or drift monitoring
- [ ] No rate limiting on public API endpoints

### Documentation
- [ ] No API documentation (OpenAPI/Swagger)
- [ ] No inline TSDoc on many exported functions

---

## 12. Doc Sync

Updated from commit `1f20e40` on 2026-03-03.

### Changelog

| Date | Commit | Changes |
|------|--------|---------|
| 2026-02-26 | `3589740` | Initial CODE_EXPLAIN.md |
| 2026-03-03 | `1f20e40` | Added Vitest unit test suite (137 tests across 7 files), `vitest.config.ts`, `test:unit` / `test:unit:watch` scripts; fixed `lib/report-code.ts` non-null assertion crash |
