/**
 * lib/scanner/accepting-patients-detector.ts
 * ════════════════════════════════════════════════════════════════
 * KairoLogic — Phase 1A Task 3: "Accepting New Patients" Detector
 * ════════════════════════════════════════════════════════════════
 *
 * Detects whether a practice website indicates it IS or IS NOT
 * currently accepting new patients, by parsing page text and HTML
 * for explicit signals.
 *
 * Why this matters (Gap G9): payer FHIR directories return NULL for
 * listed_accepting_patients on virtually all TX providers. The website
 * becomes the PRIMARY signal for this field until payer APIs populate.
 *
 * Returns a structured result with:
 *   - status: 'accepting' | 'not_accepting' | 'waitlist' | 'unknown'
 *   - confidence: 'high' | 'medium' | 'low'
 *   - matched_text: the snippet that triggered the detection
 *
 * Used by:
 *   - lib/scanner/scan-scheduler.ts (step 3b in scanSite)
 *   - scripts/run-tx-crawl.ts (bulk crawl)
 */

// ── Types ──────────────────────────────────────────────────────────

export type AcceptingPatientsStatus =
  | 'accepting'       // Actively accepting new patients
  | 'not_accepting'   // Explicitly not accepting / closed panel
  | 'waitlist'        // Accepting to a waitlist
  | 'unknown';        // No signal found

export type AcceptingPatientsConfidence = 'high' | 'medium' | 'low';

export interface AcceptingPatientsResult {
  status: AcceptingPatientsStatus;
  confidence: AcceptingPatientsConfidence;
  matched_text: string | null;   // The snippet that triggered detection
  matched_pattern: string | null; // Pattern description for debugging
}

// ── Signal Patterns ────────────────────────────────────────────────
// Ordered: more specific / higher-confidence patterns first.

// POSITIVE: "accepting new patients" signals
const ACCEPTING_PATTERNS: Array<{ pattern: RegExp; confidence: AcceptingPatientsConfidence; label: string }> = [
  // Exact phrase with explicit affirmation
  { pattern: /\bwe\s+are\s+(?:now\s+)?accepting\s+new\s+patients\b/i,         confidence: 'high',   label: 'we_are_accepting' },
  { pattern: /\baccept(?:ing)?\s+new\s+patients\b/i,                           confidence: 'high',   label: 'accepting_new_patients' },
  { pattern: /\bnew\s+patients\s+(?:are\s+)?welcome[d]?\b/i,                   confidence: 'high',   label: 'new_patients_welcome' },
  { pattern: /\bopen\s+(?:to|for)\s+new\s+patients\b/i,                        confidence: 'high',   label: 'open_to_new_patients' },
  { pattern: /\bnew\s+patient\s+appointment[s]?\b/i,                           confidence: 'medium', label: 'new_patient_appointment' },
  { pattern: /\bschedul(?:e|ing)\s+(?:a\s+)?new\s+patient[s]?\b/i,            confidence: 'medium', label: 'scheduling_new_patients' },
  { pattern: /\bnew\s+patients?\s+(?:may|can)\s+(?:call|book|schedule)\b/i,   confidence: 'medium', label: 'new_patients_may_call' },
  // Booking buttons / CTAs often imply accepting
  { pattern: /\bbook\s+(?:a\s+)?(?:new\s+patient\s+)?(?:appointment|visit)\b/i, confidence: 'low',  label: 'book_appointment_cta' },
  { pattern: /\bnew\s+patient\s+forms?\b/i,                                    confidence: 'low',    label: 'new_patient_forms' },
  { pattern: /\bbecome\s+a\s+(?:new\s+)?patient\b/i,                           confidence: 'high',   label: 'become_a_patient' },
  { pattern: /\bjoin\s+(?:our\s+)?(?:patient\s+)?(?:panel|practice|family)\b/i, confidence: 'medium', label: 'join_our_practice' },
  // Telehealth new patient variants
  { pattern: /\bnew\s+patients?\s+(?:can\s+)?(?:start|begin|request)\b/i,     confidence: 'medium', label: 'new_patients_can_start' },
];

