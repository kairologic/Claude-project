/**
 * KairoLogic Dashboard QA Explorer
 * Hybrid approach: Scripted critical path + Claude-driven free exploration
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node qa-explorer.mjs [--base-url http://localhost:3000] [--explore-turns 3]
 */

import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:3000';

const EXPLORE_TURNS = process.argv.includes('--explore-turns')
  ? parseInt(process.argv[process.argv.indexOf('--explore-turns') + 1])
  : 3;

const REPORT_DIR = path.join(process.cwd(), 'qa-reports');
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

const anthropic = new Anthropic();

// ── Journey Definition ──────────────────────────────────────────────────────
// Each section defines the scripted critical path steps.
// After completing the scripted steps in each section, Claude gets
// EXPLORE_TURNS free-exploration turns to poke around.

const JOURNEY = [
  {
    name: 'Login',
    steps: [
      {
        action: 'navigate',
        url: '/login',
        description: 'Navigate to login page',
      },
      {
        action: 'fill',
        selector: 'input[type="email"], input[name="email"]',
        value: 'admin@kairologic.net',
        description: 'Enter email',
      },
      {
        action: 'fill',
        selector: 'input[type="password"], input[name="password"]',
        value: 'pachavellam_',
        description: 'Enter password',
      },
      {
        action: 'click',
        selector: 'button[type="submit"]',
        description: 'Click sign in',
      },
      {
        action: 'wait',
        ms: 3000,
        description: 'Wait for dashboard to load',
      },
    ],
    explore: false, // No free exploration on login
  },
  {
    name: 'Dashboard Home (KPIs)',
    steps: [
      {
        action: 'navigate',
        url: '/dashboard',
        description: 'Navigate to dashboard home',
      },
      { action: 'wait', ms: 2000, description: 'Wait for KPI data to load' },
    ],
    explore: true,
    exploreContext:
      'You are on the KPI home page. Look for: correct KPI cards rendering, data populated, no broken layouts, proper color coding, responsive behavior. Try interacting with any clickable KPI elements.',
  },
  {
    name: 'Workflows',
    steps: [
      {
        action: 'navigate',
        url: '/dashboard/workflows',
        description: 'Navigate to workflows',
      },
      {
        action: 'wait',
        ms: 2000,
        description: 'Wait for workflows to load',
      },
    ],
    explore: true,
    exploreContext:
      'You are on the workflows page. Look for: filter pills working, due-date color coding (overdue in red, upcoming in yellow/orange), workflow cards rendering properly. Try clicking filter pills and opening a workflow detail slide-over.',
  },
  {
    name: 'Provider Roster',
    steps: [
      {
        action: 'navigate',
        url: '/dashboard/providers',
        description: 'Navigate to provider roster',
      },
      { action: 'wait', ms: 2000, description: 'Wait for roster to load' },
    ],
    explore: true,
    exploreContext:
      'You are on the provider roster page. Look for: provider list rendering with NPI numbers, search/filter functionality, provider detail views. Try clicking on a provider row if available.',
  },
  {
    name: 'Alerts',
    steps: [
      {
        action: 'navigate',
        url: '/dashboard/alerts',
        description: 'Navigate to alerts',
      },
      { action: 'wait', ms: 2000, description: 'Wait for alerts to load' },
    ],
    explore: true,
    exploreContext:
      'You are on the alerts page. Look for: alert cards rendering, severity indicators, auto-mark-seen behavior, proper timestamps. Try clicking an alert to see if details expand.',
  },
  {
    name: 'Documents',
    steps: [
      {
        action: 'navigate',
        url: '/dashboard/documents',
        description: 'Navigate to documents',
      },
      { action: 'wait', ms: 2000, description: 'Wait for documents to load' },
    ],
    explore: true,
    exploreContext:
      'You are on the documents page. Look for: document list rendering, download/preview functionality, proper file type icons. Try any available interactions.',
  },
  {
    name: 'Sidebar Navigation',
    steps: [],
    explore: true,
    exploreContext:
      'Test the sidebar navigation. Check: all menu items are present and clickable, active state highlighting works correctly, sidebar collapse/expand if available, logo renders properly with split-color branding (Kairo in white, Logic in gold).',
  },
];

// ── Utilities ───────────────────────────────────────────────────────────────

