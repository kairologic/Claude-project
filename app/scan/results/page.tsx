/**
 * SCAN RESULTS CTA — Light Theme Version
 * 
 * This matches the light-theme scan results page shown in the screenshot.
 * Uses Tailwind classes consistent with the white card / orange accent style.
 * 
 * Replace the section starting from "You have X fixable issues — choose your path:"
 * through the 3 product cards (Audit Report / Safe Harbor / Safe Harbor + Sentry Watch).
 * 
 * Remove the old "Safe Harbor + Sentry Watch" card entirely.
 * 
 * Live Stripe Payment Links:
 *   Audit Report:  https://buy.stripe.com/4gM5kDdpw0HP18x305
 *   Safe Harbor:   https://buy.stripe.com/00w28retAeyF6sRgQV
 *   Sentry Shield: https://buy.stripe.com/aFa3cv3OW4Y54kJ305
 */

// ============================================================
// FIND this section in your scan results page and REPLACE:
// ============================================================

{/* OLD CODE TO REMOVE — looks something like:
  
  <p>You have X fixable issues — choose your path:</p>
  
  <div> Audit Report ... $149 </div>
  <div> Safe Harbor™ ... $249  MOST POPULAR </div>
  <div> Safe Harbor + Sentry Watch ... $249 then $39/mo  RECOMMENDED </div>

*/}

{/* ============================================================ */}
{/* NEW CODE — paste this in place of the old product cards:     */}
{/* ============================================================ */}

<p className="text-gray-600 text-sm font-medium mb-4">
  You have {issueCount} fixable issues — choose your path:
</p>

<div className="space-y-3">
  {/* 1. Audit Report — $149 */}
  <a 
    href={`https://buy.stripe.com/4gM5kDdpw0HP18x305?client_reference_id=${encodeURIComponent(npi)}&prefilled_email=${encodeURIComponent(email)}`}
    target="_blank" 
    rel="noopener noreferrer"
    className="flex items-center justify-between w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-5 transition-all group"
  >
    <div className="flex items-center gap-3">
      <span className="text-xl">📄</span>
      <div>
        <div className="text-gray-900 font-bold text-sm">Audit Report</div>
        <div className="text-gray-500 text-xs">Forensic analysis with findings, border map, and remediation roadmap</div>
        <div className="text-emerald-600 text-xs font-semibold mt-1">+ 3 months Sentry Shield monitoring included</div>
      </div>
    </div>
    <div className="text-right flex-shrink-0 ml-4">
      <div className="text-gray-900 font-black text-xl">$149</div>
      <div className="text-gray-400 text-xs">one-time</div>
    </div>
  </a>

  {/* 2. Safe Harbor — $249 [MOST POPULAR] */}
  <div className="relative">
    <div className="absolute -top-2.5 left-4 bg-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider z-10">
      Most Popular
    </div>
    <a 
      href={`https://buy.stripe.com/00w28retAeyF6sRgQV?client_reference_id=${encodeURIComponent(npi)}&prefilled_email=${encodeURIComponent(email)}`}
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-between w-full bg-white hover:bg-orange-50/50 border-2 border-orange-400 rounded-xl p-5 transition-all group"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">🛡️</span>
        <div>
          <div className="text-gray-900 font-bold text-sm">Safe Harbor™</div>
          <div className="text-gray-500 text-xs">
            Everything in the Audit Report <span className="font-semibold text-gray-700">plus</span> ready-made policies, AI disclosures, staff training, evidence templates, and implementation blueprint
          </div>
          <div className="text-emerald-600 text-xs font-semibold mt-1">+ 3 months Sentry Shield monitoring included</div>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <div className="text-orange-500 font-black text-xl">$249</div>
        <div className="text-gray-400 text-xs">one-time</div>
      </div>
    </a>
  </div>

  {/* 3. Sentry Shield — $79/mo [RECOMMENDED] */}
  <div className="relative">
    <div className="absolute -top-2.5 left-4 bg-blue-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider z-10">
      Recommended
    </div>
    <a 
      href={`https://buy.stripe.com/aFa3cv3OW4Y54kJ305?client_reference_id=${encodeURIComponent(npi)}&prefilled_email=${encodeURIComponent(email)}`}
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-between w-full bg-white hover:bg-blue-50/50 border-2 border-blue-400 rounded-xl p-5 transition-all group"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">🔒</span>
        <div>
          <div className="text-gray-900 font-bold text-sm">Sentry Shield</div>
          <div className="text-gray-500 text-xs">
            Continuous compliance monitoring with drift alerts, live dashboard, and automated re-scans
          </div>
          <div className="text-emerald-600 text-xs font-semibold mt-1">Includes free audit report</div>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <div className="text-blue-500 font-black text-xl">$79</div>
        <div className="text-gray-400 text-xs">/month</div>
      </div>
    </a>
  </div>
</div>
