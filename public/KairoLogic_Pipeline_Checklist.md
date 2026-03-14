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
- [x] #10 — Backfill city on practice_websites from providers table
- [ ] #10a — Add address density filter to co-location script (skip addresses with 50+ practices — medical buildings, not single practices)
- [x] #10b — Add provider_count < 50 cap to export query (filters medical building false positives)

## 2. CA Expansion

- [x] #11 — Load CA PECOS (258K records)
- [x] #12 — Load CA .accdb into provider_licenses (310K licenses, 12,606 disciplinary, zero errors)
- [ ] #13 — Run CA scan (15,313 of 22K scanned, delta detection crashed on 502 at site 368 — needs re-run)
- [ ] #14 — Run NPI resolver for CA licenses (53.7% rate on first CA-only batch, continuing)
- [x] #15 — Run CA reassignment bridge (33K attempted, all duplicates of co-location — validates data quality)
- [ ] #16 — Resume CA Serper URL finder (22K found, ~27K remaining, need Serper credits). Fix: ~10K URLs silently rejected by url_unique constraint (multiple providers share same URL, e.g. Kaiser, UCLA Health). Script needs to link rejected providers to existing practice_websites row via practice_providers instead of dropping them.
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
- [x] #32 — Fix scan-and-delta.yml: add --state flag, bump limit 50→500, fix script path
- [x] #33 — Fix tmb-newsroom-monitor.yml: ts-node → tsx
- [ ] #34 — Remove misplaced yml files from scripts/ folder

## 6. Pipeline Health Admin Dashboard

Internal admin page (`app/admin/pipeline/page.tsx`) for monitoring data pipeline health and quality.

### Data Freshness Monitoring
- [ ] #35 — Last sync timestamp per pipeline (NPPES, PECOS, TMB, CA MB, scan+delta)
- [ ] #36 — Days since last successful run, color-coded (green < 7d, yellow 7-14d, red > 14d)
- [ ] #37 — GitHub Actions cron status (pass/fail/skipped) via GitHub API

### Row Count Trends
- [ ] #38 — Current counts per table with week-over-week delta (providers, provider_pecos, provider_licenses, practice_websites, practice_providers, nppes_delta_events)
- [ ] #39 — NPI resolution progress bar (resolved vs unresolved by state)
- [ ] #40 — Scan coverage: scanned vs unscanned sites by state

### Data Quality Flags
- [ ] #41 — practice_websites with null city
- [ ] #42 — practice_websites pointing to directory/aggregator URLs (blocked domain matches)
- [ ] #43 — provider_licenses with null NPI by status breakdown (active vs deceased/cancelled)
- [ ] #44 — practice_providers with FK orphans
- [ ] #45 — Duplicate license numbers across states
- [ ] #46 — Scan failure rate by error type (timeout, URI malformed, blocked, empty content)

### Targeting Readiness
- [ ] #47 — Tier distribution by state (Tier 1/2/3/4 counts)
- [ ] #48 — Disciplinary overlap counts (practices with flagged providers by state)
- [ ] #49 — mismatch_count freshness (last SQL update timestamp)
- [ ] #50 — Outreach-ready count: practices with complete data (city + URL + providers + mismatches)

## 7. Payer Directory Monitoring (National — Detect Only)

Cross-reference provider data against major payer directories to surface mismatches. Phase 1 is detect-only: show the practice where their data is out of sync with payers. No auto-fix, no API integrations. National scope from day one.

### Data Sources to Monitor
- [ ] #51 — CAQH ProView public provider search (name + NPI → listed address, phone, specialty)
- [ ] #52 — UnitedHealthcare provider finder scraper (uhc.com/find-a-doctor)
- [ ] #53 — Blue Cross Blue Shield provider directory (varies by state plan, start with BCBS TX + BCBS CA)
- [ ] #54 — Aetna provider search (aetna.com/dsepublicContent)
- [ ] #55 — Cigna provider directory (cigna.com/find-a-doctor)
- [ ] #56 — Humana provider search (humana.com/find-a-doctor)

### Infrastructure
- [ ] #57 — `payer_directory_snapshots` table (npi, payer, address, phone, specialty, listed_name, snapshot_date)
- [ ] #58 — Payer directory scraper framework (rate-limited, per-payer adapter pattern)
- [ ] #59 — Cross-source mismatch engine: compare NPPES vs website vs payer directory per provider
- [ ] #60 — Dashboard view: "Your data across sources" — side-by-side comparison grid per provider

### Mismatch Types to Detect
- [ ] #61 — Address mismatch (NPPES says X, Aetna says Y, website says Z)
- [ ] #62 — Phone mismatch across sources
- [ ] #63 — Provider not listed in payer directory (credentialing gap or dropped network)
- [ ] #64 — Provider listed at wrong practice location in payer directory
- [ ] #65 — Specialty mismatch between payer listing and board certification

