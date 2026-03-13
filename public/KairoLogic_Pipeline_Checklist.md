# KairoLogic Pipeline Checklist
**Last updated:** March 13, 2026

---

## Pipeline Status

| Table | TX | CA | Total |
|---|---|---|---|
| providers | — | — | 1.8M |
| provider_pecos | 203K | 258K | 461K |
| provider_licenses | 192K | 310K | 502K |
| practice_websites | 25K | 22K | 47K |
| practice_providers | 38K | 63K | 101K |
| nppes_delta_events | 9,740 | — | 9,740 |
| NPI resolutions | 59.5K | pending | 59.5K |
| disciplinary practices (TX) | 1,258 | pending | 1,258 |

---

## 1. Immediate — Finish Data Pipeline

- [x] #1 — Fix CA URL finder (Serper Places API ran for TX + partial CA)
- [ ] #2 — NPI resolver batches: TX at 59.5K resolved, ~55K active unresolved (PECOS ceiling hit). CA resolver running.
- [ ] #3 — Push updated files to GitHub (cron jobs failing without local scripts synced)
- [x] #4 — Fix `mismatch_count` on practice_websites (SQL update needed after each scan)
- [ ] #5 — Embed mismatch_count + provider_count SQL update into scan-500-practices.ts (auto-update after each run)
- [x] #6 — Fix Tier 3 = 0 bug in export logic (Tier 2 and Tier 3 had identical conditions)
- [x] #7 — Fix export state filter (was pulling all states, now filters by --state flag)
- [ ] #8 — Name quality filter integration into scan-scheduler
- [ ] #9 — Clean remaining junk URLs (radaris, yahoo, directory/aggregator URLs)
- [ ] #10 — Backfill city on practice_websites from providers table

## 2. CA Expansion

- [x] #11 — Load CA PECOS (258K records)
- [x] #12 — Load CA .accdb into provider_licenses (310K licenses, 12,606 disciplinary, zero errors)
- [ ] #13 — Run CA scan (5,000 batch in progress)
- [ ] #14 — Run NPI resolver for CA licenses
- [ ] #15 — Run CA reassignment bridge (first attempt only hit 606 sites, needs re-run with 22K URLs)
- [ ] #16 — Resume CA Serper URL finder (22K found, ~27K remaining, need Serper credits)
- [ ] #17 — Run CA mismatch_count + provider_count SQL update after scan completes
- [ ] #18 — Export CA target list with tier classification

## 3. TX Completion

- [ ] #19 — Continue NPI resolver until daily resolved count drops to ~0
- [ ] #20 — Re-run scan+delta with full provider associations (101K practice_providers)
- [ ] #21 — Export final TX target list (1,258 disciplinary practices identified)
- [ ] #22 — Validate Tier 0 targets: practices listing deceased/cancelled/suspended providers

## 4. Dashboard — Practice Intelligence Dashboard

- [ ] #23 — Build Practice Intelligence Dashboard (`app/practice/[id]/page.tsx`)
- [ ] #24 — Preview URL system + claim flow
- [ ] #25 — Multi-signal outreach scoring (NPPES mismatches + disciplinary + license status)
- [ ] #26 — Export target list with deduped domain grouping
- [ ] #27 — NPPES form pre-fill + PDF generation testing

## 5. Infrastructure

- [ ] #28 — Push all local scripts to GitHub (critical for cron jobs)
- [ ] #29 — Enable RLS on all tables + create user policies
- [ ] #30 — Fix DMARC: delete older Feb 5 duplicate `_dmarc` TXT record on kairologic.net
- [ ] #31 — Verify GitHub Actions cron jobs pass after file push

## 6. GTM Prep (after dashboard works)

- [ ] #32 — Research calls with practice managers ($25 Starbucks incentive)
- [ ] #33 — Pricing page (Monitor $29/mo, Protect $79/mo, Command $149/mo)
- [ ] #34 — Founders' rate landing page ($99/mo flat, first 10 customers)
- [ ] #35 — One-page ROI calculator
- [ ] #36 — Personalized preview email templates
- [ ] #37 — Round 1 outreach to top 50 targets

