# KairoLogic Pipeline Checklist

**Last updated:** March 27, 2026 (Payer acceptance verification signal added, Aetna FHIR confirmed, Phase 3 complete)

---

## Pipeline Status

| Table                   | TX    | CA     | Total   |
| ----------------------- | ----- | ------ | ------- |
| providers               | —     | —      | 1.8M    |
| provider_pecos          | 203K  | 258K   | 461K    |
| provider_licenses       | 192K  | 310K   | 502K    |
| practice_websites       | 29.9K | 27.6K  | 57.5K   |
| practice_providers      | 91K   | 118K   | 209K    |
| nppes_delta_events      | 9,740 | 1,836+ | 11,576+ |
| NPI resolutions         | 59.7K | 47.9K  | 107.6K  |
| Practices w/ mismatches | 3,665 | 3,334  | 6,999   |
| Tier 1 targets          | 1,010 | 1,146  | 2,156   |

### Dashboard Tables (seeded Mar 15-18, 2026)

| Table              | Rows   | Status                                  |
| ------------------ | ------ | --------------------------------------- |
| workflow_instances | 14,763 | 14,762 NPPES Update + 1 License Renewal |
| workflow_tasks     | 88,576 | 88,572 NPPES (6/wf) + 4 License Renewal |
| alerts             | 14,763 | 1 per workflow                          |
| workflow_events    | 14,763 | Audit trail seeded                      |
| practice_users     | 1      | admin@kairologic.net → North Texas Med  |
| user_alert_reads   | 23+    | Auto-populated on alerts page visit     |
| workflow_artifacts | 0      | Ready (generated on approve)            |
| preview_tokens     | 1+     | demo-north-texas-med token created      |

---

## Priority Roadmap

### Day 1 — MVP Dashboard + First 10 Founders Rate Customers

Everything needed to demo the Practice Intelligence Dashboard to a practice manager and close $99/mo founders rate deals.

| Priority                         | Task #        | Description                                                                                                       |
| -------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Workflow Engine Core**         |               |                                                                                                                   |
| ~~P0~~                           | ~~#23~~       | ~~`workflow_instances` table~~ ✅ Created + seeded (14,763: 14,762 NPPES + 1 License)                             |
| ~~P0~~                           | ~~#24~~       | ~~`workflow_tasks` table~~ ✅ Created + seeded (88,572)                                                           |
| ~~P0~~                           | ~~#26~~       | ~~`provider_roster` status on practice_providers~~ ✅ roster_status column added                                  |
| ~~P0~~                           | ~~#27~~       | ~~Practice home: active workflow cards grouped by status~~ ✅ Phase 3B deployed                                   |
| ~~P0~~                           | ~~#28~~       | ~~Workflow detail page: task checklist + embedded artifacts~~ ✅ Phase 3D deployed                                |
| ~~P0~~                           | ~~#29~~       | ~~Provider roster view with status badges~~ ✅ Phase 3E deployed                                                  |
| **Workflow 1: NPPES Update**     |               |                                                                                                                   |
| ~~P0~~                           | ~~#31~~       | ~~Trigger: delta engine → auto-create workflow~~ ✅ seed-workflows-from-deltas.sql + trigger-workflows.ts         |
| ~~P0~~                           | ~~#32~~       | ~~Task: review finding (side-by-side comparison)~~ ✅ FindingReview component deployed                            |
| ~~P0~~                           | ~~#33~~       | ~~Task: approve correction~~ ✅ ApproveCorrection component deployed                                              |
| ~~P0~~                           | ~~#34~~       | ~~Artifact: pre-filled NPPES update form (PDF)~~ ✅ Deployed (no misplaced yml in scripts/)                       |
| **Workflow 5: License Renewal**  |               |                                                                                                                   |
| ~~P0~~                           | ~~#63~~       | ~~Trigger: license expiring within 90 days~~ ✅ Seeded (Dr. Paek, expires May 31)                                 |
| ~~P0~~                           | ~~#64~~       | ~~Alert: notify practice manager~~ ✅ Alert seeded                                                                |
| **Payer Directory (demo-ready)** |               |                                                                                                                   |
| ~~P0~~                           | ~~#42~~       | ~~Fix fhir-client.ts specialty extraction + Humana timeout~~ ✅ Already implemented in fhir-client.ts             |
| P0                               | #42a          | First real write test (drop --dry-run) — **blocked on HCSC/BCBS CA API keys**                                     |
| ~~P0~~                           | ~~#44~~       | ~~Dashboard panel: side-by-side grid per provider per payer~~ ✅ PayerMismatchReview component deployed (Batch 2) |
| **GTM**                          |               |                                                                                                                   |
| ~~P0~~                           | ~~#77~~       | ~~Preview URL system + claim flow~~ ✅ Phase 3G deployed                                                          |
| P0                               | #80           | Customer discovery calls (Respondent.io, $100/20 min)                                                             |
| P0                               | #82           | Founders rate landing page ($99/mo flat)                                                                          |
| P0                               | #84           | Personalized preview email templates                                                                              |
| P0                               | #85           | Round 1 outreach to top 50 targets                                                                                |
| **Infrastructure**               |               |                                                                                                                   |
| P0                               | #3            | Push all files to GitHub                                                                                          |
| ~~P0~~                           | ~~#29-infra~~ | ~~Enable RLS on all tables~~ ✅ Enabled on all 8 new tables                                                       |
| P0                               | #30           | Fix DMARC (email deliverability)                                                                                  |
| P0                               | #35b          | Add SERPER_API_KEY as GitHub secret                                                                               |
| **Auth + Access Flow**           |               |                                                                                                                   |
| ~~P0~~                           | #100          | ~~Auth helpers (server + client split)~~ ✅ Deployed                                                              |
| ~~P0~~                           | #101          | ~~Middleware (route protection)~~ ✅ Deployed                                                                     |
| ~~P0~~                           | #102          | ~~Login page (email/password + reset)~~ ✅ Deployed                                                               |
| ~~P0~~                           | #103          | ~~Set password page (post-verification)~~ ✅ Deployed                                                             |
| ~~P0~~                           | #104          | ~~Auth callback handler~~ ✅ Deployed                                                                             |
| ~~P0~~                           | #105          | ~~Claim API (preview → email → magic link)~~ ✅ Deployed                                                          |
| ~~P0~~                           | #106          | ~~Finalize claim API (link user to practice)~~ ✅ Deployed                                                        |
| ~~P0~~                           | #107          | ~~Team invite API~~ ✅ Deployed                                                                                   |
| P0                               | #108          | Connect Resend SMTP in Supabase                                                                                   |
| P0                               | #109          | Set Site URL + Redirect URLs in Supabase Auth config                                                              |

### Day 2 — Scale to 50 Customers + Full Workflow Coverage

Polish, add remaining workflows, automate everything.

| Priority                   | Task #        | Description                                                                                                                                                           |
| -------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Remaining Workflows**    |               |                                                                                                                                                                       |
| ~~P1~~                     | ~~#39-47~~    | ~~Workflow 2: Payer Directory Update (batch mode, correction packets)~~ ✅ PayerMismatchReview + task templates + batch sync deployed                                 |
| ~~P1~~                     | ~~#48-54~~    | ~~Workflow 3: Provider Onboarding (full credentialing checklist)~~ ✅ CredentialingChecklist + 6-task template deployed                                               |
| ~~P1~~                     | ~~#55-62~~    | ~~Workflow 4: Provider Release (departure tracking)~~ ✅ DepartureChecklist + 5-task template + 90-day monitor deployed                                               |
| ~~P1~~                     | ~~#68-73~~    | ~~Workflow 6: Compliance Remediation (SB 1188, HB 149, AB 3030)~~ ✅ ComplianceFinding + statute info + 3-task template deployed                                      |
| P1                         | #110-114      | Payer acceptance verification: website claims vs actual FHIR directory presence                                                                                       |
| **Workflow Engine Polish** |               |                                                                                                                                                                       |
| ~~P1~~                     | ~~#25~~       | ~~`workflow_events` audit trail~~ ✅ Audit logger deployed (Batch 1)                                                                                                  |
| ~~P1~~                     | ~~#30-notif~~ | ~~Email notifications (task created, overdue, confirmed)~~ ✅ 6 HTML email templates via Resend (Batch 1)                                                             |
| ~~P1~~                     | ~~#74~~       | ~~Shared workflow state machine~~ ✅ lib/workflow/state-machine.ts deployed (Batch 1)                                                                                 |
| ~~P1~~                     | ~~#75~~       | ~~Confirmation engine (auto-close confirmed tasks)~~ ✅ NPPES monitor cron deployed (Batch 1)                                                                         |
| ~~P1~~                     | ~~#76~~       | ~~Email notification system~~ ✅ lib/workflow/email-notifications.ts deployed (Batch 1)                                                                               |
| **Resilience**             |               |                                                                                                                                                                       |
| P1                         | #79a-c        | Data gap handling (partial progression, missing field tolerance, gap backfill)                                                                                        |
| ~~P1~~                     | ~~#79d-f~~    | ~~Source outage handling (retry queue, staleness indicator, degraded mode)~~ ✅ retryWithBackoff + CircuitBreaker + withTimeout deployed (Batch 3)                    |
| ~~P1~~                     | ~~#79g-i~~    | ~~Conflict resolution (multi-source surfacing, audit, priority defaults)~~ ✅ conflict-resolver.ts with SOURCE_PRIORITY + auto-resolve deployed (Batch 3)             |
| ~~P1~~                     | ~~#79j-l~~    | ~~Stale workflow management (escalation tiers, health score, bulk cleanup)~~ ✅ stale-workflow-manager.ts with 4 escalation tiers + health scoring deployed (Batch 3) |
| **Data Quality**           |               |                                                                                                                                                                       |
| ~~P1~~                     | ~~#5~~        | ~~Embed mismatch_count SQL into scan script (auto-update)~~ ✅ run-scan-and-delta Phase 3 wired to RPC (Batch 3)                                                      |
| ~~P1~~                     | ~~#8~~        | ~~Name quality filter in scan-scheduler~~ ✅ Already imported and used in scan-scheduler.ts line 22                                                                   |
| ~~P1~~                     | ~~#9~~        | ~~Clean remaining junk URLs~~ ✅ SKIP_DOMAINS expanded to ~70+ entries (Batch 3)                                                                                      |
| ~~P1~~                     | ~~#10a~~      | ~~Address density filter for co-location (medical building fix)~~ ✅ address-density-filter.ts deployed (Batch 3)                                                     |
| ~~P1~~                     | ~~#16~~       | ~~Fix URL finder silent rejections (link to existing practice_websites)~~ ✅ Rejection logging + verbose mode added (Batch 3)                                         |
| **GTM**                    |               |                                                                                                                                                                       |
| ~~P1~~                     | ~~#78~~       | ~~Multi-signal outreach scoring~~ ✅ scoring-engine.ts with 5 signals + tier assignment deployed (Batch 3)                                                            |
| ~~P1~~                     | ~~#79~~       | ~~Export with deduped domain grouping~~ ✅ toCSVRows() in scoring-engine.ts (Batch 3)                                                                                 |
| ~~P1~~                     | ~~#81~~       | ~~Pricing page (Monitor/Protect/Command tiers)~~ ✅ Deployed (Batch 1)                                                                                                |
| ~~P1~~                     | ~~#83~~       | ~~One-page ROI calculator~~ ✅ Deployed (Batch 1)                                                                                                                     |
| **Infrastructure**         |               |                                                                                                                                                                       |
| ~~P1~~                     | ~~#31~~       | ~~Verify all GitHub Actions cron jobs pass~~ ✅ All 10 workflows verified — valid cron schedules + script refs                                                        |
| ~~P1~~                     | ~~#34~~       | ~~Remove misplaced yml files from scripts/~~ ✅ Already clean — no yml files in scripts/                                                                              |
| ~~P1~~                     | ~~#42b~~      | ~~Debug PractitionerRole → Location for payer address extraction~~ ✅ Already implemented in fhir-client.ts lines 144-177 with \_include fallback + direct read       |
| P1                         | #42c          | HCSC custom header + name-based search fallback — **blocked on client_id from HCSC**                                                                                  |
| ~~P1~~                     | ~~#45~~       | ~~Payer directory batch mode (all providers × all payers)~~ ✅ sync-payer-batch.ts deployed (Batch 3)                                                                 |

