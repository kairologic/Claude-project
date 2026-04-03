#!/usr/bin/env node
/**
 * scripts/backfill-confidence-scores.mjs
 *
 * Retroactively scores all existing practice_providers records using the
 * confidence scoring engine. Safe to run multiple times.
 *
 * Usage:
 *   node scripts/backfill-confidence-scores.mjs
 *   node scripts/backfill-confidence-scores.mjs --practice <practice_website_id>
 *   node scripts/backfill-confidence-scores.mjs --dry-run
 */

// ── Inline confidence scorer (ported from confidence-scorer.ts) ─────

const WEIGHTS = {
  NAME_EXACT_MATCH: 0.25,
  NAME_FUZZY_MATCH: 0.15,
  PHONE_MATCH: 0.20,
  SAME_STATE: 0.08,
  SAME_CITY: 0.07,
  TAXONOMY_FITS_PRACTICE: 0.12,
  ORG_CORROBORATION: 0.13,
  ENTITY_TYPE_PENALTY: -0.20,
  SPECIALTY_MISMATCH: -0.15,
  STALE_DATA_PENALTY: -0.05,
};

const TIER_CONFIRMED = 0.80;
const TIER_UNVERIFIED = 0.50;

const TAXONOMY_SPECIALTY_MAP = {
  '208600000X': ['surgery', 'general surgery', 'surgical'],
  '2086S0120X': ['surgery', 'pediatric surgery'],
  '2086S0122X': ['surgery', 'plastic surgery'],
  '2086S0105X': ['surgery', 'hand surgery'],
  '2086S0102X': ['surgery', 'surgical critical care'],
  '2086X0206X': ['surgery', 'surgical oncology'],
  '208G00000X': ['surgery', 'thoracic surgery'],
  '208C00000X': ['surgery', 'colon and rectal surgery', 'colorectal'],
  '204C00000X': ['surgery', 'vascular surgery'],
  '207X00000X': ['surgery', 'orthopaedic surgery'],
  '208100000X': ['surgery', 'bariatric surgery'],
  '207RG0300X': ['gastroenterology'],
  '208000000X': ['pediatrics'],
  '207Q00000X': ['family medicine', 'family practice'],
  '207R00000X': ['internal medicine'],
  '152W00000X': ['optometry'],
  '111N00000X': ['chiropractic'],
  '207Y00000X': ['ophthalmology'],
  '207V00000X': ['obstetrics', 'gynecology'],
  '1223G0001X': ['dentistry'],
  '363L00000X': ['nurse practitioner'],
  '363A00000X': ['physician assistant'],
};

