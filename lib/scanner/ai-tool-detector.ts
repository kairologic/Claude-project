/**
 * lib/scanner/ai-tool-detector.ts
 * ════════════════════════════════════════════════════════════════
 * KairoLogic — Phase 1A Task 5: AI Tool Detection Engine
 * Vendor Fingerprint Library
 * ════════════════════════════════════════════════════════════════
 *
 * Detects AI-powered tools embedded in provider/practice websites
 * by fingerprinting JavaScript bundles, script URLs, DOM markers,
 * meta tags, and HTTP headers.
 *
 * This is distinct from the compliance-checks.ts AI-Transparency
 * check (which looks for disclosure text). This module identifies
 * WHICH specific AI vendors are deployed on the site.
 *
 * Used by:
 *   - scripts/run-tx-crawl.ts (bulk crawl)
 *   - lib/scanner/scan-scheduler.ts (per-site scan)
 *   - API route: /api/verify/website-compliance
 *
 * Output is written to the ai_tools_detected Supabase table.
 */

// ── Types ─────────────────────────────────────────────────────────

export interface DetectedAITool {
  tool_name: string;      // Human-readable product name, e.g. "Klara Messaging"
  tool_vendor: string;    // Vendor company, e.g. "Klara" or "Epic Systems"
  tool_category: AIToolCategory;
  detection_method: DetectionMethod;
  confidence_score: number;  // 0.0 – 1.0
  matched_signals: string[]; // Which specific signals triggered this
  evidence_url?: string;     // Script URL or resource that revealed it
}

export type AIToolCategory =
  | 'clinical_ai'           // Diagnostic / clinical decision support
  | 'patient_communication' // Secure messaging, chat, patient portal
  | 'scheduling'            // AI-powered scheduling / recall
  | 'ambient_documentation' // Voice/AI scribe, note generation
  | 'revenue_cycle'         // AI-powered billing / coding
  | 'marketing_chatbot'     // Generic chatbot (non-clinical)
  | 'ehr_portal'            // EHR patient portal (may embed AI)
  | 'telehealth'            // Video / async telehealth with AI
  | 'analytics';            // Population health / care gap analytics

export type DetectionMethod =
  | 'script_url'            // Third-party JS URL matched a known pattern
  | 'dom_marker'            // HTML element ID / class / data-attr matched
  | 'meta_tag'              // <meta name> or <meta property> matched
  | 'inline_script'         // window.* variable or __config__ object matched
  | 'link_href'             // <link rel=...> href matched
  | 'text_mention'          // Branded name mentioned in visible page text
  | 'csp_header'            // Content-Security-Policy header references vendor domain
  | 'cookie_name';          // Cookie name matched vendor pattern (in HTML)

export interface AIDetectionResult {
  detected_tools: DetectedAITool[];
  tool_count: number;
  categories_detected: AIToolCategory[];
  has_clinical_ai: boolean;   // Any clinical_ai or ambient_documentation tools
  has_patient_portal: boolean; // Any ehr_portal tools
  scan_duration_ms: number;
}

// ── Vendor Fingerprint Library ────────────────────────────────────
// Each entry describes one detectable AI tool.
// Signals are checked against: script URLs, HTML text, inline JS, headers.

interface VendorFingerprint {
  tool_name: string;
  tool_vendor: string;
  tool_category: AIToolCategory;
  // URL patterns (matched against all <script src=...> and <link href=...>)
  script_patterns?: RegExp[];
  // DOM patterns (matched against full HTML)
  dom_patterns?: RegExp[];
  // Inline JS / window variable patterns
  js_patterns?: RegExp[];
  // CSP header patterns (matched against connect-src, script-src domains)
  csp_patterns?: RegExp[];
  // Cookie name patterns (found inside HTML/document.cookie refs)
  cookie_patterns?: RegExp[];
  // Minimum number of signals required to fire (default: 1)
  min_signals?: number;
  // Base confidence for a single-signal match (boosted by multiple signals)
  base_confidence: number;
}