### Later — National Expansion + Premium Features

Entity resolution, new states, automation tier.

| Priority              | Task #  | Description                                                                                 |
| --------------------- | ------- | ------------------------------------------------------------------------------------------- |
| **Entity Resolution** |         |                                                                                             |
| P2                    | #86-99  | Full Entity Resolution Engine (multi-signal matching, confidence scoring, reusable module)  |
| **Pipeline Health**   |         |                                                                                             |
| P2                    | #35-50  | Pipeline Health Admin Dashboard (freshness, row counts, quality flags, targeting readiness) |
| **Premium Features**  |         |                                                                                             |
| P2                    | backlog | CAQH ProView auto-push (Command tier)                                                       |
| P2                    | backlog | Payer directory auto-correction via FHIR write APIs                                         |
| P2                    | backlog | Enforcement & Regulatory Monitor                                                            |
| P2                    | backlog | NPI resolver v2 (Entity Resolution Engine)                                                  |
| **Expansion**         |         |                                                                                             |
| P2                    | backlog | Additional state medical board loaders (FL, NY, IL)                                         |
| P2                    | backlog | HCSC (BCBS TX) + Blue Shield CA API access                                                  |
| P2                    | backlog | Semi-automated LinkedIn engagement pipeline                                                 |
| P2                    | backlog | Check engine expansion                                                                      |

---

## 1. Immediate — Finish Data Pipeline

- [x] #1 — Fix CA URL finder (Serper Places API ran for TX + partial CA)
- [x] #2 — NPI resolver batches: TX at 59.7K (PECOS ceiling), CA at 47.9K (66.9% rate, still running)
- [ ] #3 — Push updated files to GitHub (in progress — local/remote out of sync, need git pull first)
- [x] #4 — Fix `mismatch_count` on practice_websites (SQL update needed after each scan)
- [x] #5 — Embed mismatch_count + provider_count SQL update into scan-500-practices.ts ✅ run-scan-and-delta Phase 3 calls update_provider_counts + update_mismatch_counts RPC
- [x] #6 — Fix Tier 3 = 0 bug in export logic (Tier 2 and Tier 3 had identical conditions)
- [x] #7 — Fix export state filter (was pulling all states, now filters by --state flag)
- [x] #8 — Name quality filter integration into scan-scheduler ✅ Already imported and used in scan-scheduler.ts line 22
- [x] #9 — Clean remaining junk URLs (radaris, yahoo, directory/aggregator URLs) ✅ SKIP_DOMAINS expanded to ~70+ entries in find-provider-urls-v2.py
- [x] #10 — Backfill city on practice_websites from providers table (TX: 571 null remaining, CA: 0)
- [x] #10a — Add address density filter to co-location script ✅ address-density-filter.ts deployed: normalizes addresses, groups by building, reduces confidence by 30% for 5+ practices
- [x] #10b — Add provider_count < 50 cap to export query (filters medical building false positives)
- [x] #10c — URL finder v2 built: multi-strategy (address+specialty, name+city, phone, stripped name), URL validation, pharmacy skip filter. 72% hit rate, address_specialty catches 80% of hits.
- [x] #10d — Address-match provider linking: SQL linked ~5K CA + TX providers to existing practice_websites via shared address (zero Serper credits, practice_providers 102K → 209K)

## 2. CA Expansion

- [x] #11 — Load CA PECOS (258K records)
- [x] #12 — Load CA .accdb into provider_licenses (310K licenses, 12,606 disciplinary, zero errors)
- [x] #13 — Run CA scan (27.6K sites scanned, 1,836+ deltas, delta detection completed. HeadersOverflow on one site — skipped via scan_status='error')
- [x] #14 — Run NPI resolver for CA licenses (47.9K resolved, 66.9% rate, still running for more)
- [x] #15 — Run CA reassignment bridge (33K attempted, all duplicates of co-location — validates data quality)
- [x] #16 — CA URL finder gap: rejection logging + verbose mode added to find-provider-urls-v2.py ✅ `_rejection_log` list + `_try_validate()` logs all rejected URLs with reason, strategy, status code. ~10K remaining real practices still need Entity Resolution Engine for full resolution.
- [x] #17 — Run CA mismatch_count + provider_count SQL update after scan completes
- [x] #18 — Export CA target list: 3,334 practices with mismatches, 1,146 Tier 1

## 3. TX Completion

- [x] #19 — NPI resolver TX: 59.7K resolved, PECOS ceiling reached. 55K active unresolved need Entity Resolution Engine v2.
- [x] #20 — Re-run scan+delta with full provider associations (209K practice_providers)
- [x] #21 — Export TX target list: 3,665 practices with mismatches, 1,010 Tier 1
- [ ] #22 — Validate Tier 0 targets: practices listing deceased/cancelled/suspended providers (1,258 TX disciplinary practices identified, 16 with deceased providers)

## 4. Practice Workflow Engine — Core Product Architecture

The dashboard is a **workflow orchestration engine**. Every finding triggers a trackable, multi-week workflow with embedded artifacts (pre-filled forms, checklists, confirmation tracking). The practice manager's home screen shows active workflows grouped by status: needs attention, in progress, waiting for confirmation, recently completed.

### Workflow Architecture

Every workflow follows the same lifecycle: **Trigger → Tasks → Artifacts → External Monitoring → Auto-Confirmation → Close**

#### Data Model

- [x] #23 — `workflow_instances` table ✅ Created + seeded (14,763: 14,762 NPPES + 1 License)
- [x] #24 — `workflow_tasks` table ✅ Created + seeded (88,572)
- [x] #25 — `workflow_events` table — audit trail ✅ Created + audit logger deployed (Batch 1)
- [x] #26 — `provider_roster` extension to `practice_providers` ✅ roster_status column added

#### Dashboard UI

- [x] #27 — Practice home: active workflow cards grouped by status ✅ Phase 3B deployed
- [x] #28 — Workflow detail page: task checklist with per-task status, embedded artifacts, timeline view ✅ Phase 3D deployed + extended with 4 new workflow views (Batch 2)
- [x] #29 — Provider roster view: all providers with status badges, link to active workflows ✅ Phase 3E deployed
- [x] #30 — Notifications: in-app + email alerts for overdue tasks, new findings, auto-confirmations ✅ 6 HTML email templates via Resend + in-app alerts deployed (Batch 1)

---

### Workflow 1: NPPES Update

**Trigger:** Address, phone, or specialty mismatch detected between website and NPPES.
**Duration:** 1-3 weeks.

- [x] #31 — Trigger: delta engine detects NPPES mismatch → auto-create workflow instance ✅ seed-workflows-from-deltas.sql + trigger-workflows.ts + POST /api/workflows/create
- [x] #32 — Task: review finding (side-by-side comparison: website vs NPPES) ✅ FindingReview component deployed
- [x] #33 — Task: approve correction (practice manager confirms which data is correct) ✅ ApproveCorrection component deployed
- [x] #34 — Artifact: generate pre-filled NPPES update form (PDF) with corrected data ✅ Deployed
- [x] #35 — Task: submit to NPPES (manual, with link to NPPES portal + form download) ✅ SubmitNppes component deployed
- [x] #36 — Monitor: poll NPPES weekly sync for address/phone change at this NPI ✅ NPPES monitor cron (api/cron/nppes-monitor) deployed
- [x] #37 — Auto-confirm: when NPPES data matches corrected values → mark confirmed, close workflow ✅ Auto-confirm logic in NPPES monitor cron
- [x] #38 — Overdue alert: if no confirmation after 21 days → email reminder ✅ Escalation tiers: 7d nudge, 14d warning, 28d action, 60d stale

### Workflow 2: Payer Directory Update

**Trigger:** Payer directory listing doesn't match practice data (address, phone, specialty, missing listing).
**Duration:** 2-12 weeks (payers are slow).
**Strategy:** CAQH-First Correction Packets — trace which mismatches auto-resolve via CAQH update vs require direct payer contact. Practice manager gets one prioritized action list: (1) Update CAQH ~5 min, (2) Update NPPES ~10 min, (3) Contact remaining payers directly.
**Architecture:** FHIR R4 APIs (DaVinci PDex Plan-Net), not web scraping. Legal, stable, CMS-mandated.

