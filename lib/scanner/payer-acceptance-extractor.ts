// lib/scanner/payer-acceptance-extractor.ts
// ═══ #111: Extract insurance/payer acceptance lists from practice websites ═══
//
// Looks for common patterns:
//   "Insurance accepted", "Plans we accept", "Insurance we take",
//   "Accepted insurance", "We participate with", "In-network with"
//
// Returns normalized payer codes that match our payer_directory_endpoints table.

// ── Payer Aliases ─────────────────────────────────────────
// Maps common website text variations to our canonical payer_code values.
// Ordered longest-first within each group to avoid partial matches.

const PAYER_ALIASES: { code: string; patterns: RegExp[] }[] = [
  {
    code: 'uhc',
    patterns: [/united\s*health\s*care/i, /united\s*health/i, /\buhc\b/i, /\boptum\b/i],
  },
  {
    code: 'aetna',
    patterns: [/\baetna\b/i, /aetna\s+better\s+health/i],
  },
  {
    code: 'cigna',
    patterns: [/\bcigna\b/i, /evernorth/i],
  },
  {
    code: 'humana',
    patterns: [/\bhumana\b/i],
  },
  {
    code: 'bcbs_tx',
    patterns: [
      /blue\s*cross\s*blue\s*shield\s*of\s*texas/i,
      /bcbs\s*of\s*texas/i,
      /bcbs\s*tx\b/i,
      /\bhcsc\b/i, // HCSC is the parent of BCBS TX
    ],
  },
  {
    code: 'bcbs_ca',
    patterns: [
      /blue\s*shield\s*of\s*california/i,
      /blue\s*cross\s*of\s*california/i,
      /anthem\s*blue\s*cross\s*(?:of\s*)?california/i,
      /bcbs\s*ca\b/i,
    ],
  },
  // Generic BCBS catch-all — only if state-specific didn't match
  {
    code: 'bcbs',
    patterns: [/blue\s*cross\s*blue\s*shield/i, /blue\s*cross/i, /blue\s*shield/i, /\bbcbs\b/i],
  },
];

// ── Section Detection ─────────────────────────────────────
// Patterns that indicate an insurance acceptance section on the page.

const INSURANCE_SECTION_PATTERNS = [
  /insur(?:ance|ances?)\s+(?:we\s+)?accept(?:ed|s)?/i,
  /accept(?:ed|s|ing)?\s+insur(?:ance|ances?)/i,
  /plans?\s+(?:we\s+)?accept/i,
  /accept(?:ed|s)?\s+plans?/i,
  /insur(?:ance|ances?)\s+(?:we\s+)?take/i,
  /(?:we\s+)?(?:participate|participating)\s+(?:with|in)/i,
  /in[\s-]?network\s+(?:with|insur|payer|plan)/i,
  /(?:we\s+)?(?:take|carry)\s+(?:most\s+)?(?:major\s+)?insur/i,
  /insur(?:ance|ances?)\s+(?:information|options?|providers?)/i,
  /(?:health\s+)?plans?\s+(?:we\s+)?(?:work|partner)\s+with/i,
  /payer\s+(?:information|list|accepted)/i,
  /(?:billing|payment)\s+(?:and\s+)?insur(?:ance)/i,
];

// ── Types ─────────────────────────────────────────────────

export interface PayerExtractionResult {
  accepted_payers: string[]; // Canonical payer codes
  raw_mentions: PayerMention[]; // All detected mentions with context
  extraction_source: 'section' | 'page_wide' | 'none';
  confidence: 'high' | 'medium' | 'low'; // Based on section proximity
}

export interface PayerMention {
  payer_code: string;
  matched_text: string;
  context: string; // Surrounding text snippet
  in_insurance_section: boolean;
}

// ── Main Extractor ────────────────────────────────────────

/**
 * Extract payer acceptance information from website HTML + text.
 *
 * Strategy:
 * 1. Find insurance-related sections in the HTML
 * 2. Search those sections for payer name patterns
 * 3. If no section found, scan full page text (lower confidence)
 * 4. Normalize to canonical payer codes
 * 5. Disambiguate generic BCBS based on practice state
 */
