#!/usr/bin/env npx tsx
/**
 * scripts/export-blocklist.ts
 *
 * Exports the domain blocklist from lib/scanner/domain-blocklist.ts
 * to shared/blocked-domains.json so Python scripts can use the same list.
 *
 * Usage:
 *   npx tsx scripts/export-blocklist.ts
 *   npm run export-blocklist
 */

import { getBlockedDomainsArray } from '../lib/scanner/domain-blocklist';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const outDir = join(__dirname, '..', 'shared');
const outFile = join(outDir, 'blocked-domains.json');

mkdirSync(outDir, { recursive: true });

const domains = getBlockedDomainsArray().sort();
writeFileSync(outFile, JSON.stringify(domains, null, 2) + '\n');

console.log(`Exported ${domains.length} blocked domains → ${outFile}`);