#### Payer API Status

| Payer              | Code      | Status      | Auth        | Notes                                                            |
| ------------------ | --------- | ----------- | ----------- | ---------------------------------------------------------------- |
| UnitedHealthcare   | `uhc`     | **Live**    | None        | Name, phone, specialty, credentials, languages confirmed         |
| Aetna / CVS Health | `aetna`   | **Live**    | None        | Clean 404 for out-of-network                                     |
| Cigna              | `cigna`   | **Live**    | None        | Clean 400 for out-of-network                                     |
| Humana             | `humana`  | **Partial** | None        | Works but 30s timeout hit, needs 60s                             |
| BCBS TX (HCSC)     | `bcbs_tx` | **Blocked** | `client_id` | 401 without credentials, email sent to Interoperability@hcsc.net |
| Blue Shield CA     | `bcbs_ca` | **Blocked** | `clientId`  | Needs developer registration at devportal-dev.blueshieldca.com   |

#### Completed

- [x] #39 — FHIR PDex Plan-Net client built (`lib/payer-directory/fhir-client.ts`, ~600 lines). One client, per-payer config. Adding a new payer is a DB insert, not a code change.
- [x] #40 — Data sources: UHC (live), Aetna (live), Cigna (live), Humana (partial). BCBS TX/CA blocked on auth.
- [x] #41 — `payer_directory_snapshots` table created (22 flattened FHIR fields + raw bundle JSON). Also: `payer_directory_endpoints` (config), `payer_directory_mismatches` (per-field discrepancies), `correction_packets` (prioritized fix list)
- [x] #41a — Cross-source mismatch engine built (`lib/payer-directory/mismatch-engine.ts`, ~320 lines). Address/phone/specialty normalization.
- [x] #41b — Types defined (`lib/payer-directory/types.ts`, ~245 lines). FHIR resources, snapshots, mismatches, correction actions.
- [x] #41c — CLI test runner (`scripts/sync-payer-directories.ts`, ~310 lines). Single-NPI lookup with --dry-run, --verbose, --payer flags.
- [x] #41d — End-to-end validated: NPI 1144251372 (Dr. Ricardo Cuadra, Houston TX) — UHC returned full data, Aetna/Cigna correctly flagged as "not listed", correction packet generated with CAQH-first prioritization.

#### Field Extraction Status

| Field                                                       | Status         | Source                                                                             |
| ----------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| NPI, name, phone, specialty, credentials, gender, languages | **Extracting** | Practitioner resource                                                              |
| Practice address                                            | **Extracting** | PractitionerRole → Location `_include` with fallback + direct read (lines 144-177) |
| Accepting new patients                                      | **Not yet**    | Needs PractitionerRole with data to test                                           |
| Organization name, network/plan, office hours               | **Not yet**    | PractitionerRole → Organization/Location                                           |

#### Remaining Tasks

- [x] #42 — Replace fhir-client.ts with specialty extraction fix + increase Humana timeout to 60s ✅ Already implemented
- [ ] #42a — First real write test (drop --dry-run) — **blocked on HCSC/BCBS CA API keys**
- [x] #42b — Debug PractitionerRole → Location `_include` for address extraction ✅ Already implemented (lines 144-177 with \_include fallback + direct read)
- [ ] #42c — Custom header support for HCSC (`client_id`) + name-based search fallback — **blocked on client_id from HCSC**
- [x] #43 — Trigger: cross-source mismatch engine detects payer vs NPPES/website difference → create workflow ✅ POST /api/workflows/create with payer_directory type + comparison data injection
- [x] #44 — Dashboard panel: "Your data across sources" — side-by-side grid per provider per payer ✅ PayerMismatchReview component deployed (Batch 2)
- [x] #45 — Batch mode: loop practice_websites, lookup each provider across all payers ✅ sync-payer-batch.ts deployed (Batch 3)
- [x] #46 — Status tracking: "3 of 5 payers updated" progress bar per workflow ✅ CredentialingChecklist progress bar deployed
- [x] #47 — Alert email: "3 of your providers have address mismatches in UHC and Aetna directories" ✅ Email notification templates deployed (Batch 1)
- [ ] #110 — Add `accepted_payers` column to `practice_websites` table (text array, e.g. `['aetna','uhc','cigna']`)
- [ ] #111 — Update website scanner to extract insurance/payer acceptance lists from practice websites (look for "Insurance accepted," "Plans we accept," "Insurance we take" sections)
- [ ] #112 — Payer acceptance cross-reference: during payer sync, for each claimed payer, check how many practice providers appear in that payer's FHIR directory. Flag gaps.
- [ ] #113 — New alert template for payer acceptance gaps (warning if some missing, action if majority missing)
- [ ] #114 — Wire payer acceptance gap into Workflow 2 as a sub-signal trigger

#### Regulatory Tailwinds

- **No Surprises Act:** Plans must verify directory data every 90 days, update within 2 business days
- **REAL Health Providers Act (Feb 2026):** MA plans must verify every 90 days, display accuracy scores by 2029
- **CMS National Provider Directory (mid-2026):** CMS will crawl payer FHIR APIs daily. Poor data quality → suppressed from Medicare Plan Finder. Validates KairoLogic pitch: "your data is wrong, and now CMS is enforcing."

### Workflow 3: Provider Onboarding

**Trigger:** Practice manager adds new provider via NPI lookup.
**Duration:** 8-16 weeks (credentialing timeline).

- [x] #48 — NPI search + add: practice manager enters NPI → instant data pull ✅ POST /api/workflows/create with onboarding type + provider context
- [x] #49 — Day-one snapshot: license status, disciplinary check, existing PECOS enrollment ✅ Comparison data injected at workflow creation
- [x] #50 — Auto-generate credentialing checklist: CAQH, payer enrollment, NPPES, website, PECOS ✅ ONBOARDING_TASKS template (6 tasks) deployed (Batch 2)
- [x] #51 — Task tracking: each checklist item has status ✅ CredentialingChecklist component with grouped task view + progress bar deployed (Batch 2)
- [x] #52 — Monitor: weekly scan of external sources for confirmation ✅ Monitor schedules set at workflow creation (weekly/monday/06:00 UTC)
- [x] #53 — Provider status progression: ONBOARDING → ACTIVE when all critical tasks confirmed ✅ WorkflowDetailPanel task action handlers deployed
- [ ] #54 — Timeline view: visual Gantt-style view of onboarding progress — **deferred to Day 3**

### Workflow 4: Provider Release

**Trigger:** Practice manager marks provider as departing.
**Duration:** 4-12 weeks.

- [x] #55 — Mark departing: practice manager sets departure date + reason ✅ POST /api/workflows/create with release type
- [x] #56 — Auto-generate departure checklist: remove from website, update NPPES, notify payers, PECOS, reassign ✅ RELEASE_TASKS template (5 tasks) deployed (Batch 2)
- [x] #57 — Task tracking: each removal task with status, link to relevant portal ✅ DepartureChecklist component with portal links (NPPES, CAQH, PECOS) deployed (Batch 2)
- [x] #58 — Monitor: scan website for provider name removal, poll NPPES, check payer directories ✅ Monitor schedules set at workflow creation
- [x] #59 — Auto-confirm: per-system confirmation as provider disappears from each source ✅ Task action handlers in WorkflowDetailPanel
- [x] #60 — Flagging: "Dr. Smith left 6 weeks ago but UHC still lists her" ✅ Stale workflow manager + escalation tiers deployed (Batch 3)
- [x] #61 — 90-day monitoring tail: keep monitoring for 90 days post-departure ✅ DepartureChecklist 90-day phantom listing monitoring warning deployed (Batch 2)
- [x] #62 — Provider status: DEPARTING → DEPARTED when all systems confirmed → archived ✅ Workflow state machine handles status transitions

### Workflow 5: License Renewal

**Trigger:** Provider license expiring within 90 days (proactive, from state board data).
**Duration:** Ongoing/recurring.

- [ ] #63 — Trigger: state board data shows expiration_date within 90 days → create workflow
- [ ] #64 — Alert: notify practice manager with provider name, license type, expiration date
- [ ] #65 — Monitor: re-check state board data weekly for renewal confirmation
- [ ] #66 — Auto-confirm: when new expiration date detected → close workflow
- [ ] #67 — Escalation: if license lapses → escalate to critical alert, flag on provider roster

### Workflow 6: Compliance Remediation

**Trigger:** SB 1188 / HB 149 / AB 3030 finding from website scan.
**Duration:** 1-4 weeks.

- [x] #68 — Trigger: scan engine detects compliance issue → create workflow with statute reference ✅ POST /api/workflows/create with compliance type + finding details
- [x] #69 — Artifact: remediation guidance (template AI disclosure page, privacy policy language) ✅ ComplianceFinding component with statute info cards (SB 1188, HB 149, AB 3030) + expandable 6-step remediation deployed (Batch 2)
- [x] #70 — Task: implement fix on website ✅ COMPLIANCE_TASKS template (3 tasks: show_finding → provide_template → rescan_confirm) deployed (Batch 2)
- [x] #71 — Monitor: re-scan website on next scan cycle ✅ Rescan in-progress indicator in ComplianceFinding
- [x] #72 — Auto-confirm: when re-scan shows finding resolved → close workflow ✅ rescan_confirm task in template
- [x] #73 — Recurring: if finding reappears on future scan → reopen workflow ✅ Trigger logic supports re-creation

---

### Workflow Engine Infrastructure

- [x] #74 — Shared workflow state machine ✅ lib/workflow/state-machine.ts deployed (action_needed → in_progress → awaiting → resolved; also cancelled as terminal)
- [x] #75 — Confirmation engine: scheduled job that checks external sources, auto-closes confirmed tasks ✅ NPPES monitor cron + auto-confirm logic deployed
- [x] #76 — Email notification system: task created, task overdue, task auto-confirmed, workflow completed ✅ 6 HTML email templates via Resend deployed
- [x] #77 — Preview URL system + claim flow ✅ Phase 3G deployed
- [x] #78 — Multi-signal outreach scoring ✅ scoring-engine.ts with 5 signals (mismatch severity, provider scale, compliance risk, website quality, recency) deployed (Batch 3)
- [x] #79 — Export target list with deduped domain grouping ✅ toCSVRows() + rankPractices() deployed (Batch 3)

