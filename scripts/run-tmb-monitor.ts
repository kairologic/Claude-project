/**
 * run-tmb-monitor.ts
 * 
 * CLI runner for the TMB Newsroom Disciplinary Monitor.
 * Called by GitHub Actions weekly (standalone schedule).
 * 
 * Usage:
 *   npx ts-node scripts/run-tmb-monitor.ts
 *   npx ts-node scripts/run-tmb-monitor.ts --dry-run   (parse only, no DB writes)
 */

import { TMBNewsroomMonitor } from '../lib/monitoring/tmb-newsroom-monitor';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('=== KairoLogic TMB Newsroom Monitor ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no DB writes)' : 'PRODUCTION'}`);
  console.log('');

  const monitor = new TMBNewsroomMonitor();

  try {
    if (isDryRun) {
      // Just fetch and parse, don't write to DB
      console.log('Fetching newsroom releases...');
      const releases = await monitor.fetchNewsroomReleases();
      console.log(`Found ${releases.length} releases on page 1:`);
      console.log('');

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

    } else {
      // Full production run
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
        console.log(`*** ALERT: ${result.suspensionsDetected} emergency suspension(s) detected ***`);
      }

      if (result.errors.length > 0 && result.newReleases === 0) {
        console.error('WARNING: Errors occurred and no releases were processed');
        process.exit(1);
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
