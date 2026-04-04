/**
 * KairoLogic — NPPES Targeting Pipeline (TypeScript)
 * ────────────────────────────────────────────────────────────────────────────
 * Two-pass targeting pipeline:
 *   Pass 1 — Groups providers by practice address → practice-level targets
 *   Pass 2 — Groups practices by shared phone → org-level rollup (multi-location)
 *
 * INPUT  : NPPES monthly full replacement CSV (V.2)
 *          Download: https://download.cms.gov/nppes/NPI_Files.html
 *
 * OUTPUT : nppes_targets_YYYYMMDD.csv   — practice-level ranked list
 *          nppes_orgs_YYYYMMDD.csv      — org-level rollup (multi-location)
 *          nppes_flagged_YYYYMMDD.csv   — orgs >200 providers, manual review
 *
 * USAGE  :
 *   tsx nppes-targeting.ts ./npidata_pfile_20050523-20260208.csv
 *   tsx nppes-targeting.ts ./npidata_pfile_20050523-20260208.csv --analyze
 *
 * INSTALL (one-time):
 *   npm install csv-parse
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

// ── CONFIG ────────────────────────────────────────────────────────────────────

const TARGET_STATES = new Set(['TX', 'CA']);
const MIN_PROVIDERS = 4;
const ORG_OUTLIER_CAP = 200;
const NOW = new Date();
const CUTOFF_12M = new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000);
const CUTOFF_6M = new Date(NOW.getTime() - 182 * 24 * 60 * 60 * 1000);
const CHUNK_SIZE = 100_000;

// ── NPPES V.2 COLUMN NAMES ────────────────────────────────────────────────────

const COL = {
  npi: 'NPI',
  entity: 'Entity Type Code',
  orgName: 'Provider Organization Name (Legal Business Name)',
  lastUpdate: 'Last Update Date',
  enumDate: 'Provider Enumeration Date',
  addr1: 'Provider First Line Business Practice Location Address',
  addr2: 'Provider Second Line Business Practice Location Address',
  city: 'Provider Business Practice Location Address City Name',
  state: 'Provider Business Practice Location Address State Name',
  zip: 'Provider Business Practice Location Address Postal Code',
  phone: 'Provider Business Practice Location Address Telephone Number',
  taxonomy: 'Healthcare Provider Taxonomy Code_1',
  deactivated: 'NPI Deactivation Date',
} as const;

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface Provider {
  npi: string;
  orgName: string;
  state: string;
  addr1: string;
  addr2: string;
  city: string;
  zip5: string;
  phone: string;
  taxonomy: string;
  lastUpdate: Date | null;
  enumDate: Date | null;
}

interface PracticeTarget {
  rank: number;
  score: number;
  state: string;
  city: string;
  zip: string;
  addr1: string;
  addr2: string;
  phone: string;
  provider_count: number;
  updates_12m: number;
  updates_6m: number;
  update_rate_pct: number;
  avg_tenure_yrs: number;
  manual_cost_est: number;
  recommended_plan: string;
  top_taxonomies: string;
  top_org_name: string;
  org_name_token: string;
  sample_npis: string;
  address_key: string;
}

interface OrgTarget {
  rank: number;
  score: number;
  org_name: string;
  states: string;
  primary_state: string;
  location_count: number;
  cities: string;
  phones: string;
  provider_count: number;
  updates_12m: number;
  updates_6m: number;
  avg_update_rate_pct: number;
  avg_tenure_yrs: number;
  manual_cost_est: number;
  recommended_plan: string;
  top_taxonomies: string;
  grouping_method: string;
  is_outlier: boolean;
  org_key: string;
  sample_npis: string;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function cleanStr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAddr(addr1: string, city: string, state: string, zip: string): string {
  return `${cleanStr(addr1)}|${cleanStr(city)}|${state.toUpperCase()}|${zip.slice(0, 5)}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

function orgNameToken(name: string): string {
  const stopwords = new Set([
    'the',
    'of',
    'and',
    'at',
    'in',
    'for',
    'llc',
    'inc',
    'pllc',
    'pa',
    'pc',
    'md',
    'do',
  ]);
  const tokens = cleanStr(name)
    .split(' ')
    .filter((t) => t && !stopwords.has(t));
  return tokens.slice(0, 2).join(' ');
}

function parseDate(s: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? null : d;
}

function topN(arr: string[], n: number): string {
  const freq: Record<string, number> = {};
  for (const s of arr) if (s) freq[s] = (freq[s] ?? 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
    .join(', ');
}

function mostCommon(arr: string[]): string {
  return topN(arr, 1);
}

function computeScore(providerCount: number, updates12m: number, updates6m: number): number {
  const updateRate = providerCount > 0 ? updates12m / providerCount : 0;
  const sizeScore = Math.min(providerCount / 50, 1) * 40;
  const updateRateScore = updateRate * 30;
  const recencyScore = Math.min(updates6m / Math.max(providerCount, 1), 1) * 20;
  const absVolumeScore = Math.min(updates12m / 20, 1) * 10;
  return Math.round(sizeScore + updateRateScore + recencyScore + absVolumeScore);
}

function recommendedPlan(count: number): string {
  if (count >= 50) return 'CVO/Network ($1,499/mo)';
  if (count >= 20) return 'Group ($399/mo)';
  if (count >= 10) return 'Practice ($149/mo)';
  return 'Starter ($39/mo)';
}

function escCSV(v: string | number | boolean): string {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSVRow(obj: Record<string, unknown>): string {
  return Object.values(obj)
    .map((v) => escCSV(v as string | number | boolean))
    .join(',');
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const header = Object.keys(rows[0]).join(',');
  return [header, ...rows.map(toCSVRow)].join('\n');
}

function dateStr(): string {
  return NOW.toISOString().slice(0, 10).replace(/-/g, '');
}

function pad(s: string | number, n: number, right = false): string {
  const str = String(s);
  return right ? str.padEnd(n) : str.padStart(n);
}

// ── STAGE 1: STREAM-PARSE ────────────────────────────────────────────────────

async function streamParse(filePath: string): Promise<Map<string, Provider[]>> {
  const practiceMap = new Map<string, Provider[]>();
  let totalRows = 0;
  let matched = 0;

  console.log(`\nKairoLogic NPPES Targeting Pipeline  (v2 — org rollup enabled)`);
  console.log('─'.repeat(64));
  console.log(`File     : ${path.basename(filePath)}`);
  console.log(`States   : TX, CA`);
  console.log(`ICP floor: ${MIN_PROVIDERS}+ providers per address`);
  console.log(`Org cap  : flag orgs >${ORG_OUTLIER_CAP} providers for review`);
  console.log('─'.repeat(64) + '\n');
  console.log('Pass 1 — Streaming file...\n');

  await new Promise<void>((resolve, reject) => {
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    parser.on('data', (row: Record<string, string>) => {
      totalRows++;

      if (totalRows % 250_000 === 0) {
        process.stdout.write(
          `  Scanned ${(totalRows / 1_000_000).toFixed(1)}M rows | ${matched.toLocaleString()} TX/CA matched\r`,
        );
      }

      if ((row[COL.entity] ?? '').trim() !== '1') return;

      const state = (row[COL.state] ?? '').trim().toUpperCase();
      if (!TARGET_STATES.has(state)) return;

      const addr1 = (row[COL.addr1] ?? '').trim();
      const city = (row[COL.city] ?? '').trim();
      const zip = (row[COL.zip] ?? '').trim();
      if (!addr1 || !city || !zip) return;

      if ((row[COL.deactivated] ?? '').trim()) return;

      const key = normalizeAddr(addr1, city, state, zip);
      const provider: Provider = {
        npi: (row[COL.npi] ?? '').trim(),
        orgName: (row[COL.orgName] ?? '').trim(),
        state,
        addr1,
        addr2: (row[COL.addr2] ?? '').trim(),
        city,
        zip5: zip.slice(0, 5),
        phone: normalizePhone(row[COL.phone] ?? ''),
        taxonomy: (row[COL.taxonomy] ?? '').trim(),
        lastUpdate: parseDate(row[COL.lastUpdate] ?? ''),
        enumDate: parseDate(row[COL.enumDate] ?? ''),
      };

      if (!practiceMap.has(key)) practiceMap.set(key, []);
      practiceMap.get(key)!.push(provider);
      matched++;
    });

    parser.on('end', resolve);
    parser.on('error', reject);
    fs.createReadStream(filePath).pipe(parser);
  });

  console.log(`\n\n  ${totalRows.toLocaleString()} rows scanned`);
  console.log(`  ${matched.toLocaleString()} TX/CA individual providers`);
  console.log(`  ${practiceMap.size.toLocaleString()} unique practice addresses\n`);

  return practiceMap;
}

// ── STAGE 2: SCORE PRACTICES ─────────────────────────────────────────────────

function scorePractices(practiceMap: Map<string, Provider[]>): PracticeTarget[] {
  console.log('Pass 2 — Scoring individual practice addresses...');
  const targets: PracticeTarget[] = [];

  for (const [key, providers] of practiceMap) {
    if (providers.length < MIN_PROVIDERS) continue;

    let updates12m = 0,
      updates6m = 0;
    const tenures: number[] = [];

    for (const p of providers) {
      if (p.lastUpdate) {
        if (p.lastUpdate >= CUTOFF_12M) updates12m++;
        if (p.lastUpdate >= CUTOFF_6M) updates6m++;
      }
      if (p.enumDate) {
        tenures.push((NOW.getTime() - p.enumDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
    }

    const avgTenure =
      tenures.length > 0
        ? Math.round((tenures.reduce((a, b) => a + b, 0) / tenures.length) * 10) / 10
        : 0;

    const count = providers.length;
    const rep = providers[0];
    const phone = providers.find((p) => p.phone)?.phone ?? '';
    const topOrg = topN(providers.map((p) => p.orgName).filter(Boolean), 1);

    targets.push({
      rank: 0,
      score: computeScore(count, updates12m, updates6m),
      state: rep.state,
      city: rep.city,
      zip: rep.zip5,
      addr1: rep.addr1,
      addr2: rep.addr2,
      phone,
      provider_count: count,
      updates_12m: updates12m,
      updates_6m: updates6m,
      update_rate_pct: count > 0 ? Math.round((updates12m / count) * 100) : 0,
      avg_tenure_yrs: avgTenure,
      manual_cost_est: updates12m * 118,
      recommended_plan: recommendedPlan(count),
      top_taxonomies: topN(providers.map((p) => p.taxonomy).filter(Boolean), 3),
      top_org_name: topOrg,
      org_name_token: orgNameToken(topOrg),
      sample_npis: providers
        .slice(0, 3)
        .map((p) => p.npi)
        .join(', '),
      address_key: key,
    });
  }

  targets.sort((a, b) => b.score - a.score);
  targets.forEach((t, i) => {
    t.rank = i + 1;
  });

  console.log(`  ${targets.length.toLocaleString()} qualifying practice addresses scored\n`);
  return targets;
}

// ── STAGE 3: ORG ROLLUP ──────────────────────────────────────────────────────

function rollupOrgs(practices: PracticeTarget[]): { orgs: OrgTarget[]; flagged: OrgTarget[] } {
  console.log('Pass 3 — Rolling up to org level by shared phone...');

  const phoneGroups = new Map<string, PracticeTarget[]>();
  const noPhoneList: PracticeTarget[] = [];

  for (const t of practices) {
    if (t.phone) {
      if (!phoneGroups.has(t.phone)) phoneGroups.set(t.phone, []);
      phoneGroups.get(t.phone)!.push(t);
    } else {
      noPhoneList.push(t);
    }
  }

  // Secondary: group no-phone practices by org name token
  const nameGroups = new Map<string, PracticeTarget[]>();
  const singletons: PracticeTarget[] = [];

  for (const t of noPhoneList) {
    const token = t.org_name_token;
    if (token && token.length > 4) {
      if (!nameGroups.has(token)) nameGroups.set(token, []);
      nameGroups.get(token)!.push(t);
    } else {
      singletons.push(t);
    }
  }

  function buildOrgRecord(group: PracticeTarget[], orgKey: string, method: string): OrgTarget {
    const totalProviders = group.reduce((s, t) => s + t.provider_count, 0);
    const total12m = group.reduce((s, t) => s + t.updates_12m, 0);
    const total6m = group.reduce((s, t) => s + t.updates_6m, 0);
    const allStates = [...new Set(group.map((t) => t.state))];
    const allCities = [...new Set(group.map((t) => t.city))].slice(0, 5);
    const allPhones = [...new Set(group.map((t) => t.phone).filter(Boolean))].slice(0, 3);
    const allTaxonomies = group.flatMap((t) => t.top_taxonomies.split(', ').filter(Boolean));
    const allOrgNames = group.map((t) => t.top_org_name).filter(Boolean);

    const stateCounts: Record<string, number> = {};
    group.forEach((t) => {
      stateCounts[t.state] = (stateCounts[t.state] ?? 0) + t.provider_count;
    });
    const primaryState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

    const avgRate = Math.round(group.reduce((s, t) => s + t.update_rate_pct, 0) / group.length);
    const avgTenure =
      Math.round((group.reduce((s, t) => s + t.avg_tenure_yrs, 0) / group.length) * 10) / 10;

    return {
      rank: 0,
      score: computeScore(totalProviders, total12m, total6m),
      org_name: topN(allOrgNames, 1),
      states: allStates.sort().join(', '),
      primary_state: primaryState,
      location_count: group.length,
      cities: allCities.join(', '),
      phones: allPhones.join(', '),
      provider_count: totalProviders,
      updates_12m: total12m,
      updates_6m: total6m,
      avg_update_rate_pct: avgRate,
      avg_tenure_yrs: avgTenure,
      manual_cost_est: total12m * 118,
      recommended_plan: recommendedPlan(totalProviders),
      top_taxonomies: topN(allTaxonomies, 3),
      grouping_method: method,
      is_outlier: totalProviders > ORG_OUTLIER_CAP,
      org_key: orgKey,
      sample_npis: group[0]?.sample_npis ?? '',
    };
  }

  const orgs: OrgTarget[] = [];
  const flagged: OrgTarget[] = [];

  for (const [phone, group] of phoneGroups) {
    const rec = buildOrgRecord(group, `phone:${phone}`, 'phone');
    (rec.is_outlier ? flagged : orgs).push(rec);
  }

  for (const [token, group] of nameGroups) {
    if (group.length < 2) {
      orgs.push(buildOrgRecord([group[0]], `single:${group[0].address_key}`, 'single'));
    } else {
      const rec = buildOrgRecord(group, `name:${token}`, 'org_name');
      (rec.is_outlier ? flagged : orgs).push(rec);
    }
  }

  for (const t of singletons) {
    orgs.push(buildOrgRecord([t], `single:${t.address_key}`, 'single'));
  }

  orgs.sort((a, b) => b.score - a.score);
  orgs.forEach((o, i) => {
    o.rank = i + 1;
  });
  flagged.sort((a, b) => b.provider_count - a.provider_count);

  const multiLoc = orgs.filter((o) => o.location_count > 1);
  console.log(`  ${orgs.length.toLocaleString()} org groups identified`);
  console.log(`  ${multiLoc.length.toLocaleString()} multi-location orgs detected`);
  console.log(
    `  ${flagged.length.toLocaleString()} large orgs flagged for review (>${ORG_OUTLIER_CAP} providers)\n`,
  );

  return { orgs, flagged };
}

// ── STAGE 4: SUMMARY ─────────────────────────────────────────────────────────

function printSummary(practices: PracticeTarget[], orgs: OrgTarget[], flagged: OrgTarget[]) {
  const tx = practices.filter((t) => t.state === 'TX');
  const ca = practices.filter((t) => t.state === 'CA');
  const tier1 = practices.filter((t) => t.score >= 70);
  const tier2 = practices.filter((t) => t.score >= 50 && t.score < 70);
  const tier3 = practices.filter((t) => t.score < 50);

  console.log('─'.repeat(64));
  console.log('  PRACTICE-LEVEL RESULTS');
  console.log('─'.repeat(64));
  console.log(`  Total qualifying practices : ${practices.length.toLocaleString()}`);
  console.log(`  Texas                      : ${tx.length.toLocaleString()}`);
  console.log(`  California                 : ${ca.length.toLocaleString()}`);
  console.log(
    `  Tier 1 — score >= 70       : ${tier1.length.toLocaleString()}  (highest priority)`,
  );
  console.log(`  Tier 2 — score 50-69       : ${tier2.length.toLocaleString()}  (strong targets)`);
  console.log(`  Tier 3 — score < 50        : ${tier3.length.toLocaleString()}  (nurture)`);

  console.log(`\n  Top 10 Practice Addresses:`);
  for (const t of practices.slice(0, 10)) {
    console.log(
      `  #${pad(t.rank, 3, true).padEnd(4)} [${pad(t.score, 3)}] ` +
        `${t.state} | ${t.city.slice(0, 16).padEnd(16)} | ` +
        `${pad(t.provider_count, 3)} providers | ` +
        `${t.updates_12m} updates/yr | ` +
        `$${t.manual_cost_est.toLocaleString()} est. manual cost`,
    );
  }

  const txO = orgs.filter((o) => o.primary_state === 'TX');
  const caO = orgs.filter((o) => o.primary_state === 'CA');
  const multi = orgs.filter((o) => o.location_count > 1);
  const t1o = orgs.filter((o) => o.score >= 70);
  const t2o = orgs.filter((o) => o.score >= 50 && o.score < 70);

  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ORG-LEVEL ROLLUP RESULTS`);
  console.log(`${'─'.repeat(64)}`);
  console.log(`  Total org groups           : ${orgs.length.toLocaleString()}`);
  console.log(`  Multi-location orgs        : ${multi.length.toLocaleString()}`);
  console.log(`  Texas orgs                 : ${txO.length.toLocaleString()}`);
  console.log(`  California orgs            : ${caO.length.toLocaleString()}`);
  console.log(`  Tier 1 — score >= 70       : ${t1o.length.toLocaleString()}`);
  console.log(`  Tier 2 — score 50-69       : ${t2o.length.toLocaleString()}`);
  console.log(`  Flagged for review (>${ORG_OUTLIER_CAP})  : ${flagged.length.toLocaleString()}`);

  console.log(`\n  Top 10 Orgs (multi-location first):`);
  const topOrgs = [...orgs]
    .sort(
      (a, b) =>
        (b.location_count > 1 ? 1 : 0) - (a.location_count > 1 ? 1 : 0) || b.score - a.score,
    )
    .slice(0, 10);

  for (const o of topOrgs) {
    const locStr = o.location_count > 1 ? `${o.location_count} loc` : '1 loc';
    console.log(
      `  #${pad(o.rank, 3, true).padEnd(4)} [${pad(o.score, 3)}] ` +
        `${o.primary_state} | ${(o.org_name || o.cities).slice(0, 20).padEnd(20)} | ` +
        `${pad(o.provider_count, 4)} providers | ${locStr.padEnd(6)} | ` +
        `$${o.manual_cost_est.toLocaleString()} | ${o.recommended_plan}`,
    );
  }

  if (flagged.length > 0) {
    console.log(`\n  Flagged large orgs (manual review — likely health systems):`);
    for (const o of flagged.slice(0, 5)) {
      console.log(
        `  !! ${(o.org_name || 'unknown').slice(0, 30).padEnd(30)} | ` +
          `${o.provider_count} providers | ${o.location_count} locations | ${o.grouping_method}`,
      );
    }
  }
}

// ── STAGE 5: ANALYZE ─────────────────────────────────────────────────────────

function printAnalysis(practices: PracticeTarget[], orgs: OrgTarget[]) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  POOL ANALYSIS`);
  console.log(`${'='.repeat(70)}`);

  // Practice size bands
  const sizeBands: [string, number, number][] = [
    ['4-5   micro', 4, 5],
    ['6-9   small', 6, 9],
    ['10-19 mid', 10, 19],
    ['20-49 large', 20, 49],
    ['50+   group', 50, 9999],
  ];

  console.log(`\n  -- Practice Pool by Size --\n`);
  console.log(
    `  ${'Band'.padEnd(22)} ${'Count'.padStart(7)}  ${'Avg upd/yr'.padStart(10)}  ${'Avg rate'.padStart(9)}  ${'TX'.padStart(6)}  ${'CA'.padStart(6)}`,
  );
  console.log(
    `  ${'-'.repeat(22)}  ${'-'.repeat(7)}  ${'-'.repeat(10)}  ${'-'.repeat(9)}  ${'-'.repeat(6)}  ${'-'.repeat(6)}`,
  );
  for (const [label, lo, hi] of sizeBands) {
    const band = practices.filter((t) => t.provider_count >= lo && t.provider_count <= hi);
    if (!band.length) continue;
    const avgU = band.reduce((s, t) => s + t.updates_12m, 0) / band.length;
    const avgR = band.reduce((s, t) => s + t.update_rate_pct, 0) / band.length;
    const txC = band.filter((t) => t.state === 'TX').length;
    const caC = band.filter((t) => t.state === 'CA').length;
    console.log(
      `  ${label.padEnd(22)} ${band.length.toLocaleString().padStart(7)}  ` +
        `${avgU.toFixed(1).padStart(10)}  ${(avgR.toFixed(0) + '%').padStart(9)}  ` +
        `${txC.toLocaleString().padStart(6)}  ${caC.toLocaleString().padStart(6)}`,
    );
  }

  // Update rate bands
  const rateBands: [string, number, number][] = [
    ['0%  no updates', 0, 0],
    ['1-24%  occasional', 1, 24],
    ['25-49% moderate', 25, 49],
    ['50-74% high', 50, 74],
    ['75-99% very high', 75, 99],
    ['100%  full roster', 100, 100],
  ];

  console.log(`\n  -- By Update Rate (trailing 12 months) --\n`);
  console.log(
    `  ${'Band'.padEnd(22)} ${'Count'.padStart(7)}  ${'Avg providers'.padStart(13)}  ${'TX'.padStart(6)}  ${'CA'.padStart(6)}`,
  );
  console.log(
    `  ${'-'.repeat(22)}  ${'-'.repeat(7)}  ${'-'.repeat(13)}  ${'-'.repeat(6)}  ${'-'.repeat(6)}`,
  );
  for (const [label, lo, hi] of rateBands) {
    const band = practices.filter((t) => t.update_rate_pct >= lo && t.update_rate_pct <= hi);
    if (!band.length) continue;
    const avgP = band.reduce((s, t) => s + t.provider_count, 0) / band.length;
    const txC = band.filter((t) => t.state === 'TX').length;
    const caC = band.filter((t) => t.state === 'CA').length;
    console.log(
      `  ${label.padEnd(22)} ${band.length.toLocaleString().padStart(7)}  ` +
        `${avgP.toFixed(1).padStart(13)}  ${txC.toLocaleString().padStart(6)}  ${caC.toLocaleString().padStart(6)}`,
    );
  }

  // Hidden gems in Tier 3
  const tier3 = practices.filter((t) => t.score < 50);
  console.log(`\n  -- Hidden Gems in Tier 3 (score < 50) --\n`);
  const gems: [string, PracticeTarget[]][] = [
    [
      '4-9 prov + rate>=60%',
      tier3.filter(
        (t) => t.provider_count >= 4 && t.provider_count <= 9 && t.update_rate_pct >= 60,
      ),
    ],
    [
      '4-9 prov + rate>=80%',
      tier3.filter(
        (t) => t.provider_count >= 4 && t.provider_count <= 9 && t.update_rate_pct >= 80,
      ),
    ],
    [
      '10-19 prov + updates>=5',
      tier3.filter((t) => t.provider_count >= 10 && t.provider_count <= 19 && t.updates_12m >= 5),
    ],
    ['20+ prov + updates>=3', tier3.filter((t) => t.provider_count >= 20 && t.updates_12m >= 3)],
    ['Any + rate==100%', tier3.filter((t) => t.update_rate_pct === 100)],
  ];
  console.log(
    `  ${'Segment'.padEnd(30)} ${'Count'.padStart(7)}  ${'TX'.padStart(6)}  ${'CA'.padStart(6)}`,
  );
  console.log(`  ${'-'.repeat(30)}  ${'-'.repeat(7)}  ${'-'.repeat(6)}  ${'-'.repeat(6)}`);
  for (const [label, seg] of gems) {
    const txC = seg.filter((t) => t.state === 'TX').length;
    const caC = seg.filter((t) => t.state === 'CA').length;
    console.log(
      `  ${label.padEnd(30)} ${seg.length.toLocaleString().padStart(7)}  ${txC.toLocaleString().padStart(6)}  ${caC.toLocaleString().padStart(6)}`,
    );
  }

  // Org size breakdown
  const orgBands: [string, number, number][] = [
    ['4-9   providers', 4, 9],
    ['10-19 providers', 10, 19],
    ['20-49 providers', 20, 49],
    ['50-99 providers', 50, 99],
    ['100-199 providers', 100, 199],
    ['200+ flagged', 200, 9999],
  ];
  const multiOrgs = orgs.filter((o) => o.location_count > 1);
  console.log(
    `\n  -- Org Pool by Total Provider Count (${multiOrgs.length.toLocaleString()} multi-location orgs) --\n`,
  );
  console.log(
    `  ${'Band'.padEnd(22)} ${'Orgs'.padStart(7)}  ${'Multi-loc'.padStart(9)}  ${'Avg upd/yr'.padStart(10)}  ${'TX'.padStart(6)}  ${'CA'.padStart(6)}`,
  );
  console.log(
    `  ${'-'.repeat(22)}  ${'-'.repeat(7)}  ${'-'.repeat(9)}  ${'-'.repeat(10)}  ${'-'.repeat(6)}  ${'-'.repeat(6)}`,
  );
  for (const [label, lo, hi] of orgBands) {
    const band = orgs.filter((o) => o.provider_count >= lo && o.provider_count <= hi);
    if (!band.length) continue;
    const ml = band.filter((o) => o.location_count > 1).length;
    const avgU = band.reduce((s, o) => s + o.updates_12m, 0) / band.length;
    const txC = band.filter((o) => o.primary_state === 'TX').length;
    const caC = band.filter((o) => o.primary_state === 'CA').length;
    console.log(
      `  ${label.padEnd(22)} ${band.length.toLocaleString().padStart(7)}  ` +
        `${ml.toLocaleString().padStart(9)}  ${avgU.toFixed(1).padStart(10)}  ` +
        `${txC.toLocaleString().padStart(6)}  ${caC.toLocaleString().padStart(6)}`,
    );
  }

  // Estimated pipeline value
  const t1Cost = practices.filter((t) => t.score >= 70).reduce((s, t) => s + t.manual_cost_est, 0);
  const t2Cost = practices
    .filter((t) => t.score >= 50 && t.score < 70)
    .reduce((s, t) => s + t.manual_cost_est, 0);
  const allCost = practices.reduce((s, t) => s + t.manual_cost_est, 0);
  console.log(`\n  -- Estimated Manual Cost in Pool (@$118/update) --\n`);
  console.log(`  Tier 1 pipeline : $${t1Cost.toLocaleString()}/yr`);
  console.log(`  Tier 2 pipeline : $${t2Cost.toLocaleString()}/yr`);
  console.log(`  Full pool       : $${allCost.toLocaleString()}/yr`);

  // Campaign segments
  const segA = orgs.filter((o) => o.score >= 70);
  const segB = orgs.filter((o) => o.score >= 50 && o.score < 70);
  const segC = orgs.filter((o) => o.score < 50 && o.avg_update_rate_pct >= 60);
  const segD = orgs.filter((o) => o.score < 50 && o.location_count > 1);

  console.log(`\n  -- Recommended Campaign Segments (Org-Level) --\n`);
  const campaigns: [string, OrgTarget[], string][] = [
    ['A — Tier 1 score >= 70', segA, 'Hottest. Lead with cost + multi-location pain.'],
    ['B — Tier 2 score 50-69', segB, 'Strong. Personalize with update count.'],
    ['C — High-churn Tier 3 (rate>=60%)', segC, 'Hidden gems. Pitch update rate back at them.'],
    ['D — Multi-location Tier 3', segD, 'Group/CVO pitch even if low update rate.'],
  ];
  let total = 0;
  for (const [label, seg, note] of campaigns) {
    const txC = seg.filter((o) => o.primary_state === 'TX').length;
    const caC = seg.filter((o) => o.primary_state === 'CA').length;
    total += seg.length;
    console.log(`  ${label}`);
    console.log(
      `    Total: ${seg.length.toLocaleString()}  (TX: ${txC.toLocaleString()}  CA: ${caC.toLocaleString()})`,
    );
    console.log(`    ${note}\n`);
  }
  console.log(`  Total actionable (A+B+C+D): ${total.toLocaleString()} orgs`);
  console.log(`${'='.repeat(70)}\n`);
}

// ── STAGE 6: WRITE OUTPUTS ───────────────────────────────────────────────────

function writeOutputs(practices: PracticeTarget[], orgs: OrgTarget[], flagged: OrgTarget[]) {
  const ds = dateStr();
  const cwd = process.cwd();

  const files: [string, Record<string, unknown>[]][] = [
    [`nppes_targets_${ds}.csv`, practices as unknown as Record<string, unknown>[]],
    [`nppes_orgs_${ds}.csv`, orgs as unknown as Record<string, unknown>[]],
    [`nppes_flagged_${ds}.csv`, flagged as unknown as Record<string, unknown>[]],
  ];

  console.log(`\n  ── Output files ──`);
  for (const [fname, rows] of files) {
    const fpath = path.join(cwd, fname);
    fs.writeFileSync(fpath, toCSV(rows), 'utf8');
    console.log(`  ${fname}  (${rows.length.toLocaleString()} rows)`);
  }

  fs.writeFileSync(path.join(cwd, `nppes_targets_${ds}.json`), JSON.stringify(practices, null, 2));
  fs.writeFileSync(path.join(cwd, `nppes_orgs_${ds}.json`), JSON.stringify(orgs, null, 2));

  console.log(`\nDone.\n`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = process.argv[2];
  const analyze = process.argv.includes('--analyze');

  if (!filePath) {
    console.error('\nUsage: tsx nppes-targeting.ts <path-to-nppes-monthly.csv> [--analyze]\n');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`\nFile not found: ${filePath}\n`);
    process.exit(1);
  }

  const practiceMap = await streamParse(filePath);
  const practices = scorePractices(practiceMap);
  const { orgs, flagged } = rollupOrgs(practices);
  printSummary(practices, orgs, flagged);
  if (analyze) printAnalysis(practices, orgs);
  writeOutputs(practices, orgs, flagged);
}

main().catch((err) => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