export function extractAcceptedPayers(
  html: string,
  text: string,
  practiceState: string | null,
): PayerExtractionResult {
  const mentions: PayerMention[] = [];
  let extractionSource: PayerExtractionResult['extraction_source'] = 'none';
  let confidence: PayerExtractionResult['confidence'] = 'low';

  // ── Step 1: Find insurance sections ───────────────────
  const sections = findInsuranceSections(html, text);

  if (sections.length > 0) {
    extractionSource = 'section';
    confidence = 'high';

    for (const section of sections) {
      const sectionMentions = findPayerMentions(section, true);
      mentions.push(...sectionMentions);
    }
  }

  // ── Step 2: Page-wide scan if no section found ────────
  if (mentions.length === 0) {
    const pageMentions = findPayerMentions(text, false);

    if (pageMentions.length > 0) {
      extractionSource = 'page_wide';
      // Lower confidence since payer names outside insurance context
      // could be references, not acceptance claims
      confidence = pageMentions.length >= 3 ? 'medium' : 'low';
      mentions.push(...pageMentions);
    }
  }

  // ── Step 3: Deduplicate and normalize ─────────────────
  const seenCodes = new Set<string>();
  const uniqueMentions: PayerMention[] = [];

  for (const m of mentions) {
    if (!seenCodes.has(m.payer_code)) {
      seenCodes.add(m.payer_code);
      uniqueMentions.push(m);
    }
  }

  // ── Step 4: Disambiguate generic BCBS ─────────────────
  let acceptedPayers = [...seenCodes];

  if (seenCodes.has('bcbs') && practiceState) {
    // Replace generic BCBS with state-specific code
    acceptedPayers = acceptedPayers.filter((c) => c !== 'bcbs');
    const stateCode = resolveBcbsByState(practiceState);
    if (stateCode && !acceptedPayers.includes(stateCode)) {
      acceptedPayers.push(stateCode);
    }
  }

  // Remove generic BCBS if a specific one is already present
  if (
    acceptedPayers.includes('bcbs') &&
    (acceptedPayers.includes('bcbs_tx') || acceptedPayers.includes('bcbs_ca'))
  ) {
    acceptedPayers = acceptedPayers.filter((c) => c !== 'bcbs');
  }

  return {
    accepted_payers: acceptedPayers.sort(),
    raw_mentions: uniqueMentions,
    extraction_source: extractionSource,
    confidence,
  };
}

// ── Section Finder ────────────────────────────────────────

/**
 * Find text regions on the page that discuss insurance acceptance.
 * Returns text chunks (up to ~500 chars each) around matching headings/sections.
 */
function findInsuranceSections(html: string, text: string): string[] {
  const sections: string[] = [];

  // Strategy A: Look for headings containing insurance keywords
  // Match <h1>-<h6>, <strong>, <b>, <th>, <dt>, or class="heading" etc.
  const headingRegex = /<(?:h[1-6]|strong|b|th|dt)[^>]*>(.*?)<\/(?:h[1-6]|strong|b|th|dt)>/gi;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(html)) !== null) {
    const headingText = match[1].replace(/<[^>]+>/g, '').trim();

    const isInsuranceHeading = INSURANCE_SECTION_PATTERNS.some((p) => p.test(headingText));
    if (isInsuranceHeading) {
      // Grab the next ~500 chars of text after this heading
      const afterHeading = html.substring(
        match.index + match[0].length,
        match.index + match[0].length + 2000,
      );
      // Strip HTML tags to get plain text
      const plainAfter = afterHeading
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      sections.push(plainAfter.substring(0, 500));
    }
  }

  // Strategy B: Look for insurance patterns in plain text (list items, paragraphs)
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (INSURANCE_SECTION_PATTERNS.some((p) => p.test(line))) {
      // Grab this line + next 10 lines
      const section = lines.slice(i, Math.min(i + 15, lines.length)).join(' ');
      sections.push(section.substring(0, 500));
    }
  }

  return sections;
}

// ── Payer Mention Finder ──────────────────────────────────

function findPayerMentions(text: string, inInsuranceSection: boolean): PayerMention[] {
  const mentions: PayerMention[] = [];
  const seen = new Set<string>();

  for (const payer of PAYER_ALIASES) {
    if (seen.has(payer.code)) continue;

    for (const pattern of payer.patterns) {
      const match = pattern.exec(text);
      if (match) {
        seen.add(payer.code);

        // Extract surrounding context (30 chars before and after)
        const start = Math.max(0, match.index - 30);
        const end = Math.min(text.length, match.index + match[0].length + 30);
        const context = text.substring(start, end).replace(/\s+/g, ' ').trim();

        mentions.push({
          payer_code: payer.code,
          matched_text: match[0],
          context,
          in_insurance_section: inInsuranceSection,
        });
        break; // One match per payer is enough
      }
    }
  }

  return mentions;
}

// ── BCBS State Resolution ─────────────────────────────────

function resolveBcbsByState(state: string): string | null {
  const stateUpper = state.toUpperCase();
  // Map US states to BCBS affiliate codes we track
  const STATE_MAP: Record<string, string> = {
    TX: 'bcbs_tx',
    CA: 'bcbs_ca',
    // Extend as more BCBS affiliates are added:
    // IL: 'bcbs_il', FL: 'bcbs_fl', etc.
  };
  return STATE_MAP[stateUpper] || null;
}