function normalizeName(name) {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/[.,\-'"]/g, '')
    .replace(/\b(MD|DO|FACS|FASMBS|MBA|MHA|PA|NP|RN|JR|SR|II|III|IV)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function fuzzyNameMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;

  const aParts = a.split(' ').filter(Boolean);
  const bParts = b.split(' ').filter(Boolean);

  if (aParts.length >= 2 && bParts.length >= 2) {
    if (aParts[0] === bParts[0] && aParts[aParts.length - 1] === bParts[bParts.length - 1]) return true;
  }

  const aSet = new Set(aParts);
  const bSet = new Set(bParts);
  const overlap = [...aSet].filter(w => bSet.has(w) && w.length > 2).length;
  const shorter = Math.min(aParts.length, bParts.length);
  if (shorter > 0 && overlap / shorter >= 0.6) return true;

  return false;
}

function scoreProviderConfidence(provider, nppes, practice) {
  const signals = [];
  let score = 0;

  if (!nppes) {
    signals.push({ signal: 'NO_NPPES_RECORD', value: true, weight: -0.40, detail: `NPI ${provider.npi} not found in NPPES` });
    return { score: 0.10, tier: 'review', signals };
  }

  // 1. Name matching
  const webName = normalizeName(provider.provider_name);
  const nppesName = nppes.entity_type_code === '2'
    ? normalizeName(nppes.organization_name)
    : normalizeName(`${nppes.first_name} ${nppes.last_name}`);

  if (webName === nppesName) {
    signals.push({ signal: 'NAME_EXACT_MATCH', value: true, weight: WEIGHTS.NAME_EXACT_MATCH, detail: `"${provider.provider_name}" matches NPPES exactly` });
    score += WEIGHTS.NAME_EXACT_MATCH;
  } else if (fuzzyNameMatch(webName, nppesName)) {
    signals.push({ signal: 'NAME_FUZZY_MATCH', value: true, weight: WEIGHTS.NAME_FUZZY_MATCH, detail: `"${provider.provider_name}" ≈ NPPES` });
    score += WEIGHTS.NAME_FUZZY_MATCH;
  } else {
    signals.push({ signal: 'NAME_NO_MATCH', value: false, weight: 0, detail: `"${provider.provider_name}" ≠ NPPES "${nppesName}"` });
  }

  // 2. Phone matching
  const webPhone = normalizePhone(provider.web_phone);
  const nppesPhone = normalizePhone(nppes.phone);
  if (webPhone && nppesPhone && webPhone === nppesPhone) {
    signals.push({ signal: 'PHONE_MATCH', value: true, weight: WEIGHTS.PHONE_MATCH, detail: `Phone matches NPPES` });
    score += WEIGHTS.PHONE_MATCH;
  }

  // 3. Geographic matching
  if (nppes.state && practice.practice_state && nppes.state.toUpperCase() === practice.practice_state.toUpperCase()) {
    signals.push({ signal: 'SAME_STATE', value: true, weight: WEIGHTS.SAME_STATE, detail: `State ${nppes.state} matches` });
    score += WEIGHTS.SAME_STATE;
  }
  if (nppes.city && practice.practice_city && nppes.city.toUpperCase() === practice.practice_city.toUpperCase()) {
    signals.push({ signal: 'SAME_CITY', value: true, weight: WEIGHTS.SAME_CITY, detail: `City ${nppes.city} matches` });
    score += WEIGHTS.SAME_CITY;
  }

  // 4. Taxonomy vs practice specialty
  const taxonomySpecialties = TAXONOMY_SPECIALTY_MAP[nppes.primary_taxonomy_code] || [];
  const practiceSpecs = (practice.practice_specialties || []).map(s => s.toLowerCase());
  if (taxonomySpecialties.length > 0 && practiceSpecs.length > 0) {
    const fits = taxonomySpecialties.some(ts => practiceSpecs.some(ps => ps.includes(ts) || ts.includes(ps)));
    if (fits) {
      signals.push({ signal: 'TAXONOMY_FITS_PRACTICE', value: true, weight: WEIGHTS.TAXONOMY_FITS_PRACTICE, detail: `${taxonomySpecialties[0]} fits practice` });
      score += WEIGHTS.TAXONOMY_FITS_PRACTICE;
    } else {
      signals.push({ signal: 'SPECIALTY_MISMATCH', value: true, weight: WEIGHTS.SPECIALTY_MISMATCH, detail: `${taxonomySpecialties[0]} doesn't match practice` });
      score += WEIGHTS.SPECIALTY_MISMATCH;
    }
  }

  // 5. Entity type check
  if (nppes.entity_type_code === '2') {
    const orgNameSimilar = fuzzyNameMatch(normalizeName(nppes.organization_name), normalizeName(practice.practice_name));
    if (orgNameSimilar) {
      signals.push({ signal: 'ORG_NPI_MATCHES_PRACTICE', value: true, weight: 0.10, detail: `Org "${nppes.organization_name}" ≈ practice` });
      score += 0.10;
    } else {
      signals.push({ signal: 'ENTITY_TYPE_PENALTY', value: true, weight: WEIGHTS.ENTITY_TYPE_PENALTY, detail: `Type 2 org NPI in individual roster` });
      score += WEIGHTS.ENTITY_TYPE_PENALTY;
    }
  }

  // 6. Org corroboration
  if (practice.confirmed_provider_count >= 3) {
    signals.push({ signal: 'ORG_CORROBORATION', value: practice.confirmed_provider_count, weight: WEIGHTS.ORG_CORROBORATION, detail: `${practice.confirmed_provider_count} confirmed at practice` });
    score += WEIGHTS.ORG_CORROBORATION;
  }

  // 7. Staleness
  if (provider.last_seen_at) {
    const daysSince = (Date.now() - new Date(provider.last_seen_at).getTime()) / 86400000;
    if (daysSince > 90) {
      signals.push({ signal: 'STALE_DATA', value: daysSince, weight: WEIGHTS.STALE_DATA_PENALTY, detail: `Last seen ${Math.floor(daysSince)} days ago` });
      score += WEIGHTS.STALE_DATA_PENALTY;
    }
  }

  score = Math.max(0, Math.min(1, score));
  const tier = score >= TIER_CONFIRMED ? 'confirmed' : score >= TIER_UNVERIFIED ? 'unverified' : 'review';
  return { score: Math.round(score * 100) / 100, tier, signals };
}

// ── Config ──────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const practiceIdx = args.indexOf('--practice');
const targetPractice = practiceIdx >= 0 ? args[practiceIdx + 1] : null;

// ── DB Helper ───────────────────────────────────────────────

async function db(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'PATCH' ? 'return=minimal' : 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB ${options.method || 'GET'} ${path}: ${res.status} ${err}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Confidence Score Backfill                          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  if (dryRun) console.log('  MODE: DRY RUN (no writes)\n');
  if (targetPractice) console.log(`  TARGET: practice ${targetPractice}\n`);

  // 1. Fetch all practice_providers
  const filter = targetPractice
    ? `practice_providers?practice_website_id=eq.${targetPractice}&select=*`
    : `practice_providers?select=*`;
  const associations = await db(filter);
  console.log(`Found ${associations.length} practice_provider records to score.\n`);

  if (associations.length === 0) {
    console.log('Nothing to score. Exiting.');
    return;
  }

  // 2. Collect unique NPIs and practice IDs
  const allNpis = [...new Set(associations.map(a => a.npi))];
  const allPracticeIds = [...new Set(associations.map(a => a.practice_website_id))];

  // 3. Batch-fetch NPPES data
  console.log(`Fetching NPPES data for ${allNpis.length} unique NPIs...`);
  const nppesMap = new Map();

  for (let i = 0; i < allNpis.length; i += 50) {
    const batch = allNpis.slice(i, i + 50);
    const npiList = batch.map(n => `"${n}"`).join(',');
    const rows = await db(
      `providers?npi=in.(${npiList})&select=npi,first_name,last_name,organization_name,entity_type_code,phone,city,state,primary_taxonomy_code,taxonomy_desc`,
    );
    for (const r of rows) {
      nppesMap.set(r.npi, {
        npi: r.npi,
        first_name: r.first_name || '',
        last_name: r.last_name || '',
        organization_name: r.organization_name || '',
        entity_type_code: r.entity_type_code || '1',
        phone: r.phone || '',
        city: r.city || '',
        state: r.state || '',
        primary_taxonomy_code: r.primary_taxonomy_code || '',
        taxonomy_desc: r.taxonomy_desc || '',
      });
    }
  }
  console.log(`  → Loaded ${nppesMap.size} NPPES records.\n`);

  // 4. Build practice context
  console.log(`Building context for ${allPracticeIds.length} practices...`);
  const practiceCtxMap = new Map();

  for (const pid of allPracticeIds) {
    const pwRows = await db(`practice_websites?id=eq.${pid}&select=name,state,npi`);
    const pw = pwRows[0] || { name: '', state: '' };

    const practiceAssocs = associations.filter(a => a.practice_website_id === pid);
    const confirmedCount = practiceAssocs.filter(
      a => a.status === 'VERIFIED' || a.status === 'ACTIVE',
    ).length;

    const specSet = new Set();
    for (const a of practiceAssocs) {
      if (a.web_specialty) specSet.add(a.web_specialty);
    }

    practiceCtxMap.set(pid, {
      practice_name: pw.name || '',
      practice_state: pw.state || '',
      practice_specialties: [...specSet],
      total_providers: practiceAssocs.length,
      confirmed_provider_count: confirmedCount,
    });
  }
  console.log(`  → Built context for ${practiceCtxMap.size} practices.\n`);

  // 5. Score each association
  const stats = { total: associations.length, scored: 0, confirmed: 0, unverified: 0, review: 0, noNppes: 0, errors: 0 };

  console.log('Scoring providers...\n');
  console.log('NPI        | Name                           | Score | Tier        | Top Signal');
  console.log('-'.repeat(95));

  const now = new Date().toISOString();

  for (const assoc of associations) {
    try {
      const nppes = nppesMap.get(assoc.npi) || null;
      const practiceCtx = practiceCtxMap.get(assoc.practice_website_id);
      if (!nppes) stats.noNppes++;

      const providerData = {
        npi: assoc.npi,
        provider_name: assoc.provider_name || '',
        web_phone: assoc.web_phone,
        web_specialty: assoc.web_specialty,
        association_source: assoc.association_source,
        last_seen_at: assoc.last_seen_at,
      };

      const result = scoreProviderConfidence(providerData, nppes, practiceCtx);

      const name = (assoc.provider_name || '').padEnd(30).slice(0, 30);
      const topSignal = result.signals.length > 0
        ? result.signals.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0].signal
        : 'NONE';
      console.log(
        `${assoc.npi} | ${name} | ${result.score.toFixed(2).padStart(5)} | ${result.tier.padEnd(11)} | ${topSignal}`,
      );

      if (!dryRun) {
        await db(`practice_providers?id=eq.${assoc.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            confidence_score: result.score,
            confidence_tier: result.tier,
            confidence_signals: result.signals,
            confidence_scored_at: now,
          }),
        });
      }

      stats.scored++;
      if (result.tier === 'confirmed') stats.confirmed++;
      else if (result.tier === 'unverified') stats.unverified++;
      else stats.review++;
    } catch (err) {
      stats.errors++;
      console.error(`  ERROR scoring NPI ${assoc.npi}:`, err);
    }
  }

  // 6. Summary
  console.log('\n' + '='.repeat(60));
  console.log('BACKFILL SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total records:    ${stats.total}`);
  console.log(`  Scored:           ${stats.scored}`);
  console.log(`  Confirmed:        ${stats.confirmed} (>=0.80)`);
  console.log(`  Unverified:       ${stats.unverified} (0.50-0.79)`);
  console.log(`  Review:           ${stats.review} (<0.50)`);
  console.log(`  No NPPES record:  ${stats.noNppes}`);
  console.log(`  Errors:           ${stats.errors}`);
  if (dryRun) {
    console.log('\n  DRY RUN — no changes written to database');
  } else {
    console.log(`\n  All scores written to practice_providers`);
  }
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
