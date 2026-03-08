// ═══════════════════════════════════════════════════════════════════
// NAME QUALITY FILTER — Patch for lib/scanner/scan-scheduler.ts
// ═══════════════════════════════════════════════════════════════════
//
// Add this function to scan-scheduler.ts, then call it in matchProviders()
// to filter out garbage names before they hit the providers table.
//
// In matchProviders(), find:
//   // Strategy 2: Name matching against state providers
//   if (state && names.length > 0 && names.length <= 50) {
//     for (const name of names) {
//
// Replace with:
//   if (state && names.length > 0 && names.length <= 50) {
//     const cleanNames = names.filter(isValidProviderName);
//     for (const name of cleanNames) {

/**
 * Validate that an extracted string looks like a real provider name,
 * not a specialty, business term, or HTML artifact.
 * 
 * Returns true only for strings that look like "First Last" or "Last, First".
 */
export function isValidProviderName(name: string): boolean {
  if (!name) return false;
  
  const trimmed = name.trim();
  
  // Too short or too long
  if (trimmed.length < 4 || trimmed.length > 60) return false;
  
  // Must contain at least one space (first + last name)
  if (!trimmed.includes(' ') && !trimmed.includes(',')) return false;
  
  // Reject if it's all caps and longer than 3 words (likely a business name)
  if (trimmed === trimmed.toUpperCase() && trimmed.split(/\s+/).length > 3) return false;
  
  // Reject if it contains numbers (not a person's name)
  if (/\d/.test(trimmed)) return false;
  
  // Reject common garbage patterns from HTML extraction
  const REJECT_PATTERNS = [
    // Specialties and medical terms
    /\b(orthodontic|pediatric|cardiol|dermatol|neurolog|oncolog|urolog|gynecol|ophthalm|radiol|anesthesi|patholog|psychiatr|chiropr|podiatr|optometr|dentist|dental|pharmacy|pharma|surgical|medical|clinic|health|wellness|therapy|therapist|counseli|nursing|rehab|hospital|urgent|emergency)\b/i,
    
    // Business terms
    /\b(associate|practice|group|center|institute|foundation|network|service|solution|management|consult|partner|enterprise|corporation|company|llc|pllc|inc|ltd|corp)\b/i,
    
    // Location/direction terms
    /\b(north|south|east|west|central|downtown|uptown|midtown|metro|regional|county|district|community)\b/i,
    
    // HTML/web artifacts
    /\b(click|here|read|more|learn|view|contact|about|home|menu|login|sign|submit|search|subscribe|facebook|twitter|instagram|linkedin)\b/i,
    
    // Generic words that aren't names
    /\b(the|and|for|with|from|your|our|all|new|best|top|free|get|how|what|why|who|where|when|now|today|this|that|just|only|also|very|much|more|most|some|any|each|every)\b/i,
    
    // Registered trademark / brand artifacts
    /[®™©]/,
    
    // URLs or email-like strings
    /[@\/\\:]/,
    
    // Pure prepositions or articles that slipped through
    /^(at|in|on|of|to|by|a|an|the|is|or|am|pm)$/i,
  ];
  
  for (const pattern of REJECT_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  
  // Must have at least one word that starts with a capital letter
  // (real names are typically capitalized)
  const words = trimmed.split(/[\s,]+/).filter(w => w.length > 0);
  const hasCapitalWord = words.some(w => /^[A-Z]/.test(w));
  if (!hasCapitalWord) return false;
  
  // Must have exactly 2-4 words (First Last, First Middle Last, Dr. First Last)
  if (words.length < 2 || words.length > 5) return false;
  
  // The last word (likely last name) should be at least 2 characters
  const lastName = words[words.length - 1].replace(/[.,]/g, '');
  if (lastName.length < 2) return false;
  
  return true;
}

// ── Test cases ──
// isValidProviderName("John Smith")            → true
// isValidProviderName("Dr. Sarah Chen")        → true
// isValidProviderName("Rodriguez, Maria")      → true
// isValidProviderName("orthodontics")          → false (no space, medical term)
// isValidProviderName("at")                    → false (too short, preposition)
// isValidProviderName("Fastbraces®")           → false (trademark symbol)
// isValidProviderName("North Texas Dental")    → false (business name pattern)
// isValidProviderName("Click Here")            → false (web artifact)
// isValidProviderName("reliance")              → false (no space, business term)
// isValidProviderName("DeFrank")               → false (no space = single word)
