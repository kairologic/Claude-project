#!/usr/bin/env npx tsx
/**
 * scripts/generate-test-stub.ts
 *
 * Generates Playwright spec stubs for untested routes and components.
 *
 * Usage:
 *   npx tsx scripts/generate-test-stub.ts                    # audit mode — list untested routes
 *   npx tsx scripts/generate-test-stub.ts --generate         # create spec stubs for untested routes
 *   npx tsx scripts/generate-test-stub.ts --route /roster    # generate stub for a specific route
 *
 * How it works:
 *   1. Scans app/(dashboard)/practice/[id]/ for page.tsx files → dashboard routes
 *   2. Scans app/api/ for route.ts files → API routes
 *   3. Cross-references against existing e2e/*.spec.ts files
 *   4. Reports coverage gaps and optionally generates stubs
 */

import { readdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join, relative, basename } from 'path';

const ROOT = join(import.meta.dirname || __dirname, '..');
const E2E_DIR = join(ROOT, 'e2e');
const DASHBOARD_DIR = join(ROOT, 'app/(dashboard)/practice/[id]');
const API_DIR = join(ROOT, 'app/api');

// ─── Route Discovery ─────────────────────────────────────────────────────────

interface DiscoveredRoute {
  type: 'page' | 'api';
  path: string;
  relativePath: string;
  suggestedSpecName: string;
}

function findFiles(dir: string, filename: string, results: string[] = []): string[] {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findFiles(full, filename, results);
    } else if (entry === filename) {
      results.push(full);
    }
  }
  return results;
}