### Phase 1 Deliverable
- [ ] #66 — Practice Intelligence Dashboard panel: "Payer Directory Sync Status" — shows per-provider, per-payer match/mismatch with source links
- [ ] #67 — Alert email: "3 of your providers have address mismatches in UHC and Aetna directories"

## 8. GTM Prep (after dashboard works)

- [ ] #68 — Research calls with practice managers ($25 Starbucks incentive)
- [ ] #69 — Pricing page (Monitor $29/mo, Protect $79/mo, Command $149/mo)
- [ ] #70 — Founders' rate landing page ($99/mo flat, first 10 customers)
- [ ] #71 — One-page ROI calculator
- [ ] #72 — Personalized preview email templates
- [ ] #73 — Round 1 outreach to top 50 targets

## 9. Entity Resolution Engine (Core Infrastructure)

Multi-attribute matching engine for resolving healthcare entities across data sources. Needed for: URL discovery, payer directory matching, ongoing NPPES/PECOS/state board ingestion, and cross-source mismatch detection. Target: 95%+ match rate.

### The Problem
NPPES legal names ("BEVERLY HILLS DERMATOLOGY GROUP INC") don't match public-facing names ("Dermatology Associates Medical Group" at derm90210.com). Single-attribute search (name only) fails 30-40% of the time. Same problem exists across every data source.

### Multi-Signal Matching Approach
- [ ] #74 — Address matching: normalize + geocode NPPES address, compare to Google Places / payer directory address (strongest signal)
- [ ] #75 — Phone matching: NPPES phone → Google Business listing reverse lookup
- [ ] #76 — Name fuzzy matching: strip legal suffixes (MD, PA, Inc, LLC, PLLC, Corp), Jaro-Winkler on core name tokens
- [ ] #77 — NPI direct lookup: some directories index by NPI (CAQH, some payer finders)
- [ ] #78 — Specialty + ZIP radius: "dermatologist 90210" catches what name search misses
- [ ] #79 — Website content verification: confirm matched URL contains provider name or NPI on the page

### Confidence Scoring
- [ ] #80 — Weighted scoring: address match (40%) + phone match (25%) + name similarity (20%) + specialty match (15%)
- [ ] #81 — Auto-accept threshold: combined score >= 0.90 → link automatically
- [ ] #82 — Review queue: score 0.70-0.89 → flag for manual verification
- [ ] #83 — Reject threshold: score < 0.70 → skip, log for future retry with new data

### Infrastructure
- [ ] #84 — `entity_resolution_log` table: tracks every match attempt with scores per signal, enables tuning
- [ ] #85 — Reusable resolver module (`lib/entity/entity-resolver.ts`): shared across URL finder, payer directory scraper, NPI resolver, and any future data source
- [ ] #86 — Batch mode: process 10K+ entities per run with rate limiting and progress tracking
- [ ] #87 — Incremental mode: resolve new/changed entities on each weekly sync cycle

### Impact
- Fixes the ~10K silently rejected CA URLs from Serper (27K providers still without URLs)
- Enables payer directory matching (Category 4 signals) without manual mapping
- Improves NPI resolver v2 (direct name+address match for 55K unresolved TX licenses)
- Foundation for every new data source integration going forward

## 10. Product Backlog (future)

- [ ] NPI resolver v2: uses Entity Resolution Engine (section 9) for direct name+address matching against 1.8M NPPES providers table
- [ ] CAQH ProView auto-push: auto-submit corrections from KairoLogic findings into ProView (Command tier, requires CAQH API partnership)
- [ ] Payer directory auto-correction: push address/phone updates to payer portals (Command tier)
- [ ] Check engine expansion (new compliance checks)
- [ ] Semi-automated LinkedIn engagement pipeline
- [ ] Fix CDN anycast geo-lookup false positives (Cloudflare/Fastly IPs misidentified as foreign)
- [ ] Refactor admin dashboard `handleDownloadReport` to shared `generateAuditPDF.ts`
- [ ] Dynamic state-specific scoring profiles (multi-state support)
- [ ] Landing page: show findings regardless of `is_paid` (show "already purchased" info banner instead of blocking)
- [ ] Enforcement & Regulatory Monitor (automated daily monitoring of TX enforcement actions, regulatory guidance)
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

## Practice Intelligence Dashboard — Signal Inventory

Every finding surfaced in the dashboard, organized by category. No scores — just facts with source links. The practice manager sees what's wrong, where, and gets tools to fix it.

### Category 1: NPPES Data Mismatches
| Signal | Description |
|---|---|
| Address mismatch | Practice address on website doesn't match NPPES address of record |
| Phone mismatch | Phone on website doesn't match NPPES phone |
| Provider moved | Provider listed on website but NPPES shows different address (provider relocated) |
| Departed provider | Provider no longer at NPPES address but still displayed on website |
| Name mismatch | Organization name on website doesn't match NPPES registered name |
| Specialty mismatch | Specialty shown on website doesn't match NPPES taxonomy code |

