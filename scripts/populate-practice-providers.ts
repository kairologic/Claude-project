// scripts/populate-practice-providers.ts
// ═══ KairoLogic — Practice Provider Pre-Population ═══
//
// Dramatically improves provider match rates by using two approaches:
//
// APPROACH 1: NPPES Address Co-Location
//   For each practice_website (which has an org NPI from registry):
//   1. Look up the Type 2 org in providers table to get its practice address
//   2. Find all Type 1 individuals in providers with the same address
//   3. Insert them into practice_providers as DETECTED associations
//
//   This works because NPPES practice addresses are where providers
//   actually see patients. Multiple Type 1 providers at the same
//   address as a Type 2 org = they work at that practice.
//
// APPROACH 2: PECOS Reassignment Bridge (when data is available)
//   Uses PECOS reassignment data to map individual NPIs to org NPIs.
//   The reassignment file shows which individuals bill through which orgs.
//
// Run: npx tsx scripts/populate-practice-providers.ts [--limit 500] [--dry-run]

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function db(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:
        options.method === 'POST'
          ? 'resolution=ignore-duplicates,return=minimal'
          : 'return=representation',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB error: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    limit: parseInt(args.find((a: any, i: any) => args[i - 1] === '--limit') || '500', 10),
    dryRun: args.includes('--dry-run'),
    offset: parseInt(args.find((a: any, i: any) => args[i - 1] === '--offset') || '0', 10),
  };
}

// ═══════════════════════════════════════════════════════════
// APPROACH 1: NPPES Address Co-Location
// ═══════════════════════════════════════════════════════════

interface CoLocationResult {
  practiceWebsiteId: string;
  orgNpi: string;
  orgName: string;
  orgAddress: string;
  individualNpis: string[];
}

/**
 * For a given org NPI, find all Type 1 individuals at the same practice address.
 */
async function findCoLocatedProviders(
  orgNpi: string,
): Promise<{ address: string; city: string; state: string; providers: any[] }> {
  // 1. Look up the Type 2 org's address
  const orgs: any[] = await db(
    `providers?npi=eq.${orgNpi}&entity_type_code=eq.2&select=npi,organization_name,address_line_1,city,state,zip_code`,
  );

  if (!orgs?.length || !orgs[0].address_line_1) {
    return { address: '', city: '', state: '', providers: [] };
  }

  const org = orgs[0];
  const addr = org.address_line_1?.trim();
  const city = org.city?.trim();
  const state = org.state?.trim();

  if (!addr || !city || !state) {
    return { address: addr || '', city: city || '', state: state || '', providers: [] };
  }

  // 2. Find Type 1 individuals at the same address + city + state
  const encodedAddr = encodeURIComponent(addr);
  const encodedCity = encodeURIComponent(city);

  const individuals: any[] = await db(
    `providers?address_line_1=eq.${encodedAddr}&city=eq.${encodedCity}&state=eq.${state}&entity_type_code=eq.1&deactivation_date=is.null&select=npi,first_name,last_name,primary_taxonomy_code&limit=50`,
  );
  return {
    address: addr,
    city,
    state,
    providers: individuals || [],
  };
}

/**
 * Run address co-location matching for a batch of practice_websites.
 */