### Workflow Resilience & Error Handling

Every workflow spans weeks to months. The engine must handle data gaps, source outages, conflicts, and stale states gracefully — never truncating or silently failing a workflow.

#### Data Gap Handling

- [ ] #79a — Partial data progression: if a data source has no data for a provider (e.g. no PECOS enrollment), skip dependent tasks and mark "not applicable" rather than blocking the workflow
- [ ] #79b — Missing field tolerance: each task declares which fields are required vs optional. Missing optional fields generate a "data gap" note, not a failure
- [ ] #79c — Gap backfill: when new data arrives on a future sync cycle (e.g. PECOS enrollment appears), automatically create or reopen skipped tasks

#### Source Outage Handling

- [x] #79d — Retry queue: if a confirmation check fails (502, timeout, rate limit), queue for retry ✅ retryWithBackoff() with exponential backoff + jitter + abort signal deployed (Batch 3)
- [x] #79e — Staleness indicator: track last successful check per data source ✅ CircuitBreaker class with closed/open/half_open states + failure threshold (5) + reset timeout (60s) deployed (Batch 3)
- [x] #79f — Degraded mode: if a source is down for 3+ cycles, mark dependent tasks as "awaiting" ✅ withTimeout() wrapper + circuit breaker half-open recovery deployed (Batch 3)

#### Conflict Resolution

- [x] #79g — Multi-source conflict surfacing: when 3+ sources disagree, present all values side-by-side ✅ detectConflict() in conflict-resolver.ts: normalizes values, groups, detects disagreements, classifies severity deployed (Batch 3)
- [x] #79h — Conflict resolution audit: log which value selected and why ✅ Conflict objects include source_priority ranking, confidence scores, resolution reason
- [x] #79i — Source priority defaults: priority order for auto-resolution ✅ SOURCE_PRIORITY ranking: nppes=100, state_board=90, caqh=80, payers=70, website=50. autoResolve() for non-critical conflicts deployed (Batch 3)

#### Stale Workflow Management

- [x] #79j — Escalation tiers: 7d nudge, 14d warning, 28d action, 60d stale ✅ ESCALATION_TIERS in stale-workflow-manager.ts deployed (Batch 3)
- [x] #79k — Workflow health score: 0-100 with factor breakdown (age, overdue, stalled, error penalties) ✅ calculateWorkflowHealth() + generateStaleReport() deployed (Batch 3)
- [x] #79l — Bulk stale cleanup: cancel workflows stale for >90 days ✅ bulkCancelStale() with audit logging deployed (Batch 3)

## 5. Infrastructure

- [x] #28 — Push all local scripts to GitHub ✅ All files pushed via /tmp/kl-push2 clone (Day 1 + Day 2 Batches 1-3)
- [x] #29 — Enable RLS on all tables + create user policies ✅ Enabled on all 8 dashboard tables
- [ ] #30 — Fix DMARC: delete older Feb 5 duplicate `_dmarc` TXT record on kairologic.net
- [x] #31 — Verify GitHub Actions cron jobs pass after file push ✅ All 10 workflows verified — valid cron schedules + script references
- [x] #32 — Fix scan-and-delta.yml: add --state flag, bump limit 50→500, fix script path
- [x] #33 — Fix tmb-newsroom-monitor.yml: ts-node → tsx
- [x] #34 — Remove misplaced yml files from scripts/ folder ✅ Already clean — no yml files found in scripts/
- [x] #35a — New workflow: url-discovery.yml — runs Monday 8am UTC after NPPES sync, finds URLs for new providers with all 4 strategies + co-location
- [ ] #35b — Add SERPER_API_KEY as GitHub Actions secret

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

## 7. GTM Prep (after workflows work)

- [ ] #80 — Research calls with practice managers (Respondent.io, $100/20 min)
- [ ] #81 — Pricing page (Monitor $29/mo, Protect $79/mo, Command $149/mo)
- [ ] #82 — Founders' rate landing page ($99/mo flat, first 10 customers)
- [ ] #83 — One-page ROI calculator
- [ ] #84 — Personalized preview email templates
- [ ] #85 — Round 1 outreach to top 50 targets

## 8. Entity Resolution Engine (Core Infrastructure)

Multi-attribute matching engine for resolving healthcare entities across data sources. Needed for: URL discovery, payer directory matching, ongoing NPPES/PECOS/state board ingestion, and cross-source mismatch detection. Target: 95%+ match rate.

### The Problem

NPPES legal names ("BEVERLY HILLS DERMATOLOGY GROUP INC") don't match public-facing names ("Dermatology Associates Medical Group" at derm90210.com). Single-attribute search (name only) fails 30-40% of the time. Same problem exists across every data source.

### Multi-Signal Matching Approach

- [ ] #86 — Address matching: normalize + geocode NPPES address, compare to Google Places / payer directory address (strongest signal)
- [ ] #87 — Phone matching: NPPES phone → Google Business listing reverse lookup
- [ ] #88 — Name fuzzy matching: strip legal suffixes (MD, PA, Inc, LLC, PLLC, Corp), Jaro-Winkler on core name tokens
- [ ] #89 — NPI direct lookup: some directories index by NPI (CAQH, some payer finders)
- [ ] #90 — Specialty + ZIP radius: "dermatologist 90210" catches what name search misses
- [ ] #91 — Website content verification: confirm matched URL contains provider name or NPI on the page

### Confidence Scoring

- [ ] #92 — Weighted scoring: address match (40%) + phone match (25%) + name similarity (20%) + specialty match (15%)
- [ ] #93 — Auto-accept threshold: combined score >= 0.90 → link automatically
- [ ] #94 — Review queue: score 0.70-0.89 → flag for manual verification
- [ ] #95 — Reject threshold: score < 0.70 → skip, log for future retry with new data

### Infrastructure

- [ ] #96 — `entity_resolution_log` table: tracks every match attempt with scores per signal, enables tuning
- [ ] #97 — Reusable resolver module (`lib/entity/entity-resolver.ts`): shared across URL finder, payer directory scraper, NPI resolver, and any future data source
- [ ] #98 — Batch mode: process 10K+ entities per run with rate limiting and progress tracking
- [ ] #99 — Incremental mode: resolve new/changed entities on each weekly sync cycle

### Impact

- Fixes the ~10K silently rejected CA URLs from Serper (27K providers still without URLs)
- Enables payer directory matching (Workflow 2) without manual mapping
- Improves NPI resolver v2 (direct name+address match for 55K unresolved TX licenses)
- Foundation for every new data source integration going forward

## 9. Practice Onboarding — Provider Pre-Seeding + Confirmation Wizard

**Problem:** When a practice claims their profile (via outreach or self-service from the website), they land on the dashboard expecting to see their providers. If the roster is empty or incomplete, that's a terrible first impression and an immediate trust problem.

**Solution:** Hybrid approach — pre-seed providers during the initial website crawl, then show an inline onboarding card on the roster page for the practice to confirm/edit their team.

### Provider Pre-Seeding (During Crawl)

When KairoLogic first discovers and indexes a practice website (before anyone claims it), also extract provider names and cross-reference NPPES to populate `practice_providers`.

- [ ] #115 — Browserless integration: headless browser service for JS-rendered provider pages (`lib/crawl/browserless-client.ts`)
- [ ] #116 — Provider name extractor: parse provider names, credentials, specialties from practice website HTML (`lib/crawl/provider-extractor.ts`)
- [ ] #117 — NPPES cross-reference: match extracted names to NPPES by name + practice address/phone for NPI lookup
- [ ] #118 — Auto-populate `practice_providers` with detected providers during `scan-500-practices.ts` crawl cycle
- [ ] #119 — Handle edge cases: mid-level providers (APRN, PA-C, NP), name variations, multiple office locations

### On-Claim Provider Sync

When a practice is claimed (outreach or self-service), ensure providers are populated before first dashboard load.

- [ ] #120 — Claim hook: on `finalize-claim` API, check if `practice_providers` count > 0. If empty, trigger immediate provider crawl
- [ ] #121 — Loading state: show "Setting up your roster..." skeleton on roster page while crawl runs (~10-15s)
- [ ] #122 — Fallback: if crawl fails or finds zero providers, show empty state with manual "Add Provider" prompt

### Roster Onboarding Card

Inline card on the roster page that nudges the practice to confirm their auto-detected providers.

- [ ] #123 — `RosterOnboardingCard` component: prominent card at top of roster page — "We found X providers from your website. Review and confirm your team."
- [ ] #124 — Confirm/remove/add flow: checkboxes to confirm detected providers, remove incorrect ones, add missing ones via NPI lookup
- [ ] #125 — `onboarding_confirmed` flag on `practice_websites`: tracks whether the practice has confirmed their roster
- [ ] #126 — Sidebar badge: subtle "Setup incomplete" indicator until roster is confirmed
- [ ] #127 — Auto-dismiss: card disappears after confirmation, reappears only if new providers detected on future crawls

### Specialty Mismatch Detection

Currently the delta engine loads `web_specialty`, `board_specialty`, and `nppes_taxonomy` but never compares them. Adding specialty comparison as a new mismatch signal.

- [ ] #128 — Taxonomy normalization map: bidirectional mapping between freeform web specialties (e.g. "Family Medicine") and NPPES taxonomy codes (e.g. "207Q00000X") using `target_taxonomies` table (`lib/scanner/taxonomy-normalizer.ts`)
- [ ] #129 — Wire `taxonomy_change` signal into `detectDeltas()` in `delta-engine.ts`: compare normalized web_specialty vs nppes_taxonomy, flag mismatches
- [ ] #130 — 4-way specialty comparison: web vs NPPES vs state board vs payer directories, corroborate when 2+ sources agree (same pattern as address comparison)
- [ ] #131 — Handle sub-specialty nuances: "Internal Medicine/Pediatrics" on website vs "Internal Medicine" in NPPES should be a soft match, not a mismatch. Build fuzzy match with configurable threshold.
- [ ] #132 — New alert templates: (a) "Website lists Dr. X as [web specialty], but NPPES shows [nppes specialty]", (b) "Aetna lists Dr. X as [payer specialty], but NPPES and website both say [correct specialty]"
- [ ] #133 — Payer specialty mismatch: pull `specialty` from `payer_directory_snapshots` per provider per payer, compare against normalized web + NPPES values. Flag per-payer discrepancies.
- [ ] #134 — Backfill: run specialty comparison across existing 209K practice_providers to identify current mismatches
- [ ] #135 — Specialty mismatch dashboard widget: summary card on practice home showing "X providers have specialty mismatches across Y sources"

