// scripts/run-trial-lifecycle.ts
// ═══ Daily Trial Lifecycle Runner ═══
// Called by GitHub Actions daily. Two jobs:
//   1. Downgrade expired trials to free tier
//   2. Send trial email sequences (Day 7, 12, 14, 21)
//
// Usage: npx tsx scripts/run-trial-lifecycle.ts

import { downgradeExpiredTrials } from '../lib/trial/trial-manager';
import { runTrialEmailSequence } from '../lib/trial/trial-emails';

async function main() {
  console.log('=== KairoLogic Trial Lifecycle Runner ===');
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Phase 1: Downgrade expired trials
  console.log('--- Phase 1: Trial Downgrades ---');
  try {
    const downgrades = await downgradeExpiredTrials();
    console.log(`  Downgraded:         ${downgrades.downgraded}`);
    console.log(`  Already converted:  ${downgrades.already_converted}`);
    console.log(`  Still active:       ${downgrades.still_active}`);
  } catch (err) {
    console.error('  Downgrade error:', err);
  }

  // Phase 2: Send trial email sequences
  console.log('\n--- Phase 2: Trial Email Sequences ---');
  try {
    const emails = await runTrialEmailSequence();
    console.log(`  Day 7 (value summary):   ${emails.day7_sent} sent`);
    console.log(`  Day 12 (expiry warning): ${emails.day12_sent} sent`);
    console.log(`  Day 14 (downgrade):      ${emails.day14_sent} sent`);
    console.log(`  Day 21 (nudge):          ${emails.day21_sent} sent`);
    console.log(`  Errors:                  ${emails.errors}`);
  } catch (err) {
    console.error('  Email sequence error:', err);
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
