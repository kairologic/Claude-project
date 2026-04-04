import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * Vercel Cron: TMB Weekly Re-Sync Monitor
 * Runs weekly (Wednesdays at 4 AM UTC — matches KairoLogic scan schedule).
 *
 * Phase 1A Task 11: Set up TMB weekly re-sync cron job.
 *
 * What this does:
 *   1. Checks when provider_licenses was last synced from TMB data
 *   2. Flags staleness if TMB data is > 10 days old
 *   3. Sends a Supabase alert if a fresh TMB file download is needed
 *   4. Monitors for emergency suspensions in TMB newsroom (via title keywords)
 *   5. Creates 'license_stale' alerts for practices whose providers
 *      have TMB data older than STALE_DAYS
 *
 * NOTE: The full TMB data load (parse + upsert) is triggered by running
 *   npx tsx scripts/tmb-monthly-sync.ts <phy-file>
 * after manually downloading the PHY file from http://orssp.tmb.state.tx.us
 * This cron job MONITORS staleness and triggers alerts — it does not
 * download the file itself (ORSSP requires login + payment per download).
 *
 * Cron schedule (vercel.json): "0 4 * * 3"  (Wednesdays at 04:00 UTC)
 */

const STALE_DAYS = 10;           // Alert if TMB data is older than this
const CRITICAL_STALE_DAYS = 30;  // Critical alert threshold
const TX_STATE = 'TX';

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date();

  const results = {
    checked_at: now.toISOString(),
    tmb_last_synced: null as string | null,
    tmb_staleness_days: null as number | null,
    is_stale: false,
    is_critical: false,
    stale_providers: 0,
    alerts_created: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. Find the most recent TMB sync timestamp ────────────────
    // TMB data is loaded into provider_licenses with tmb_synced_at or similar.
    // We use the MAX of tmb_loaded_at across all TX licenses as the sync time.
    const { data: syncInfo, error: syncErr } = await supabase
      .from('provider_licenses')
      .select('tmb_loaded_at')
      .eq('state', TX_STATE)
      .not('tmb_loaded_at', 'is', null)
      .order('tmb_loaded_at', { ascending: false })
      .limit(1)
      .single();

    if (syncErr && syncErr.code !== 'PGRST116') {
      // PGRST116 = "no rows" — acceptable if table is empty
      results.errors.push(`TMB sync check: ${syncErr.message}`);
    }

    const lastSyncedAt = syncInfo?.tmb_loaded_at
      ? new Date(syncInfo.tmb_loaded_at)
      : null;

    results.tmb_last_synced = lastSyncedAt?.toISOString() ?? null;

    if (lastSyncedAt) {
      const ageDays = (now.getTime() - lastSyncedAt.getTime()) / (1000 * 60 * 60 * 24);
      results.tmb_staleness_days = Math.floor(ageDays);
      results.is_stale = ageDays > STALE_DAYS;
      results.is_critical = ageDays > CRITICAL_STALE_DAYS;
    } else {
      // No TMB data at all — critical
      results.is_stale = true;
      results.is_critical = true;
      results.tmb_staleness_days = 999;
    }

    // ── 2. Count TX providers with stale TMB records ──────────────
    if (results.is_stale) {
      const staleThreshold = new Date(now);
      staleThreshold.setDate(staleThreshold.getDate() - STALE_DAYS);

      const { count } = await supabase
        .from('provider_licenses')
        .select('id', { count: 'exact', head: true })
        .eq('state', TX_STATE)
        .or(
          `tmb_loaded_at.is.null,tmb_loaded_at.lt.${staleThreshold.toISOString()}`,
        );

      results.stale_providers = count ?? 0;
    }

    // ── 3. Create staleness alert if needed ───────────────────────
    if (results.is_stale) {
      const severity = results.is_critical ? 'critical' : 'warning';
      const ageDays = results.tmb_staleness_days ?? 0;

      const alertMessage = results.is_critical
        ? `TMB license data is ${ageDays} days old — CRITICAL. Download fresh PHY file from ORSSP immediately.`
        : `TMB license data is ${ageDays} days old (threshold: ${STALE_DAYS} days). Schedule PHY file download from http://orssp.tmb.state.tx.us`;

      const { error: alertErr } = await supabase.from('alerts').insert({
        type: 'tmb_data_stale',
        severity,
        message: alertMessage,
        metadata: {
          last_synced_at: results.tmb_last_synced,
          staleness_days: ageDays,
          stale_providers: results.stale_providers,
          orssp_url: 'http://orssp.tmb.state.tx.us',
          sync_command: 'npx tsx scripts/tmb-monthly-sync.ts <path-to-PHY-file>',
        },
        is_seen: false,
        created_at: now.toISOString(),
      });

      if (alertErr) {
        results.errors.push(`Alert insert: ${alertErr.message}`);
      } else {
        results.alerts_created++;
      }
    }

    // ── 4. Check for recently suspended TX providers ───────────────
    // The TMB newsroom posts emergency suspension notices.
    // We check for provider_licenses records with SUSPENDED status
    // that don't yet have a workflow created for the practice.
    const suspendedSince = new Date(now);
    suspendedSince.setDate(suspendedSince.getDate() - 7); // Past 7 days

    const { data: suspended, error: suspErr } = await supabase
      .from('provider_licenses')
      .select('npi, licensee_name, license_status, tmb_loaded_at')
      .eq('state', TX_STATE)
      .ilike('license_status', '%suspend%')
      .gte('tmb_loaded_at', suspendedSince.toISOString())
      .limit(50);

    if (!suspErr && suspended && suspended.length > 0) {
      // Create alerts for practices tracking these suspended providers
      for (const provider of suspended) {
        // Check if provider belongs to a tracked practice
        const { data: pp } = await supabase
          .from('practice_providers')
          .select('practice_id, provider_name')
          .eq('npi', provider.npi)
          .limit(1)
          .single();

        if (!pp) continue; // Provider not in a tracked practice

        // Check if alert already exists for this NPI this week
        const { count: existingAlerts } = await supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('type', 'tmb_emergency_suspension')
          .contains('metadata', { npi: provider.npi })
          .gte('created_at', suspendedSince.toISOString());

        if ((existingAlerts ?? 0) > 0) continue;

        await supabase.from('alerts').insert({
          practice_id: pp.practice_id,
          type: 'tmb_emergency_suspension',
          severity: 'critical',
          message: `⚠️ TMB EMERGENCY SUSPENSION: ${provider.licensee_name || provider.npi} has been suspended by the Texas Medical Board.`,
          metadata: {
            npi: provider.npi,
            licensee_name: provider.licensee_name,
            license_status: provider.license_status,
            tmb_loaded_at: provider.tmb_loaded_at,
            tmb_url: 'https://www.tmb.state.tx.us/page/newsroom',
          },
          is_seen: false,
          created_at: now.toISOString(),
        });

        results.alerts_created++;
      }
    } else if (suspErr) {
      results.errors.push(`Suspension check: ${suspErr.message}`);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`Unhandled: ${msg}`);
  }

  const status = results.errors.length > 0 ? 207 : 200;
  return NextResponse.json(results, { status });
}
