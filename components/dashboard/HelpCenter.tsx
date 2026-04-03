'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { colors } from '@/lib/design-tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
}

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  topics: HelpTopic[];
}

interface FAQItem {
  question: string;
  answer: string;
}

// ─── Help Content ───────────────────────────────────────────────────────────

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: '🚀',
    topics: [
      {
        id: 'what-is-kairologic',
        title: 'What is KairoLogic?',
        description: 'Learn about the KairoLogic platform and its core purpose',
        content: `KairoLogic is a comprehensive practice management and credentialing compliance platform designed specifically for healthcare providers. It automates the tracking, monitoring, and management of provider credentials across multiple payers and regulatory bodies.

The platform provides real-time visibility into compliance status, automates credential renewal workflows, and reduces administrative burden by centralizing all credentialing activities in one intuitive dashboard.

Key capabilities include:

• Provider Data Monitoring — Track provider information across NPPES, payer directories, and state boards in real time
• Compliance Scanning — Automated detection of SB 1188, HB 149, and AB 3030 compliance issues on practice websites
• Credentialing Workflows — End-to-end automation from provider onboarding through payer enrollment
• Payer Directory Tracking — Monitor your representation across UHC, Aetna, Cigna, Humana, BCBS, and more
• PECOS Enrollment Verification — Medicare enrollment status verification against CMS data
• Self-Service Reporting — Export audit trails, workflow status, and compliance findings to CSV or PDF`,
      },
      {
        id: 'how-dashboard-works',
        title: 'How the Dashboard Works',
        description: 'Understanding the main dashboard interface and navigation',
        content: `The KairoLogic dashboard is your command center for all credentialing activities. It provides:

Overview Cards — Quick snapshots of compliance status, active workflows, and pending actions at the top of your dashboard home page.

Workflow Hub — Access all your credentialing processes in one place. View active, pending, and completed workflows with task-level detail.

Provider Roster — Centralized view of all providers and their credential status. See mismatches, payer coverage, and PECOS enrollment at a glance.

Payer Directories — Monitor your representation across all major payer networks with a color-coded grid showing matched, mismatched, and not-listed status.

Alerts & Notifications — Real-time updates on important compliance events, approaching deadlines, and detected issues.

Reports — Self-service reporting with field selection, filtering, and export to CSV or PDF. Four report types: Workflow Status, Audit Trail, Provider Accuracy, and Compliance Findings.

Navigation is organized intuitively with a left sidebar for main sections. The sidebar collapses on smaller screens and shows your practice name and current page.`,
      },
      {
        id: 'understanding-workflows',
        title: 'Understanding Workflows',
        description: 'The basics of automated credentialing workflows',
        content: `Workflows are automated processes that manage specific credentialing tasks. Each workflow:

• Monitors external sources for changes or requirements
• Automatically detects when actions are needed
• Guides you through required steps with a task checklist
• Tracks progress and completion status
• Generates alerts when deadlines approach

Workflow Types:

NPPES Update — Detects and manages address, phone, or specialty mismatches between your records and the NPPES registry.

Payer Directory — Monitors payer network listings and flags when providers are not listed or have incorrect information.

License Renewal — Tracks professional license expiration dates and guides renewal submission.

Provider Onboarding — Multi-step credentialing for new providers: NPPES verification, CAQH enrollment, payer credentialing, PECOS enrollment, and automated monitoring setup.

Provider Release — Manages departures: payer notification, PECOS termination, CAQH deactivation, and 90-day phantom listing monitoring.

Compliance Remediation — Addresses website compliance findings (data sovereignty, AI transparency, clinical integrity).

Workflows run continuously in the background and are triggered automatically when the system detects an actionable condition.`,
      },
      {
        id: 'trial-overview',
        title: 'Your Free Trial',
        description: 'What your 14-day trial includes and what happens after',
        content: `Your 14-day free trial includes full access to every feature on the platform:

• Provider data monitoring across NPPES, payer directories, and state boards
• Compliance scanning (SB 1188, HB 149)
• Credentialing workflow automation
• Payer directory tracking across UHC, Aetna, Cigna, Humana, and BCBS
• Self-service reporting with CSV and PDF export
• PECOS enrollment verification

What happens during your trial:

Day 1 — Your first provider data scan runs automatically. Results appear within a few minutes.

Day 10 — You'll receive an email with a summary of findings and recommendations.

Day 18 — A reminder that your trial is ending soon, with an upgrade link.

Day 21 — Trial ends. Your dashboard switches to read-only mode.

Day 21–28 — Read-only access continues for 7 additional days so you can review data and export reports before deciding.

Founders Rate: The first 10 customers who upgrade from trial get a locked-in founders rate for the first year.

To upgrade at any time, go to Settings > Billing or contact us at info@kairologic.net.`,
      },
    ],
  },
  {
    id: 'workflows',
    name: 'Workflows',
    icon: '⚙️',
    topics: [
      {
        id: 'nppes-update-workflow',
        title: 'NPPES Update Workflows',
        description: 'Managing National Provider Enumeration System updates',
        content: `The NPPES Update workflow monitors the CMS National Provider Enumeration System for changes to provider credentials and information.

What it does:
• Tracks NPPES registration status for all providers
• Detects updates to provider information (address, specialties, licenses)
• Monitors NPI number assignments and changes
• Alerts you to discrepancies between your records and NPPES

Why it matters:
NPPES is the authoritative source for NPI information and is checked by virtually all payers. Keeping NPPES data current ensures payer directory accuracy and prevents claim denials.

How to use:
1. Navigate to the Workflows tab
2. Filter by "NPPES Update" type
3. Review the finding summary — it tells you which field is mismatched
4. Click "Review" to see the expected vs. actual values
5. Use the "Download NPPES Update Form" button to get a pre-filled correction form
6. Submit the correction to NPPES
7. The workflow auto-resolves once the next sync confirms the fix

Common mismatches: address changes, phone number updates, specialty additions, practice location moves.`,
      },
      {
        id: 'payer-directory-workflow',
        title: 'Payer Directory Updates',
        description: 'Keeping your provider representation current across networks',
        content: `This workflow monitors all major payer directories to ensure your providers are listed correctly and with current credentials.

What it tracks:
• Provider presence in each payer's network
• Address, phone, and specialty accuracy
• Listing status (listed vs. not listed)
• Name and credential discrepancies

Automatic detection:
The workflow continuously scans payer directories via FHIR PDex Plan-Net APIs and alerts you when:
• A provider is not listed in a directory they should be in
• Information doesn't match between NPPES and the payer
• A provider is newly detected in a directory
• Status changes occur

Taking action:
1. Open the workflow to see which payer and field is mismatched
2. Check if the correction can go through CAQH (indicated by the "Fix via CAQH" badge)
3. For CAQH-eligible fixes, update your CAQH ProView profile and payers that pull from CAQH will auto-update
4. For non-CAQH payers, submit corrections through the payer's own portal (links provided in the workflow detail)
5. Monitor the workflow — it auto-resolves when the next payer sync confirms the fix`,
      },
      {
        id: 'license-renewal-workflow',
        title: 'License Renewal Monitoring',
        description: 'Tracking and managing provider license renewals',
        content: `This workflow monitors professional licenses and certifications to prevent lapses in coverage.

Key features:
• Tracks expiration dates for all licenses, certifications, and credentials
• Alerts you 90 days, 30 days, and 7 days before expiration
• Monitors renewal status through state medical board data
• Maintains historical records of all licenses

Workflow tasks:
1. Verify current license status with the state board
2. Prepare renewal application and documentation
3. Submit renewal to the appropriate board
4. Track processing status
5. Confirm renewal completion

Why this matters:
A lapsed license can immediately disqualify a provider from payer networks and lead to denied claims. This workflow ensures nothing falls through the cracks.

How auto-confirmation works:
KairoLogic checks the Texas Medical Board (and other state boards) periodically. When a renewal is confirmed in the board's system, the workflow automatically marks the renewal task as complete and updates the provider's credential status.`,
      },
      {
        id: 'credentialing-onboarding',
        title: 'Credentialing Onboarding',
        description: 'Complete new provider credentialing workflow',
        content: `The Credentialing Onboarding workflow is a comprehensive, multi-source assessment that automates the entire process of getting a new provider fully credentialed.

How it works:
When a new provider is detected or manually added, the system runs an assessment across multiple sources:

1. NPPES Verification — Confirms NPI is active and address matches
2. State License Check — Verifies current medical license with the state board
3. PECOS Enrollment — Checks Medicare enrollment status via CMS data
4. CAQH ProView — Determines if provider has a CAQH profile
5. Payer Directory Scan — Checks current listing status across all monitored payers

Based on the assessment results, the workflow generates a prioritized task list organized into groups:

Immediate Tasks — Things you can do right now (update NPPES address, create CAQH profile)
Submit & Wait — Forms to submit that require processing time (payer credentialing applications, PECOS enrollment)
Automated Monitoring — Tasks the system handles automatically (watch for payer confirmation, monitor license status)
Already Complete — Items that need no action

Each task includes:
• Clear description of what needs to be done
• Which portal or system to use (with direct links)
• Expected timeline for completion
• Whether it can be done via CAQH (auto-propagates to multiple payers)

The workflow tracks progress as tasks are completed and auto-resolves individual items when external sources confirm the action.`,
      },
      {
        id: 'provider-release-workflow',
        title: 'Provider Release / Departure',
        description: 'Managing provider departures and network withdrawals',
        content: `When a provider leaves your practice, the Release workflow manages all necessary terminations and deactivations.

The process includes:
1. Mark provider for release in the system
2. Automatically generate termination tasks for all active networks
3. Submit notifications to payers
4. Terminate PECOS enrollment (if Medicare-enrolled)
5. Deactivate CAQH profile
6. Monitor for phantom listings for 90 days post-departure

Departure assessment:
Similar to onboarding, the system runs a multi-source assessment to determine what needs to happen:
• Which payer directories currently list this provider?
• Is the provider Medicare-enrolled (PECOS check)?
• Does the provider have an active CAQH profile?
• Are there pending workflows that should be cancelled?

Tasks are generated based on what's actually needed — if a provider isn't listed with a payer, no termination task is created for that payer.

Phantom listing monitoring:
After departure, the system monitors payer directories for 90 days to ensure the provider is properly removed. If they still appear in a directory, an alert is generated.`,
      },
    ],
  },
  {
    id: 'provider-management',
    name: 'Provider Management',
    icon: '👥',
    topics: [
      {
        id: 'provider-roster',
        title: 'Provider Roster',
        description: 'Managing your complete provider list',
        content: `The Provider Roster is a comprehensive view of all providers in your practice.

Features:
• Search and filter providers by name, NPI, specialty, or status
• View credential status at a glance with color-coded badges
• See mismatch counts (address, phone, taxonomy, name)
• Track roster status: Active, Onboarding, Departing, Departed
• Access provider detail pages for full history

Provider statuses explained:

ACTIVE (Green) — Provider is on your roster and being monitored across all sources.
ONBOARDING (Blue) — New provider with credentialing in progress.
DEPARTING (Orange) — Provider has been marked for departure, release workflow active.
DEPARTED (Gray) — Provider has left the practice. Monitoring continues for phantom listings.
UNVERIFIED (Yellow) — Provider detected but not yet confirmed by the practice.

Mismatch indicators:
Each provider row shows flags for detected mismatches:
• Address mismatch — NPPES address differs from payer records
• Phone mismatch — Phone number inconsistency detected
• Taxonomy mismatch — Specialty coding differs between sources
• Name mismatch — Name spelling or format differs
• License issue — State license problem detected`,
      },
      {
        id: 'status-badges-explained',
        title: 'Status Badges Explained',
        description: 'Understanding provider status indicators',
        content: `Status badges appear throughout the dashboard to quickly communicate a provider's credentialing status.

Roster Status badges:
ACTIVE (Green) — Provider is fully on your roster and being actively monitored.
ONBOARDING (Blue) — Provider is new and going through the credentialing process.
DEPARTING (Red) — Provider is leaving; release workflow is active.
DEPARTED (Gray) — Provider has left the practice.

Workflow Status badges:
NEEDS ACTION (Red) — A workflow requires your attention. There are tasks you need to complete.
IN PROGRESS (Gold) — Work is underway on this workflow. Some tasks may be waiting for external responses.
AWAITING (Blue) — Waiting for a response from an external system (payer, NPPES, state board).
RESOLVED (Green) — All tasks complete, issue resolved.
CANCELLED (Gray) — Workflow was cancelled (e.g., duplicate, provider didn't actually join).

Alert Severity badges:
ACTION (Red) — Requires immediate attention.
WARNING (Orange/Gold) — Important but not critical.
INFO (Blue) — Informational update.
RESOLVED (Green) — Previously flagged issue has been resolved.

Hovering over any status badge shows additional details and the date of the last status change.`,
      },
      {
        id: 'pecos-verification',
        title: 'PECOS Enrollment Verification',
        description: 'Understanding Medicare enrollment status checks',
        content: `KairoLogic checks each provider's Medicare enrollment status by querying the CMS PECOS (Provider Enrollment, Chain, and Ownership System) data.

What PECOS verification tells you:

ENROLLED (Green) — Provider is found in PECOS with an "Approved" status in the correct state. No action needed.

NEEDS REASSIGNMENT — Provider is Medicare-enrolled but in a different state than your practice. May need a PECOS change of information or reassignment.

NOT LISTED — Provider's NPI was not found in CMS PECOS data. They may not be Medicare-enrolled. If they need to participate in Medicare, a PECOS enrollment task will be generated in their credentialing workflow.

NOT CHECKED — PECOS data is not yet available for this provider's state. Currently, KairoLogic syncs PECOS data for Texas and California. Coverage is expanding.

How it's used in credentialing:
During onboarding, the PECOS check determines whether a "PECOS enrollment" task needs to be created. During departure, it determines whether a "PECOS termination" task is needed.

Data freshness:
PECOS data is synced monthly from the CMS Data API. The "Last synced" date is shown in the provider detail view.`,
      },
      {
        id: 'specialty-comparison',
        title: 'Specialty Mismatch Detection',
        description: 'How KairoLogic compares specialty data across multiple sources',
        content: `KairoLogic performs a four-way specialty comparison to detect mismatches between how a provider's specialty is listed across different sources. This helps ensure consistent, accurate representation.

The four sources compared:
Website — The specialty listed on your practice website (e.g., "Family Medicine", "Internal Medicine/Pediatrics")
NPPES — The taxonomy code registered with CMS (e.g., 207Q00000X for Family Medicine)
Board Certification — Specialty from state medical board records
Payer Directories — How payers list the provider's specialty in their network directories

How matching works:
KairoLogic normalizes freeform specialty text from each source into standardized NUCC taxonomy codes, then compares them. The system understands that specialties like "Internal Medicine/Pediatrics" and "Internal Medicine" are related (sub-specialty match) rather than a hard mismatch.

Confidence scoring:
Exact match — All sources agree on the same taxonomy code (1.0 confidence)
Sub-specialty match — Codes share the same specialty family but differ in sub-specialty (0.7 confidence)
Soft mismatch — Related but different specialties (0.3-0.5 confidence)
Hard mismatch — Completely different specialties (0.0 confidence)

Consensus detection:
When 2 or more sources agree, that value is treated as the consensus. A single outlier source is flagged for correction rather than raising a general alert.

What to do about mismatches:
1. Review specialty mismatches in the Provider Roster (look for the "Specialty" badge)
2. Determine which source is correct
3. Update the incorrect source (NPPES update workflow, website update, or payer directory correction)
4. KairoLogic will re-scan and clear the finding once sources align`,
      },
    ],
  },
  {
    id: 'payer-directories',
    name: 'Payer Directories',
    icon: '🏥',
    topics: [
      {
        id: 'understanding-payer-grid',
        title: 'Understanding the Payer Grid',
        description: 'How to read and use the payer directory monitoring grid',
        content: `The Payer Grid provides a comprehensive view of your provider representation across all major payer networks.

Grid structure:
• Rows = Providers in your practice
• Columns = Payer networks being monitored (UHC, Aetna, Cigna, Humana, BCBS TX, Blue Shield CA)
• Each cell = Provider's listing status with that payer

Reading the grid:
• Green = Provider is listed and information matches
• Yellow/Orange = Listed but with data mismatches
• Red = Provider is NOT listed in this directory
• Gray = Not applicable / not monitored

Interactive features:
Click any cell to:
• View detailed information about that provider/payer relationship
• See exactly what information is mismatched (address, phone, specialty)
• View the NPPES value vs. payer value side by side
• Check if the fix can go through CAQH
• Access direct links to payer portals for corrections

Data source:
Payer directory data is retrieved via FHIR PDex Plan-Net APIs. Each payer is synced on a regular schedule, and snapshot dates are shown in the column headers.`,
      },
      {
        id: 'matched-mismatch-not-listed',
        title: 'What Matched / Mismatch / Not Listed Means',
        description: 'Understanding data alignment indicators',
        content: `These indicators show how your provider information aligns with each payer's records.

MATCHED (Green)
Your provider data matches what's in the payer's system. No action needed.

MISMATCH (Yellow/Orange)
Your data differs from the payer's records. Common mismatches:
• Address mismatch — Your address differs from payer records (often suite number differences)
• Phone mismatch — Phone number in payer directory doesn't match NPPES
• Specialty mismatch — Listed specialty coding differs
• Name variation — Slight spelling or format differences

Why mismatches happen:
• Provider updated information with you but not with all payers
• Payer data is outdated or was entered differently
• Address formats differ between systems (e.g., "STE 200" vs. "Suite 200")
• Provider has multiple locations

NOT LISTED (Red)
Provider does not appear in the payer's directory at all. This can mean:
• Enrollment application is still pending
• Provider was never enrolled with this payer
• Provider was terminated from the network
• Application was rejected

Priority levels:
• Priority 3 (High) — Phone mismatches, critical data differs
• Priority 2 (Medium) — Address mismatches
• Priority 1 (Low) — Not listed in directory`,
      },
      {
        id: 'fixing-mismatches',
        title: 'How to Fix Mismatches',
        description: 'Steps to correct provider information across payer networks',
        content: `When you identify a mismatch, follow these steps:

Step 1: Review the Mismatch Detail
Click the mismatch in the payer grid or workflow to see:
• Which field is different (address, phone, specialty)
• The NPPES value (what should be correct)
• The payer value (what the payer has)
• Whether the fix can go through CAQH

Step 2: Determine the Correction Path

If "Fix via CAQH" = Yes:
1. Log into CAQH ProView (proview.caqh.org)
2. Update the incorrect field in your provider's CAQH profile
3. Payers that pull from CAQH (UHC, Aetna) will automatically receive the update
4. KairoLogic monitors for the fix to propagate (usually 1-2 weeks)

If "Fix via CAQH" = No:
1. The workflow provides the direct portal link for that payer
2. Log into the payer's credentialing portal
3. Submit the correction through their system
4. KairoLogic monitors for confirmation

Step 3: Track Resolution
The mismatch workflow auto-resolves when the next payer sync confirms the data now matches. You'll see the status change from "Action Needed" to "Resolved" in the workflow list.

Common fix timelines:
• CAQH updates: 1-3 business days
• UHC/Aetna (via CAQH): 1-2 weeks
• Cigna direct: 3-7 days
• Humana direct: 3-7 days
• BCBS TX (Availity): 5-10 days`,
      },
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance Scanning',
    icon: '🛡️',
    topics: [
      {
        id: 'compliance-overview',
        title: 'Compliance Scanning Overview',
        description: 'How KairoLogic monitors regulatory compliance',
        content: `KairoLogic scans practice websites for compliance with state healthcare regulations. Currently monitored:

SB 1188 — Data Sovereignty (Texas)
Ensures patient health information stays within compliant boundaries:
• Primary domain IP geolocation
• CDN and edge cache analysis (foreign edge indicators)
• Mail exchange (MX) pathing
• Third-party data processor assessment

HB 149 — AI Transparency (Texas)
Requires clear disclosure when AI is used in patient care:
• Conspicuous AI disclosure text on practice websites
• Patient notification requirements
• Documentation of AI use in clinical decisions

Clinical Integrity Checks:
• Minor/parental access portal compliance (Texas requires distinct auth for guardians)
• Biological sex input fields on patient registration
• Metabolic health options

How scanning works:
1. KairoLogic crawls your practice website
2. Analyzes pages for compliance indicators
3. Generates findings with severity ratings (High, Medium, Low)
4. Creates compliance workflows for remediation
5. Re-scans periodically to confirm fixes

Findings appear in the Compliance Findings section of the dashboard and can be exported via the self-service reporting system.`,
      },
      {
        id: 'sovereignty-score',
        title: 'Understanding Your Sovereignty Score',
        description: 'How the data sovereignty score is calculated',
        content: `The Sovereignty Score is a 0-100 rating that measures how well your practice's digital infrastructure protects patient data within compliant boundaries.

Score components:
• Domain hosting location (domestic vs. foreign servers)
• CDN edge nodes (are cache servers in compliant regions?)
• Email routing (are MX records pointing to compliant servers?)
• Third-party integrations (do embedded services route data offshore?)
• SSL/TLS certificate configuration
• Cookie and tracking technology compliance

Score ranges:
90-100 — Excellent. Infrastructure is fully compliant.
70-89 — Good. Minor issues that should be addressed.
50-69 — Fair. Several compliance gaps that need attention.
Below 50 — Poor. Significant data sovereignty risks.

How to improve your score:
1. Review findings in the Data Sovereignty category
2. Address high-severity findings first (domain hosting, MX routing)
3. Work with your web hosting provider to ensure domestic hosting
4. Configure CDN settings to restrict edge caching to compliant regions
5. Re-scan after making changes to see updated score`,
      },
      {
        id: 'ehr-ai-detection',
        title: 'EHR Vendor AI Detection (AI-05)',
        description: 'How KairoLogic detects AI-enabled EHR systems at your practice',
        content: `KairoLogic automatically detects when your practice uses an EHR (Electronic Health Record) system that includes AI-powered features. This is important because regulations like HB 149 (Texas) and AB 3030 (California) require disclosure when AI is used in patient care.

How it works:
KairoLogic scans your practice website for links and references to known EHR platforms. It cross-references detected vendors against a registry of 13+ EHR systems with documented AI capabilities, including eClinicalWorks/Healow, Epic/MyChart, athenahealth, Cerner, NextGen, Allscripts, ModMed, AdvancedMD, DrChrono, Elation, and Practice Fusion.

Detection confidence levels:
Confirmed — Vendor has publicly documented AI features (e.g., eClinicalWorks Sunoh.ai ambient listening)
Likely — Vendor has AI features in product announcements but not yet in regulatory filings
Possible — Vendor has AI-adjacent features that may trigger disclosure requirements

What happens when AI is detected:
If your EHR vendor has known AI capabilities but your website lacks an AI disclosure notice, KairoLogic generates a compliance finding (AI-05) with:
• The specific vendor and AI features detected
• Severity rating based on confidence level
• A recommended disclosure template customized to your vendor's AI capabilities
• Links to the applicable state regulation

What to do:
1. Review the AI-05 finding in your Compliance dashboard
2. Verify whether your practice has enabled the AI features in your EHR
3. If AI features are active, add the recommended disclosure to your website
4. Re-scan to confirm the finding resolves to "Compliant"

Even if you haven't explicitly enabled AI features, many modern EHR platforms activate them by default. When in doubt, add the disclosure — it protects your practice and builds patient trust.`,
      },
    ],
  },
  {
    id: 'reports',
    name: 'Reports & Export',
    icon: '📊',
    topics: [
      {
        id: 'self-service-reporting',
        title: 'Self-Service Reporting',
        description: 'Building custom reports with field selection and export',
        content: `The Reports section lets you build custom reports by selecting fields, applying filters, and exporting to CSV or PDF.

Available report types:

Workflow Status — Active and historical workflows with task progress, provider details, and resolution tracking. Fields include workflow type, status, provider info, task counts, age, and resolution time.

Audit Trail — Complete event log of detections, user actions, and system events. Fields include event type, actor, workflow context, provider info, and timestamps.

Provider Data Accuracy — Per-provider, per-payer mismatch data showing what's wrong and how to fix it. Fields include NPI, payer, field name, NPPES value, payer value, priority, and CAQH fix instructions.

Compliance Findings — Website compliance scan results with category, regulation, severity, and remediation status.

How to use:
1. Select a report type from the report picker
2. Choose which fields to include (checkboxes)
3. Apply filters (status, date range, provider, payer)
4. Preview results in the table view
5. Click "Export CSV" or "Export PDF" to download

CSV exports follow RFC 4180 format and open directly in Excel or Google Sheets.

PDF exports generate a branded, landscape-format document with page numbers and KairoLogic branding — suitable for board meetings, compliance audits, and payer submissions.`,
      },
      {
        id: 'export-data',
        title: 'Exporting Data',
        description: 'How to download reports in CSV and PDF format',
        content: `All four report types support export to CSV and PDF.

CSV Export:
• Click "Export CSV" after building your report
• File downloads immediately
• Opens in Excel, Google Sheets, or any spreadsheet tool
• Headers match your selected field labels
• All rows are included (up to 5,000 records)
• Dates are in ISO 8601 format for easy sorting
• Special characters are properly escaped

PDF Export:
• Click "Export PDF" after building your report
• Generates a landscape-format, multi-page document
• Includes: KairoLogic header, practice name, report title, date
• Navy header row with white text
• Alternating row shading for readability
• Page numbers on every page
• Long text is truncated to fit columns

Tips:
• For large datasets, use filters to narrow the results before exporting
• CSV is best for further analysis in spreadsheets
• PDF is best for sharing with stakeholders, auditors, or payers
• You can generate the same report multiple times with different filter criteria`,
      },
    ],
  },
  {
    id: 'alerts-notifications',
    name: 'Alerts & Notifications',
    icon: '🔔',
    topics: [
      {
        id: 'alert-types',
        title: 'Alert Types',
        description: 'Understanding different types of system alerts',
        content: `KairoLogic generates different alerts for different situations:

COMPLIANCE ALERTS
Triggered when credentials or statuses don't meet requirements.
Examples: Lapsed license, missing malpractice insurance, unverified NPI

DEADLINE ALERTS
Triggered when important dates are approaching.
Examples: License renewal deadline, contract expiration, required re-verification

STATUS CHANGE ALERTS
Triggered when payer or regulatory systems detect changes.
Examples: Provider deactivated by payer, new credential available, status updated

ACTION REQUIRED ALERTS
Triggered when specific action is needed from your practice.
Examples: Documents requested by payer, form completion needed, response required

INFORMATION ALERTS
Triggered for system activity updates.
Examples: Workflow completed, payer response received, scan completed

Where to find alerts:
• Dashboard overview — Active alert count in the KPI cards
• Alerts page — Full list with filtering and sorting
• Workflow detail — Alerts related to specific workflows
• Email notifications — Configurable delivery for critical alerts`,
      },
      {
        id: 'severity-levels',
        title: 'Severity Levels',
        description: 'Alert priority and urgency indicators',
        content: `Each alert has a severity level indicating urgency and importance.

ACTION REQUIRED (Red)
Requires immediate attention. Impacts provider's ability to practice or collect claims.
Examples: License lapsed, malpractice insurance expired, provider deactivated by major payer
Action needed: Within 24 hours

WARNING (Gold/Orange)
Important and time-sensitive. Will impact operations if not addressed soon.
Examples: License expires in 7 days, payer requesting documentation, multiple mismatches detected
Action needed: Within 3-7 days

INFORMATIONAL (Blue)
Routine matters or positive updates.
Examples: Workflow completed, credential successfully verified, scan completed
Action needed: Review at your convenience

RESOLVED (Green)
A previously flagged issue has been fixed.
Examples: License renewed, mismatch corrected, payer listing confirmed
Action needed: No action — just confirmation

Managing alerts:
• Use the severity filter to focus on what matters most
• Mark alerts as resolved once addressed
• Review the alerts page weekly to stay current
• Export alerts via the Audit Trail report for compliance documentation`,
      },
    ],
  },
  {
    id: 'account-settings',
    name: 'Account & Settings',
    icon: '⚙️',
    topics: [
      {
        id: 'practice-settings',
        title: 'Practice Settings',
        description: 'Configuring your practice profile and preferences',
        content: `The Settings page lets you configure your practice profile and notification preferences.

Practice Profile:
• Practice name and NPI
• Primary contact email
• Practice address and phone
• Scan tier (frequency of monitoring)

Notification Preferences:
Configure how you receive alerts:
• Email notifications for critical alerts
• Weekly digest summaries
• Scan completion notifications

Scan Configuration:
• Scan frequency: Weekly (trial), Monthly (standard)
• Payer selection: Choose which payers to monitor
• Provider scope: Which providers to include in monitoring

Data Management:
• Export your complete practice data
• View data retention policies
• Request data deletion (post-trial)`,
      },
      {
        id: 'billing',
        title: 'Billing & Subscription',
        description: 'Managing your KairoLogic subscription',
        content: `Billing information is accessible from Settings > Billing.

Trial Period:
Your 14-day trial includes full access to all features. No credit card is required to start. After 14 days, your dashboard switches to read-only mode for 7 additional days.

Founders Rate:
The first 10 customers who upgrade get a locked-in founders rate for the first year. Check Settings > Billing to see if founders rate slots are still available.

Upgrading:
To upgrade from trial to a paid plan:
1. Go to Settings > Billing
2. Select your plan (Protect or Scale)
3. Enter payment information
4. Your dashboard immediately returns to full access

Plans:
PROTECT — Single practice, up to 10 providers, weekly scans
SCALE — Multiple practices, unlimited providers, daily scans, API access

Questions about billing? Email info@kairologic.net or reply to any email from us.`,
      },
    ],
  },
  {
    id: 'faq',
    name: 'Common Questions',
    icon: '❓',
    topics: [],
  },
];

