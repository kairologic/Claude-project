/*
 * ═══════════════════════════════════════════════════════════════
 * app/scan/results/page.tsx — BUY BUTTON → PAYMENT LINK MIGRATION
 * ═══════════════════════════════════════════════════════════════
 * 
 * This page currently uses Stripe Buy Buttons (test mode).
 * These need to be replaced with either:
 *   A) Live mode Buy Buttons (create new ones in Stripe Dashboard)
 *   B) Simple <a> links to Payment Links (simpler, recommended)
 * 
 * OPTION B (Recommended) — Replace StripeBuyButton components with links:
 * 
 * CHANGES NEEDED:
 * 
 * 1. Line 146: Replace StripeBuyButton with payment link
 *    OLD: <StripeBuyButton buyButtonId="buy_btn_1Sw4cBGg3oiiGF7gzfOByHpl" />
 *    NEW: <a href="https://buy.stripe.com/YOUR_REPORT_LINK" ... >Get Full Report — $149</a>
 * 
 * 2. Line 177: Replace StripeBuyButton  
 *    OLD: <StripeBuyButton buyButtonId="buy_btn_1Sw5EKGg3oiiGF7gohk7tAL2" />
 *    NEW: <a href="https://buy.stripe.com/YOUR_SAFE_HARBOR_LINK" ... >Get Safe Harbor — $249</a>
 * 
 * 3. Line 214: Replace StripeBuyButton
 *    OLD: <StripeBuyButton buyButtonId="buy_btn_1Sw4QQGg3oiiGF7gZFOHeTTM" />
 *    NEW: <a href="https://buy.stripe.com/YOUR_SHIELD_LINK" ... >Start Shield — $79/mo</a>
 * 
 * 4. You can also REMOVE the entire StripeBuyButton component and 
 *    the stripe buy-button.js script loader (lines 17-42) since 
 *    they're no longer needed.
 * 
 * Below is the updated replacement code for each section:
 */

// ═══════════════════════════════════════
// REPLACEMENT: Score < 60 section (line ~146)
// ═══════════════════════════════════════
// Replace: <StripeBuyButton buyButtonId="buy_btn_1Sw4cBGg3oiiGF7gzfOByHpl" />
// With:
<a href="https://buy.stripe.com/YOUR_REPORT_LINK" 
   target="_blank" rel="noopener noreferrer"
   className="block w-full bg-navy hover:bg-navy-light text-white font-bold py-3 px-6 rounded-lg text-center transition-colors">
  Get Full Report — $149
  <span className="block text-xs text-green-400 font-bold mt-0.5">+ 3 months Shield FREE</span>
</a>

// ═══════════════════════════════════════
// REPLACEMENT: Score 60-89 section (line ~177)
// ═══════════════════════════════════════
// Replace: <StripeBuyButton buyButtonId="buy_btn_1Sw5EKGg3oiiGF7gohk7tAL2" />
// With:
<a href="https://buy.stripe.com/YOUR_SAFE_HARBOR_LINK"
   target="_blank" rel="noopener noreferrer"
   className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors">
  Get Safe Harbor™ — $249
  <span className="block text-xs text-orange-200 font-bold mt-0.5">+ 3 months Shield FREE</span>
</a>

// ═══════════════════════════════════════
// REPLACEMENT: Score 90+ section (line ~214)  
// ═══════════════════════════════════════
// Replace: <StripeBuyButton buyButtonId="buy_btn_1Sw4QQGg3oiiGF7gZFOHeTTM" />
// With:
<a href="https://buy.stripe.com/YOUR_SHIELD_LINK"
   target="_blank" rel="noopener noreferrer"
   className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors">
  Start Sentry Shield — $79/mo
  <span className="block text-xs text-green-200 font-bold mt-0.5">Includes free Audit Report</span>
</a>

// ═══════════════════════════════════════
// CLEANUP: Remove unused code
// ═══════════════════════════════════════
// 
// Remove line 17:
//   const STRIPE_PK = 'pk_live_51SqnMv...';
//
// Remove lines 28-42 (StripeBuyButton component and script loader):
//   function StripeBuyButton(...) { ... }
//
// These are no longer needed since we're using direct Payment Links
// instead of embedded Buy Buttons.
