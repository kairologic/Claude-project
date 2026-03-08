/**
 * tmb-newsroom-monitor.ts
 * 
 * Monitors the Texas Medical Board Newsroom for disciplinary actions,
 * closing the 30-day ORSSP detection gap for critical licensing events.
 * 
 * THREE-TIER APPROACH:
 * 
 *   Tier 1 (this file): Weekly newsroom scraper
 *     - Fetches tmb.state.tx.us/about-us/newsroom press release table
 *     - Parses for new disciplinary entries since last check
 *     - Extracts physician names, license numbers, cities, action types
 *     - Cross-references against provider_licenses table
 *     - Writes high-confidence delta events for matches
 *     - Catches emergency suspensions within ~7 days (vs 30 day ORSSP lag)
 * 
 *   Tier 2 (future): Board meeting batch processing
 *     - After each bi-monthly board meeting, TMB publishes comprehensive
 *       "TMB Disciplines N Physicians at [Month] Meeting" releases
 *     - Dedicated parser for these structured releases
 * 
 *   Tier 3 (existing): ORSSP monthly bulk file
 *     - Remains the authoritative baseline for all status fields
 *     - tmb-parser.ts continues to handle this
 * 
 * DATA SOURCE:
 *   TMB Newsroom: https://www.tmb.state.tx.us/about-us/newsroom
 *   - Press releases follow board meetings
 *   - Emergency suspensions published ad-hoc (highest urgency)
 *   - HTML table with title + date, paginated
 *   - Data updates are public information (Texas Open Meetings Act)
 * 
 * SCRAPING APPROACH:
 *   - Minimal footprint: 1 page fetch per run (just the newsroom table)
 *   - Individual release pages fetched only for NEW entries
 *   - Respectful: weekly cadence, single-threaded, User-Agent identified
 *   - No login required, no ToS risk (public government data)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PressRelease {
  title: string;
  url: string;
  date: string;            // ISO date string
  releaseType: TMBReleaseType;
  physicianName?: string;   // For suspension releases: "Jaffer", "Molina", etc.
  physicianCity?: string;   // For suspension releases: "Sugar Land", "Austin", etc.
}

export type TMBReleaseType =
  | 'EMERGENCY_SUSPENSION'    // "TMB Suspends [City] Physician ([Name])"
  | 'BOARD_MEETING_ACTIONS'   // "TMB Disciplines N Physicians at [Month] Meeting"
  | 'PA_SUSPENSION'           // "Texas Physician Assistant Board Suspends..."
  | 'OTHER';                  // Joint statements, rule changes, etc.

export interface BoardMeetingAction {
  physicianName: string;
  licenseNumber: string;
  city: string;
  state: string;
  actionType: string;
  releaseDate: string;
  releaseUrl: string;
}

export interface MonitorResult {
  newReleases: number;
  suspensionsDetected: number;
  boardActionsDetected: number;
  matchesFound: number;
  deltaEventsCreated: number;
  errors: string[];
}

// ─── Configuration ───────────────────────────────────────────────────────────

const TMB_NEWSROOM_URL = 'https://www.tmb.state.tx.us/about-us/newsroom';
const TMB_BASE_URL = 'https://www.tmb.state.tx.us';
const USER_AGENT = 'KairoLogic Healthcare Compliance Monitor/1.0 (contact@kairologic.net)';

// ─── Regex Patterns ──────────────────────────────────────────────────────────

const PATTERNS = {
  // "TMB Suspends Sugar Land Physician (Jaffer)"
  emergencySuspension: /TMB Suspends\s+(.+?)\s+Physician\s*\(([^)]+)\)/i,

  // "Texas Physician Assistant Board Suspends Texas City Physician Assistant (Seiter)"
  paSuspension: /Physician Assistant Board Suspends\s+(.+?)\s+Physician Assistant\s*\(([^)]+)\)/i,

  // "TMB Disciplines 24 Physicians at June Meeting"
  boardMeeting: /TMB Disciplines\s+(\d+)\s+Physicians?\s+at\s+(\w+)\s+Meeting/i,

  // Inside board meeting releases: "Henderson, David Livingstone, M.D., Lic. No. N0088, Dallas"
  physicianEntry: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+[A-Z]\.?)?),\s*(?:M\.D\.|D\.O\.),\s*Lic\.\s*No\.\s*([A-Z]\d+),\s*(.+?)(?:\s*$|\s*·)/gm,

  // License number pattern
  licenseNumber: /Lic(?:ense)?\.?\s*No\.?\s*([A-Z]\d{3,5})/i,
};

// ─── TMB Newsroom Monitor Service ────────────────────────────────────────────

export class TMBNewsroomMonitor {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main entry point: check TMB newsroom for new disciplinary actions.
   */
  async checkForNewActions(): Promise<MonitorResult> {
    const result: MonitorResult = {
      newReleases: 0,
      suspensionsDetected: 0,
      boardActionsDetected: 0,
      matchesFound: 0,
      deltaEventsCreated: 0,
      errors: [],
    };

    try {
      // 1. Fetch the newsroom page
      console.log('[TMB Monitor] Fetching newsroom...');
      const releases = await this.fetchNewsroomReleases();
      console.log(`[TMB Monitor] Found ${releases.length} releases on page`);

      // 2. Filter to only new releases (since last check)
      const newReleases = await this.filterNewReleases(releases);
      result.newReleases = newReleases.length;
      console.log(`[TMB Monitor] ${newReleases.length} new since last check`);

      if (newReleases.length === 0) {
        console.log('[TMB Monitor] No new releases, done');
        return result;
      }

      // 3. Process each new release by type
      await this.processReleases(newReleases, result);

    } catch (err) {
      const msg = `Fatal error: ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      console.error(`[TMB Monitor] ${msg}`);
    }

    return result;
  }

  /**
   * Backfill: crawl multiple pages of the TMB newsroom to catch
   * historical disciplinary actions. Use for initial bootstrap.
   * 
   * TMB newsroom has ~10 pages of press releases going back ~2 years.
   * Each page has ~10 entries.
   * 
   * Usage:
   *   const monitor = new TMBNewsroomMonitor();
   *   const result = await monitor.backfill({ pages: 10, delayMs: 1000 });
   */
  async backfill(options: {
    pages?: number;
    delayMs?: number;
    sinceDate?: string;  // ISO date, stop crawling when releases are older than this
  } = {}): Promise<MonitorResult> {
    const { pages = 10, delayMs = 1000, sinceDate } = options;
    const cutoffDate = sinceDate ? new Date(sinceDate) : null;

    const result: MonitorResult = {
      newReleases: 0,
      suspensionsDetected: 0,
      boardActionsDetected: 0,
      matchesFound: 0,
      deltaEventsCreated: 0,
      errors: [],
    };

    console.log(`[TMB Backfill] Crawling ${pages} pages of TMB newsroom...`);
    if (cutoffDate) {
      console.log(`[TMB Backfill] Cutoff date: ${sinceDate}`);
    }

    let totalReleases = 0;
    let stoppedEarly = false;

    for (let page = 0; page < pages; page++) {
      try {
        console.log(`[TMB Backfill] Fetching page ${page + 1}/${pages}...`);
        const releases = await this.fetchNewsroomPage(page);

        if (releases.length === 0) {
          console.log(`[TMB Backfill] Page ${page + 1} is empty, stopping`);
          break;
        }

        // Check if we've gone past the cutoff date
        if (cutoffDate) {
          const oldestOnPage = new Date(releases[releases.length - 1].date);
          if (oldestOnPage < cutoffDate) {
            // Filter this page to only include releases after cutoff
            const filtered = releases.filter(r => new Date(r.date) >= cutoffDate);
            console.log(`[TMB Backfill] Page ${page + 1}: ${filtered.length}/${releases.length} releases after cutoff`);
            
            const newReleases = await this.filterNewReleases(filtered);
            if (newReleases.length > 0) {
              await this.processReleases(newReleases, result);
              result.newReleases += newReleases.length;
              totalReleases += newReleases.length;
            }
            stoppedEarly = true;
            break;
          }
        }

        // Filter and process new releases on this page
        const newReleases = await this.filterNewReleases(releases);
        totalReleases += newReleases.length;
        result.newReleases += newReleases.length;

        if (newReleases.length > 0) {
          console.log(`[TMB Backfill] Page ${page + 1}: ${newReleases.length} new releases to process`);
          await this.processReleases(newReleases, result);
        } else {
          console.log(`[TMB Backfill] Page ${page + 1}: all releases already processed`);
        }

        // Respectful delay between pages
        if (page < pages - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (err) {
        const msg = `Error on page ${page + 1}: ${err instanceof Error ? err.message : String(err)}`;
        result.errors.push(msg);
        console.error(`[TMB Backfill] ${msg}`);
      }
    }

    console.log(`[TMB Backfill] Complete: ${totalReleases} new releases across ${pages} pages${stoppedEarly ? ' (stopped at cutoff date)' : ''}`);
    return result;
  }

  /**
   * Shared processing logic used by both checkForNewActions() and backfill().
   */
  private async processReleases(releases: PressRelease[], result: MonitorResult): Promise<void> {
    for (const release of releases) {
      try {
        if (release.releaseType === 'EMERGENCY_SUSPENSION') {
          result.suspensionsDetected++;
          const matches = await this.processEmergencySuspension(release);
          result.matchesFound += matches;
          result.deltaEventsCreated += matches;
        } else if (release.releaseType === 'BOARD_MEETING_ACTIONS') {
          const actions = await this.processBoardMeetingRelease(release);
          result.boardActionsDetected += actions.total;
          result.matchesFound += actions.matched;
          result.deltaEventsCreated += actions.eventsCreated;
        }

        // Mark release as processed
        await this.markReleaseProcessed(release);

      } catch (err) {
        const msg = `Error processing release "${release.title}": ${err instanceof Error ? err.message : String(err)}`;
        result.errors.push(msg);
        console.error(`[TMB Monitor] ${msg}`);
      }
    }
  }

  // ─── Newsroom Fetching ─────────────────────────────────────────────────

  /**
   * Fetch and parse a single page of the TMB newsroom press release table.
   * Page 0 = most recent, page 1 = next oldest, etc.
   */
  async fetchNewsroomPage(page: number = 0): Promise<PressRelease[]> {
    const url = page === 0
      ? TMB_NEWSROOM_URL
      : `${TMB_NEWSROOM_URL}?page=${page}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(`TMB Newsroom returned HTTP ${response.status} for page ${page}`);
    }

    const html = await response.text();
    return this.parseNewsroomHtml(html);
  }

  /**
   * Fetch page 0 (default). Backwards-compatible with existing callers.
   */
  async fetchNewsroomReleases(): Promise<PressRelease[]> {
    return this.fetchNewsroomPage(0);
  }

  /**
   * Parse the newsroom HTML for press release entries.
   * 
   * The TMB newsroom page has a table with columns:
   *   Press Release | Date
   * 
   * Each row has a link to the full release and a date string (MM/DD/YYYY).
   */
  parseNewsroomHtml(html: string): PressRelease[] {
    const releases: PressRelease[] = [];

    // Match table rows with press release links and dates
    // Pattern: <a href="/about-us/newsroom/...">Title</a> followed by date
    const rowPattern = /<a\s+href="(\/about-us\/newsroom\/[^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})/g;
    let match;

    while ((match = rowPattern.exec(html)) !== null) {
      const [, path, title, dateStr] = match;
      const url = `${TMB_BASE_URL}${path}`;
      const cleanTitle = title.trim();

      // Parse date from MM/DD/YYYY
      const [month, day, year] = dateStr.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Classify the release type
      const releaseType = this.classifyRelease(cleanTitle);

      const release: PressRelease = {
        title: cleanTitle,
        url,
        date: isoDate,
        releaseType,
      };

      // Extract physician name and city for suspension releases
      if (releaseType === 'EMERGENCY_SUSPENSION') {
        const suspMatch = PATTERNS.emergencySuspension.exec(cleanTitle);
        if (suspMatch) {
          release.physicianCity = suspMatch[1].trim();
          release.physicianName = suspMatch[2].trim();
        }
      } else if (releaseType === 'PA_SUSPENSION') {
        const paMatch = PATTERNS.paSuspension.exec(cleanTitle);
        if (paMatch) {
          release.physicianCity = paMatch[1].trim();
          release.physicianName = paMatch[2].trim();
        }
      }

      releases.push(release);
    }

    // Fallback: try a simpler pattern if the table structure differs
    if (releases.length === 0) {
      console.warn('[TMB Monitor] Primary parser found 0 releases, trying fallback...');
      return this.parseNewsroomFallback(html);
    }

    // Deduplicate — TMB renders table twice (desktop + mobile layout)
    const seen = new Set<string>();
    const unique = releases.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
    return unique;
  }

  /**
   * Fallback parser: less strict, handles slightly different HTML structures.
   */
  private parseNewsroomFallback(html: string): PressRelease[] {
    const releases: PressRelease[] = [];

    // Look for any links to /about-us/newsroom/ paths
    const linkPattern = /href="(\/about-us\/newsroom\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const [, path, title] = match;
      const cleanTitle = title.trim();

      // Skip non-press-release links (navigation, etc.)
      if (cleanTitle.length < 10) continue;
      if (/^(Newsroom|Press Releases|TMB Board)$/i.test(cleanTitle)) continue;

      const url = `${TMB_BASE_URL}${path}`;
      const releaseType = this.classifyRelease(cleanTitle);

      // Try to find a nearby date
      const afterMatch = html.substring(match.index + match[0].length, match.index + match[0].length + 200);
      const dateMatch = afterMatch.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      let isoDate = new Date().toISOString().split('T')[0]; // fallback to today

      if (dateMatch) {
        const [month, day, year] = dateMatch[1].split('/');
        isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      releases.push({
        title: cleanTitle,
        url,
        date: isoDate,
        releaseType,
      });
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = releases.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
    return unique;
  }

  /**
   * Classify a press release by its title pattern.
   */
  private classifyRelease(title: string): TMBReleaseType {
    if (PATTERNS.emergencySuspension.test(title)) return 'EMERGENCY_SUSPENSION';
    if (PATTERNS.paSuspension.test(title)) return 'PA_SUSPENSION';
    if (PATTERNS.boardMeeting.test(title)) return 'BOARD_MEETING_ACTIONS';
    return 'OTHER';
  }

  // ─── Filtering ─────────────────────────────────────────────────────────

  /**
   * Filter releases to only those we haven't processed yet.
   * Uses a tracking table to record processed release URLs.
   */
  async filterNewReleases(releases: PressRelease[]): Promise<PressRelease[]> {
    if (releases.length === 0) return [];

    const urls = releases.map((r) => r.url);

    const { data: processed } = await this.supabase
      .from('tmb_processed_releases')
      .select('url')
      .in('url', urls);

    const processedUrls = new Set((processed || []).map((p) => p.url));
    return releases.filter((r) => !processedUrls.has(r.url));
  }

  /**
   * Mark a release as processed so we don't re-process it.
   */
  async markReleaseProcessed(release: PressRelease): Promise<void> {
    await this.supabase.from('tmb_processed_releases').upsert({
      url: release.url,
      title: release.title,
      release_date: release.date,
      release_type: release.releaseType,
      processed_at: new Date().toISOString(),
    });
  }

  // ─── Emergency Suspension Processing ───────────────────────────────────

  /**
   * Process an emergency suspension release.
   * 
   * These have titles like "TMB Suspends Sugar Land Physician (Jaffer)"
   * The title alone gives us: city + last name.
   * 
   * We then fetch the full release page to extract the license number,
   * and cross-reference against our provider_licenses table.
   */
  async processEmergencySuspension(release: PressRelease): Promise<number> {
    console.log(`[TMB Monitor] Processing emergency suspension: ${release.title}`);

    if (!release.physicianName || !release.physicianCity) {
      console.warn(`[TMB Monitor] Could not extract name/city from title`);
      return 0;
    }

    // Fetch the full release page to get the license number
    let licenseNumber: string | null = null;
    try {
      const response = await fetch(release.url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (response.ok) {
        const html = await response.text();
        const licMatch = PATTERNS.licenseNumber.exec(html);
        if (licMatch) {
          licenseNumber = licMatch[1];
          console.log(`[TMB Monitor] Found license number: ${licenseNumber}`);
        }
      }
    } catch (err) {
      console.warn(`[TMB Monitor] Could not fetch release page: ${err}`);
    }

    // Try to match against our provider_licenses table
    let matchQuery = this.supabase
      .from('provider_licenses')
      .select('id, npi, provider_name, state, license_number')
      .eq('state', 'TX');

    if (licenseNumber) {
      // Best match: by license number
      matchQuery = matchQuery.eq('license_number', licenseNumber);
    } else {
      // Fallback: by last name (less precise)
      matchQuery = matchQuery.ilike('provider_name', `%${release.physicianName}%`);
    }

    const { data: matches } = await matchQuery;

    if (!matches || matches.length === 0) {
      console.log(`[TMB Monitor] No match found for ${release.physicianName} (${licenseNumber || 'no lic#'})`);
      return 0;
    }

    // Create delta events for each match
    let eventsCreated = 0;
    for (const match of matches) {
      await this.createLicenseDeltaEvent({
        npi: match.npi,
        providerLicenseId: match.id,
        eventType: 'LICENSE_SUSPENSION',
        fieldName: 'license_status',
        oldValue: 'ACTIVE',
        newValue: 'SUSPENDED',
        confidence: 0.98,
        source: 'tmb_newsroom',
        sourceUrl: release.url,
        releaseDate: release.date,
        details: `Emergency suspension: ${release.title}`,
      });
      eventsCreated++;
    }

    console.log(`[TMB Monitor] Created ${eventsCreated} delta event(s) for ${release.physicianName}`);
    return eventsCreated;
  }

  // ─── Board Meeting Release Processing ──────────────────────────────────

  /**
   * Process a board meeting disciplinary summary.
   * 
   * These have titles like "TMB Disciplines 24 Physicians at June Meeting"
   * and contain structured lists of physicians with license numbers.
   */
  async processBoardMeetingRelease(release: PressRelease): Promise<{
    total: number;
    matched: number;
    eventsCreated: number;
  }> {
    console.log(`[TMB Monitor] Processing board meeting release: ${release.title}`);

    const response = await fetch(release.url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      console.warn(`[TMB Monitor] Failed to fetch release page: HTTP ${response.status}`);
      return { total: 0, matched: 0, eventsCreated: 0 };
    }

    const html = await response.text();
    const actions = this.parseBoardMeetingActions(html, release);

    let matched = 0;
    let eventsCreated = 0;

    for (const action of actions) {
      // Look up by license number in our provider_licenses table
      const { data: match } = await this.supabase
        .from('provider_licenses')
        .select('id, npi, provider_name')
        .eq('state', 'TX')
        .eq('license_number', action.licenseNumber)
        .single();

      if (match) {
        matched++;

        // Determine the severity of the action
        const newStatus = this.mapActionTypeToStatus(action.actionType);

        await this.createLicenseDeltaEvent({
          npi: match.npi,
          providerLicenseId: match.id,
          eventType: 'BOARD_ACTION',
          fieldName: 'license_status',
          oldValue: 'ACTIVE',
          newValue: newStatus,
          confidence: 0.95,
          source: 'tmb_newsroom',
          sourceUrl: release.url,
          releaseDate: release.date,
          details: `Board action: ${action.actionType} - ${action.physicianName}`,
        });
        eventsCreated++;
      }
    }

    console.log(`[TMB Monitor] Board meeting: ${actions.length} total, ${matched} matched, ${eventsCreated} events`);
    return { total: actions.length, matched, eventsCreated };
  }

  /**
   * Parse physician entries from a board meeting release page.
   */
  private parseBoardMeetingActions(html: string, release: PressRelease): BoardMeetingAction[] {
    const actions: BoardMeetingAction[] = [];

    // Strip HTML tags for easier parsing
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ');

    // Match physician entries: "LastName, FirstName Middle, M.D., Lic. No. X1234, City"
    const entryPattern = /([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*),\s*([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*(?:\s+[A-Z]\.?)?),\s*(?:M\.D\.|D\.O\.),\s*Lic\.\s*No\.\s*([A-Z]\d{3,5}),\s*([A-Za-z\s.'-]+?)(?:\s*(?:·|$|\.))/g;
    let match;

    while ((match = entryPattern.exec(text)) !== null) {
      const [, lastName, firstName, licNo, city] = match;
      actions.push({
        physicianName: `${firstName.trim()} ${lastName.trim()}`,
        licenseNumber: licNo.trim(),
        city: city.trim(),
        state: 'TX',
        actionType: 'BOARD_ORDER', // Generic; could parse action type from context
        releaseDate: release.date,
        releaseUrl: release.url,
      });
    }

    return actions;
  }

  /**
   * Map TMB action types to provider status values.
   */
  private mapActionTypeToStatus(actionType: string): string {
    const lower = actionType.toLowerCase();
    if (lower.includes('suspend')) return 'SUSPENDED';
    if (lower.includes('revok') || lower.includes('surrender')) return 'REVOKED';
    if (lower.includes('restrict')) return 'RESTRICTED';
    if (lower.includes('probation')) return 'PROBATION';
    if (lower.includes('reprimand')) return 'REPRIMANDED';
    return 'BOARD_ACTION'; // Generic
  }

  // ─── Delta Event Creation ──────────────────────────────────────────────

  private async createLicenseDeltaEvent(params: {
    npi: string;
    providerLicenseId: string;
    eventType: string;
    fieldName: string;
    oldValue: string;
    newValue: string;
    confidence: number;
    source: string;
    sourceUrl: string;
    releaseDate: string;
    details: string;
  }): Promise<void> {
    // Check for duplicate: same NPI + field + new value within the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: existing } = await this.supabase
      .from('nppes_delta_events')
      .select('id')
      .eq('npi', params.npi)
      .eq('field_name', params.fieldName)
      .eq('new_value', params.newValue)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[TMB Monitor] Duplicate delta event skipped for NPI ${params.npi}`);
      return;
    }

    const { error } = await this.supabase.from('nppes_delta_events').insert({
      npi: params.npi,
      field_name: params.fieldName,
      old_value: params.oldValue,
      new_value: params.newValue,
      confidence: params.confidence,
      source: params.source,
      source_url: params.sourceUrl,
      detection_date: params.releaseDate,
      details: params.details,
      verification_status: 'verified', // Newsroom releases are authoritative
      gate_status_at_creation: 'PASSED',
      alert_sent: false,
    });

    if (error) {
      console.error(`[TMB Monitor] Failed to create delta event:`, error);
      throw error;
    }

    // Update mismatch flags on practice_providers if applicable
    await this.supabase
      .from('practice_providers')
      .update({
        has_license_issue: true,
        license_issue_type: params.newValue,
        license_issue_detected_at: new Date().toISOString(),
      })
      .eq('npi', params.npi);
  }
}

export default TMBNewsroomMonitor;
