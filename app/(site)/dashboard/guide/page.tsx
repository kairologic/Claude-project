import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sentry Shield Dashboard Guide | KairoLogic',
  description: 'Complete user manual for the KairoLogic Sentry Shield compliance monitoring dashboard.',
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
        <span className="w-1 h-6 rounded-full bg-gold" />
        {title}
      </h2>
      <div className="text-slate-300 text-sm leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
      <div className="text-gold font-semibold text-sm mb-1">{label}</div>
      <div className="text-slate-400 text-xs leading-relaxed">{children}</div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    gray: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

const TOC = [
  { id: 'overview', label: 'Dashboard Overview' },
  { id: 'score', label: 'Compliance Score' },
  { id: 'tiers', label: 'Risk Tiers' },
  { id: 'categories', label: 'Category Scores' },
  { id: 'border-map', label: 'Data Border Map' },
  { id: 'npi-integrity', label: 'NPI Integrity' },
  { id: 'drift-monitor', label: 'Drift Monitor' },
  { id: 'scan-history', label: 'Scan History' },
  { id: 'alerts', label: 'Alerts & Severity' },
  { id: 'audit-report', label: 'Audit Report' },
  { id: 'widget', label: 'Compliance Widget' },
  { id: 'subscription', label: 'Subscription Tiers' },
  { id: 'authentication', label: 'Authentication & Security' },
  { id: 'faq', label: 'FAQ' },
];