### Category 2: License & Credentialing Alerts
| Signal | Description |
|---|---|
| Disciplinary action | Provider on website has active disciplinary action (TMB or CA MB) |
| Suspended license | Provider on website has a suspended license — cannot practice |
| Revoked license | Provider on website has a revoked license |
| Deceased provider | Provider on website is deceased per state board records |
| Cancelled license | Provider on website has cancelled license (non-payment or voluntary) |
| Delinquent license | Provider license renewal is overdue — no practice permitted |
| Malpractice judgment | Provider on website has malpractice judgment on record |
| Felony conviction | Provider on website has felony conviction on record |
| Voluntary surrender | Provider surrendered license to resolve disciplinary action |
| License expiring | Provider license expiring within 90 days (proactive alert) |

### Category 3: PECOS / Medicare Enrollment Gaps
| Signal | Description |
|---|---|
| Not in PECOS | Provider listed on website but has no Medicare enrollment |
| PECOS address mismatch | PECOS enrollment shows different practice address than website |
| Reassignment mismatch | Provider PECOS reassignment doesn't match the practice they're listed under |
| Enrollment expired | Provider PECOS enrollment expired or terminated |

### Category 4: Payer Directory Mismatches (detect only, manual fix)
| Signal | Description |
|---|---|
| Address mismatch | Payer directory address doesn't match NPPES or website (per payer: UHC, BCBS, Aetna, Cigna, Humana) |
| Phone mismatch | Phone number differs across payer directories |
| Not listed | Provider not found in payer directory (possible network drop or credentialing gap) |
| Wrong location | Provider listed at wrong practice location in payer directory |
| Specialty mismatch | Payer listing specialty doesn't match board certification |

### Category 5: Regulatory Compliance (Website Findings)

*Texas — SB 1188 (Data Sovereignty)*
| Signal | Description |
|---|---|
| Foreign data routing | Website routing data to servers outside the US |
| Foreign-hosted forms | Patient-facing forms hosted on foreign infrastructure |
| Third-party trackers | Trackers sending patient-adjacent data overseas |
| Missing privacy policy | No privacy policy or doesn't address data residency |
| Missing cookie consent | Cookie consent mechanism absent or insufficient |

*Texas — HB 149 (AI Transparency)*
| Signal | Description |
|---|---|
| Undisclosed AI content | AI-generated content on website without disclosure |
| Undisclosed AI chatbot | Chatbot or symptom checker without AI disclosure |
| Undisclosed AI tools | AI-powered scheduling or triage without transparency notice |
| Missing AI policy | No AI usage policy page |

*California — AB 3030 (AI Transparency)*
| Signal | Description |
|---|---|
| Undisclosed AI tools | Patient-facing AI tools without required CA notifications |
| Missing AI disclosure | Required AI disclosure absent per AB 3030 |

*Clinical Integrity (all states)*
| Signal | Description |
|---|---|
| Outdated credentials | Provider credentials displayed on website don't match current board records |
| Misleading specialty | Specialty claims on website don't match board certification |
| Missing disclosures | Required practice disclosures absent |
| Certification mismatch | Board certification claims don't match actual board records |

### Category 6: NPPES Correction Actions
| Signal | Description |
|---|---|
| Address update needed | Pre-filled NPPES update form with corrected address |
| Phone update needed | Pre-filled NPPES update form with corrected phone |
| Taxonomy update needed | Pre-filled NPPES update form with corrected specialty code |
| Authorized official update | Pre-filled form for authorized official changes |
| PDF ready for submission | Generated PDF for mailing to NPPES if electronic update unavailable |

### Signal Count Summary
| Category | Signals | Data Source |
|---|---|---|
| NPPES Mismatches | 6 | NPPES weekly sync + website scan |
| License & Credentialing | 10 | TMB, CA MB, state board data |
| PECOS / Medicare | 4 | CMS PECOS monthly sync |
| Payer Directories | 5 | Payer directory scrapers (per payer) |
| Regulatory Compliance | 11 | Website scan engine |
| NPPES Corrections | 5 | Generated from mismatch findings |
| **Total** | **41** | |

---

## Key Files

| File | Purpose |
|---|---|
| `scripts/scan-500-practices.ts` | Batch scan + delta detection + export |
| `scripts/run-scan-and-delta.ts` | Scan + delta runner (used by cron) |
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
| `nppes-weekly-sync.yml` | Monday 6am UTC | Needs verification |
| `pecos-monthly-sync.yml` | 1st of month 7am UTC | Needs verification |
| `tmb-monthly-sync.yml` | Manual trigger | — |
| `ca-mb-resolution-sync.yml` | 2nd Tuesday 8am UTC | Needs verification |
| `scan-and-delta.yml` | Wednesday 5am UTC | Fixed (state filter + limit bump) |
| `nppes-confirmation-poll.yml` | Daily 10am UTC | Needs verification |
| `tmb-newsroom-monitor.yml` | Wednesday 4am UTC | Fixed (ts-node → tsx) |
| `trial-lifecycle.yml` | Daily 11am UTC | Needs verification |
