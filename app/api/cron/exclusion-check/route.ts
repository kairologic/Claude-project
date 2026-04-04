import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * Vercel Cron: OIG/LEIE Exclusion List Check
 * Runs monthly (1st of each month at 7 AM UTC).
 *
 * Downloads the OIG LEIE exclusion list CSV and cross-references against
 * all active providers in practice_providers. If a provider is found on
 * the exclusion list, it:
 *   1. Sets has_license_issue = true, license_issue_type = 'excluded_oig'
 *   2. Creates a HIGH priority delta event
 *   3. Creates an alert for the practice
 *
 * OIG LEIE is updated monthly. Any excluded provider cannot participate
 * in Medicare/Medicaid — this is the highest-severity compliance signal.
 *
 * Source: https://oig.hhs.gov/exclusions/exclusions_list.asp
 * CSV download: https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv
 */

const OIG_CSV_URL = 'https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv';
const FETCH_TIMEOUT_MS = 60_000; // 60s — file is ~15MB

interface ExclusionRecord {
  lastName: string;
  firstName: string;
  npi: string;
  exclType: string;
  exclDate: string;
  state: string;
  specialty: string;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const startTime = Date.now();
  const results = {
    exclusion_records_parsed: 0,
    active_npis_checked: 0,
    matches_found: 0,
    flags_created: 0,
    alerts_created: 0,
    errors: [] as string[],
  };

  try {
    // 1. Fetch all active provider NPIs across all tracked practices
    const { data: activeProviders, error: provErr } = await supabase
      .from('practice_providers')
      .select('npi, practice_website_id, provider_name, has_license_issue, license_issue_type')
      .in('roster_status', ['active', 'onboarding']);

    if (provErr || !activeProviders || activeProviders.length === 0) {
      return NextResponse.json({
        message: 'No active providers to check',
        error: provErr?.message,
      });
    }

    // Build a Set of NPIs for O(1) lookup
    const activeNpiSet = new Set(activeProviders.map((p) => p.npi));
    results.active_npis_checked = activeNpiSet.size;

    // 2. Download and parse the OIG LEIE CSV
    //    CSV format: LASTNAME,FIRSTNAME,MIDNAME,BUSNAME,GENERAL,SPECIALTY,
    //                UPIN,NPI,DOB,ADDRESS,CITY,STATE,ZIP,EXCLTYPE,EXCLDATE,
    //                REINDATE,WAIVERDATE,WVRSTATE
    const csvText = await fetchExclusionList();
    if (!csvText) {
      return NextResponse.json(
        {
          message: 'Failed to download OIG exclusion list',
          error: 'CSV fetch returned empty',
        },
        { status: 502 },
      );
    }

    // Parse CSV — skip header row
    const lines = csvText.split('\n');
    const excludedNpis = new Map<string, ExclusionRecord>();

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 15) continue;

      const npi = fields[7]?.trim();
      results.exclusion_records_parsed++;

      // Only track records that have an NPI and match our active providers
      if (npi && npi.length === 10 && activeNpiSet.has(npi)) {
        // Skip if they have a reinstatement date (field 15)
        const reinDate = fields[15]?.trim();
        if (reinDate && reinDate.length > 0) continue;

        excludedNpis.set(npi, {
          lastName: fields[0]?.trim() || '',
          firstName: fields[1]?.trim() || '',
          npi,
          exclType: fields[13]?.trim() || '',
          exclDate: fields[14]?.trim() || '',
          state: fields[11]?.trim() || '',
          specialty: fields[5]?.trim() || '',
        });
      }
    }

    results.matches_found = excludedNpis.size;

    if (excludedNpis.size === 0) {
      return NextResponse.json({
        message: `Checked ${results.active_npis_checked} NPIs against ${results.exclusion_records_parsed} exclusion records. No matches found.`,
        ...results,
        duration_ms: Date.now() - startTime,
      });
    }

    // 3. Flag matched providers and create alerts
    for (const [npi, excl] of excludedNpis) {
      const affectedProviders = activeProviders.filter((p) => p.npi === npi);

      for (const provider of affectedProviders) {
        // Skip if already flagged as excluded
        if (provider.license_issue_type === 'excluded_oig') continue;

        try {
          // Update practice_providers with exclusion flag
          const { error: updateErr } = await supabase
            .from('practice_providers')
            .update({
              has_license_issue: true,
              license_issue_type: 'excluded_oig',
              license_issue_detected_at: new Date().toISOString(),
            })
            .eq('npi', npi)
            .eq('practice_website_id', provider.practice_website_id);

          if (updateErr) {
            results.errors.push(`Flag update failed for ${npi}: ${updateErr.message}`);
            continue;
          }
          results.flags_created++;

          // Create a delta event for the exclusion
          await supabase.from('nppes_delta_events').insert({
            npi,
            practice_website_id: provider.practice_website_id,
            signal_type: 'license_status_change',
            field: 'oig_exclusion',
            old_value: null,
            new_value: `EXCLUDED: ${excl.exclType} (${excl.exclDate})`,
            detection_source: 'oig_leie',
            confidence: 'HIGH',
            details: {
              exclusion_type: excl.exclType,
              exclusion_date: excl.exclDate,
              oig_name: `${excl.lastName}, ${excl.firstName}`,
              oig_state: excl.state,
              oig_specialty: excl.specialty,
            },
          });

          // Create an alert
          await supabase.from('alerts').insert({
            practice_website_id: provider.practice_website_id,
            alert_type: 'oig_exclusion',
            severity: 'critical',
            title: `CRITICAL: ${provider.provider_name || npi} is on OIG Exclusion List`,
            message:
              `Provider ${provider.provider_name || npi} (NPI: ${npi}) appears on the OIG LEIE exclusion list. ` +
              `Exclusion type: ${excl.exclType}, effective ${excl.exclDate}. ` +
              `This provider cannot participate in any federal healthcare programs. ` +
              `Immediate action required: verify with OIG and contact all payers.`,
            provider_npi: npi,
          });
          results.alerts_created++;
        } catch (err) {
          results.errors.push(
            `Processing error for ${npi}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    return NextResponse.json({
      message:
        `OIG exclusion check complete. ${results.matches_found} excluded provider(s) found ` +
        `out of ${results.active_npis_checked} active NPIs checked against ` +
        `${results.exclusion_records_parsed} exclusion records.`,
      ...results,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error('[exclusion-check] Fatal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Exclusion check failed' },
      { status: 500 },
    );
  }
}

// ── CSV Fetch ─────────────────────────────────────────────────

async function fetchExclusionList(): Promise<string | null> {
  try {
    const res = await fetch(OIG_CSV_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'KairoLogic/1.0 (healthcare compliance monitoring)',
      },
    });

    if (!res.ok) {
      console.error(`[exclusion-check] OIG CSV download failed: ${res.status}`);
      return null;
    }

    return await res.text();
  } catch (err) {
    console.error('[exclusion-check] OIG CSV fetch error:', err);
    return null;
  }
}

// ── Simple CSV line parser (handles quoted fields) ────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current); // last field
  return fields;
}