## 7. Product Backlog (future)

- [ ] NPI resolver v2: direct name+address matching against 1.8M NPPES providers table (resolves ~55K active TX licenses that PECOS bridge misses)
- [ ] Check engine expansion (new compliance checks)
- [ ] Semi-automated LinkedIn engagement pipeline
- [ ] Fix CDN anycast geo-lookup false positives (Cloudflare/Fastly IPs misidentified as foreign)
- [ ] Refactor admin dashboard `handleDownloadReport` to shared `generateAuditPDF.ts`
- [ ] Dynamic state-specific scoring profiles (multi-state support)
- [ ] Landing page: show findings regardless of `is_paid` (show "already purchased" info banner instead of blocking)
- [ ] Enforcement & Regulatory Monitor (automated daily monitoring of TX enforcement actions, regulatory guidance)
- [ ] Insurance directory monitoring (detect-only for launch)
- [ ] CAQH ProView auto-push (premium tier)
- [ ] Graduated departure logic (3-tier confidence decay replacing binary DEPARTED flag)

---

## Targeting Data Summary

### TX Tier 0 — Highest Value Targets
- 1,258 practices with disciplinary-flagged providers on their website
- 16 practices listing deceased providers
- 69 practices listing cancelled-license providers
- 1,093 practices with active-but-disciplined providers

### Tier Classification (scan-500-practices.ts)
| Tier | Criteria |
|---|---|
| Tier 1 — High signal | 2+ mismatches AND 6+ providers |
| Tier 2 — Movement signal | 2+ mismatches AND 4+ providers |
| Tier 3 — Single mismatch | 1+ mismatch AND 4+ providers |
| Tier 4 — Low signal | Everything else |

### Outreach Hook
> "We scanned 25,000 Texas practices. The average 8-provider group has 60 data discrepancies across NPPES, PECOS, and license records right now. Most practice managers don't find these until a claim is denied. We surface them on day one, help you fix them, then monitor so they never pile up again. $79/month."

---

## Key Files

| File | Purpose |
|---|---|
| `scripts/scan-500-practices.ts` | Batch scan + delta detection + export |
| `scripts/load-ca-medical-board.py` | CA .accdb loader → provider_licenses |
| `scripts/populate-practice-providers.ts` | Address co-location matching |
| `scripts/load-pecos-reassignment.py` | PECOS reassignment bridge |
| `scripts/ca-mb-monthly-sync.ts` | NPI resolver + CA MB sync |
| `scripts/find-provider-urls.py` | Serper Places API URL finder |
| `lib/nppes/npi-resolver.ts` | NPI resolution engine |
| `lib/nppes/pecos-client.ts` | CMS PECOS API client |
| `lib/scanner/scan-scheduler.ts` | Scan orchestrator |
| `lib/scanner/delta-engine.ts` | NPPES delta detection |
| `lib/scanner/name-quality-filter.ts` | Pre-scan name validation |
| `lib/scanner/domain-blocklist.ts` | Directory/aggregator URL filter |

---

## GitHub Actions Workflows

| Workflow | Schedule | Status |
|---|---|---|
| `nppes-weekly-sync.yml` | Monday 6am UTC | Failing (files not pushed) |
| `pecos-monthly-sync.yml` | 1st of month 7am UTC | Failing |
| `tmb-monthly-sync.yml` | Manual trigger | — |
| `ca-mb-resolution-sync.yml` | 2nd Tuesday 8am UTC | Failing |
| `scan-and-delta.yml` | Wednesday 5am UTC | Failing |
| `nppes-auto-confirmation.yml` | Daily 10am UTC | Failing |
| `tmb-newsroom-monitor.yml` | Wednesday 4am UTC | Failing |
