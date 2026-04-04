#!/usr/bin/env npx tsx
/**
 * KairoLogic Test Coverage Audit
 *
 * Detects when dashboard source files were changed but their
 * corresponding test files were NOT updated. Designed to run:
 *
 *   1. In CI (GitHub Actions) on every PR — fails the build if gaps found
 *   2. Locally before push — warns about untested changes
 *   3. On-demand — full coverage report
 *
 * Usage:
 *   npx tsx tests/audit-coverage.ts                  # Full audit
 *   npx tsx tests/audit-coverage.ts --diff HEAD~1    # Audit last commit
 *   npx tsx tests/audit-coverage.ts --diff main      # Audit vs main branch
 *   npx tsx tests/audit-coverage.ts --report         # Coverage report only
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { COVERAGE_MAP, getUncoveredSources, getCoveredUseCases } from './coverage-map';

// ── Colors ──
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const GOLD = '\x1b[33m';
const BLUE = '\x1b[34m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

// ── Parse args ──
const args = process.argv.slice(2);
const diffRef = args.includes('--diff') ? args[args.indexOf('--diff') + 1] : null;
const reportOnly = args.includes('--report');

// ── Get changed files from git ──
function getChangedFiles(ref: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${ref}`, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    console.error(`${RED}Failed to get git diff against ${ref}${NC}`);
    return [];
  }
}

// ── Check if a test file covers a changed source ──
function findGaps(changedFiles: string[]): {
  gaps: Array<{ source: string; category: string; tests: string[]; useCases: string[] }>;
  covered: Array<{ source: string; test: string }>;
  testFilesChanged: string[];
} {
  const gaps: Array<{ source: string; category: string; tests: string[]; useCases: string[] }> = [];
  const covered: Array<{ source: string; test: string }> = [];
  const testFilesChanged = changedFiles.filter((f) => f.startsWith('tests/'));

  for (const file of changedFiles) {
    // Skip non-source files
    if (file.startsWith('tests/') || file.startsWith('scripts/') || file.startsWith('.github/'))
      continue;
    if (!file.match(/\.(tsx?|jsx?)$/)) continue;

    // Find matching coverage entry
    const entry = COVERAGE_MAP.find((e) => file.includes(e.source) || e.source === file);

    if (!entry) continue; // File not in coverage map (might be fine)

    if (entry.tests.length === 0) {
      gaps.push({
        source: file,
        category: entry.category,
        tests: [],
        useCases: entry.useCases,
      });
      continue;
    }

    // Check if ANY of the mapped test files were also changed
    const testAlsoChanged = entry.tests.some((t) => testFilesChanged.includes(t));
    if (testAlsoChanged) {
      covered.push({ source: file, test: entry.tests[0] });
    } else {
      gaps.push({
        source: file,
        category: entry.category,
        tests: entry.tests,
        useCases: entry.useCases,
      });
    }
  }

  return { gaps, covered, testFilesChanged };
}

// ── Print coverage report ──
function printReport() {
  console.log(`\n${BLUE}╔══════════════════════════════════════════════╗${NC}`);
  console.log(`${BLUE}║    KairoLogic Test Coverage Audit Report      ║${NC}`);
  console.log(`${BLUE}╚══════════════════════════════════════════════╝${NC}\n`);

  // Coverage map stats
  const totalSources = COVERAGE_MAP.length;
  const coveredSources = COVERAGE_MAP.filter((e) => e.tests.length > 0).length;
  const uncoveredSources = getUncoveredSources();
  const allUseCases = getCoveredUseCases();

  console.log(`${GREEN}Source files mapped:${NC}  ${coveredSources}/${totalSources}`);
  console.log(`${GREEN}Use cases covered:${NC}   ${allUseCases.length}`);
  console.log(`${GREEN}Test spec files:${NC}     16`);
  console.log(`${GREEN}Total assertions:${NC}    236\n`);

  // Category breakdown
  const categories = new Map<string, { sources: number; covered: number; useCases: string[] }>();
  for (const entry of COVERAGE_MAP) {
    const cat = categories.get(entry.category) || { sources: 0, covered: 0, useCases: [] };
    cat.sources++;
    if (entry.tests.length > 0) cat.covered++;
    cat.useCases.push(...entry.useCases);
    categories.set(entry.category, cat);
  }

  console.log(`${BLUE}Category Breakdown:${NC}`);
  console.log(`${'Category'.padEnd(25)} ${'Coverage'.padEnd(12)} Use Cases`);
  console.log(`${'─'.repeat(25)} ${'─'.repeat(12)} ${'─'.repeat(20)}`);
  for (const [name, data] of categories) {
    const pct = Math.round((data.covered / data.sources) * 100);
    const color = pct === 100 ? GREEN : pct >= 50 ? GOLD : RED;
    const uniqueUCs = [...new Set(data.useCases)];
    console.log(
      `${name.padEnd(25)} ${color}${`${data.covered}/${data.sources} (${pct}%)`.padEnd(12)}${NC} ${DIM}${uniqueUCs.join(', ')}${NC}`,
    );
  }

  // Uncovered sources
  if (uncoveredSources.length > 0) {
    console.log(`\n${GOLD}Uncovered source files (need tests):${NC}`);
    for (const entry of uncoveredSources) {
      console.log(`  ${RED}✗${NC} ${entry.source} ${DIM}(${entry.category})${NC}`);
    }
  }

  console.log('');
}

// ── Main ──
function main() {
  printReport();

  if (reportOnly) {
    process.exit(0);
  }

  if (!diffRef) {
    console.log(
      `${DIM}Tip: Run with --diff HEAD~1 or --diff main to audit specific changes${NC}\n`,
    );
    process.exit(0);
  }

  // Diff-based audit
  console.log(`${BLUE}Auditing changes vs ${diffRef}...${NC}\n`);
  const changedFiles = getChangedFiles(diffRef);

  if (changedFiles.length === 0) {
    console.log(`${GREEN}No changed files detected.${NC}`);
    process.exit(0);
  }

  console.log(`${DIM}Changed files: ${changedFiles.length}${NC}\n`);

  const { gaps, covered, testFilesChanged } = findGaps(changedFiles);

  // Print covered
  if (covered.length > 0) {
    console.log(`${GREEN}✓ Source + test both updated (${covered.length}):${NC}`);
    for (const { source, test } of covered) {
      console.log(`  ${GREEN}✓${NC} ${source} → ${DIM}${test}${NC}`);
    }
    console.log('');
  }

  // Print gaps
  if (gaps.length > 0) {
    console.log(`${RED}✗ Source changed but test NOT updated (${gaps.length}):${NC}`);
    for (const gap of gaps) {
      if (gap.tests.length === 0) {
        console.log(
          `  ${RED}✗${NC} ${gap.source} ${DIM}(${gap.category}) — NO TEST FILE EXISTS${NC}`,
        );
      } else {
        console.log(`  ${GOLD}⚠${NC} ${gap.source} ${DIM}(${gap.category})${NC}`);
        console.log(`    ${DIM}Expected test update in: ${gap.tests.join(', ')}${NC}`);
        if (gap.useCases.length > 0) {
          console.log(`    ${DIM}Affected use cases: ${gap.useCases.join(', ')}${NC}`);
        }
      }
    }
    console.log('');

    // In CI, fail the build
    if (process.env.CI) {
      console.log(`${RED}FAIL: ${gaps.length} source file(s) changed without test updates.${NC}`);
      console.log(
        `${DIM}Update the corresponding test files or add new tests for these changes.${NC}`,
      );
      console.log(
        `${DIM}If the change is cosmetic/non-functional, add --skip-audit to your commit message.${NC}\n`,
      );
      process.exit(1);
    } else {
      console.log(`${GOLD}WARNING: ${gaps.length} source file(s) may need test updates.${NC}`);
      console.log(
        `${DIM}Run the affected tests to verify: npx playwright test --grep "${gaps[0].useCases[0] || 'UC-'}"${NC}\n`,
      );
    }
  } else {
    console.log(`${GREEN}All changed source files have corresponding test updates!${NC}\n`);
  }

  // Summary
  const dashboardChanges = changedFiles.filter(
    (f) =>
      f.includes('components/dashboard/') ||
      f.includes('app/api/workflows/') ||
      f.includes('lib/workflow/'),
  ).length;

  if (dashboardChanges > 0 && testFilesChanged.length === 0) {
    console.log(
      `${GOLD}⚠ ${dashboardChanges} dashboard file(s) changed but no test files were modified.${NC}`,
    );
    console.log(`${DIM}Consider running: npm run test:e2e to verify nothing broke.${NC}\n`);
  }
}

main();