function discoverDashboardRoutes(): DiscoveredRoute[] {
  const pages = findFiles(DASHBOARD_DIR, 'page.tsx');
  return pages.map(p => {
    const rel = relative(DASHBOARD_DIR, p).replace(/\/page\.tsx$/, '');
    const slug = rel === 'page.tsx' ? 'home' : rel.replace(/\//g, '-').replace(/\[.*?\]/g, 'detail');
    return {
      type: 'page',
      path: p,
      relativePath: `/practice/[id]/${rel}`,
      suggestedSpecName: `${slug}.e2e.spec.ts`,
    };
  });
}

function discoverApiRoutes(): DiscoveredRoute[] {
  const routes = findFiles(API_DIR, 'route.ts');
  return routes.map(r => {
    const rel = relative(API_DIR, r).replace(/\/route\.ts$/, '');
    const slug = rel.replace(/\//g, '-').replace(/\[.*?\]/g, 'id');
    return {
      type: 'api',
      path: r,
      relativePath: `/api/${rel}`,
      suggestedSpecName: `${slug}.api.spec.ts`,
    };
  });
}

// ─── Coverage Check ──────────────────────────────────────────────────────────

function getExistingSpecs(): Set<string> {
  if (!existsSync(E2E_DIR)) return new Set();
  return new Set(
    readdirSync(E2E_DIR).filter(f => f.endsWith('.spec.ts'))
  );
}

function getTestedRoutes(): Set<string> {
  const tested = new Set<string>();
  const specs = readdirSync(E2E_DIR).filter(f => f.endsWith('.spec.ts'));

  for (const spec of specs) {
    const content = readFileSync(join(E2E_DIR, spec), 'utf-8');
    // Extract route patterns from navigateTo(), page.goto(), fetch() calls
    const routeMatches = content.matchAll(/(?:goto|navigateTo|fetch)\s*\(\s*[`'"]([^`'"]+)[`'"]/g);
    for (const m of routeMatches) {
      tested.add(m[1].replace(/\/practice\/[^/]+/, '/practice/[id]'));
    }
    // Also match test describe blocks for route hints
    const describeMatches = content.matchAll(/describe\s*\(\s*['"]([^'"]+)['"]/g);
    for (const m of describeMatches) {
      tested.add(m[1]);
    }
  }
  return tested;
}

// ─── Stub Generation ─────────────────────────────────────────────────────────

function generatePageStub(route: DiscoveredRoute): string {
  const name = basename(route.relativePath);
  return `import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, URLS } from './fixtures/test-data';

test.describe('${name} Page', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Add authentication setup
    await page.goto(\`\${URLS.PRACTICE_BASE}/\${TEST_PRACTICE.id}/${name}\`);
  });

  test('page loads without errors', async ({ page }) => {
    await expect(page).not.toHaveTitle(/error/i);
    // TODO: Add specific assertions for ${name} page content
  });

  test('renders main content', async ({ page }) => {
    // TODO: Add content assertions
    await expect(page.locator('main')).toBeVisible();
  });

  // TODO: Add feature-specific tests
  // test('feature X works', async ({ page }) => {});
});
`;
}

function generateApiStub(route: DiscoveredRoute): string {
  const name = route.relativePath.replace(/^\/api\//, '').replace(/\//g, ' ');
  return `import { test, expect } from '@playwright/test';
import { TEST_PRACTICE, API } from './fixtures/test-data';

test.describe('API: ${name}', () => {
  // TODO: Add authentication headers
  const headers = {
    'Content-Type': 'application/json',
  };

  test('responds to GET request', async ({ request }) => {
    const response = await request.get(\`\${API.BASE}${route.relativePath}?practice_id=\${TEST_PRACTICE.id}\`, { headers });
    // TODO: Adjust expected status code
    expect(response.status()).toBeLessThan(500);
  });

  test('rejects unauthenticated request', async ({ request }) => {
    const response = await request.get(\`\${API.BASE}${route.relativePath}\`);
    expect(response.status()).toBe(401);
  });

  // TODO: Add endpoint-specific tests
  // test('creates resource', async ({ request }) => {});
  // test('validates input', async ({ request }) => {});
});
`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const generateMode = args.includes('--generate');
  const specificRoute = args.find((_, i) => args[i - 1] === '--route');

  const dashboardRoutes = discoverDashboardRoutes();
  const apiRoutes = discoverApiRoutes();
  const existingSpecs = getExistingSpecs();
  const allRoutes = [...dashboardRoutes, ...apiRoutes];

  console.log(`\n  KairoLogic Test Coverage Audit\n`);
  console.log(`  Dashboard routes found: ${dashboardRoutes.length}`);
  console.log(`  API routes found:       ${apiRoutes.length}`);
  console.log(`  Existing spec files:    ${existingSpecs.size}`);
  console.log('');

  // Find untested routes
  const untested = allRoutes.filter(r => {
    if (specificRoute) {
      return r.relativePath.includes(specificRoute);
    }
    // Check if any existing spec file name partially matches
    const slug = r.suggestedSpecName.replace('.spec.ts', '');
    return !Array.from(existingSpecs).some(s =>
      s.includes(slug) || slug.includes(s.replace('.spec.ts', '').replace('.e2e', '').replace('.api', ''))
    );
  });

  if (untested.length === 0) {
    console.log('  All discovered routes have corresponding spec files.');
    return;
  }

  console.log(`  Untested routes (${untested.length}):\n`);
  for (const route of untested) {
    const icon = route.type === 'page' ? '  Page' : '   API';
    console.log(`    ${icon}  ${route.relativePath}`);
    console.log(`          → ${route.suggestedSpecName}`);
  }

  if (generateMode) {
    console.log('\n  Generating spec stubs...\n');
    for (const route of untested) {
      const specPath = join(E2E_DIR, route.suggestedSpecName);
      if (existsSync(specPath)) {
        console.log(`    SKIP  ${route.suggestedSpecName} (already exists)`);
        continue;
      }
      const content = route.type === 'page'
        ? generatePageStub(route)
        : generateApiStub(route);
      writeFileSync(specPath, content, 'utf-8');
      console.log(`    CREATE  ${route.suggestedSpecName}`);
    }
    console.log('\n  Done. Review the generated stubs and fill in TODO markers.\n');
  } else {
    console.log('\n  Run with --generate to create spec stubs for these routes.\n');
  }
}

main();
