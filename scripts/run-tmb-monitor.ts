/**
 * run-tmb-monitor.ts
 * 
 * CLI runner for the TMB Newsroom Disciplinary Monitor.
 * Called by GitHub Actions weekly (standalone schedule).
 * 
 * Usage:
 *   npx tsx scripts/run-tmb-monitor.ts                     # normal weekly check (page 1 only)
 *   npx tsx scripts/run-tmb-monitor.ts --dry-run            # parse only, no DB writes
 *   npx tsx scripts/run-tmb-monitor.ts --backfill           # crawl last 6 months (~10 pages)
 *   npx tsx scripts/run-tmb-monitor.ts --backfill --pages 5 # crawl 5 pages
 *   npx tsx scripts/run-tmb-monitor.ts --backfill --since 2025-09-01  # crawl until Sept 2025
 */

import { TMBNewsroomMonitor } from '../lib/monitoring/tmb-newsroom-monitor';

function parseArgs() {
  const args = process.argv.slice(2);
  let dryRun = false;
  let backfill = false;
  let pages = 10;
  let sinceDate: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    if (args[i] === '--backfill') backfill = true;
    if (args[i] === '--pages' && args[i + 1]) {
      pages = parseInt(args[i + 1], 10);
      i++;
    }
    if (args[i] === '--since' && args[i + 1]) {
      sinceDate = args[i + 1];
      i++;
    }
  }

  return { dryRun, backfill, pages, sinceDate };
}

async function main() {
  const { dryRun, backfill, pages, sinceDate } = parseArgs();

  console.log('=== KairoLogic TMB Newsroom Monitor ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : backfill ? `BACKFILL (${pages} pages)` : 'PRODUCTION'}`);
  if (sinceDate) console.log(`Since: ${sinceDate}`);
  console.log('');

  const monitor = new TMBNewsroomMonitor();

  try {
    if (dryRun) {
      // Just fetch and parse, don't write to DB
      if (backfill) {
        console.log(`Fetching ${pages} pages of releases...`);
        const allReleases: any[] = [];

        for (let page = 0; page < pages; page++) {
          console.log(`\nPage ${page + 1}/${pages}:`);
          const releases = await monitor.fetchNewsroomPage(page);

          if (releases.length === 0) {
            console.log('  (empty page, stopping)');
            break;
          }

          // Check cutoff
          if (sinceDate) {
            const cutoff = new Date(sinceDate);
            const filtered = releases.filter(r => new Date(r.date) >= cutoff);
            if (filtered.length < releases.length) {
              console.log(`  ${filtered.length}/${releases.length} releases after cutoff`);
              allReleases.push(...filtered);
              break;
            }
          }

          allReleases.push(...releases);

          for (const release of releases) {
            const icon = release.releaseType === 'EMERGENCY_SUSPENSION' ? '🚨'
              : release.releaseType === 'BOARD_MEETING_ACTIONS' ? '📋'
              : release.releaseType === 'PA_SUSPENSION' ? '⚠️'
              : '📰';

            console.log(`  ${icon} [${release.date}] ${release.title}`);
            if (release.physicianName) {
              console.log(`     → ${release.physicianName} (${release.physicianCity})`);
            }
          }

          // Delay between pages
          if (page < pages - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        const suspensions = allReleases.filter((r: any) => r.releaseType === 'EMERGENCY_SUSPENSION');
        const meetings = allReleases.filter((r: any) => r.releaseType === 'BOARD_MEETING_ACTIONS');

        console.log('');
        console.log('--- BACKFILL DRY RUN SUMMARY ---');
        console.log(`Total releases found:      ${allReleases.length}`);
        console.log(`Emergency suspensions:     ${suspensions.length}`);
        console.log(`Board meeting summaries:   ${meetings.length}`);
        console.log(`Other releases:            ${allReleases.length - suspensions.length - meetings.length}`);
        if (allReleases.length > 0) {
          console.log(`Date range:                ${allReleases[allReleases.length - 1].date} to ${allReleases[0].date}`);
        }

      } else {
        // Single page dry run
        console.log('Fetching newsroom releases (page 1 only)...');
        const releases = await monitor.fetchNewsroomReleases();
        console.log(`Found ${releases.length} releases:\n`);

        for (const release of releases) {
          const icon = release.releaseType === 'EMERGENCY_SUSPENSION' ? '🚨'
            : release.releaseType === 'BOARD_MEETING_ACTIONS' ? '📋'
            : release.releaseType === 'PA_SUSPENSION' ? '⚠️'
            : '📰';

          console.log(`  ${icon} [${release.date}] ${release.title}`);
          console.log(`     Type: ${release.releaseType}`);
          if (release.physicianName) {
            console.log(`     Physician: ${release.physicianName} (${release.physicianCity})`);
          }
          console.log(`     URL: ${release.url}`);
          console.log('');
        }

        const suspensions = releases.filter(r => r.releaseType === 'EMERGENCY_SUSPENSION');
        const meetings = releases.filter(r => r.releaseType === 'BOARD_MEETING_ACTIONS');

        console.log('--- SUMMARY ---');
        console.log(`Emergency suspensions: ${suspensions.length}`);
        console.log(`Board meeting summaries: ${meetings.length}`);
        console.log(`Other releases: ${releases.length - suspensions.length - meetings.length}`);
      }

    } else if (backfill) {
      // Full backfill — crawl multiple pages and process
      const result = await monitor.backfill({
        pages,
        delayMs: 1000,
        sinceDate,
      });

      console.log('');
      console.log('=== BACKFILL RESULTS ===');
      console.log(`New releases processed:  ${result.newReleases}`);
      console.log(`Suspensions detected:    ${result.suspensionsDetected}`);
      console.log(`Board actions detected:  ${result.boardActionsDetected}`);
      console.log(`Provider matches:        ${result.matchesFound}`);
      console.log(`Delta events created:    ${result.deltaEventsCreated}`);
      console.log(`Errors:                  ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.log('');
        console.log('ERRORS:');
        for (const err of result.errors) {
          console.error(`  - ${err}`);
        }
      }

      if (result.suspensionsDetected > 0) {
        console.log('');
        console.log(`*** ${result.suspensionsDetected} emergency suspension(s) detected ***`);
      }

    } else {
      // Normal weekly check (page 1 only)
      const result = await monitor.checkForNewActions();

      console.log('');
      console.log('=== RESULTS ===');
      console.log(`New releases found:      ${result.newReleases}`);
      console.log(`Suspensions detected:    ${result.suspensionsDetected}`);
      console.log(`Board actions detected:  ${result.boardActionsDetected}`);
      console.log(`Provider matches:        ${result.matchesFound}`);
      console.log(`Delta events created:    ${result.deltaEventsCreated}`);
      console.log(`Errors:                  ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.log('');
        console.log('ERRORS:');
        for (const err of result.errors) {
          console.error(`  - ${err}`);
        }
      }

      if (result.suspensionsDetected > 0) {
        console.log('');
        console.log(`*** ${result.suspensionsDetected} emergency suspension(s) detected ***`);
      }
    }

  } catch (err) {
    console.error('FATAL: TMB monitor failed:', err);
    process.exit(1);
  }

  console.log('');
  console.log(`Completed: ${new Date().toISOString()}`);
}

main();
