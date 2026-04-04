/**
 * lib/outreach/scoring-engine.ts
 *
 * #78 — Multi-signal outreach scoring engine.
 * Ranks practices by outreach priority using multiple signals:
 *   - Mismatch count and severity
 *   - Provider count (more providers = bigger deal)
 *   - Compliance risk (state regulation exposure)
 *   - Website quality (no site = harder to fix)
 *   - Recency (recent mismatches = more urgent)
 *
 * Output: a scored, ranked list for campaign targeting.
 */

// ── Score weights ────────────────────────────────────────────

const WEIGHTS = {
  mismatch_severity: 30, // Max 30 points for mismatch volume & types
  provider_scale: 20, // Max 20 points for practice size
  compliance_risk: 20, // Max 20 points for regulatory exposure
  website_quality: 15, // Max 15 points for website assessment
  recency: 15, // Max 15 points for how recent the issues are
};

// ── Types ────────────────────────────────────────────────────

export interface PracticeSignals {
  practice_id: string;
  practice_name: string;
  state: string;
  url: string | null;

  // Signal data
  mismatch_count: number;
  high_confidence_mismatches: number;
  address_mismatches: number;
  phone_mismatches: number;
  provider_count: number;
  has_website: boolean;
  website_last_scan: string | null;
  most_recent_mismatch: string | null;

  // Optional: payer directory status
  payer_mismatch_count?: number;
  compliance_statutes?: string[]; // ['SB 1188', 'HB 149', etc.]
}

export interface OutreachScore {
  practice_id: string;
  practice_name: string;
  state: string;
  url: string | null;

  total_score: number; // 0-100
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4';

  components: {
    mismatch_severity: number;
    provider_scale: number;
    compliance_risk: number;
    website_quality: number;
    recency: number;
  };

  signals: PracticeSignals;
  recommended_action: string;
}

// ── Scoring functions ───────────────────────────────────────

function scoreMismatchSeverity(signals: PracticeSignals): number {
  const { mismatch_count, high_confidence_mismatches, address_mismatches } = signals;

  if (mismatch_count === 0) return 0;

  // Base: log scale for count (diminishing returns after 10)
  let score = Math.min(15, Math.log2(mismatch_count + 1) * 4);

  // Bonus for high-confidence findings (verified mismatches)
  score += Math.min(10, high_confidence_mismatches * 2);

  // Bonus for address mismatches (most impactful for patients)
  score += Math.min(5, address_mismatches * 2.5);

  return Math.min(WEIGHTS.mismatch_severity, Math.round(score));
}

function scoreProviderScale(signals: PracticeSignals): number {
  const { provider_count } = signals;

  if (provider_count <= 1) return 2;
  if (provider_count <= 3) return 6;
  if (provider_count <= 6) return 10;
  if (provider_count <= 15) return 15;
  return WEIGHTS.provider_scale; // 20 for large practices
}

function scoreComplianceRisk(signals: PracticeSignals): number {
  const { state, compliance_statutes = [], mismatch_count, payer_mismatch_count = 0 } = signals;

  let score = 0;

  // Texas: SB 1188, HB 149
  if (state === 'TX') {
    score += 8;
    if (mismatch_count >= 3) score += 4; // Multiple violations amplify risk
  }

  // California: AB 3030 (stricter penalties)
  if (state === 'CA') {
    score += 10;
    if (mismatch_count >= 2) score += 5;
  }

  // Explicit statute findings
  score += Math.min(6, compliance_statutes.length * 3);

  // Payer directory mismatches add compliance risk
  if (payer_mismatch_count > 0) {
    score += Math.min(4, payer_mismatch_count * 2);
  }

  return Math.min(WEIGHTS.compliance_risk, Math.round(score));
}

function scoreWebsiteQuality(signals: PracticeSignals): number {
  const { has_website, url, website_last_scan } = signals;

  if (!has_website || !url) return 0; // No website = can't fix easily

  let score = 8; // Base score for having a scannable website

  // Bonus for recently scanned (data is fresh)
  if (website_last_scan) {
    const daysSinceScann = (Date.now() - new Date(website_last_scan).getTime()) / 86_400_000;
    if (daysSinceScann <= 7) score += 7;
    else if (daysSinceScann <= 30) score += 4;
    else score += 2;
  }

  return Math.min(WEIGHTS.website_quality, Math.round(score));
}

function scoreRecency(signals: PracticeSignals): number {
  const { most_recent_mismatch } = signals;

  if (!most_recent_mismatch) return 0;

  const daysSince = (Date.now() - new Date(most_recent_mismatch).getTime()) / 86_400_000;

  if (daysSince <= 7) return WEIGHTS.recency;
  if (daysSince <= 14) return 12;
  if (daysSince <= 30) return 8;
  if (daysSince <= 60) return 4;
  return 2;
}

// ── Main scoring function ───────────────────────────────────

export function scorePractice(signals: PracticeSignals): OutreachScore {
  const components = {
    mismatch_severity: scoreMismatchSeverity(signals),
    provider_scale: scoreProviderScale(signals),
    compliance_risk: scoreComplianceRisk(signals),
    website_quality: scoreWebsiteQuality(signals),
    recency: scoreRecency(signals),
  };

  const total =
    components.mismatch_severity +
    components.provider_scale +
    components.compliance_risk +
    components.website_quality +
    components.recency;

  // Tier assignment
  let tier: OutreachScore['tier'];
  if (total >= 70) tier = 'tier1';
  else if (total >= 50) tier = 'tier2';
  else if (total >= 30) tier = 'tier3';
  else tier = 'tier4';

  // Recommended action based on score
  let action: string;
  if (tier === 'tier1') {
    action =
      'Immediate outreach: high mismatch volume + compliance risk. Personalized email with compliance report.';
  } else if (tier === 'tier2') {
    action =
      'Priority outreach: significant mismatches. Send automated report with ROI calculator link.';
  } else if (tier === 'tier3') {
    action = 'Nurture sequence: moderate issues. Add to email drip with educational content.';
  } else {
    action = 'Low priority: monitor for changes. Include in quarterly roundup.';
  }

  return {
    practice_id: signals.practice_id,
    practice_name: signals.practice_name,
    state: signals.state,
    url: signals.url,
    total_score: Math.min(100, total),
    tier,
    components,
    signals,
    recommended_action: action,
  };
}

/**
 * Score and rank a batch of practices.
 * Returns sorted by score descending (highest priority first).
 */
export function rankPractices(practices: PracticeSignals[]): OutreachScore[] {
  return practices.map(scorePractice).sort((a, b) => b.total_score - a.total_score);
}

/**
 * Export ranked practices as CSV-ready rows.
 */
export function toCSVRows(scores: OutreachScore[]): string {
  const header =
    'practice_id,practice_name,state,url,total_score,tier,mismatch_severity,provider_scale,compliance_risk,website_quality,recency,recommended_action';
  const rows = scores.map((s) =>
    [
      s.practice_id,
      `"${(s.practice_name || '').replace(/"/g, '""')}"`,
      s.state,
      s.url || '',
      s.total_score,
      s.tier,
      s.components.mismatch_severity,
      s.components.provider_scale,
      s.components.compliance_risk,
      s.components.website_quality,
      s.components.recency,
      `"${s.recommended_action.replace(/"/g, '""')}"`,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
