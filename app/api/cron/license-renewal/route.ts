import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';
import { LICENSE_RENEWAL_TASKS } from '@/lib/workflow/workflow-templates';

/**
 * Vercel Cron: License Renewal Countdown Monitor
 * Runs weekly (Mondays at 7 AM UTC).
 *
 * Scans provider_licenses for upcoming expirations and creates
 * tiered alerts at 90, 60, and 30 day marks.
 *
 * Tiers:
 *   90 days → 'info' alert (heads-up)
 *   60 days → 'warning' alert (start renewal)
 *   30 days → 'action' alert (urgent renewal needed)
 *   Expired  → 'critical' alert + has_license_issue flag
 *
 * Only processes licenses linked to active practice providers.
 */

const RENEWAL_TIERS = [
  { days: 90, severity: 'info' as const, label: '90-day notice' },
  { days: 60, severity: 'warning' as const, label: '60-day warning' },
  { days: 30, severity: 'action' as const, label: '30-day urgent' },
  { days: 0, severity: 'critical' as const, label: 'EXPIRED' },
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const startTime = Date.now();
  const now = new Date();
  const log: string[] = [];

  const results = {
    licenses_scanned: 0,
    expiring_90d: 0,
    expiring_60d: 0,
    expiring_30d: 0,
    expired: 0,
    alerts_created: 0,
    workflows_created: 0,
    flags_set: 0,
    errors: [] as string[],
  };

  try {
    // 1. Get all licenses with expiration dates, joined to active providers
    //    Only check licenses for providers in tracked practices.
    const { data: licenses, error: licErr } = await supabase
      .from('provider_licenses')
      .select(
        'id, npi, licensee_name, license_number, state, license_type, license_status, expiration_date',
      )
      .not('expiration_date', 'is', null)
      .in('license_status', ['active', 'Active', 'ACTIVE']);

    if (licErr || !licenses) {
      return NextResponse.json(
        {
          message: 'Failed to fetch licenses',
          error: licErr?.message,
        },
        { status: 500 },
      );
    }

    results.licenses_scanned = licenses.length;

    // Get NPIs that are active in tracked practices
    const { data: activeProviders } = await supabase
      .from('practice_providers')
      .select('npi, practice_website_id, provider_name')
      .in('roster_status', ['active', 'onboarding']);

    if (!activeProviders || activeProviders.length === 0) {
      return NextResponse.json({
        message: 'No active providers to monitor for license renewal',
        ...results,
        duration_ms: Date.now() - startTime,
      });
    }

    const activeNpiMap = new Map<string, typeof activeProviders>();
    for (const p of activeProviders) {
      const existing = activeNpiMap.get(p.npi) || [];
      existing.push(p);
      activeNpiMap.set(p.npi, existing);
    }

    // 2. Check each license against renewal tiers
    for (const lic of licenses) {
      if (!lic.expiration_date || !activeNpiMap.has(lic.npi)) continue;

      const expiryDate = new Date(lic.expiration_date);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / 86_400_000);

      // Determine which tier this license falls into
      let matchedTier: (typeof RENEWAL_TIERS)[0] | null = null;

      if (daysUntilExpiry <= 0) {
        matchedTier = RENEWAL_TIERS[3]; // expired
        results.expired++;
      } else if (daysUntilExpiry <= 30) {
        matchedTier = RENEWAL_TIERS[2]; // 30-day
        results.expiring_30d++;
      } else if (daysUntilExpiry <= 60) {
        matchedTier = RENEWAL_TIERS[1]; // 60-day
        results.expiring_60d++;
      } else if (daysUntilExpiry <= 90) {
        matchedTier = RENEWAL_TIERS[0]; // 90-day
        results.expiring_90d++;
      }

      if (!matchedTier) continue; // More than 90 days out — no action needed

      const practices = activeNpiMap.get(lic.npi) || [];

      for (const practice of practices) {
        try {
          // Check if we've already alerted for this license at this tier
          const alertTag = `license_renewal_${lic.license_number}_${matchedTier.days}d`;
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('practice_website_id', practice.practice_website_id)
            .eq('provider_npi', lic.npi)
            .eq('alert_type', alertTag)
            .limit(1);

          if (existingAlert && existingAlert.length > 0) continue; // Already sent

          // Create alert
          const expiryStr = expiryDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });

          const isExpired = daysUntilExpiry <= 0;
          const title = isExpired
            ? `EXPIRED: ${lic.licensee_name || lic.npi} — ${lic.state} ${lic.license_type || 'medical'} license expired ${expiryStr}`
            : `License renewal ${matchedTier.label}: ${lic.licensee_name || lic.npi} — ${lic.state} license expires ${expiryStr}`;

          const message = isExpired
            ? `The ${lic.state} ${lic.license_type || 'medical'} license (#${lic.license_number}) for ` +
              `${lic.licensee_name || `NPI ${lic.npi}`} expired on ${expiryStr}. ` +
              `This provider may not be able to practice or bill until the license is renewed. ` +
              `Contact the state medical board immediately.`
            : `The ${lic.state} ${lic.license_type || 'medical'} license (#${lic.license_number}) for ` +
              `${lic.licensee_name || `NPI ${lic.npi}`} expires in ${daysUntilExpiry} days (${expiryStr}). ` +
              `Begin the renewal process with the ${lic.state} medical board to avoid a lapse in credentials.`;

          await supabase.from('alerts').insert({
            practice_website_id: practice.practice_website_id,
            alert_type: alertTag,
            severity: matchedTier.severity,
            title,
            message,
            provider_npi: lic.npi,
          });
          results.alerts_created++;

          // WF5: Create license_renewal workflow at 60-day mark
          // (not 90d — too early; not 30d — too late to start)
          if (matchedTier.days === 60 || isExpired) {
            const { data: existingWf } = await supabase
              .from('workflow_instances')
              .select('id')
              .eq('practice_id', practice.practice_website_id)
              .eq('workflow_type', 'license_renewal')
              .eq('provider_npi', lic.npi)
              .neq('status', 'resolved')
              .neq('status', 'cancelled')
              .limit(1);

            if (!existingWf || existingWf.length === 0) {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() + (isExpired ? 14 : daysUntilExpiry));

              const { data: wfRows } = await supabase
                .from('workflow_instances')
                .insert({
                  practice_id: practice.practice_website_id,
                  workflow_type: 'license_renewal',
                  status: isExpired ? 'action_needed' : 'in_progress',
                  priority: isExpired ? 1 : 2,
                  provider_npi: lic.npi,
                  provider_name: lic.licensee_name || practice.provider_name || `NPI ${lic.npi}`,
                  trigger_source: 'license_renewal_cron',
                  finding_summary: isExpired
                    ? `EXPIRED: ${lic.state} ${lic.license_type || 'medical'} license`
                    : `${lic.state} license expires in ${daysUntilExpiry} days`,
                  finding_details: {
                    license_number: lic.license_number,
                    state: lic.state,
                    license_type: lic.license_type,
                    expiration_date: lic.expiration_date,
                    days_until_expiry: daysUntilExpiry,
                    is_expired: isExpired,
                  },
                  target_completion: targetDate.toISOString().split('T')[0],
                  overdue_at: isExpired
                    ? new Date().toISOString().split('T')[0]
                    : new Date(Date.now() + (daysUntilExpiry - 7) * 86_400_000)
                        .toISOString()
                        .split('T')[0],
                })
                .select();

              if (wfRows && wfRows.length > 0) {
                const wf = wfRows[0];
                results.workflows_created++;

                // Insert tasks from template
                const tasks = LICENSE_RENEWAL_TASKS.map((t) => ({
                  workflow_id: wf.id,
                  task_order: t.task_order,
                  task_type: t.task_type,
                  title: t.title,
                  description: t.description,
                  status: t.task_order === 1 ? 'active' : 'pending',
                  metadata:
                    t.task_type === 'review_license'
                      ? {
                          license_number: lic.license_number,
                          state: lic.state,
                          license_type: lic.license_type,
                          expiration_date: lic.expiration_date,
                        }
                      : {},
                }));

                await supabase.from('workflow_tasks').insert(tasks);
              }
            }
          }

          // For expired licenses, also flag the provider
          if (isExpired) {
            const { error: flagErr } = await supabase
              .from('practice_providers')
              .update({
                has_license_issue: true,
                license_issue_type: 'expired',
                license_issue_detected_at: new Date().toISOString(),
              })
              .eq('npi', lic.npi)
              .eq('practice_website_id', practice.practice_website_id);

            if (!flagErr) results.flags_set++;
          }
        } catch (err) {
          results.errors.push(
            `License ${lic.license_number} for ${lic.npi}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    log.push(
      `Scanned ${results.licenses_scanned} licenses. ` +
        `Expiring: 90d=${results.expiring_90d}, 60d=${results.expiring_60d}, ` +
        `30d=${results.expiring_30d}, expired=${results.expired}. ` +
        `Alerts: ${results.alerts_created}, Workflows: ${results.workflows_created}, Flags: ${results.flags_set}`,
    );

    return NextResponse.json({
      message: log[0],
      ...results,
      log,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error('[license-renewal] Fatal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'License renewal check failed' },
      { status: 500 },
    );
  }
}