function ensureDirs() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreenshot(page, label) {
  const safeName = label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = Date.now();
  const filename = `${safeName}_${timestamp}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

function screenshotToBase64(filepath) {
  return fs.readFileSync(filepath).toString('base64');
}

// ── Claude Vision Analysis ──────────────────────────────────────────────────

async function analyzeScreenshot(screenshotPath, context, isExploration = false) {
  const base64 = screenshotToBase64(screenshotPath);

  const systemPrompt = isExploration
    ? `You are a QA tester exploring a healthcare provider data monitoring dashboard called KairoLogic. 
You are doing free exploration — look at the screenshot and decide what a real practice manager user would do next.

Your job:
1. ANALYZE what you see — identify any visual bugs, broken layouts, missing data, confusing UX, accessibility issues.
2. DECIDE your next action — what would you click, scroll, or interact with to explore further?

Respond in this exact JSON format:
{
  "findings": [
    { "severity": "critical|warning|info", "description": "what you found", "element": "which element" }
  ],
  "next_action": {
    "type": "click|scroll|hover|none",
    "target": "CSS selector or description of what to click",
    "reasoning": "why a real user would do this"
  },
  "overall_impression": "brief UX assessment"
}`
    : `You are a QA tester reviewing a screenshot of the KairoLogic dashboard — a healthcare provider data monitoring platform.

Analyze the screenshot for:
- Visual bugs (broken layouts, overlapping elements, cut-off text)
- Missing or empty data that should be populated
- UI consistency (colors, fonts, spacing)
- Accessibility concerns (contrast, readability)
- Functional issues visible in the UI (error messages, loading spinners stuck, broken images)
- Brand compliance (navy #0A192F / gold #D4A017 palette)

Respond in this exact JSON format:
{
  "findings": [
    { "severity": "critical|warning|info", "description": "what you found", "element": "which element" }
  ],
  "page_state": "description of what the page shows",
  "overall_impression": "brief assessment"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64 },
          },
          {
            type: 'text',
            text: context || 'Analyze this dashboard screenshot for QA issues.',
          },
        ],
      },
    ],
    system: systemPrompt,
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    // Strip markdown fences if present
    const clean = text.replace(/```json\s?|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { findings: [], overall_impression: text, parse_error: true };
  }
}

// ── Execute Scripted Step ───────────────────────────────────────────────────

async function executeStep(page, step) {
  switch (step.action) {
    case 'navigate':
      await page
        .goto(`${BASE_URL}${step.url}`, {
          waitUntil: 'networkidle',
          timeout: 15000,
        })
        .catch(() => page.goto(`${BASE_URL}${step.url}`, { timeout: 15000 }));
      break;

    case 'fill':
      await page.waitForSelector(step.selector, { timeout: 10000 });
      await page.fill(step.selector, step.value);
      break;

    case 'click':
      await page.waitForSelector(step.selector, { timeout: 10000 });
      await page.click(step.selector);
      break;

    case 'wait':
      await page.waitForTimeout(step.ms);
      break;

    default:
      console.warn(`  ⚠ Unknown action: ${step.action}`);
  }
}

// ── Free Exploration Mode ───────────────────────────────────────────────────

async function freeExplore(page, sectionName, context, turns) {
  const results = [];
  console.log(`  🔍 Free exploration (${turns} turns)...`);

  for (let turn = 1; turn <= turns; turn++) {
    console.log(`    Turn ${turn}/${turns}`);

    const screenshotPath = await captureScreenshot(page, `${sectionName}_explore_${turn}`);
    const analysis = await analyzeScreenshot(screenshotPath, context, true);
    results.push({ turn, screenshotPath, analysis });

    // Log findings as they happen
    if (analysis.findings?.length > 0) {
      for (const f of analysis.findings) {
        const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : '🔵';
        console.log(`    ${icon} ${f.description}`);
      }
    }

    // Execute the suggested next action
    if (analysis.next_action && analysis.next_action.type !== 'none') {
      try {
        const target = analysis.next_action.target;
        console.log(
          `    → ${analysis.next_action.type}: ${target} (${analysis.next_action.reasoning})`,
        );

        switch (analysis.next_action.type) {
          case 'click':
            // Try CSS selector first, fall back to text-based
            try {
              await page.click(target, { timeout: 5000 });
            } catch {
              // Try finding by visible text
              const textTarget = target.replace(/['"]/g, '');
              try {
                await page.getByText(textTarget, { exact: false }).first().click({ timeout: 5000 });
              } catch {
                console.log(`    ⚠ Could not find clickable target: ${target}`);
              }
            }
            await page.waitForTimeout(1500);
            break;

          case 'scroll':
            await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.7));
            await page.waitForTimeout(1000);
            break;

          case 'hover':
            try {
              await page.hover(target, { timeout: 5000 });
            } catch {
              console.log(`    ⚠ Could not hover: ${target}`);
            }
            await page.waitForTimeout(800);
            break;
        }
      } catch (err) {
        console.log(`    ⚠ Exploration action failed: ${err.message}`);
      }
    }
  }

  return results;
}

// ── Generate Report ─────────────────────────────────────────────────────────

function generateReport(allResults) {
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = path.join(REPORT_DIR, `qa-report-${timestamp}.md`);

  let criticals = 0,
    warnings = 0,
    infos = 0;
  const allFindings = [];

  for (const section of allResults) {
    for (const result of section.results) {
      if (result.analysis?.findings) {
        for (const f of result.analysis.findings) {
          allFindings.push({ ...f, section: section.section });
          if (f.severity === 'critical') criticals++;
          else if (f.severity === 'warning') warnings++;
          else infos++;
        }
      }
    }
  }

  let md = `# KairoLogic Dashboard QA Report\n`;
  md += `**Date:** ${new Date().toLocaleString()}\n`;
  md += `**Base URL:** ${BASE_URL}\n`;
  md += `**Explore turns per section:** ${EXPLORE_TURNS}\n\n`;
  md += `## Summary\n`;
  md += `| Severity | Count |\n|----------|-------|\n`;
  md += `| 🔴 Critical | ${criticals} |\n`;
  md += `| 🟡 Warning | ${warnings} |\n`;
  md += `| 🔵 Info | ${infos} |\n`;
  md += `| **Total** | **${allFindings.length}** |\n\n`;

  // Critical findings first
  if (criticals > 0) {
    md += `## 🔴 Critical Findings\n\n`;
    for (const f of allFindings.filter((f) => f.severity === 'critical')) {
      md += `- **[${f.section}]** ${f.description} *(element: ${f.element})*\n`;
    }
    md += `\n`;
  }

  if (warnings > 0) {
    md += `## 🟡 Warnings\n\n`;
    for (const f of allFindings.filter((f) => f.severity === 'warning')) {
      md += `- **[${f.section}]** ${f.description} *(element: ${f.element})*\n`;
    }
    md += `\n`;
  }

  if (infos > 0) {
    md += `## 🔵 Info\n\n`;
    for (const f of allFindings.filter((f) => f.severity === 'info')) {
      md += `- **[${f.section}]** ${f.description} *(element: ${f.element})*\n`;
    }
    md += `\n`;
  }

  // Section-by-section detail
  md += `## Section Details\n\n`;
  for (const section of allResults) {
    md += `### ${section.section}\n\n`;
    for (const result of section.results) {
      const impression = result.analysis?.overall_impression || result.analysis?.page_state || '';
      if (impression) md += `> ${impression}\n\n`;
      const screenshot = path.relative(REPORT_DIR, result.screenshotPath);
      md += `📸 [Screenshot](${screenshot})\n\n`;
    }
  }

  fs.writeFileSync(reportPath, md);
  return { reportPath, criticals, warnings, infos, total: allFindings.length };
}