const faqItems: FAQItem[] = [
  {
    question: 'How long does an NPPES update take?',
    answer:
      'NPPES updates typically process within 1-2 weeks. KairoLogic automatically monitors your NPPES registration and alerts you when updates are detected. Once you submit changes to NPPES (either directly or through your State Medical Board), they appear in the national system within this timeframe, and we update your dashboard accordingly.',
  },
  {
    question: 'What does "Not Listed" mean in the payer grid?',
    answer:
      'When a provider shows as "Not Listed" for a specific payer, it means that provider does not currently appear in that payer\'s directory. This can happen if the enrollment application is still pending, the provider hasn\'t been enrolled yet, they were terminated, or the application was rejected. Click the cell for details and next steps.',
  },
  {
    question: 'What triggers a workflow?',
    answer:
      'Workflows are triggered automatically. NPPES workflows fire when a mismatch is detected between NPPES data and your records. Payer directory workflows fire when a provider is not listed or has incorrect data. License renewal workflows trigger 90 days before expiration. Onboarding workflows are created when a new provider is added. All monitoring runs continuously.',
  },
  {
    question: 'How does auto-confirmation work?',
    answer:
      'Auto-confirmation uses regular synchronization with external sources like NPPES, payer directories, and state medical boards. When KairoLogic detects that a credential has been successfully updated in an external system, it automatically marks that workflow task as complete. You can always review auto-confirmations in the audit trail.',
  },
  {
    question: 'What is CAQH ProView?',
    answer:
      'CAQH ProView is a centralized credentialing database used by many payers. When you update your CAQH profile, payers that pull from CAQH (like UHC and Aetna) receive the update automatically. KairoLogic indicates which mismatches can be fixed via CAQH with a "Fix via CAQH" badge.',
  },
  {
    question: 'What is PECOS?',
    answer:
      'PECOS (Provider Enrollment, Chain, and Ownership System) is the CMS system for Medicare enrollment. KairoLogic checks PECOS data to determine if a provider is Medicare-enrolled. This affects credentialing workflows — providers not in PECOS may need to be enrolled for Medicare participation.',
  },
  {
    question: 'Can I export data?',
    answer:
      'Yes! The Reports section supports CSV and PDF export for all four report types: Workflow Status, Audit Trail, Provider Accuracy, and Compliance Findings. You can select which fields to include, apply filters, and download the results instantly.',
  },
  {
    question: 'How are priorities determined?',
    answer:
      'Alert and task priorities are based on regulatory impact and financial risk. Phone mismatches and critical data differences are Priority 3 (high). Address mismatches are Priority 2 (medium). Missing listings are Priority 1 (lower). License lapses and compliance issues are always high priority.',
  },
  {
    question: 'What states does KairoLogic cover?',
    answer:
      'KairoLogic currently provides full coverage for Texas (TX) and California (CA). This includes PECOS enrollment data, state medical board license monitoring, and state-specific compliance scanning (SB 1188, HB 149 for TX; AB 3030 for CA). Payer directory monitoring works nationwide.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'Email us at info@kairologic.net or reply to any email from us. We read and respond to everything. For urgent issues, include "URGENT" in the subject line.',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

interface HelpCenterProps {
  practiceId: string;
  initialSection?: string;
}

export default function HelpCenter({ practiceId, initialSection }: HelpCenterProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('what-is-kairologic');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFAQ, setShowFAQ] = useState(initialSection === 'faq');
  const [expandedFAQ, setExpandedFAQ] = useState<Set<number>>(new Set());
  const [topicFeedback, setTopicFeedback] = useState<Record<string, string | null>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  // Find the selected topic across all categories
  const selectedTopic = useMemo(() => {
    for (const cat of helpCategories) {
      const topic = cat.topics.find((t) => t.id === selectedTopicId);
      if (topic) return { topic, category: cat };
    }
    return null;
  }, [selectedTopicId]);

  // Filter categories and topics by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories.filter((c) => c.topics.length > 0);
    const q = searchQuery.toLowerCase();
    return helpCategories
      .map((cat) => ({
        ...cat,
        topics: cat.topics.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.content.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.topics.length > 0);
  }, [searchQuery]);

  const filteredFAQ = useMemo(() => {
    if (!searchQuery.trim()) return faqItems;
    const q = searchQuery.toLowerCase();
    return faqItems.filter(
      (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    setShowFAQ(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  const toggleFAQ = (index: number) => {
    const next = new Set(expandedFAQ);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedFAQ(next);
  };

  // ── Styles ──
  const s: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      height: 'calc(100vh - 64px)',
      backgroundColor: colors.gray50,
      overflow: 'hidden',
    },
    // LEFT PANEL — Index
    left: {
      width: 320,
      minWidth: 320,
      borderRight: `1px solid ${colors.gray200}`,
      backgroundColor: colors.white,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    searchWrap: {
      padding: '16px 16px 12px',
      borderBottom: `1px solid ${colors.gray200}`,
    },
    searchInput: {
      width: '100%',
      padding: '10px 12px 10px 36px',
      fontSize: 13,
      border: `1px solid ${colors.gray200}`,
      borderRadius: 8,
      fontFamily: 'inherit',
      backgroundColor: colors.gray50,
      color: colors.navy,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    searchIcon: {
      position: 'absolute' as const,
      left: 28,
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 14,
      color: colors.gray400,
      pointerEvents: 'none' as const,
    },
    indexScroll: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '8px 0',
    },
    catLabel: {
      padding: '10px 16px 4px',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      color: colors.gray400,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    topicItem: {
      padding: '8px 16px 8px 28px',
      fontSize: 13,
      color: colors.navy,
      cursor: 'pointer',
      transition: 'background 0.15s',
      lineHeight: '1.4',
      borderLeft: '3px solid transparent',
    },
    topicItemActive: {
      backgroundColor: colors.goldPale,
      borderLeftColor: colors.gold,
      fontWeight: 600,
    },
    faqLink: {
      padding: '12px 16px',
      fontSize: 13,
      fontWeight: 600,
      color: colors.gold,
      cursor: 'pointer',
      borderTop: `1px solid ${colors.gray200}`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    // RIGHT PANEL — Content
    right: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    contentHeader: {
      padding: '24px 32px 16px',
      borderBottom: `1px solid ${colors.gray200}`,
      backgroundColor: colors.white,
    },
    contentTitle: {
      fontSize: 24,
      fontWeight: 700,
      color: colors.navy,
      margin: 0,
      marginBottom: 4,
    },
    contentBreadcrumb: {
      fontSize: 12,
      color: colors.gray400,
    },
    contentBreadcrumbLink: {
      color: colors.gold,
      cursor: 'pointer',
      fontWeight: 500,
    },
    contentScroll: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '24px 32px 48px',
    },
    contentBody: {
      fontSize: 14,
      color: colors.navy,
      lineHeight: 1.7,
      whiteSpace: 'pre-wrap' as const,
      maxWidth: 720,
    },
    feedbackSection: {
      borderTop: `1px solid ${colors.gray200}`,
      paddingTop: 20,
      marginTop: 32,
      maxWidth: 720,
    },
    feedbackLabel: {
      fontSize: 13,
      fontWeight: 600,
      color: colors.navy,
      marginBottom: 10,
    },
    feedbackBtnGroup: {
      display: 'flex',
      gap: 10,
    },
    // FAQ styles
    faqCard: {
      backgroundColor: colors.white,
      borderRadius: 10,
      border: `1px solid ${colors.gray200}`,
      overflow: 'hidden',
      marginBottom: 12,
      maxWidth: 720,
    },
    faqQuestion: {
      padding: '14px 16px',
      fontSize: 14,
      fontWeight: 600,
      color: colors.navy,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      userSelect: 'none' as const,
    },
    faqAnswer: {
      padding: '0 16px 14px',
      fontSize: 13,
      color: colors.gray600,
      lineHeight: 1.6,
    },
    faqToggle: {
      fontSize: 18,
      color: colors.gold,
      fontWeight: 400,
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '48px 24px',
      color: colors.gray400,
    },
  };

  const feedbackBtn = (selected: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 500,
    border: `1px solid ${selected ? colors.gold : colors.gray200}`,
    borderRadius: 6,
    backgroundColor: selected ? colors.gold : colors.white,
    color: selected ? colors.white : colors.navy,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <div style={s.container}>
      {/* ═══ LEFT: Topic Index ═══ */}
      <div style={s.left}>
        <div style={s.searchWrap}>
          <div style={{ position: 'relative' as const }}>
            <span style={s.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
          </div>
        </div>

        <div style={s.indexScroll}>
          {filteredCategories.length === 0 && filteredFAQ.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: colors.gray400,
                fontSize: 13,
              }}
            >
              No results for &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <>
              {filteredCategories.map((cat) => (
                <div key={cat.id}>
                  <div style={s.catLabel}>
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  {cat.topics.map((topic) => (
                    <div
                      key={topic.id}
                      style={{
                        ...s.topicItem,
                        ...(selectedTopicId === topic.id && !showFAQ ? s.topicItemActive : {}),
                      }}
                      onClick={() => handleTopicClick(topic.id)}
                      onMouseEnter={(e) => {
                        if (selectedTopicId !== topic.id || showFAQ) {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.gray50;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedTopicId !== topic.id || showFAQ) {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
                        }
                      }}
                    >
                      {topic.title}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {/* FAQ link at bottom */}
        <div
          style={{
            ...s.faqLink,
            ...(showFAQ ? { backgroundColor: colors.goldPale } : {}),
          }}
          onClick={() => {
            setShowFAQ(true);
            if (contentRef.current) contentRef.current.scrollTop = 0;
          }}
        >
          <span>❓</span>
          <span>Common Questions ({searchQuery ? filteredFAQ.length : faqItems.length})</span>
        </div>
      </div>

      {/* ═══ RIGHT: Content Panel ═══ */}
      <div style={s.right}>
        {showFAQ ? (
          <>
            <div style={s.contentHeader}>
              <div style={s.contentBreadcrumb}>
                <span
                  style={s.contentBreadcrumbLink}
                  onClick={() => {
                    setShowFAQ(false);
                  }}
                >
                  Help
                </span>
                {' / '}
                <span>Common Questions</span>
              </div>
              <h1 style={s.contentTitle}>Common Questions</h1>
            </div>
            <div style={s.contentScroll} ref={contentRef}>
              {filteredFAQ.length === 0 ? (
                <div style={s.emptyState}>
                  <div
                    style={{ fontSize: 16, fontWeight: 600, color: colors.navy, marginBottom: 8 }}
                  >
                    No matching questions
                  </div>
                  <p>Try a different search term</p>
                </div>
              ) : (
                filteredFAQ.map((item, idx) => (
                  <div key={idx} style={s.faqCard}>
                    <div
                      style={s.faqQuestion}
                      onClick={() => toggleFAQ(idx)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.gray50;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
                      }}
                    >
                      <span style={{ flex: 1 }}>{item.question}</span>
                      <span style={s.faqToggle}>{expandedFAQ.has(idx) ? '−' : '+'}</span>
                    </div>
                    {expandedFAQ.has(idx) && <div style={s.faqAnswer}>{item.answer}</div>}
                  </div>
                ))
              )}
            </div>
          </>
        ) : selectedTopic ? (
          <>
            <div style={s.contentHeader}>
              <div style={s.contentBreadcrumb}>
                <span>Help</span>
                {' / '}
                <span style={s.contentBreadcrumbLink}>{selectedTopic.category.name}</span>
                {' / '}
                <span>{selectedTopic.topic.title}</span>
              </div>
              <h1 style={s.contentTitle}>{selectedTopic.topic.title}</h1>
            </div>
            <div style={s.contentScroll} ref={contentRef}>
              <div style={s.contentBody}>{selectedTopic.topic.content}</div>

              {/* Feedback */}
              <div style={s.feedbackSection}>
                <div style={s.feedbackLabel}>Was this helpful?</div>
                <div style={s.feedbackBtnGroup}>
                  <button
                    style={feedbackBtn(topicFeedback[selectedTopic.topic.id] === 'yes')}
                    onClick={() =>
                      setTopicFeedback({ ...topicFeedback, [selectedTopic.topic.id]: 'yes' })
                    }
                  >
                    👍 Yes
                  </button>
                  <button
                    style={feedbackBtn(topicFeedback[selectedTopic.topic.id] === 'no')}
                    onClick={() =>
                      setTopicFeedback({ ...topicFeedback, [selectedTopic.topic.id]: 'no' })
                    }
                  >
                    👎 No
                  </button>
                </div>
                {topicFeedback[selectedTopic.topic.id] === 'yes' && (
                  <p style={{ fontSize: 12, color: colors.green, marginTop: 8 }}>
                    Thanks for the feedback!
                  </p>
                )}
                {topicFeedback[selectedTopic.topic.id] === 'no' && (
                  <p style={{ fontSize: 12, color: colors.gray400, marginTop: 8 }}>
                    Thanks for letting us know. Email us at info@kairologic.net if you need more
                    help.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              ...s.contentScroll,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={s.emptyState}>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.navy, marginBottom: 8 }}>
                Select a topic
              </div>
              <p>Choose a topic from the left panel to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