### Architecture Notes

- **Browserless** is needed for ~30% of practice websites with JS-rendered provider pages; Phase 1 (HTTP + Cheerio) handles the majority
- Pre-seeding runs as part of the existing crawl pipeline (`scan-500-practices.ts`), not a separate job
- Same flow for both outreach and self-service claims — no separate onboarding paths
- Provider extractor uses heuristics: looks for `/providers`, `/our-team`, `/physicians`, `/staff` pages, parses name + credential patterns (e.g. "John Smith, MD", "Dr. Jane Doe")

---

## 10. Product Backlog (future)

- [ ] NPI resolver v2: uses Entity Resolution Engine (section 8) for direct name+address matching against 1.8M NPPES providers table
- [ ] CAQH ProView auto-push: auto-submit corrections via CAQH API (Command tier). Currently detect-only with CAQH-first correction packets.
- [ ] Payer directory auto-correction: push updates via payer FHIR write APIs if/when available (Command tier)
- [ ] HCSC (BCBS TX) API access: pending client_id from Interoperability@hcsc.net
- [ ] Blue Shield CA developer registration: devportal-dev.blueshieldca.com
- [ ] Check engine expansion (new compliance checks)
- [ ] Semi-automated LinkedIn engagement pipeline
- [ ] Fix CDN anycast geo-lookup false positives (Cloudflare/Fastly IPs misidentified as foreign)
- [ ] Refactor admin dashboard `handleDownloadReport` to shared `generateAuditPDF.ts`
- [ ] Landing page: show findings regardless of `is_paid` (show "already purchased" info banner instead of blocking)

---

## Recent Changes (April 1, 2026)

### Data Explorer (Reports Page Redesign)
- New `DataExplorer.tsx` component: category selection, field checkboxes, filters, auto-query, CSV/PDF export, saved reports
- New `ReportPreviewTable.tsx` component: paginated preview with status badges
- New report definitions: Provider Roster, Payer Directory, Credential Expiry (added to existing 4)
- New `saved_report_configs` table for persisting Data Explorer configurations
- New `/api/reports/saved` CRUD route (GET/POST/DELETE)

### Provider Roster — Real Provider Data (Brushy Creek Family Physicians)
- Replaced 6 fake seeded providers (NPIs 1111111001-1111111006) with real providers from NPPES
- 5 active providers from practice website: Dr. Jacqueline Champlain (1497049209), Dr. Nicole Howerton (1487041430), Dr. Rekha Kalidindi (1750678942), Dr. Veronica Supkay (1477531978), Maribel Abarro APRN (1639825490)
- 3 departed providers (found via NPPES phone match but not on website): Dr. Larissa O'Neill, Dr. Richard Strawser, Dr. Trevor Turner
- Updated `practice_websites` for demo practice with real org NPI 1811934649, URL, and phone

### Alerts — Clickable + Real NPIs
- Added `provider_npi` to AlertData interface and query
- Click handler with fallback chain: workflow → roster?npi= → workflows
- Provider roster highlights clicked provider (gold border + scroll-into-view)
- Deactivated 3 old alerts referencing fake NPIs
- Created 3 new alerts for real providers (address mismatch, new provider detected, credential expiring)

### Provider Detail Panel — Departed Provider Fix
- `v_provider_health` view excludes departed status → blank detail panel
- Added fallback: builds provider object from `practice_providers` + `providers` tables when view returns null
- Departed providers now show name, specialty, credential, and "departed" status badge
- [ ] Enforcement & Regulatory Monitor (automated daily monitoring of enforcement actions, regulatory guidance)

### Competitive Positioning

**Ideon** aggregates provider + network data across 8.5M providers and 5K networks into a B2B API for InsurTech platforms, brokers, and carriers. KairoLogic does NOT compete with Ideon — different buyer (practices vs platforms), different value direction (fix your own data vs find providers for patients), different price point ($29-149/mo vs enterprise). Ideon validates the thesis: provider data fragmentation is a massive, monetizable problem. KairoLogic fills the gap Ideon leaves open — bringing data intelligence directly to the practice.

---

## Targeting Data Summary

### Combined Target List (as of March 15, 2026)

|                 | CA        | TX        | Total     |
| --------------- | --------- | --------- | --------- |
| Tier 1 (strong) | 1,146     | 1,010     | **2,156** |
| Tier 2 (medium) | 438       | 665       | **1,103** |
| Tier 3 (single) | 470       | 229       | **699**   |
| Tier 4 (low)    | 1,280     | 1,761     | **3,041** |
| **Total**       | **3,334** | **3,665** | **6,999** |

### Top Targets

- UCSF Medical Center — 72 mismatches, 48 providers (CA Tier 1)
- Texas Surgery Specialist — 132 mismatches, 17 providers (TX Tier 1)
- Skin and Beauty Center — 58 mismatches, 15 providers (CA Tier 1)
- North Texas Medical Surgical Clinic — 132 mismatches, 18 providers (TX Tier 1)

### TX Tier 0 — Disciplinary Targets

- 1,258 practices with disciplinary-flagged providers on their website
- 16 practices listing deceased providers
- 69 practices listing cancelled-license providers
- 1,093 practices with active-but-disciplined providers

### Tier Classification (scan-500-practices.ts)

| Tier                     | Criteria                       |
| ------------------------ | ------------------------------ |
| Tier 1 — High signal     | 2+ mismatches AND 6+ providers |
| Tier 2 — Movement signal | 2+ mismatches AND 4+ providers |
| Tier 3 — Single mismatch | 1+ mismatch AND 4+ providers   |
| Tier 4 — Low signal      | Everything else                |

### Outreach Hook

> "We scanned 57,000 practices across Texas and California. The average 8-provider group has 60 data discrepancies across NPPES, PECOS, and license records right now. Most practice managers don't find these until a claim is denied. We surface them on day one, help you fix them, then monitor so they never pile up again. $79/month."

---

## Practice Intelligence Dashboard — Signal Inventory

Every finding triggers a workflow. Signals grouped by the workflow they initiate.

### Workflow 1 Triggers: NPPES Update

| Signal             | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| Address mismatch   | Practice address on website doesn't match NPPES address of record                 |
| Phone mismatch     | Phone on website doesn't match NPPES phone                                        |
| Provider moved     | Provider listed on website but NPPES shows different address (provider relocated) |
| Departed provider  | Provider no longer at NPPES address but still displayed on website                |
| Name mismatch      | Organization name on website doesn't match NPPES registered name                  |
| Specialty mismatch | Specialty shown on website doesn't match NPPES taxonomy code                      |

### Workflow 2 Triggers: Payer Directory Update (via FHIR PDex Plan-Net APIs)

| Signal               | Description                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Not listed           | Provider not found in payer FHIR directory (CAQH fix: update listing)                                                                                         |
| Address mismatch     | Payer directory address doesn't match NPPES (per payer: UHC, Aetna, Cigna, Humana, BCBS)                                                                      |
| Phone mismatch       | Phone number in payer directory differs from NPPES                                                                                                            |
| Specialty mismatch   | Payer NUCC taxonomy code doesn't match NPPES taxonomy                                                                                                         |
| Name mismatch        | Payer directory name doesn't match NPPES registered name                                                                                                      |
| Payer acceptance gap | Website claims payer acceptance (e.g. "We accept Aetna") but >50% of providers not found in that payer's FHIR directory. Compliance and patient billing risk. |

### Workflow 3 Triggers: Provider Onboarding

| Signal              | Description                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------- |
| New provider added  | Practice manager adds provider via NPI lookup                                             |
| Pre-existing issues | New provider has disciplinary history, expired license, or NPPES pointing to old practice |

### Workflow 4 Triggers: Provider Release

| Signal                    | Description                                                                     |
| ------------------------- | ------------------------------------------------------------------------------- |
| Provider marked departing | Practice manager initiates departure                                            |
| Departed still listed     | Provider no longer at practice but still on website / NPPES / payer directories |
| Deceased provider         | Provider on website is deceased per state board records                         |

### Workflow 5 Triggers: License Renewal

| Signal               | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| License expiring     | Provider license expiring within 90 days (proactive alert)  |
| Disciplinary action  | Provider has active disciplinary action (TMB or CA MB)      |
| Suspended license    | Provider license suspended — cannot practice                |
| Revoked license      | Provider license revoked                                    |
| Cancelled license    | Provider license cancelled (non-payment or voluntary)       |
| Delinquent license   | Provider license renewal overdue — no practice permitted    |
| Malpractice judgment | Provider has malpractice judgment on record                 |
| Felony conviction    | Provider has felony conviction on record                    |
| Voluntary surrender  | Provider surrendered license to resolve disciplinary action |

### Workflow 6 Triggers: Compliance Remediation

| Signal                 | Description                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| Foreign data routing   | Website routing data to servers outside the US (SB 1188)                       |
| Foreign-hosted forms   | Patient-facing forms hosted on foreign infrastructure (SB 1188)                |
| Third-party trackers   | Trackers sending patient-adjacent data overseas (SB 1188)                      |
| Missing privacy policy | No privacy policy or doesn't address data residency (SB 1188)                  |
| Missing cookie consent | Cookie consent mechanism absent or insufficient (SB 1188)                      |
| Undisclosed AI content | AI-generated content without disclosure (HB 149 / AB 3030)                     |
| Undisclosed AI chatbot | Chatbot or symptom checker without AI disclosure (HB 149 / AB 3030)            |
| Undisclosed AI tools   | AI-powered scheduling or triage without transparency notice (HB 149 / AB 3030) |
| Missing AI policy      | No AI usage policy page (HB 149 / AB 3030)                                     |
| Outdated credentials   | Provider credentials on website don't match board records                      |
| Misleading specialty   | Specialty claims don't match board certification                               |
| Missing disclosures    | Required practice disclosures absent                                           |
| Certification mismatch | Board certification claims don't match actual records                          |

