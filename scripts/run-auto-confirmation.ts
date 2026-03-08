/**
 * run-auto-confirmation.ts
 * 
 * CLI runner for the auto-confirmation polling loop.
 * Called by GitHub Actions daily at 10am UTC.
 * 
 * Replaces the old confirmation-poll logic that only checked
 * SUBMITTED requests. Now checks all FORM_GENERATED and SUBMITTED requests.
 * 
 * Usage:
 *   npx ts-node scripts/run-auto-confirmation.ts
 */

import { AutoConfirmationService } from '../lib/forms/auto-confirmation-loop';

async function main() {
  console.log('=== KairoLogic Auto-Confirmation Polling ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');

  const service = new AutoConfirmationService();

  try {
    const results = await service.pollAllActive();

    console.log('');
    console.log('=== RESULTS ===');
    console.log(`Total active requests: ${results.total}`);
    console.log(`  Confirmed (NPPES updated): ${results.confirmed}`);
    console.log(`  No change (still polling):  ${results.noChange}`);
    console.log(`  Stale (nudge sent):         ${results.stale}`);
    console.log(`  Expired (polling stopped):  ${results.expired}`);
    console.log(`  Errors:                     ${results.errors}`);
    console.log('');

    if (results.confirmed > 0) {
      console.log(`*** ${results.confirmed} update(s) confirmed live in NPPES! ***`);
    }

    if (results.errors > 0) {
      console.warn(`WARNING: ${results.errors} polling error(s) occurred`);
    }

    // Exit with error code if ALL requests errored (something systemic is wrong)
    if (results.total > 0 && results.errors === results.total) {
      console.error('CRITICAL: All polling requests failed');
      process.exit(1);
    }

  } catch (err) {
    console.error('FATAL: Auto-confirmation polling failed:', err);
    process.exit(1);
  }

  console.log(`Completed: ${new Date().toISOString()}`);
}

main();