// NEGATIVE: "NOT accepting" signals — checked first (higher priority)
const NOT_ACCEPTING_PATTERNS: Array<{ pattern: RegExp; confidence: AcceptingPatientsConfidence; label: string }> = [
  { pattern: /\bnot\s+accept(?:ing)?\s+new\s+patients\b/i,                    confidence: 'high',   label: 'not_accepting' },
  { pattern: /\bno\s+longer\s+accept(?:ing)?\s+new\s+patients\b/i,           confidence: 'high',   label: 'no_longer_accepting' },
  { pattern: /\bclos(?:ed|ing)\s+(?:our\s+)?(?:panel|practice)\b/i,          confidence: 'high',   label: 'closed_panel' },
  { pattern: /\bpanel\s+(?:is\s+)?(?:closed|full)\b/i,                       confidence: 'high',   label: 'panel_closed' },
  { pattern: /\bno\s+new\s+patients?\b/i,                                      confidence: 'high',   label: 'no_new_patients' },
  { pattern: /\bunable\s+to\s+(?:accept|take)\s+new\s+patients\b/i,          confidence: 'high',   label: 'unable_to_accept' },
  { pattern: /\bonly\s+(?:see(?:ing)?\s+)?(?:current|existing|established)\s+patients\b/i, confidence: 'high', label: 'existing_patients_only' },
  { pattern: /\bexisting\s+patients?\s+only\b/i,                              confidence: 'high',   label: 'existing_only' },
  // Referral-only implies closed panel to new self-referrals
  { pattern: /\bby\s+referral\s+only\b/i,                                     confidence: 'medium', label: 'referral_only' },
  { pattern: /\bwaiting\s+list\s+(?:is\s+)?(?:full|closed)\b/i,              confidence: 'high',   label: 'waitlist_full' },
];

// WAITLIST patterns
const WAITLIST_PATTERNS: Array<{ pattern: RegExp; confidence: AcceptingPatientsConfidence; label: string }> = [
  { pattern: /\bjoin(?:ing)?\s+(?:our\s+)?waiting\s+list\b/i,                confidence: 'high',   label: 'join_waitlist' },
  { pattern: /\bwait(?:ing)?\s+list\b/i,                                      confidence: 'medium', label: 'waiting_list' },
  { pattern: /\bwaitlist\b/i,                                                  confidence: 'medium', label: 'waitlist' },
  { pattern: /\bopen(?:ing)?\s+(?:soon|in\s+\d+)/i,                          confidence: 'low',    label: 'opening_soon' },
];

// ── Helper: find surrounding text context ─────────────────────────

function getContext(text: string, matchIndex: number, contextChars = 80): string {
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(text.length, matchIndex + contextChars);
  return text.substring(start, end).replace(/\s+/g, ' ').trim();
}

// ── Main Detector ─────────────────────────────────────────────────

/**
 * Detect "accepting new patients" status from website HTML + plain text.
 *
 * Priority order: NOT_ACCEPTING > WAITLIST > ACCEPTING
 * (A page that says "no longer accepting" overrides any old "new patients welcome" text)
 */
export function detectAcceptingPatients(
  html: string,
  text: string,
): AcceptingPatientsResult {
  // Work on the combined text + visible alt-text from HTML
  // Use text (stripped) as primary, fall back to HTML for some patterns
  const searchText = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // ── 1. Check NOT_ACCEPTING (highest priority) ──────────────────
  for (const { pattern, confidence, label } of NOT_ACCEPTING_PATTERNS) {
    const match = pattern.exec(searchText);
    if (match) {
      return {
        status: 'not_accepting',
        confidence,
        matched_text: getContext(searchText, match.index),
        matched_pattern: label,
      };
    }
  }

  // ── 2. Check WAITLIST ──────────────────────────────────────────
  let waitlistResult: AcceptingPatientsResult | null = null;
  for (const { pattern, confidence, label } of WAITLIST_PATTERNS) {
    const match = pattern.exec(searchText);
    if (match) {
      // Keep looking — a stronger accepting signal should override a weak waitlist
      waitlistResult = {
        status: 'waitlist',
        confidence,
        matched_text: getContext(searchText, match.index),
        matched_pattern: label,
      };
      break;
    }
  }

  // ── 3. Check ACCEPTING ─────────────────────────────────────────
  for (const { pattern, confidence, label } of ACCEPTING_PATTERNS) {
    const match = pattern.exec(searchText);
    if (match) {
      // High-confidence accepting overrides low-confidence waitlist
      if (
        waitlistResult &&
        confidence === 'low' &&
        waitlistResult.confidence !== 'low'
      ) {
        return waitlistResult; // waitlist wins over low-confidence accepting signal
      }
      return {
        status: 'accepting',
        confidence,
        matched_text: getContext(searchText, match.index),
        matched_pattern: label,
      };
    }
  }

  // Return waitlist if found but no accepting signal
  if (waitlistResult) return waitlistResult;

  // ── 4. No signal ──────────────────────────────────────────────
  return {
    status: 'unknown',
    confidence: 'low',
    matched_text: null,
    matched_pattern: null,
  };
}
