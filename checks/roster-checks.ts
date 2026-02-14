// checks/roster/checks.ts
// ═══ Provider Roster Check Modules ═══

import type { CheckModule } from './types';
import { normalizeName, fuzzyNameMatch } from './utils';

/**
 * RST-01: Roster Count Consistency
 * Compares provider count on website vs Type-1 NPIs in geographic area.
 * Tier: report (shown in report, teaser in free)
 */
export const rosterCountCheck: CheckModule = {
  id: 'RST-01',
  category: 'npi-integrity',
  name: 'Provider Roster Count',
  description: 'Compares provider count on website to NPI records in area',
  severity: 'medium',
  tier: 'report',

  async run(ctx) {
    const site = ctx.cache.siteSnapshot;
    const providers = ctx.cache.npiProviders;

    if (!site || site.provider_count === 0) {
      return {
        status: 'inconclusive', score: 0,
        title: 'Website provider count not detected',
        detail: 'Could not determine provider count from the website. Ensure your "Our Providers" or team page lists providers individually.',
      };
    }

    if (!providers || providers.length === 0) {
      return {
        status: 'inconclusive', score: 0,
        title: 'NPI provider data unavailable',
        detail: 'Could not retrieve individual provider NPIs for this geographic area',
      };
    }

    const siteCount = site.provider_count;
    const npiCount = providers.length;
    const diff = Math.abs(siteCount - npiCount);
    const maxCount = Math.max(siteCount, npiCount);
    const variancePct = Math.round((diff / maxCount) * 100);

    // Within 10% — pass
    if (variancePct <= 10) {
      return {
        status: 'pass', score: 100,
        title: 'Provider roster consistent',
        detail: `Website lists ${siteCount} providers, ${npiCount} active NPIs found in area`,
        evidence: {
          site_count: siteCount,
          npi_count: npiCount,
          variance_pct: variancePct,
        },
      };
    }

    // 11-30% — warning
    if (variancePct <= 30) {
      return {
        status: 'warn', score: 60,
        title: 'Minor roster variance detected',
        detail: `Website lists ${siteCount} providers but ${npiCount} NPIs found in area (${variancePct}% variance)`,
        evidence: {
          site_count: siteCount,
          npi_count: npiCount,
          variance_pct: variancePct,
          direction: siteCount > npiCount ? 'more_on_site' : 'more_in_npi',
        },
        remediationSteps: [
          siteCount > npiCount
            ? 'Some providers on your website may not have active NPIs in this area'
            : 'Some providers with NPIs in your area may be missing from your website',
          'Review your team page for accuracy',
          'Minor variances are normal — providers may list a different primary address with NPPES',
        ],
      };
    }

    // >30% — fail
    const score = Math.max(20, 80 - variancePct);
    return {
      status: 'fail', score,
      title: 'Significant roster discrepancy',
      detail: `Website lists ${siteCount} providers but ${npiCount} NPIs found in area (${variancePct}% variance)`,
      evidence: {
        site_count: siteCount,
        npi_count: npiCount,
        variance_pct: variancePct,
        direction: siteCount > npiCount ? 'more_on_site' : 'more_in_npi',
      },
      remediationSteps: [
        'Review your "Our Providers" or team page for accuracy',
        'Remove providers who have left the practice',
        'Add new providers to your website',
        'Ensure each provider has an active NPI with correct practice address',
        siteCount > npiCount
          ? 'Providers listed on your site may need to update their NPI practice address to this location'
          : 'Providers in the NPI registry for your area may be missing from your website',
      ],
    };
  },
};

/**
 * RST-02: Roster Name Matching
 * Fuzzy-matches provider names between website and NPI records.
 * Tier: shield (deep analysis, only for paying subscribers)
 */
export const rosterNameCheck: CheckModule = {
  id: 'RST-02',
  category: 'npi-integrity',
  name: 'Provider Name Verification',
  description: 'Cross-references provider names on website with NPI records',
  severity: 'high',
  tier: 'shield',

  async run(ctx) {
    const site = ctx.cache.siteSnapshot;
    const providers = ctx.cache.npiProviders;

    if (!site?.provider_names?.length) {
      return {
        status: 'inconclusive', score: 0,
        title: 'Website provider names not detected',
        detail: 'Could not extract individual provider names from the website',
      };
    }

    if (!providers?.length) {
      return {
        status: 'inconclusive', score: 0,
        title: 'NPI provider data unavailable',
        detail: 'Could not retrieve individual provider NPIs for this area',
      };
    }

    // Normalize all names
    const siteNames = site.provider_names.map(n => ({
      original: n,
      normalized: normalizeName(n),
    }));

    const npiNames = providers.map(p => ({
      original: p.name_full,
      normalized: normalizeName(p.name_full),
      npi: p.npi,
      taxonomy: p.tax_classification,
    }));

    // Find providers on website but NOT in NPI records
    const onSiteNotInNpi = siteNames.filter(sn =>
      !npiNames.some(nn => fuzzyNameMatch(sn.normalized, nn.normalized))
    );

    // Find providers in NPI but NOT on website
    const inNpiNotOnSite = npiNames.filter(nn =>
      !siteNames.some(sn => fuzzyNameMatch(sn.normalized, nn.normalized))
    );

    // Find matched providers
    const matched = siteNames.filter(sn =>
      npiNames.some(nn => fuzzyNameMatch(sn.normalized, nn.normalized))
    );

    const totalChecked = siteNames.length;
    const matchRate = totalChecked > 0 ? Math.round((matched.length / totalChecked) * 100) : 0;

    // All matched
    if (onSiteNotInNpi.length === 0 && inNpiNotOnSite.length === 0) {
      return {
        status: 'pass', score: 100,
        title: 'All providers verified',
        detail: `All ${siteNames.length} website providers match NPI records in area`,
        evidence: {
          matched_count: matched.length,
          match_rate: 100,
          site_provider_count: siteNames.length,
          npi_provider_count: npiNames.length,
        },
      };
    }

    // Some mismatches
    const issueCount = onSiteNotInNpi.length + inNpiNotOnSite.length;
    const status = issueCount <= 2 ? 'warn' : 'fail';
    const score = Math.max(20, 100 - (issueCount * 10));

    return {
      status, score,
      title: `Provider roster discrepancies found`,
      detail: `${onSiteNotInNpi.length} on website but not in NPI area, ${inNpiNotOnSite.length} in NPI area but not on website (${matchRate}% match rate)`,
      evidence: {
        matched_count: matched.length,
        match_rate: matchRate,
        on_site_not_in_npi: onSiteNotInNpi.slice(0, 10).map(p => p.original),
        in_npi_not_on_site: inNpiNotOnSite.slice(0, 10).map(p => ({
          name: p.original,
          npi: p.npi,
          taxonomy: p.taxonomy,
        })),
        site_provider_count: siteNames.length,
        npi_provider_count: npiNames.length,
      },
      remediationSteps: [
        ...(onSiteNotInNpi.length > 0
          ? [`${onSiteNotInNpi.length} provider(s) on your website may have left or may list a different practice address with NPPES`]
          : []),
        ...(inNpiNotOnSite.length > 0
          ? [`${inNpiNotOnSite.length} provider(s) with NPIs in your area are not listed on your website`]
          : []),
        'Verify your team page is up to date',
        'Providers who have relocated should update their NPI practice address',
        'New hires should be added to your website within 30 days',
      ],
    };
  },
};
