/**
 * Tooltip definitions for key Sentry Shield dashboard fields.
 * Shared between /dashboard and /dashboard/[npi] pages.
 */
export const TOOLTIPS = {
  // ── Score & Tier ──
  compositeScore:
    'Your overall compliance score (0–100) calculated from Data Residency, AI Transparency, and NPI Integrity checks. 75+ is Compliant, 50–74 Needs Work, below 50 is Violation Risk.',
  riskTier:
    'Sovereign (80+): fully compliant. Drift (60–79): minor issues detected. Violation (<60): immediate action required. Pending: no scan data yet.',
  lastScan:
    'The time elapsed since the most recent automated or manual compliance scan was completed.',

  // ── Category Cards ──
  dataResidency:
    'SB 1188 — Checks whether patient data stays within US borders. Verifies that all third-party endpoints (analytics, CDNs, forms) resolve to US-based servers.',
  aiTransparency:
    'HB 149 — Checks whether AI-powered tools on your website are properly disclosed to patients, including chatbots, symptom checkers, and scheduling assistants.',
  clinicalIntegrity:
    'Verifies that clinical content, provider credentials, and medical claims on your website are accurate, up-to-date, and consistent with authoritative sources.',
  npiIntegrity:
    'Compares your NPPES registry data (name, address, specialty, phone) against what your website displays to detect mismatches that could confuse patients or regulators.',
  activeAlerts:
    'The number of unresolved compliance issues requiring your attention. Alerts are generated when scans detect new violations or when previously compliant checks regress.',

  // ── Border Map ──
  borderMapEndpoint:
    'A domain or hostname that your website sends data to. This includes analytics trackers, form processors, CDN assets, and third-party scripts.',
  borderMapIP:
    'The resolved IP address of the endpoint. Used to geolocate where patient data is being transmitted.',
  borderMapLocation:
    'The physical location of the server handling the endpoint. US-based locations pass SB 1188; foreign locations fail.',
  borderMapStatus:
    'Pass = endpoint is US-sovereign (data stays in the US). Fail = endpoint resolves to a server outside the US, violating SB 1188.',
  usSovereignCount:
    'Number of detected endpoints whose servers are physically located within the United States, satisfying SB 1188 data residency requirements.',
  foreignEndpointCount:
    'Number of detected endpoints whose servers are located outside the US. Each is a potential SB 1188 violation requiring remediation.',

  // ── Drift Monitor ──
  driftMonitor:
    'Tracks changes between scans — new scripts, modified content, removed disclosures. Shield subscribers get real-time detection; Watch subscribers see scan-to-scan diffs.',
  driftSeverity:
    'Critical: immediate compliance breach. High: likely violation if not addressed soon. Medium: potential issue worth reviewing. Low: informational change.',
  driftResolved:
    'A resolved event means the detected change has either been fixed or reviewed and determined to be acceptable.',

  // ── Scan History ──
  scanType:
    'Manual: triggered by you or your team. Automated: scheduled monitoring scan. Onboarding: initial baseline scan run during setup.',
  findingsCount:
    'Total number of individual compliance checks evaluated during this scan, including passes, failures, and warnings.',
  scanScore:
    'The composite compliance score at the time of this scan. Compare across scans to track your compliance trajectory over time.',

  // ── NPI Integrity (NPI dashboard) ──
  npiFull:
    'The 10-digit National Provider Identifier assigned by CMS. This is the canonical identifier used to match your NPPES registry record to your website.',
  npiRegistryVerification:
    'Compares data from the CMS NPPES registry (official provider directory) against the information displayed on your website to find discrepancies.',
  npiVsSite:
    'Side-by-side comparison showing what NPPES says vs. what your website shows. Mismatches can trigger compliance flags and confuse patients.',
  checkStatus:
    'Pass: check is compliant. Fail: violation detected. Warn: potential issue needing review. Inconclusive: unable to determine (often due to missing data).',
  providerRoster:
    'Verifies that all providers listed on your website match their official NPPES credentials, including name spelling, specialty, and practice address.',
  mismatchHistory:
    'Timeline of detected discrepancies between your NPPES record and website. Tracks when mismatches were first seen, last seen, and how often they recur.',

  // ── Documents / Audit Report ──
  auditReport:
    'Your Sovereignty Audit Report — a detailed PDF documenting every compliance check, violations found, recommended fixes, and fix priority levels.',
  fixPriority:
    'Critical: fix immediately, active violation. High: fix this week, likely violation. Medium: fix within 30 days. Low: best practice improvement.',
  violations:
    'Specific compliance violations found during the audit. Each entry includes the violated clause, technical finding, and recommended remediation steps.',

  // ── Widget ──
  widgetEmbed:
    'HTML snippet to embed a live compliance badge on your website. Shows your current score and compliance status to patients. Updates automatically after each scan.',

  // ── Subscription ──
  subscriptionTier:
    'Watch: scan-on-demand with basic reporting. Shield ($79/mo): 24/7 automated monitoring, drift detection, real-time alerts, and priority support.',
  trialStatus:
    'Your current trial status. Shield trials include full monitoring features. When the trial ends, your account reverts to Watch tier unless upgraded.',
} as const;