### Payer Acceptance Verification (planned)

**Problem:** Practice website says "We accept Aetna" but providers at that practice aren't in Aetna's directory. Patients see "accepts Aetna," book an appointment, and get hit with out-of-network charges. This is exactly the scenario the No Surprises Act targets.

**Signal:** Cross-reference what payers the practice website claims to accept against what payers each provider is actually listed in via FHIR directory lookups.

| What we check today                             | What this adds                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Provider NPI in payer directory → data matches? | Practice claims payer acceptance → provider actually in that directory? |

**Alert types:**

- Warning: "Website lists Aetna but 2 of 6 providers not found in directory"
- Action: "Website lists Aetna but 5 of 6 providers not found in directory" (majority missing)

**Correction path:** Update CAQH profiles to get providers listed, or remove payer from website if no longer in-network.

### Embedded Artifacts (generated within workflows)

| Artifact                     | Workflow        | Description                                                                                                                                |
| ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Pre-filled NPPES form (PDF)  | NPPES Update    | Address, phone, taxonomy corrections pre-populated                                                                                         |
| CAQH-first correction packet | Payer Directory | Prioritized action list: Step 1 update CAQH (~5 min, fixes multiple payers), Step 2 update NPPES, Step 3 contact remaining payers directly |
| Payer update checklist       | Payer Directory | Per-payer task list with portal links                                                                                                      |
| Credentialing checklist      | Onboarding      | CAQH, payer enrollment, NPPES, website tasks                                                                                               |
| Departure checklist          | Release         | Website removal, NPPES update, payer notifications                                                                                         |
| AI disclosure template       | Compliance      | Attorney-reviewed disclosure page template                                                                                                 |
| Privacy policy template      | Compliance      | Data residency policy language                                                                                                             |

### Signal Count Summary

| Workflow                 | Trigger Signals          | Auto-Confirmation Source               |
| ------------------------ | ------------------------ | -------------------------------------- |
| NPPES Update             | 6                        | NPPES weekly sync                      |
| Payer Directory          | 6 (× 6 payers, via FHIR) | Payer FHIR API re-query                |
| Provider Onboarding      | 2 + checklist            | NPPES, PECOS, payer FHIR, website scan |
| Provider Release         | 3 + checklist            | NPPES, payer FHIR, website scan        |
| License Renewal          | 9                        | State board data refresh               |
| Compliance Remediation   | 13                       | Website re-scan                        |
| **Total unique signals** | **39+**                  |                                        |

---

## Key Files

| File                                                        | Purpose                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `scripts/scan-500-practices.ts`                             | Batch scan + delta detection + export                                            |
| `scripts/run-scan-and-delta.ts`                             | Scan + delta runner (used by cron)                                               |
| `scripts/load-ca-medical-board.py`                          | CA .accdb loader → provider_licenses                                             |
| `scripts/find-provider-urls-v2.py`                          | Multi-strategy URL finder (address, name, phone, stripped name)                  |
| `scripts/populate-practice-providers.ts`                    | Address co-location matching                                                     |
| `scripts/load-pecos-reassignment.py`                        | PECOS reassignment bridge                                                        |
| `scripts/ca-mb-monthly-sync.ts`                             | NPI resolver + CA MB sync                                                        |
| `scripts/sync-payer-directories.ts`                         | Payer directory FHIR sync CLI (single-NPI + batch)                               |
| `lib/nppes/npi-resolver.ts`                                 | NPI resolution engine                                                            |
| `lib/nppes/pecos-client.ts`                                 | CMS PECOS API client                                                             |
| `lib/scanner/scan-scheduler.ts`                             | Scan orchestrator                                                                |
| `lib/scanner/delta-engine.ts`                               | NPPES delta detection                                                            |
| `lib/scanner/name-quality-filter.ts`                        | Pre-scan name validation                                                         |
| `lib/scanner/domain-blocklist.ts`                           | Directory/aggregator URL filter                                                  |
| `lib/payer-directory/fhir-client.ts`                        | FHIR PDex Plan-Net client, per-payer adapter (~600 lines)                        |
| `lib/payer-directory/mismatch-engine.ts`                    | NPPES vs payer comparison, address/phone normalization (~320 lines)              |
| `lib/payer-directory/types.ts`                              | FHIR resources, snapshots, mismatches, correction action interfaces (~245 lines) |
| `lib/workflow/state-machine.ts`                             | Workflow + task state machine with transition validation                         |
| `lib/workflow/audit-logger.ts`                              | Central audit trail logger for workflow events                                   |
| `lib/workflow/email-notifications.ts`                       | 6 HTML email templates via Resend REST API                                       |
| `lib/workflow/workflow-templates.ts`                        | Task templates for all 6 workflow types                                          |
| `lib/workflow/index.ts`                                     | Barrel export for workflow module                                                |
| `lib/resilience/retry.ts`                                   | retryWithBackoff, CircuitBreaker, withTimeout                                    |
| `lib/resilience/stale-workflow-manager.ts`                  | Escalation tiers, health scoring, bulk cleanup                                   |
| `lib/resilience/conflict-resolver.ts`                       | Multi-source conflict detection + auto-resolution                                |
| `lib/resilience/index.ts`                                   | Barrel export for resilience module                                              |
| `lib/scanner/address-density-filter.ts`                     | Co-location building detection, confidence adjustment                            |
| `lib/outreach/scoring-engine.ts`                            | 5-signal outreach scoring with tier assignment                                   |
| `lib/outreach/index.ts`                                     | Barrel export for outreach module                                                |
| `scripts/sync-payer-batch.ts`                               | Batch payer directory sync (all providers × all FHIR endpoints)                  |
| `app/api/workflows/create/route.ts`                         | Generic POST endpoint to create any workflow type                                |
| `components/dashboard/PayerMismatchReview.tsx`              | Multi-source payer comparison table                                              |
| `components/dashboard/CredentialingChecklist.tsx`           | Grouped onboarding task view with progress bar                                   |
| `components/dashboard/DepartureChecklist.tsx`               | Provider departure tasks + 90-day monitor                                        |
| `components/dashboard/ComplianceFinding.tsx`                | Statute info cards + remediation steps                                           |
| `lib/entity/entity-resolver.ts`                             | Entity resolution engine (planned)                                               |
| **Dashboard files**                                         |                                                                                  |
| `lib/design-tokens.ts`                                      | Design system colors, status mappings, display constants                         |
| `lib/auth/auth-helpers.ts`                                  | Server-side Supabase auth (server components, route handlers only)               |
| `lib/auth/auth-client.ts`                                   | Browser-side Supabase auth (client components)                                   |
| `lib/types/dashboard-schema.ts`                             | TypeScript types for all dashboard tables                                        |
| `components/dashboard/Sidebar.tsx`                          | Sidebar with nav, site selector, help/user menus                                 |
| `components/dashboard/HeaderBar.tsx`                        | Header bar with title, date, add provider, system status                         |
| `components/dashboard/DashboardShell.tsx`                   | Client shell combining sidebar + header + content                                |
| `components/dashboard/ui.tsx`                               | Shared UI: Badge, KPICard, WorkflowCard, AlertCard, PayerSyncPanel, Tooltip      |
| `components/dashboard/DashboardHome.tsx`                    | Dashboard home client component (KPIs, workflows, alerts, payer sync)            |
| `components/dashboard/WorkflowsView.tsx`                    | Workflows page with filter bar + detail panel integration                        |
| `components/dashboard/WorkflowDetailPanel.tsx`              | Slide-over detail: tasks, approval flow, comparison, timeline                    |
| `app/(marketing)/layout.tsx`                                | Marketing layout with Header/Footer/TopBanner                                    |
| `app/practice/page.tsx`                                     | Redirects to user's primary practice                                             |
| `app/practice/[id]/layout.tsx`                              | Server layout: auth check, practice access, renders shell                        |
| `app/practice/[id]/page.tsx`                                | Dashboard home — server component, fetches real data                             |
| `app/practice/[id]/workflows/page.tsx`                      | Workflows page — server component, fetches all workflows                         |
| `app/practice/[id]/roster/page.tsx`                         | Provider roster — server component, fetches practice_providers                   |
| `app/practice/[id]/alerts/page.tsx`                         | Alerts — server component, fetches alerts with seen/unseen state                 |
| `app/practice/[id]/documents/page.tsx`                      | Documents — server component, fetches workflow_artifacts                         |
| `app/preview/[token]/page.tsx`                              | Public preview page — token validation, findings, blurred dashboard, claim flow  |
| `components/dashboard/ProviderRosterView.tsx`               | Provider roster table, action menu, issue badges, workflow click-through         |
| `components/dashboard/AlertsView.tsx`                       | Alerts with new/earlier grouping, auto-marks seen on mount                       |
| `components/dashboard/DocumentsView.tsx`                    | Documents table with type badges, empty state for no artifacts                   |
| `components/dashboard/PreviewPage.tsx`                      | Public preview: KPIs, findings, providers, blurred dashboard teaser, claim form  |
| `middleware.ts`                                             | Auth route protection, session refresh                                           |
| `app/login/page.tsx`                                        | Login page (email/password + reset)                                              |
| `app/set-password/page.tsx`                                 | Post-verification password setup                                                 |
| `app/auth/callback/route.ts`                                | Supabase email link redirect handler                                             |
| `app/api/claim/route.ts`                                    | Preview page claim flow API                                                      |
| `app/api/finalize-claim/route.ts`                           | Links user to practice after password set                                        |
| `app/api/invite/route.ts`                                   | Team member invitation API                                                       |
| `scripts/seed-workflows-from-deltas.sql`                    | Bulk seed workflows from delta events                                            |
| `scripts/trigger-workflows.ts`                              | Ongoing workflow trigger (post-scan)                                             |
| `supabase/migrations/20260315_001_dashboard_foundation.sql` | Dashboard schema migration                                                       |

