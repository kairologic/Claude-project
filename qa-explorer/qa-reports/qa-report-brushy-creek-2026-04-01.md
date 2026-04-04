# KairoLogic QA Report — Brushy Creek Family Providers

**Date:** April 1, 2026
**Base URL:** https://kairologic.net
**Focus:** Brushy Creek Family Providers practice (admin + user dashboard)
**Method:** Manual Claude-in-Chrome walkthrough

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 2      |
| Warning   | 4      |
| Info      | 6      |
| **Total** | **12** |

---

## Fix Verification (from March 31 commit)

| Fix                                            | Status                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Sidebar icons (corrupted UTF-8 → proper emoji) | ✅ **FIXED** — Icons render cleanly                                           |
| Blog removed from practice sidebar             | ✅ **FIXED** — Blog nav item gone                                             |
| User Dashboard button uses organization_id     | ⚠️ **Partial** — Code fix works, but org mapping data issue (see Critical #1) |

---

## Critical Findings

### 1. User Dashboard button still navigates to wrong practice (data issue)

- **Section:** Admin Practices → Brushy Creek Family Providers → "User Dashboard ↗"
- **Element:** `/practice/${organization_id}` link
- **Description:** The code fix is working correctly — the button now uses `organization_id` (184908d3-43e2-4522-918b-2220f908c54c) instead of the practice_websites `id`. However, this organization_id maps to **"NORTH TEXAS MEDICAL SURGICAL CLINIC PA"** in the database, not "Brushy Creek Family Providers." The dashboard header shows "NORTH TEXAS MEDICAL SURGICAL CLINIC PA · DENTON, TX · 19 providers" while the admin row shows "Brushy Creek Family Providers · Round Rock, TX · 5 providers."
- **Root cause:** The `organization_id` in the `practice_websites` table for Brushy Creek points to the North Texas org. Either Brushy Creek needs its own organization record, or the foreign key mapping is wrong.
- **Fix needed:** Database — verify `practice_websites.organization_id` mappings for all practices.

### 2. Settings page shows placeholder data instead of actual practice info

- **Section:** Practice Dashboard → Settings → Practice Profile
- **Element:** Form fields (Practice Name, Address, etc.)
- **Description:** While the header correctly shows "NORTH TEXAS MEDICAL SURGICAL CLINIC PA", the Practice Profile form shows:
  - Practice Name: "Sunrise Medical Group"
  - Address: "123 Main Street"
  - City: "San Francisco" / State: "CA" / Zip: "94105"
  - Website: "https://sunrisemedical.com"

  This is clearly seed/placeholder data. A practice manager seeing this would lose trust in the platform.

- **Fix needed:** Either populate from `practice_websites` table data or clear placeholder values.

---

## Warnings

### 3. Brushy Creek scan status showing "Error" with 1 consecutive error

- **Section:** Admin Practices → Brushy Creek detail
- **Element:** DASHBOARD ISSUES panel
- **Description:** "Scan status: error (1 consecutive errors)" — last scan was 3 days ago. Combined with "Payer directory sync not yet run." The scan error should be investigated; a practice in "Live" status shouldn't have a stalled error scan.

### 4. Payer Directory shows 0/0 for Brushy Creek but 114 matched for the org

- **Section:** Admin Practices list vs Practice Dashboard → Payer Directories
- **Element:** Payer Listed column / Payer directories page
- **Description:** The admin practices list shows "0/0 Listed" and "0 Snapshots" for Brushy Creek, but the user dashboard Payer Directories page shows "All 114 · Matched 76" with data across 7 payers. This disconnect is because the admin view shows Brushy Creek's practice_websites record data (which has no payer syncs) while the dashboard shows the organization's data (North Texas).

### 5. Provider Roster — Specialty column empty for all providers

- **Section:** Practice Dashboard → Provider Roster
- **Element:** SPECIALTY column
- **Description:** All 18 providers show "—" in the Specialty column. This data should be populated from NPPES taxonomy codes. Missing specialty data makes it harder for practice managers to identify providers at a glance.

### 6. Two payer directories show "NOT CONNECTED"

- **Section:** Practice Dashboard → Payer Directories
- **Element:** BCBS of Texas and Blue Shield of California columns
- **Description:** Both show "NOT CONNECTED" for all providers while the other 5 payers (Aetna/CVS Health, Cigna, Humana, UnitedHealthcare, NPPES) are connected and showing matches. This is expected for incomplete FHIR integrations but worth flagging.

---

## Info

### 7. Sidebar icons rendering correctly after fix

- **Section:** Practice Dashboard sidebar
- **Description:** All nav items show clean emoji icons: 📊 Dashboard, ⚙ Workflows, 👥 Provider roster, 🔔 Alerts, 📄 Documents, 🏥 Payer directories, 🔍 NL Search, 📈 Reports, ⚙️ Settings. "COMING SOON" section shows 📋 Credentialing (greyed out) and ❓ Help & support.

### 8. Blog successfully removed from sidebar

- **Section:** Practice Dashboard sidebar
- **Description:** Blog nav item is no longer present. The sidebar goes directly from Reports → Settings → COMING SOON section. Confirmed Blog only lives on public website.

### 9. Workflows page fully functional (31 workflows)

- **Section:** Practice Dashboard → Workflows
- **Description:** Shows 31 workflows with working filter pills: All (31), Needs Action (20), In Progress (6), Awaiting (0), Resolved (1). Type filters: All Types, NPPES Update (23), Onboarding (3), Provider Release (2), License Renewal (1). Workflow cards show address mismatch details with "OVERDUE" badges and due date tracking.

### 10. Alerts page populated with 24 alerts

- **Section:** Practice Dashboard → Alerts
- **Description:** License expiring alert (Dr. Paek, May 31 2026) at top, followed by address mismatch alerts for multiple providers. All have ACTION severity badges. Timestamps showing "13 days ago" and "21 days ago."

### 11. Documents page — clean empty state

- **Section:** Practice Dashboard → Documents
- **Description:** Shows "No documents yet" with explanatory text about how documents are auto-generated when corrections are approved. This is expected for a practice that hasn't approved any workflows yet.

### 12. Payer Directories grid rendering well

- **Section:** Practice Dashboard → Payer Directories
- **Description:** Full provider × payer matrix with 114 total entries, 76 matched. Color-coded status badges (✓ MATCHED in green, NOT CONNECTED in gray). Provider names with NPI numbers. Filter pills for Matched/Mismatch/Not listed/No data.

---

## Section Walkthrough

### Admin → Brushy Creek Family Providers (expanded row)

- Status: **Live** | Providers: **5** | Last Scan: **Error** (3d ago) | Payer Listed: **0/0** | Open: **2** | Issues: **1 error**
- Providers: 5 Active, 0 Unverified, 1 Departed, 6 Total
- Delta Events: 2 detected, 2 unresolved, 0 workflows
- Payer Directory: 0 snapshots across the board
- Accepted Payers (from website): UnitedHealthcare, Aetna, Blue Cross Blue Shield, Cigna, Humana
- Dashboard Issues: "Scan status: error (1 consecutive errors)", "Payer directory sync not yet run"
- Claimed · ID: c1000000...

### Practice Dashboard (via User Dashboard button → North Texas org)

- **Home:** Welcome banner, 17 Needs Attention / 0 In Progress / 0 Monitoring / 2 All Clear. Priority Providers with issue counts. Practice Compliance (SB 1188 PENDING, HB 149 PENDING, AB 3030 N/A). Payer Sync Status showing last sync dates.
- **Workflows:** 31 total, filter pills functional, overdue badges rendering
- **Provider Roster:** 18 providers, 16 with issues, 2 clear. Health scores 50-70%.
- **Alerts:** 24 alerts with ACTION badges
- **Documents:** Empty state (expected)
- **Payer Directories:** 114 entries, 76 matched, 5 of 7 payers connected
- **Settings:** Placeholder data (critical — see finding #2)