// ── Main Runner ─────────────────────────────────────────────────────────────

async function run() {
  ensureDirs();
  console.log(`\n🚀 KairoLogic QA Explorer`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Explore turns: ${EXPLORE_TURNS}`);
  console.log(`   Report dir: ${REPORT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const allResults = [];

  for (const section of JOURNEY) {
    console.log(`\n📋 Section: ${section.name}`);
    const sectionResults = [];

    // 1. Execute scripted steps
    for (const step of section.steps) {
      console.log(`  ▶ ${step.description}`);
      try {
        await executeStep(page, step);
      } catch (err) {
        console.log(`  ❌ Step failed: ${err.message}`);
        sectionResults.push({
          step: step.description,
          error: err.message,
          screenshotPath: await captureScreenshot(page, `${section.name}_error`),
          analysis: {
            findings: [
              {
                severity: 'critical',
                description: `Step failed: ${err.message}`,
                element: step.selector || step.url || 'unknown',
              },
            ],
          },
        });
      }
    }

    // 2. Capture post-scripted-steps screenshot and analyze
    const postStepScreenshot = await captureScreenshot(page, `${section.name}_complete`);
    const postStepAnalysis = await analyzeScreenshot(
      postStepScreenshot,
      `Section: ${section.name}. ${section.exploreContext || ''}`,
    );
    sectionResults.push({
      phase: 'scripted',
      screenshotPath: postStepScreenshot,
      analysis: postStepAnalysis,
    });

    // Log scripted findings
    if (postStepAnalysis.findings?.length > 0) {
      for (const f of postStepAnalysis.findings) {
        const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : '🔵';
        console.log(`  ${icon} ${f.description}`);
      }
    }

    // 3. Free exploration
    if (section.explore) {
      const exploreResults = await freeExplore(
        page,
        section.name,
        section.exploreContext,
        EXPLORE_TURNS,
      );
      sectionResults.push(
        ...exploreResults.map((r) => ({
          phase: `explore_turn_${r.turn}`,
          screenshotPath: r.screenshotPath,
          analysis: r.analysis,
        })),
      );
    }

    allResults.push({ section: section.name, results: sectionResults });
  }

  await browser.close();

  // 4. Generate report
  console.log(`\n📊 Generating report...`);
  const report = generateReport(allResults);
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ QA Run Complete`);
  console.log(
    `   🔴 ${report.criticals} critical  🟡 ${report.warnings} warnings  🔵 ${report.infos} info`,
  );
  console.log(`   📄 Report: ${report.reportPath}`);
  console.log(`   📸 Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`${'═'.repeat(50)}\n`);
}

run().catch((err) => {
  console.error('❌ QA Explorer crashed:', err);
  process.exit(1);
});