export default function DashboardGuidePage() {
  return (
    <div className="min-h-screen bg-[#070d1b]">
      {/* Header */}
      <header className="border-b border-white/[0.06] sticky top-0 z-40 bg-[#070d1b]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-block">
              <h1 className="text-lg font-extrabold">
                <span className="text-white">KAIRO</span>
                <span className="text-gold">LOGIC</span>
              </h1>
            </Link>
            <p className="text-gold text-[10px] font-bold uppercase tracking-[1.5px]">Sentry Shield — User Guide</p>
          </div>
          <Link href="/dashboard" className="text-slate-400 hover:text-white text-xs transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar TOC */}
        <nav className="hidden lg:block w-56 flex-shrink-0 py-8 pr-6 sticky top-20 self-start" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-[1.5px] mb-3">On this page</div>
          <ul className="space-y-1">
            {TOC.map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="block text-xs text-slate-400 hover:text-gold py-1 transition-colors">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 py-8 px-6 lg:pl-10 space-y-12 min-w-0">

          {/* Intro */}
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-3">Sentry Shield Dashboard Guide</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
              Welcome to the KairoLogic Sentry Shield dashboard. This guide explains every section,
              metric, and interactive element you will encounter while monitoring your healthcare
              website&apos;s compliance with Texas SB 1188 and HB 149.
            </p>
          </div>

          {/* 1. Overview */}
          <Section id="overview" title="Dashboard Overview">
            <p>
              The Sentry Shield dashboard is your central hub for monitoring Texas healthcare
              compliance. It is divided into tabs accessible from the left sidebar:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
              <li><strong className="text-white">Dashboard</strong> — Overview with score ring, category cards, recent scans, and active alerts</li>
              <li><strong className="text-white">Data Border Map</strong> — Live view of every endpoint your website communicates with</li>
              <li><strong className="text-white">Drift Alerts</strong> — Changes detected between scans (Shield subscribers)</li>
              <li><strong className="text-white">Scan History</strong> — Chronological list of all compliance scans</li>
              <li><strong className="text-white">NPI Integrity</strong> — NPPES registry vs. website comparison (NPI dashboard)</li>
              <li><strong className="text-white">Audit Report</strong> — Your downloadable PDF compliance report</li>
              <li><strong className="text-white">Widget Settings</strong> — Embed code for your website compliance badge</li>
              <li><strong className="text-white">Settings</strong> — Account, subscription, and notification preferences</li>
            </ul>
            <p className="text-slate-500 text-xs">
              The top bar displays your practice name, NPI number, website URL, and quick-action buttons
              (Refresh, Download Report, Copy Widget Code).
            </p>
          </Section>

          {/* 2. Score */}
          <Section id="score" title="Compliance Score">
            <p>
              Your <strong className="text-white">Composite Compliance Score</strong> (0&ndash;100) is the
              weighted average of all individual compliance checks across Data Residency, AI Transparency,
              Clinical Integrity, and NPI Integrity categories.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="75&ndash;100: Compliant">
                Your website meets all major Texas healthcare compliance requirements. Continue monitoring to maintain this status.
              </Field>
              <Field label="50&ndash;74: Needs Work">
                Some compliance checks are failing. Review the category breakdown and address flagged issues to avoid regulatory action.
              </Field>
              <Field label="0&ndash;49: Violation Risk">
                Significant compliance gaps detected. Immediate remediation is recommended to avoid fines up to $50,000 per violation.
              </Field>
            </div>
            <p className="text-slate-500 text-xs">
              The score ring on the Dashboard tab visually represents your score. The color changes
              from green (75+) to amber (50&ndash;74) to red (&lt;50).
            </p>
          </Section>

          {/* 3. Tiers */}
          <Section id="tiers" title="Risk Tiers">
            <p>
              Each score maps to a <strong className="text-white">risk tier</strong> that determines your
              compliance posture at a glance:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/[0.03] border border-green-500/20 rounded-lg p-4 text-center">
                <Badge color="green">Sovereign</Badge>
                <div className="text-slate-400 text-xs mt-2">Score 80+</div>
                <div className="text-slate-500 text-[10px] mt-1">Fully compliant</div>
              </div>
              <div className="bg-white/[0.03] border border-amber-500/20 rounded-lg p-4 text-center">
                <Badge color="amber">Drift</Badge>
                <div className="text-slate-400 text-xs mt-2">Score 60&ndash;79</div>
                <div className="text-slate-500 text-[10px] mt-1">Minor issues</div>
              </div>
              <div className="bg-white/[0.03] border border-red-500/20 rounded-lg p-4 text-center">
                <Badge color="red">Violation</Badge>
                <div className="text-slate-400 text-xs mt-2">Score &lt;60</div>
                <div className="text-slate-500 text-[10px] mt-1">Action required</div>
              </div>
              <div className="bg-white/[0.03] border border-slate-500/20 rounded-lg p-4 text-center">
                <Badge color="gray">Pending</Badge>
                <div className="text-slate-400 text-xs mt-2">Score 0 / null</div>
                <div className="text-slate-500 text-[10px] mt-1">No scan data</div>
              </div>
            </div>
          </Section>

          {/* 4. Categories */}
          <Section id="categories" title="Category Scores">
            <p>
              Your composite score is broken down into individual compliance categories:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Data Residency (SB 1188)">
                Checks whether patient data stays within US borders. Verifies that all third-party
                endpoints (analytics, CDNs, forms) resolve to US-based servers. Violations indicate
                data leaving the country.
              </Field>
              <Field label="AI Transparency (HB 149)">
                Checks whether AI-powered tools on your website are properly disclosed to patients.
                This includes chatbots, symptom checkers, scheduling assistants, and any AI-generated content.
              </Field>
              <Field label="Clinical Integrity">
                Verifies that clinical content, provider credentials, and medical claims on your
                website are accurate, up-to-date, and consistent with authoritative sources.
              </Field>
              <Field label="NPI Integrity">
                Compares your NPPES registry data (name, address, specialty, phone) against what
                your website displays. Mismatches can confuse patients and trigger compliance flags.
              </Field>
            </div>
            <p className="text-slate-500 text-xs">
              Each category card shows its percentage score, pass/fail count, and a progress bar.
              Badges read <Badge color="green">Pass</Badge> (75%+), <Badge color="amber">Warn</Badge> (50&ndash;74%), or <Badge color="red">Fail</Badge> (&lt;50%).
            </p>
          </Section>

          {/* 5. Border Map */}
          <Section id="border-map" title="Data Border Map">
            <p>
              The Data Border Map shows every external endpoint your website communicates with
              and whether data stays within US borders (SB 1188 compliance).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Endpoint">
                The domain or hostname that your website sends data to &mdash; analytics trackers,
                form processors, CDN assets, and third-party scripts.
              </Field>
              <Field label="IP Address">
                The resolved IP address used to geolocate where patient data is being transmitted.
              </Field>
              <Field label="Location">
                Physical server location. US-based locations pass SB 1188; foreign locations fail.
              </Field>
              <Field label="Status">
                <Badge color="green">Pass</Badge> = US-sovereign (data stays in US). <Badge color="red">Fail</Badge> = foreign server, potential SB 1188 violation.
              </Field>
            </div>
            <p className="text-slate-500 text-xs">
              The summary counters at the top show <strong className="text-emerald-400">US-Sovereign</strong> vs. <strong className="text-red-400">Foreign</strong> endpoint counts.
              Any foreign endpoints require remediation.
            </p>
          </Section>

          {/* 6. NPI Integrity */}
          <Section id="npi-integrity" title="NPI Integrity">
            <p>
              The NPI Integrity tab is available on the provider-specific dashboard (<code className="text-gold text-xs">/dashboard/[npi]</code>).
              It compares your official NPPES registry record against your website&apos;s displayed information.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="NPI Registry Verification">
                Side-by-side comparison of what NPPES says vs. what your website shows for each
                data point (name, address, specialty, phone, etc.).
              </Field>
              <Field label="Check Status">
                <Badge color="green">Pass</Badge> = compliant.{' '}
                <Badge color="red">Fail</Badge> = violation detected.{' '}
                <Badge color="amber">Warn</Badge> = potential issue.{' '}
                <Badge color="gray">Inconclusive</Badge> = unable to determine.
              </Field>
              <Field label="Provider Roster Integrity">
                Verifies that all providers listed on your website match their official NPPES
                credentials. Available to Shield subscribers only.
              </Field>
              <Field label="Mismatch History">
                Timeline of detected discrepancies. Tracks when mismatches were first seen,
                last seen, and their recurrence count.
              </Field>
            </div>
          </Section>

          {/* 7. Drift Monitor */}
          <Section id="drift-monitor" title="Drift Monitor">
            <p>
              The Drift Monitor (Shield subscribers only) tracks changes between scans &mdash; new scripts
              added, content modified, disclosures removed, or configuration changes that affect compliance.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Drift Event">
                A detected change on your website since the last scan. Events include added/removed
                scripts, content modifications, and configuration changes.
              </Field>
              <Field label="Resolved">
                A resolved event means the change has been fixed or reviewed and determined acceptable.
                Unresolved events remain flagged until addressed.
              </Field>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Watch-tier subscribers see scan-to-scan diffs only. Shield subscribers get real-time
              detection and immediate alerts.
            </p>
          </Section>

          {/* 8. Scan History */}
          <Section id="scan-history" title="Scan History">
            <p>
              A chronological record of every compliance scan performed on your website.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Scan Type">
                <strong className="text-white">Manual:</strong> triggered by you.{' '}
                <strong className="text-white">Automated:</strong> scheduled monitoring.{' '}
                <strong className="text-white">Onboarding:</strong> initial baseline scan.
              </Field>
              <Field label="Findings Count">
                Total compliance checks evaluated during this scan, including passes, failures, and warnings.
              </Field>
              <Field label="Score">
                The composite compliance score at the time of this scan. Compare across scans to
                track your compliance trajectory.
              </Field>
            </div>
          </Section>

          {/* 9. Alerts */}
          <Section id="alerts" title="Alerts & Severity Levels">
            <p>
              Alerts are generated when scans detect violations or when previously compliant checks
              regress. Each alert carries a severity level:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-center">
                <Badge color="red">Critical</Badge>
                <div className="text-slate-400 text-[10px] mt-2">Immediate compliance breach. Fix now.</div>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 text-center">
                <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border bg-orange-500/10 text-orange-400 border-orange-500/20">High</span>
                <div className="text-slate-400 text-[10px] mt-2">Likely violation if not addressed soon.</div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-center">
                <Badge color="amber">Medium</Badge>
                <div className="text-slate-400 text-[10px] mt-2">Potential issue worth reviewing.</div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-center">
                <Badge color="blue">Low</Badge>
                <div className="text-slate-400 text-[10px] mt-2">Informational change.</div>
              </div>
            </div>
          </Section>

          {/* 10. Audit Report */}
          <Section id="audit-report" title="Audit Report">
            <p>
              The <strong className="text-white">Sovereignty Audit Report</strong> is a detailed PDF
              documenting every compliance check, violations found, recommended fixes, and fix priority levels.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Violations">
                Each entry includes the violated clause (SB 1188 or HB 149), the technical finding,
                and a recommended remediation step.
              </Field>
              <Field label="Fix Priority">
                <Badge color="red">Critical</Badge> = fix immediately.{' '}
                <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border bg-orange-500/10 text-orange-400 border-orange-500/20">High</span> = fix this week.{' '}
                <Badge color="amber">Medium</Badge> = fix within 30 days.{' '}
                <Badge color="blue">Low</Badge> = best practice improvement.
              </Field>
            </div>
            <p className="text-slate-500 text-xs">
              Download the full report from the Audit Report tab or via the &quot;Report&quot; button in the top bar.
            </p>
          </Section>

          {/* 11. Widget */}
          <Section id="widget" title="Compliance Widget">
            <p>
              The compliance widget is an HTML embed you add to your website to display a live
              compliance badge showing your current score and status to patients.
            </p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <div className="text-gold font-semibold text-sm mb-2">How to install</div>
              <ol className="text-slate-400 text-xs leading-relaxed space-y-1.5 list-decimal list-inside">
                <li>Go to the <strong className="text-white">Widget Settings</strong> tab in your dashboard</li>
                <li>Click <strong className="text-white">Copy Code</strong> to copy the embed snippet</li>
                <li>Paste it into your website&apos;s HTML, ideally in the footer before the closing <code className="text-gold">&lt;/body&gt;</code> tag</li>
                <li>The widget auto-updates after each scan &mdash; no maintenance needed</li>
              </ol>
            </div>
          </Section>

          {/* 12. Subscription */}
          <Section id="subscription" title="Subscription Tiers">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white/[0.03] border border-blue-500/20 rounded-lg p-5">
                <div className="text-blue-400 font-bold text-sm mb-2">Watch (Free / On-Demand)</div>
                <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
                  <li>On-demand compliance scans</li>
                  <li>Basic reporting</li>
                  <li>NPI integrity checks</li>
                  <li>Data border map</li>
                  <li>Compliance widget</li>
                </ul>
              </div>
              <div className="bg-white/[0.03] border border-emerald-500/20 rounded-lg p-5">
                <div className="text-emerald-400 font-bold text-sm mb-2">Shield ($79/mo)</div>
                <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
                  <li>Everything in Watch, plus:</li>
                  <li>24/7 automated monitoring</li>
                  <li>Real-time drift detection</li>
                  <li>Instant alert notifications</li>
                  <li>Provider roster monitoring</li>
                  <li>Priority support</li>
                </ul>
              </div>
            </div>
            <p className="text-slate-500 text-xs">
              Shield trials include full monitoring features. When the trial ends, your account
              reverts to Watch tier unless you upgrade.
            </p>
          </Section>

          {/* 13. Auth */}
          <Section id="authentication" title="Authentication & Security">
            <p>
              The Sentry Shield dashboard uses a secure two-factor authentication flow:
            </p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <ol className="text-slate-400 text-xs leading-relaxed space-y-2 list-decimal list-inside">
                <li><strong className="text-white">Magic Link:</strong> Enter your email on the login page. You&apos;ll receive a one-time login link valid for 10 minutes.</li>
                <li><strong className="text-white">PIN Verification (2FA):</strong> On new or untrusted devices, enter the 6-digit PIN sent to your email. You have 5 attempts.</li>
                <li><strong className="text-white">Device Trust:</strong> Check &quot;Trust this device for 90 days&quot; to skip PIN verification on future logins from the same browser.</li>
              </ol>
            </div>
            <p className="text-slate-500 text-xs">
              <strong className="text-white">Sign out</strong> keeps your device trusted.{' '}
              <strong className="text-white">Forget this device</strong> removes the device trust token, requiring PIN verification on your next login.
            </p>
          </Section>

          {/* 14. FAQ */}
          <Section id="faq" title="Frequently Asked Questions">
            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <div className="text-white font-semibold text-sm mb-1">How often are automated scans run?</div>
                <div className="text-slate-400 text-xs">Shield subscribers receive automated scans daily. Watch subscribers can trigger scans on demand from the dashboard or via the API.</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <div className="text-white font-semibold text-sm mb-1">What does a &quot;foreign endpoint&quot; mean?</div>
                <div className="text-slate-400 text-xs">A foreign endpoint is any server your website sends data to that is located outside the United States. Under SB 1188, patient data must not leave US borders, so foreign endpoints are flagged as potential violations.</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <div className="text-white font-semibold text-sm mb-1">How do I fix a compliance violation?</div>
                <div className="text-slate-400 text-xs">Each violation in your Audit Report includes a recommended fix and priority level. Common fixes include switching to US-based analytics providers, adding AI disclosure banners, and updating provider information to match NPPES records.</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <div className="text-white font-semibold text-sm mb-1">Can I share my dashboard with my web developer?</div>
                <div className="text-slate-400 text-xs">Yes. The NPI-specific dashboard (<code className="text-gold">/dashboard/[npi]?token=...</code>) can be shared via its URL. The token provides read-only access to compliance data without requiring login credentials.</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <div className="text-white font-semibold text-sm mb-1">What happens when my Shield trial ends?</div>
                <div className="text-slate-400 text-xs">Your account reverts to Watch tier. You retain access to on-demand scans and existing reports, but automated monitoring, drift detection, and real-time alerts are paused until you upgrade.</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <div className="text-white font-semibold text-sm mb-1">How do I contact support?</div>
                <div className="text-slate-400 text-xs">
                  Email <a href="mailto:compliance@kairologic.net" className="text-gold hover:underline">compliance@kairologic.net</a> or
                  call <a href="tel:+15124022237" className="text-gold hover:underline">(512) 402-2237</a>.
                  Shield subscribers receive priority response within 4 business hours.
                </div>
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div className="pt-8 border-t border-white/[0.04]">
            <p className="text-slate-600 text-[10px]">
              &copy; {new Date().getFullYear()} KairoLogic. This guide is updated alongside dashboard releases.
              For the latest information, visit <Link href="/dashboard/guide" className="text-gold hover:underline">kairologic.net/dashboard/guide</Link>.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