async function runAddressCoLocation(options: {
  limit: number;
  offset: number;
  dryRun: boolean;
}): Promise<{
  sitesProcessed: number;
  providersFound: number;
  associationsCreated: number;
  sitesWithProviders: number;
}> {
  const { limit, offset, dryRun } = options;
  const stats = {
    sitesProcessed: 0,
    providersFound: 0,
    associationsCreated: 0,
    sitesWithProviders: 0,
  };

  // Fetch practice_websites with org NPIs
  const sites: any[] = await db(
    `practice_websites?npi=not.is.null&select=id,npi,name,url,state&order=created_at.asc&limit=${limit}&offset=${offset}`,
  );

  console.log(`[CoLocation] Processing ${sites.length} practice websites...`);

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    stats.sitesProcessed++;

    try {
      const result = await findCoLocatedProviders(site.npi);

      if (result.providers.length > 0) {
        stats.sitesWithProviders++;
        stats.providersFound += result.providers.length;

        if (!dryRun) {
          // Insert into practice_providers
          const rows = result.providers.map((p: any) => ({
            npi: p.npi,
            practice_website_id: site.id,
            association_source: 'DETECTED',
            status: 'UNVERIFIED',
          }));

          try {
            await db('practice_providers?on_conflict=npi,practice_website_id', {
              method: 'POST',
              body: JSON.stringify(rows),
            });
            stats.associationsCreated += rows.length;
          } catch (err: any) {
            // Ignore duplicate key errors
            if (!err.message?.includes('23505')) {
              console.warn(`[CoLocation] Insert error for ${site.url}: ${err.message}`);
            }
          }
        } else {
          stats.associationsCreated += result.providers.length;
        }

        if (stats.sitesProcessed % 50 === 0 || result.providers.length >= 5) {
          console.log(
            `  [${stats.sitesProcessed}/${sites.length}] ${site.name || site.url}: ` +
              `${result.providers.length} providers at ${result.address}, ${result.city}`,
          );
        }
      }
    } catch (err: any) {
      // Skip individual site errors
      if (err.message?.includes('57014')) {
        // Statement timeout — skip quietly
      } else {
        console.warn(
          `  [${stats.sitesProcessed}] Error for ${site.url}: ${err.message?.substring(0, 80)}`,
        );
      }
    }

    // Progress every 100 sites
    if (stats.sitesProcessed % 100 === 0) {
      console.log(
        `  Progress: ${stats.sitesProcessed}/${sites.length} sites, ` +
          `${stats.providersFound} providers found, ` +
          `${stats.sitesWithProviders} sites with matches`,
      );
    }
  }

  return stats;
}

// ═══════════════════════════════════════════════════════════
// APPROACH 2: PECOS Reassignment Bridge
// ═══════════════════════════════════════════════════════════

// The PECOS reassignment dataset maps:
//   RNDRNG_NPI (individual rendering provider) → RCV_NPI (org receiving billing)
//
// If practice_websites.npi matches RCV_NPI, then RNDRNG_NPI practices there.
//
// Dataset ID discovery: Run this to find the reassignment dataset ID:
//   Invoke-WebRequest -Uri "https://data.cms.gov/data-api/v1/dataset/2457ea29-fc82-48b0-86ec-3b0755de7515/data-viewer?size=0"
//
// TODO: Once discovered, add PECOS_REASSIGNMENT_DATASET_ID and implement
// fetchReassignmentFromApi() similar to fetchPecosFromApi() in pecos-client.ts.

// For now, we use Approach 1 (address co-location) which works with existing data.

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  KairoLogic — Practice Provider Pre-Population');
  console.log('  NPPES Address Co-Location Matching');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Limit:    ${opts.limit}`);
  console.log(`  Offset:   ${opts.offset}`);
  console.log(`  Dry run:  ${opts.dryRun}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Check if providers table has address data
  const testProvider: any[] = await db(
    `providers?entity_type_code=eq.2&state=eq.TX&address_line_1=not.is.null&select=npi,organization_name,address_line_1,city,state&limit=1`,
  );

  if (!testProvider?.length) {
    console.error(
      '[FATAL] No Type 2 providers with addresses found. Check providers table schema.',
    );
    process.exit(1);
  }

  console.log(
    `[Check] Providers table has address data. Sample: ${testProvider[0].organization_name} at ${testProvider[0].address_line_1}, ${testProvider[0].city} ${testProvider[0].state}\n`,
  );

  const startTime = Date.now();
  const result = await runAddressCoLocation(opts);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Sites processed:       ${result.sitesProcessed}`);
  console.log(
    `  Sites with providers:  ${result.sitesWithProviders} (${((result.sitesWithProviders / Math.max(result.sitesProcessed, 1)) * 100).toFixed(1)}%)`,
  );
  console.log(`  Total providers found: ${result.providersFound}`);
  console.log(`  Associations created:  ${result.associationsCreated}`);
  console.log(`  Duration:              ${duration}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (opts.dryRun) {
    console.log('\n  ⚠ DRY RUN — no data was written');
    console.log('  Run without --dry-run to populate practice_providers');
  }
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