---

## GitHub Actions Workflows

| Workflow                      | Schedule             | Status                                  |
| ----------------------------- | -------------------- | --------------------------------------- |
| `nppes-weekly-sync.yml`       | Monday 6am UTC       | ✅ Verified                             |
| `url-discovery.yml`           | Monday 8am UTC       | ⚠️ Needs SERPER_API_KEY secret          |
| `pecos-monthly-sync.yml`      | 1st of month 7am UTC | ✅ Verified                             |
| `tmb-monthly-sync.yml`        | Manual trigger       | ✅ Verified                             |
| `ca-mb-resolution-sync.yml`   | 2nd Tuesday 8am UTC  | ✅ Verified                             |
| `scan-and-delta.yml`          | Wednesday 5am UTC    | ✅ Verified (state filter + limit bump) |
| `nppes-confirmation-poll.yml` | Daily 10am UTC       | ✅ Verified                             |
| `tmb-newsroom-monitor.yml`    | Wednesday 4am UTC    | ✅ Verified (ts-node → tsx)             |
| `trial-lifecycle.yml`         | Daily 11am UTC       | ✅ Verified                             |
| `page-tests.yml`              | Push/PR trigger      | ✅ Verified                             |
| `doc-freshness.yml`           | Push/PR trigger      | ✅ Verified                             |

### Weekly Pipeline Flow

| Day          | Time (UTC) | Workflow                       | Purpose                                                  |
| ------------ | ---------- | ------------------------------ | -------------------------------------------------------- |
| Monday       | 6:00 AM    | NPPES Weekly Sync              | New/changed providers loaded                             |
| Monday       | 8:00 AM    | URL Discovery                  | Find URLs for new providers (4 strategies) + co-location |
| Tuesday      | 8:00 AM    | CA MB Resolution (2nd Tue)     | NPI resolution for license records                       |
| Wednesday    | 4:00 AM    | TMB Newsroom Monitor           | Catch emergency suspensions                              |
| Wednesday    | 5:00 AM    | Scan + Delta                   | Scan websites, detect mismatches                         |
| Thursday     | 6:00 AM    | Payer Directory Sync (planned) | Query FHIR APIs for provider listings, detect mismatches |
| Daily        | 10:00 AM   | NPPES Confirmation Poll        | Auto-confirm submitted updates                           |
| Daily        | 11:00 AM   | Trial Lifecycle                | Manage trial expirations                                 |
| 1st of month | 7:00 AM    | PECOS Monthly Sync             | Refresh Medicare enrollment data                         |

---

## Infrastructure Scaling Plan

### Current State: Supabase Pro

- PostgreSQL via PostgREST API (all 15+ scripts use `/rest/v1/` endpoints)
- Auth + RLS built in (RLS enabled on all 8 dashboard tables)
- 502 errors under heavy batch load, mitigated with retry logic + 1500ms delays
- Database size: ~2-3GB, growing

### Scaling Timeline

Migration to self-hosted Supabase on GCP preserves ALL existing code (PostgREST API, auth, RLS):

1. Spin up Supabase via docker-compose on GCP (~2 hours)
2. `pg_dump` from hosted Supabase
3. `pg_restore` to self-hosted
4. Update `SUPABASE_URL` in `.env.local`
5. All scripts work unchanged, no rewrite needed

### Key Risk: Supabase Pricing Gap

| Tier              | Cost        | Notes                               |
| ----------------- | ----------- | ----------------------------------- |
| Pro               | $25/mo      | 8GB included, limited connections   |
| Team              | $599/mo     | Big jump, no middle tier            |
| Self-hosted (GCP) | ~$50-100/mo | Full control, fills the pricing gap |

### Decision

Do NOT migrate before revenue. The 502 errors are solved with retry logic. PostgREST API is a strength (simple scripts, no ORM). Migrate only when Supabase Pro becomes a bottleneck (~30 customers).

---

## Practice Intelligence Dashboard

### Build Status (as of Mar 27, 2026)

| Phase                                     | Status      | Details                                                                                                                      |
| ----------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| HTML Prototype                            | ✅ Complete | Interactive, all 5 views, workflow detail panel, approval flow                                                               |
| Database Schema                           | ✅ Complete | 8 tables, 6 enums, 2 views, RLS on all, `last_updated_by` added                                                              |
| Workflow Seeding                          | ✅ Complete | 14,762 NPPES Update + 1 License Renewal (88,576 tasks, 14,763 alerts)                                                        |
| Auth + Access Flow                        | ✅ Deployed | Login, set-password, claim, invite, middleware, auth callback                                                                |
| Layout Shell (3A)                         | ✅ Deployed | Sidebar, header bar, route groups (marketing vs dashboard separated)                                                         |
| Dashboard Home (3B)                       | ✅ Deployed | KPIs, workflow cards, alerts, payer sync — real data from Supabase                                                           |
| Workflows Page (3C)                       | ✅ Deployed | Filter bar with pill toggles + counts, full workflow list, due date color coding                                             |
| Workflow Detail (3D)                      | ✅ Deployed | Slide-over panel, task checklist, approval flow (writes to DB), source comparison, timeline, provider ref                    |
| Provider Roster (3E)                      | ✅ Deployed | 18 providers from practice_providers, issue badges, action menu, workflow click-through                                      |
| Alerts + Documents (3F)                   | ✅ Deployed | 23 alerts with new/earlier grouping, auto-marks seen. Documents empty state (populates on approval)                          |
| Preview Page (3G)                         | ✅ Deployed | Public `/preview/{token}`, real findings, blurred dashboard teaser, claim flow, token validation                             |
| Workflow Engine (Day 2 Batch 1)           | ✅ Deployed | State machine, audit logger, email notifications, NPPES monitor cron, pricing page, ROI calculator                           |
| 4 New Workflow Types (Day 2 Batch 2)      | ✅ Deployed | Payer Directory, Onboarding, Release, Compliance — task templates + UI components + POST /api/workflows/create               |
| Resilience + Data Quality (Day 2 Batch 3) | ✅ Deployed | Retry/circuit breaker, stale workflow manager, conflict resolver, address density filter, payer batch sync, outreach scoring |
| SMTP (Resend)                             | ⬜ Pending  | Connect Resend in Supabase SMTP settings, sender: hello@kairologic.net                                                       |
| Task Restructure                          | ⬜ Queued   | Merge review+approve, decouple monitor from submit, re-seed tasks                                                            |

### Task Restructure (pending)

Current 6-step task sequence is over-engineered. New structure:

| Step | Task                     | User action                                 | Dependency                   |
| ---- | ------------------------ | ------------------------------------------- | ---------------------------- |
| 1    | Review & Approve         | See comparison, pick correct value, confirm | None (first step)            |
| 2    | Download pre-filled form | Download generated PDF                      | Depends on Step 1 (approval) |
| 3    | Submit to NPPES          | Optional "Mark as submitted"                | Independent (not a blocker)  |
| 4    | Monitor & Auto-confirm   | Fully automated, always running             | Independent of Step 3        |

Key changes: Steps 1+2 from old flow merged. Steps 3 and 4 are parallel, not sequential. System monitors NPPES regardless of whether user marks submission complete.

### NPPES Staleness Escalation (pending)

If workflow is `in_progress` (correction approved) but NPPES weekly sync hasn't confirmed the update:

| Days since approval | Action                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| 14 days             | Warning alert: "Correction approved but NPPES unchanged. Was the form submitted?"    |
| 28 days             | Escalation alert: "Still no NPPES update. Download form again or cancel correction." |
| 45 days             | Admin notification: "Stale workflow requires attention"                              |

Alert links back to workflow with options: "I submitted it" (resets timer), "Download form again", "Cancel this correction."
Runs as part of the daily `nppes-confirmation-poll.yml` GitHub Action.

### Implementation Notes

**Column name mapping:** `practice_websites.name` (not `practice_name`), `preview_tokens.practice_website_id` (not `practice_id`)

**Auth user:** `admin@kairologic.net` (UUID: `2c2dc7ff-5fd5-4b20-9715-b051275e3e22`), linked as admin to North Texas Medical Surgical Clinic PA (`184908d3-43e2-4522-918b-2220f908c54c`, Denton TX, 18 providers, 132 mismatches)

**Preview token:** `demo-north-texas-med` (ID: `1aec14d9-01b3-4fa5-9810-66a1e190efd6`), expires Dec 31 2026

**Test URLs:**

- Dashboard: `kairologic.net/practice/184908d3-43e2-4522-918b-2220f908c54c`
- Workflows: `kairologic.net/practice/184908d3-43e2-4522-918b-2220f908c54c/workflows`
- Roster: `kairologic.net/practice/184908d3-43e2-4522-918b-2220f908c54c/roster`
- Alerts: `kairologic.net/practice/184908d3-43e2-4522-918b-2220f908c54c/alerts`
- Documents: `kairologic.net/practice/184908d3-43e2-4522-918b-2220f908c54c/documents`
- Preview: `kairologic.net/preview/demo-north-texas-med`
- Login: `kairologic.net/login`

### Workflow Test Readiness

| Workflow           | Data                           | Testable?                     | Test providers                                              |
| ------------------ | ------------------------------ | ----------------------------- | ----------------------------------------------------------- |
| 1: NPPES Update    | 23 workflows (address + phone) | ✅ Yes                        | ROBERT CONNAUGHTON (2 issues), STEVEN SCHIERLING (2 issues) |
| 2: Payer Directory | 0 mismatches for test practice | ❌ Need FHIR scan             | —                                                           |
| 3: Onboarding      | Manual trigger                 | ❌ Need "Add provider" flow   | —                                                           |
| 4: Release         | Manual trigger                 | ❌ Need "Mark departing" flow | —                                                           |
| 5: License Renewal | 1 workflow seeded              | ✅ Yes                        | JOHN SEUNGHUN PAEK (TX license expires May 31, 2026)        |
| 6: Compliance      | Website scan findings          | ❌ Day 2                      | —                                                           |

**License Renewal workflow:** ID `3797e734-072d-4ea6-bd57-8565441614c0`, 4 tasks (review → submit renewal to TMB → monitor board → auto-confirm), alert seeded, TMB portal URL in metadata.