const VENDOR_FINGERPRINTS: VendorFingerprint[] = [
  // ── Patient Communication & Secure Messaging ──────────────────

  {
    tool_name: 'Klara Messaging',
    tool_vendor: 'Klara',
    tool_category: 'patient_communication',
    script_patterns: [/klara\.com/i, /klara-widget/i],
    dom_patterns: [/data-klara/i, /klara-chat/i, /id=["']klara/i],
    js_patterns: [/window\.KlaraWidget/i, /__klara/i],
    base_confidence: 0.95,
  },
  {
    tool_name: 'Luma Health Patient Engagement',
    tool_vendor: 'Luma Health',
    tool_category: 'patient_communication',
    script_patterns: [/lumahealth\.io/i, /luma-health/i],
    dom_patterns: [/luma-widget/i, /data-luma/i],
    js_patterns: [/window\.LumaHealth/i, /lumahealth/i],
    base_confidence: 0.93,
  },
  {
    tool_name: 'Spruce Health Messaging',
    tool_vendor: 'Spruce Health',
    tool_category: 'patient_communication',
    script_patterns: [/sprucehealth\.com/i],
    dom_patterns: [/spruce-messenger/i, /spruce-widget/i],
    js_patterns: [/window\.SpruceHealth/i, /sprucehealth/i],
    base_confidence: 0.92,
  },
  {
    tool_name: 'OhMD Patient Texting',
    tool_vendor: 'OhMD',
    tool_category: 'patient_communication',
    script_patterns: [/ohmd\.com/i],
    dom_patterns: [/ohmd-widget/i],
    js_patterns: [/window\.OhMD/i, /'ohmd'/i],
    base_confidence: 0.90,
  },
  {
    tool_name: 'Relatient Patient Engagement',
    tool_vendor: 'Relatient',
    tool_category: 'patient_communication',
    script_patterns: [/relatient\.com/i, /relatient-widget/i],
    dom_patterns: [/relatient/i],
    js_patterns: [/Relatient/i],
    base_confidence: 0.88,
  },

  // ── EHR Patient Portals ───────────────────────────────────────

  {
    tool_name: 'Epic MyChart Patient Portal',
    tool_vendor: 'Epic Systems',
    tool_category: 'ehr_portal',
    script_patterns: [/mychart\./i, /epic\.com/i, /epicuserweb/i],
    dom_patterns: [/mychart/i, /epic-mychart/i, /MyChartPortal/i, /href=["'][^"']*mychart/i, /data-mychart/i],
    js_patterns: [/window\.MyChart/i, /MyChartPRD/i, /epic/i],
    base_confidence: 0.92,
  },
  {
    tool_name: 'athenahealth Patient Portal',
    tool_vendor: 'athenahealth',
    tool_category: 'ehr_portal',
    script_patterns: [/athenahealth\.com/i, /athenanet\.com/i],
    dom_patterns: [/athena-patient/i, /athenahealth/i],
    js_patterns: [/athenahealth/i, /athenanet/i],
    base_confidence: 0.92,
  },
  {
    tool_name: 'eClinicalWorks Patient Portal',
    tool_vendor: 'eClinicalWorks',
    tool_category: 'ehr_portal',
    script_patterns: [/eclinicalweb\.com/i, /eclinicalworks/i],
    dom_patterns: [/ecw-portal/i, /eClinicalWorks/i],
    js_patterns: [/eclinicalweb/i, /eCW/i],
    base_confidence: 0.91,
  },
  {
    tool_name: 'Elation Health Patient Portal',
    tool_vendor: 'Elation Health',
    tool_category: 'ehr_portal',
    script_patterns: [/elationhealth\.com/i],
    dom_patterns: [/elation-portal/i],
    js_patterns: [/elationhealth/i],
    base_confidence: 0.89,
  },
  {
    tool_name: 'DrChrono Patient Portal',
    tool_vendor: 'DrChrono',
    tool_category: 'ehr_portal',
    script_patterns: [/drchrono\.com/i],
    dom_patterns: [/drchrono/i],
    js_patterns: [/drchrono/i],
    base_confidence: 0.89,
  },

  // ── AI-Powered Scheduling ─────────────────────────────────────

  {
    tool_name: 'Zocdoc Scheduling',
    tool_vendor: 'Zocdoc',
    tool_category: 'scheduling',
    script_patterns: [/zocdoc\.com/i, /assets\.zocdoc\.com/i],
    dom_patterns: [/zocdoc-widget/i, /data-zocdoc/i, /zocdoc/i],
    js_patterns: [/window\.ZocDoc/i, /ZocDoc/],
    base_confidence: 0.95,
  },
  {
    tool_name: 'Acuity Scheduling',
    tool_vendor: 'Squarespace (Acuity)',
    tool_category: 'scheduling',
    script_patterns: [/acuityscheduling\.com/i],
    dom_patterns: [/acuity-scheduling/i, /acuityscheduling/i],
    js_patterns: [/AcuityScheduling/i],
    base_confidence: 0.93,
  },
  {
    tool_name: 'Solutionreach Recall & Scheduling',
    tool_vendor: 'Solutionreach',
    tool_category: 'scheduling',
    script_patterns: [/solutionreach\.com/i],
    dom_patterns: [/solutionreach/i],
    js_patterns: [/Solutionreach/i],
    base_confidence: 0.88,
  },
  {
    tool_name: 'NexHealth Online Scheduling',
    tool_vendor: 'NexHealth',
    tool_category: 'scheduling',
    script_patterns: [/nexhealth\.com/i],
    dom_patterns: [/nexhealth-widget/i, /nexhealth/i],
    js_patterns: [/NexHealth/i],
    base_confidence: 0.91,
  },
  {
    tool_name: 'Phreesia Patient Intake',
    tool_vendor: 'Phreesia',
    tool_category: 'scheduling',
    script_patterns: [/phreesia\.com/i, /phreesia\.net/i],
    dom_patterns: [/phreesia/i],
    js_patterns: [/Phreesia/i],
    base_confidence: 0.92,
  },

  // ── Ambient Documentation / AI Scribe ────────────────────────

  {
    tool_name: 'Nuance DAX AI Scribe',
    tool_vendor: 'Microsoft / Nuance',
    tool_category: 'ambient_documentation',
    script_patterns: [/nuance\.com/i, /nuancedax/i, /dragon-medical/i],
    dom_patterns: [/nuance-dax/i, /dragon-medical/i],
    js_patterns: [/Nuance/i, /DragonMedical/i],
    base_confidence: 0.90,
  },
  {
    tool_name: 'Suki AI Clinical Assistant',
    tool_vendor: 'Suki AI',
    tool_category: 'ambient_documentation',
    script_patterns: [/suki\.ai/i],
    dom_patterns: [/suki-widget/i, /suki\.ai/i],
    js_patterns: [/window\.Suki/i, /suki\.ai/i],
    base_confidence: 0.93,
  },
  {
    tool_name: 'Abridge AI Documentation',
    tool_vendor: 'Abridge',
    tool_category: 'ambient_documentation',
    script_patterns: [/abridge\.com/i],
    dom_patterns: [/abridge/i],
    js_patterns: [/Abridge/i],
    base_confidence: 0.91,
  },
  {
    tool_name: 'DeepScribe Ambient AI',
    tool_vendor: 'DeepScribe',
    tool_category: 'ambient_documentation',
    script_patterns: [/deepscribe\.ai/i],
    dom_patterns: [/deepscribe/i],
    js_patterns: [/DeepScribe/i],
    base_confidence: 0.90,
  },

  // ── Clinical / Diagnostic AI ──────────────────────────────────

  {
    tool_name: 'Olive AI Healthcare Automation',
    tool_vendor: 'Olive AI',
    tool_category: 'clinical_ai',
    script_patterns: [/oliveai\.com/i],
    dom_patterns: [/olive-ai/i],
    js_patterns: [/OliveAI/i],
    base_confidence: 0.88,
  },
  {
    tool_name: 'Babylon Health AI Triage',
    tool_vendor: 'Babylon Health',
    tool_category: 'clinical_ai',
    script_patterns: [/babylonhealth\.com/i, /babylon-widget/i],
    dom_patterns: [/babylon-health/i],
    js_patterns: [/BabylonHealth/i],
    base_confidence: 0.91,
  },
  {
    tool_name: 'Infermedica Clinical AI',
    tool_vendor: 'Infermedica',
    tool_category: 'clinical_ai',
    script_patterns: [/infermedica\.com/i],
    dom_patterns: [/infermedica/i],
    js_patterns: [/Infermedica/i],
    base_confidence: 0.92,
  },
  {
    tool_name: 'Regard Clinical Decision Support',
    tool_vendor: 'Regard',
    tool_category: 'clinical_ai',
    script_patterns: [/regardhealth\.com/i],
    dom_patterns: [/regard-widget/i],
    js_patterns: [/Regard/i],
    base_confidence: 0.88,
  },

  // ── Revenue Cycle AI ──────────────────────────────────────────

  {
    tool_name: 'Cohere Health Prior Auth AI',
    tool_vendor: 'Cohere Health',
    tool_category: 'revenue_cycle',
    script_patterns: [/coherehealth\.com/i],
    dom_patterns: [/cohere-widget/i],
    js_patterns: [/CohereHealth/i],
    base_confidence: 0.88,
  },

  // ── Marketing & General Chatbots ──────────────────────────────

  {
    tool_name: 'Drift AI Chat',
    tool_vendor: 'Drift (Salesloft)',
    tool_category: 'marketing_chatbot',
    script_patterns: [/js\.driftt\.com/i, /drift\.com\/include/i],
    dom_patterns: [/drift-widget/i, /data-drift/i],
    js_patterns: [/window\.drift/i, /window\.driftt/i, /drift\.load/i],
    base_confidence: 0.97,
  },
  {
    tool_name: 'Intercom Chat',
    tool_vendor: 'Intercom',
    tool_category: 'marketing_chatbot',
    script_patterns: [/widget\.intercom\.io/i, /js\.intercomcdn\.com/i],
    dom_patterns: [/intercom-frame/i, /intercom-container/i, /#intercom-/i],
    js_patterns: [/window\.Intercom/i, /intercomSettings/i],
    base_confidence: 0.97,
  },
  {
    tool_name: 'Tidio AI Chat',
    tool_vendor: 'Tidio',
    tool_category: 'marketing_chatbot',
    script_patterns: [/code\.tidio\.co/i],
    dom_patterns: [/tidio-chat/i],
    js_patterns: [/tidioChatCode/i, /window\.tidioChatApi/i],
    base_confidence: 0.96,
  },
  {
    tool_name: 'Zendesk Chat',
    tool_vendor: 'Zendesk',
    tool_category: 'marketing_chatbot',
    script_patterns: [/static\.zdassets\.com/i, /zendesk\.com\/embeddable/i],
    dom_patterns: [/zendesk-widget/i, /zEWidget-launcher/i],
    js_patterns: [/window\.zE\b/i, /zESettings/i],
    base_confidence: 0.96,
  },
  {
    tool_name: 'Freshdesk / Freshchat',
    tool_vendor: 'Freshworks',
    tool_category: 'marketing_chatbot',
    script_patterns: [/freshchat\.com/i, /wchat\.freshchat\.com/i],
    dom_patterns: [/freshchat-widget/i, /fc-widget/i],
    js_patterns: [/window\.fcWidget/i, /FreshworksWidget/i],
    base_confidence: 0.95,
  },
  {
    tool_name: 'HubSpot Live Chat',
    tool_vendor: 'HubSpot',
    tool_category: 'marketing_chatbot',
    script_patterns: [/js\.hs-scripts\.com/i, /js\.hubspot\.com/i, /js\.usemessages\.com/i],
    dom_patterns: [/hs-chat-widget/i, /hubspot-messages/i],
    js_patterns: [/window\.HubSpotConversations/i, /hsConversationsSettings/i],
    base_confidence: 0.96,
  },

  // ── Telehealth with AI ────────────────────────────────────────

  {
    tool_name: 'Teladoc Health',
    tool_vendor: 'Teladoc Health',
    tool_category: 'telehealth',
    script_patterns: [/teladoc\.com/i, /teladochealth\.com/i],
    dom_patterns: [/teladoc-widget/i],
    js_patterns: [/Teladoc/i],
    base_confidence: 0.90,
  },
  {
    tool_name: 'Doxy.me Telehealth',
    tool_vendor: 'Doxy.me',
    tool_category: 'telehealth',
    script_patterns: [/doxy\.me/i],
    dom_patterns: [/doxy-widget/i, /doxy\.me/i],
    js_patterns: [/DoxyMe/i],
    base_confidence: 0.93,
  },

  // ── Analytics / Population Health ────────────────────────────

  {
    tool_name: 'Health Catalyst Analytics',
    tool_vendor: 'Health Catalyst',
    tool_category: 'analytics',
    script_patterns: [/healthcatalyst\.com/i],
    dom_patterns: [/health-catalyst/i],
    js_patterns: [/HealthCatalyst/i],
    base_confidence: 0.87,
  },
];

// ── Signal Extraction ─────────────────────────────────────────────

function extractScriptUrls(html: string): string[] {
  const urls: string[] = [];
  const srcRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = srcRegex.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

function extractLinkHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const hrefRegex = /<link[^>]+href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) hrefs.push(m[1]);
  return hrefs;
}

function extractInlineScript(html: string): string {
  // Combine all inline <script> blocks (not src=)
  const parts: string[] = [];
  const inlineRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = inlineRegex.exec(html)) !== null) parts.push(m[1]);
  return parts.join('\n');
}

function extractCSPDomains(headers: Record<string, string>): string {
  const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'] || '';
  return csp;
}

// ── Confidence Scoring ────────────────────────────────────────────

function computeConfidence(fp: VendorFingerprint, signalCount: number): number {
  // Each additional signal beyond the first adds 0.03, capped at 0.99
  const boost = Math.min((signalCount - 1) * 0.03, 0.12);
  return Math.min(fp.base_confidence + boost, 0.99);
}

// ── Main Detection Engine ─────────────────────────────────────────

/**
 * Run all vendor fingerprint checks against a crawled page.
 *
 * @param html       Full HTML of the crawled page
 * @param text       Stripped plain text of the page
 * @param headers    HTTP response headers (lowercased keys)
 * @returns          Detection result with all matched tools
 */
export function detectAITools(
  html: string,
  text: string,
  headers: Record<string, string> = {},
): AIDetectionResult {
  const startMs = Date.now();

  // Pre-extract signal sources (do this once)
  const scriptUrls = extractScriptUrls(html);
  const linkHrefs = extractLinkHrefs(html);
  const inlineScript = extractInlineScript(html);
  const cspHeader = extractCSPDomains(headers);
  const allUrls = [...scriptUrls, ...linkHrefs].join('\n');

  const detected: DetectedAITool[] = [];

  for (const fp of VENDOR_FINGERPRINTS) {
    const signals: string[] = [];
    let primaryMethod: DetectionMethod = 'text_mention';

    // 1. Script URL matching
    if (fp.script_patterns) {
      for (const pattern of fp.script_patterns) {
        const match = scriptUrls.find((url) => pattern.test(url));
        if (match) {
          signals.push(`script: ${match.slice(0, 80)}`);
          primaryMethod = 'script_url';
          break;
        }
      }
    }

    // 2. DOM / full-HTML matching (IDs, classes, data-attrs, href patterns)
    if (fp.dom_patterns) {
      for (const pattern of fp.dom_patterns) {
        if (pattern.test(html)) {
          signals.push(`dom: ${pattern.source}`);
          if (primaryMethod === 'text_mention') primaryMethod = 'dom_marker';
          break;
        }
      }
    }

    // 3. Inline JavaScript variable/config matching
    if (fp.js_patterns) {
      for (const pattern of fp.js_patterns) {
        if (pattern.test(inlineScript)) {
          signals.push(`inline_js: ${pattern.source}`);
          if (primaryMethod === 'text_mention') primaryMethod = 'inline_script';
          break;
        }
      }
    }

    // 4. CSP header domain matching
    if (fp.csp_patterns) {
      for (const pattern of fp.csp_patterns) {
        if (pattern.test(cspHeader)) {
          signals.push(`csp: ${pattern.source}`);
          if (primaryMethod === 'text_mention') primaryMethod = 'csp_header';
          break;
        }
      }
    }

    // 5. Link href matching
    if (fp.script_patterns) {
      const hrefMatch = linkHrefs.find((h) => fp.script_patterns!.some((p) => p.test(h)));
      if (hrefMatch && !signals.some((s) => s.startsWith('script:'))) {
        signals.push(`link_href: ${hrefMatch.slice(0, 80)}`);
        if (primaryMethod === 'text_mention') primaryMethod = 'link_href';
      }
    }

    // Check minimum signal threshold
    const minSignals = fp.min_signals ?? 1;
    if (signals.length < minSignals) continue;

    const confidence = computeConfidence(fp, signals.length);

    // Find representative evidence URL (first script URL matched)
    const evidenceUrl = scriptUrls.find((url) =>
      fp.script_patterns?.some((p) => p.test(url)),
    );

    detected.push({
      tool_name: fp.tool_name,
      tool_vendor: fp.tool_vendor,
      tool_category: fp.tool_category,
      detection_method: primaryMethod,
      confidence_score: parseFloat(confidence.toFixed(2)),
      matched_signals: signals,
      evidence_url: evidenceUrl,
    });
  }

  // Deduplicate by tool_name (keep highest confidence)
  const seen = new Map<string, DetectedAITool>();
  for (const tool of detected) {
    const existing = seen.get(tool.tool_name);
    if (!existing || tool.confidence_score > existing.confidence_score) {
      seen.set(tool.tool_name, tool);
    }
  }
  const uniqueTools = [...seen.values()].sort((a, b) => b.confidence_score - a.confidence_score);

  const categories = [...new Set(uniqueTools.map((t) => t.tool_category))];
  const hasClinicalAI = categories.some(
    (c) => c === 'clinical_ai' || c === 'ambient_documentation',
  );
  const hasPortal = categories.includes('ehr_portal');

  return {
    detected_tools: uniqueTools,
    tool_count: uniqueTools.length,
    categories_detected: categories,
    has_clinical_ai: hasClinicalAI,
    has_patient_portal: hasPortal,
    scan_duration_ms: Date.now() - startMs,
  };
}

// ── Supabase Writer ───────────────────────────────────────────────

/**
 * Write detected AI tools to the ai_tools_detected table.
 * Uses upsert on (npi, tool_name, detected_date) — safe to re-run.
 */
export async function saveAIToolDetections(
  npi: string,
  crawlUrl: string,
  result: AIDetectionResult,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<{ written: number; errors: number }> {
  if (result.tool_count === 0) return { written: 0, errors: 0 };

  const rows = result.detected_tools.map((tool) => ({
    npi,
    tool_name: tool.tool_name,
    tool_vendor: tool.tool_vendor,
    tool_category: tool.tool_category,
    detection_method: tool.detection_method,
    confidence_score: tool.confidence_score,
    detected_at: new Date().toISOString(),
    crawl_url: crawlUrl,
    evidence: {
      matched_signals: tool.matched_signals,
      evidence_url: tool.evidence_url ?? null,
    },
  }));

  const res = await fetch(`${supabaseUrl}/rest/v1/ai_tools_detected`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`[AIDetector] Failed to save for NPI ${npi}: ${res.status} ${err.slice(0, 200)}`);
    return { written: 0, errors: rows.length };
  }

  return { written: rows.length, errors: 0 };
}