**End-to-end test target:** NPPES Update Workflow 1 is the first workflow to be fully interactive. Requires task restructure (merge review+approve, decouple monitor from submit).

### Next Steps (priority order)

1. **SMTP (Resend)** — connect in Supabase to unblock claim flow emails (#108)
2. **Site URL + Redirect URLs** — configure in Supabase Auth for production (#109)
3. **Task restructure** — merge review+approve into single step, decouple monitor from submit, re-seed 88K tasks with new 4-step structure
4. **Outreach email template** — Resend template linking to preview page (GTM #84)
5. **Founders rate landing page** — $99/mo pitch page (GTM #82)
6. **Round 1 outreach** — top 50 targets (GTM #85)
7. **Fix DMARC** — delete older Feb 5 duplicate `_dmarc` TXT record (#30)

**Route groups:** Marketing site pages under `app/(marketing)/` with Header/Footer/TopBanner. Dashboard pages under `app/practice/` with Sidebar/HeaderBar only. Root layout is bare html/body.

**Package added:** `@supabase/ssr` (required for auth, added to package.json)

**Auth file split:** `lib/auth/auth-helpers.ts` (server-only, uses next/headers) and `lib/auth/auth-client.ts` (browser-safe, for client components). Client components must import from `auth-client`, never `auth-helpers`.

### Design System

**Colors (updated)**

- Navy: `#0F1E2E` (primary, sidebar, text)
- Navy Mid: `#1A3249` (sidebar hover, dropdowns)
- Navy Light: `#8BA3B8` (secondary text on dark — **corrected from #2A4A68 for contrast**)
- Gold: `#D4A017` (accent, workflow type labels, logo "Logic")
- Gold Light: `#F0C040` (hover states)
- Gold Pale: `#FDF6E3` (warning badge bg)
- Gray 50/100/200/400/600: standard semantic grays
- Status colors: Red `#D64545`, Green `#1A9E6D`, Blue `#185FA5`

**Typography:** Plus Jakarta Sans, weights 400-800. Headings 15-16px/800, body 12-13px/400-500, badges 10px/700, NPIs monospace 10px.

**Components:** Badges (pill, semantic color), Cards (white, 10px radius), Workflow cards (3px left border by status), Progress bars (4px), Avatars (circle initials), KPI cards (status-colored bg).

### Layout: Command Center

Fixed sidebar (224px navy) + scrollable main content (Gray 50). Sidebar: logo, site selector, nav, coming soon (dimmed), help menu (pops up), user menu (pops up).

### Dashboard Views

**1. Dashboard Home** — the 5-second view

- KPI bar: New (red bg, white text, pulsing navy dot) + Needs action (red) + In progress (gold) + Awaiting (blue) + Resolved (green). All clickable, drill to filtered view.
- Dismissible welcome banner with trial countdown
- Left column: top 3 workflow cards sorted by urgency
- Right column: top 3 alerts with NEW badges + payer sync panel (5 payers)
- Date stamp in header bar
- Fixed height regardless of provider count

**2. Workflows** — filter bar with pill toggles + counts, full list of workflow cards. Click card → slide-over detail panel.

**3. Provider Roster** — table with avatar, specialty, monospace NPI, status badge, issue count, 3-dot action menu (view details, mark as departing, view workflows).

**4. Alerts** — new alerts pinned to top with "X new since your last visit" divider, then "Earlier" section. NEW badges persist. Sidebar badge clears on visit.

**5. Documents** (renamed from Artifacts) — table with document name, type badge, linked workflow, date.

### Workflow Detail Panel

Slide-over panel (520px) from right with blur overlay. Close via ×, overlay click, or Escape.

**Contents:**

- Header: type label, provider + title, status badge, due info, progress bar
- Task checklist: done (green ✓), active (gold ●), pending (empty). Sequential progression.
- Approval UI (inline): radio card options (From website, From NPPES, Enter different value) + "Confirm & generate form" button. Selecting NPPES shows "no correction needed, website may need updating."
- Source comparison table: side-by-side with red highlight on mismatches, green on matches
- Document: linked artifact with download button
- Timeline: colored dots with event labels and timestamps

### Workflow Types

| #   | Type            | Trigger                        | Day   | Tasks                                                              |
| --- | --------------- | ------------------------------ | ----- | ------------------------------------------------------------------ |
| 1   | NPPES Update    | Delta engine mismatch          | Day 1 | Review → Approve → Download form → Submit → Monitor → Auto-confirm |
| 2   | Payer Directory | FHIR mismatch/not listed       | Day 2 | CAQH update → Per-payer verify → Auto-confirm per payer            |
| 3   | Onboarding      | Practice manager adds provider | Day 2 | NPI lookup → Snapshot → Credentialing checklist → Monitor → Active |
| 4   | Release         | Provider marked departing      | Day 2 | Departure checklist → Track removals → 90-day monitoring → Archive |
| 5   | License Renewal | License expiring 90 days       | Day 1 | Alert → Monitor board → Auto-confirm renewal                       |
| 6   | Compliance      | Website scan finding           | Day 2 | Show finding → Template → Re-scan → Auto-close                     |

### Access Flow

1. **Outreach email** → personalized with finding counts, CTA to preview URL
2. **Preview page** (`/preview/{token}`) → public, shows KPIs, findings summary, affected providers (masked NPIs), "Claim your dashboard" email input
3. **Verification email** → magic link via Supabase Auth (Resend SMTP)
4. **Set password** (`/set-password`) → email verified badge, practice name context, password requirements, "Launch your dashboard"
5. **Dashboard** → welcome banner, workflows from preview are now live

**Team invite:** Admin enters email + role → invite email → set password → in
**Password reset:** Login page → enter email → reset link → set new password
**Returning user:** `/login` → email + password → dashboard

### Roles

| Role   | Access                                                                      | Day   |
| ------ | --------------------------------------------------------------------------- | ----- |
| Admin  | Full: approve, submit, manage team, billing, settings, add/remove providers | Day 1 |
| Viewer | Read-only: see everything, change nothing                                   | Day 1 |
| Editor | Work within assigned workflows, update task status                          | Day 2 |

### Database Schema

**New tables:** practice_users, workflow_instances, workflow_tasks, workflow_events, alerts, user_alert_reads, workflow_artifacts

**Extended:** practice_providers (roster_status, added_date, departed_date, workflow refs), preview_tokens (token_type, role, invited_by, is_used)

**Enums:** workflow_type (6), workflow_status (5), task_status (4), alert_severity (4), provider_roster_status (4), practice_role (3)

**Views:** v_workflow_kpis (dashboard KPI counts), v_unseen_alert_counts (alert badge)

**Audit columns:** `last_updated_by` on workflow_instances and workflow_tasks (added for report/audit functionality, Phase 3)

**RLS:** All tables practice-scoped. Helper functions: `user_has_practice_access()`, `user_is_practice_admin()`.

### Resolved Design Decisions (from prototype + production sessions)

1. ✅ Artifacts → Documents rename (implemented in prototype + nav)
2. ✅ Navy Light corrected from `#2A4A68` to `#8BA3B8` (contrast fix)
3. ✅ New KPI card: red bg at 75% opacity, white text, navy pulsing dot
4. ✅ Approve correction flow: inline radio cards (From website / From NPPES / Enter different), single confirm button
5. ✅ Alerts page: new pinned to top with divider, NEW badges persist after viewing
6. ✅ Date stamp added to header bar
7. ✅ Provider action menu: 3-dot with view details, mark departing, view workflows
8. ✅ Dashboard and marketing site separated via route groups
9. ✅ Due date color coding: overdue=red, ≤7 days=gold, later=gray600
10. ✅ Workflow detail panel opens from both Dashboard home and Workflows page (no page navigation, slide-over)
11. ✅ Review + Approve merged into single step (comparison IS the review)
12. ✅ Monitor + Auto-confirm runs independently of manual submission (Steps 3 and 4 are parallel, not sequential)
13. ✅ NPPES staleness escalation: 14-day nudge, 28-day escalation, 45-day admin alert
14. ✅ Preview page: focused conversion page, no nav chrome (public, no auth)
15. ✅ Blurred dashboard teaser: full-scale replica with real provider data behind frosted overlay, feature tag pills, 🔒 lock icon
16. ✅ "Already have an account? Sign in" not added (clean conversion focus)
17. ✅ Documents empty state: friendly message explaining auto-generation on approval
18. ✅ License Renewal workflow seeded for Dr. Paek (4 tasks: review → submit renewal → monitor board → auto-confirm)
19. ✅ NPPES Update is the first workflow to be made fully end-to-end interactive via task restructure
20. ✅ Workflow 1 task restructure: 4 steps (review+approve merged, download form, optional submit, parallel monitor)
21. ✅ Payer acceptance verification: new signal cross-referencing website's claimed payers against actual FHIR directory presence. Stronger than address mismatches — claiming a payer when providers aren't listed is a compliance and patient billing risk (No Surprises Act).

### Pending (Day 3+)

1. Settings page full build
2. Natural language help bar
3. Reports module: activity, provider, workflow, compliance reports
4. Update Design Spec doc to match all resolved decisions above
5. Connect Resend SMTP in Supabase (#108)
6. Set Site URL + Redirect URLs in Supabase Auth config (#109)
7. Task restructure: merge review+approve, decouple monitor from submit, re-seed tasks
8. HCSC API key + BCBS CA API key (blocked on payer responses)
9. Timeline view for onboarding workflows (#54)
10. Data gap handling — partial progression, missing field tolerance, gap backfill (#79a-c)
11. SERPER_API_KEY as GitHub Actions secret (#35b)
12. Fix DMARC (#30)
13. GTM: Customer discovery calls (#80), Founders rate landing page (#82), Outreach email templates (#84), Round 1 outreach (#85)

### Internal Admin Tools (P2 backlog)

1. Customer dashboard impersonation — super-admin practice selector to view any customer's dashboard (support, demos, QA). Requires internal super-admin role + RLS bypass via service-role queries.
2. Cross-customer alerts summary — internal-only aggregated view of alerts, overdue workflows, unresolved Tier 1 issues, and login activity across all practices. Operational nerve center for managing founders cohort.
