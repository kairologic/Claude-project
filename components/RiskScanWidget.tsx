/*
 * ═══════════════════════════════════════════════════════════════
 * RiskScanWidget.tsx — CTA REPLACEMENT BLOCK
 * ═══════════════════════════════════════════════════════════════
 * 
 * HOW TO USE THIS FILE:
 * 
 * 1. Open components/RiskScanWidget.tsx
 * 
 * 2. Find the LINKS object (around line 1286) and replace it:
 * 
 *    OLD (6 test links):
 *    const LINKS = {
 *      report: `https://buy.stripe.com/test_...${clientRef}`,
 *      safeHarbor: `https://buy.stripe.com/test_...${clientRef}`,
 *      watch: `https://buy.stripe.com/test_...${clientRef}`,
 *      shield: `https://buy.stripe.com/test_...${clientRef}`,
 *      safeHarborWatch: `https://buy.stripe.com/test_...${clientRef}`,
 *      safeHarborShield: `https://buy.stripe.com/test_...${clientRef}`,
 *    };
 * 
 *    NEW (3 live links — replace PLACEHOLDER with your actual URLs):
 *    const LINKS = {
 *      report: `https://buy.stripe.com/YOUR_REPORT_LINK${clientRef}`,
 *      safeHarbor: `https://buy.stripe.com/YOUR_SAFE_HARBOR_LINK${clientRef}`,
 *      shield: `https://buy.stripe.com/YOUR_SHIELD_LINK${clientRef}`,
 *    };
 * 
 * 3. Replace the entire CTA section (from "TIER 1: Sovereign" through the 
 *    closing of TIER 3) with the code below.
 *    This is approximately lines 1296-1491 in the original file.
 *    Everything from "if (score >= 80)" to the final closing </div> of TIER 3.
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════
// REPLACEMENT CODE STARTS HERE
// (paste this inside the {(() => { ... })() } block,
//  after the LINKS definition)
// ══════════════════════════════════

              // ── TIER 1: Sovereign (80-100) ──
              if (score >= 80) {
                return (
                  <div className="mt-6 space-y-3">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-600 text-lg">🛡</span>
                        <h4 className="font-bold text-green-800 text-sm">Your score is strong — keep it that way</h4>
                      </div>
                      <p className="text-xs text-green-700 mb-4">
                        Plugin updates, hosting changes, and new scripts can silently break your compliance overnight. Every purchase includes 3 months of Sentry Shield monitoring FREE.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a href={LINKS.report} target="_blank" rel="noopener noreferrer"
                          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-lg text-sm text-center transition-colors">
                          Full Audit Report — $149
                          <span className="block text-[10px] text-green-400 font-bold mt-0.5">+ 3 months Shield FREE</span>
                        </a>
                        <a href={LINKS.safeHarbor} target="_blank" rel="noopener noreferrer"
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg text-sm text-center transition-colors">
                          Safe Harbor™ — $249
                          <span className="block text-[10px] text-orange-200 font-bold mt-0.5">+ 3 months Shield FREE</span>
                        </a>
                      </div>
                    </div>

                    {/* Shield Standalone — Best Value */}
                    <a href={LINKS.shield} target="_blank" rel="noopener noreferrer"
                      className="block w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border-2 border-amber-500/50 text-white font-semibold py-4 px-5 rounded-xl text-center transition-all relative">
                      <div className="absolute -top-2.5 right-4 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        Best Value
                      </div>
                      <span className="text-sm">Sentry Shield — $79/mo</span>
                      <span className="block text-[11px] text-amber-400 font-bold mt-0.5">Includes Free Audit Report + live dashboard + quarterly forensic reports</span>
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Annual certification seal &amp; priority support</span>
                    </a>
                  </div>
                );
              }

              // ── TIER 2: Drift (60-79) ──
              if (score >= 60) {
                return (
                  <div className="mt-6">
                    <div className="mb-3">
                      <h4 className="font-bold text-slate-800 text-sm">You have {failCount} fixable issue{failCount !== 1 ? 's' : ''} — choose your path:</h4>
                    </div>
                    <div className="space-y-2.5">

                      {/* Option 1: Report Only + Shield Trial */}
                      <a href={LINKS.report} target="_blank" rel="noopener noreferrer"
                        className="block border border-slate-200 hover:border-amber-300 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">📋</span>
                              <span className="font-bold text-slate-800 text-sm">Audit Report</span>
                            </div>
                            <p className="text-xs text-slate-500">Forensic analysis with findings, border map, and remediation roadmap</p>
                            <p className="text-xs font-bold text-green-600 mt-1">✦ Includes 3 months Sentry Shield FREE</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-xl font-black text-slate-800">$149</div>
                            <div className="text-[10px] text-slate-400">one-time</div>
                          </div>
                        </div>
                      </a>

                      {/* Option 2: Safe Harbor — Recommended */}
                      <a href={LINKS.safeHarbor} target="_blank" rel="noopener noreferrer"
                        className="block border-2 border-orange-400 bg-orange-50/50 rounded-xl p-4 transition-all hover:shadow-lg relative cursor-pointer">
                        <div className="absolute -top-2.5 left-4 bg-orange-500 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          Most Popular
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">🔧</span>
                              <span className="font-bold text-slate-800 text-sm">Safe Harbor&trade;</span>
                            </div>
                            <p className="text-xs text-slate-500">Everything in the Audit Report <strong>plus</strong> ready-made policies, AI disclosures, staff training, evidence templates, and implementation blueprint</p>
                            <p className="text-xs font-bold text-green-600 mt-1">✦ Includes 3 months Sentry Shield FREE</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-xl font-black text-orange-600">$249</div>
                            <div className="text-[10px] text-slate-400">one-time</div>
                          </div>
                        </div>
                      </a>

                    </div>
                  </div>
                );
              }

              // ── TIER 3: Violation (0-59) ──
              return (
                <div className="mt-6">
                  {/* Urgency banner */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-red-700">Active Compliance Exposure</span>
                      <span className="text-xs text-red-600 ml-1">
                        — {failCount} violation{failCount !== 1 ? 's' : ''} detected. Potential penalty up to ${(failCount * 50000).toLocaleString()}.
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="font-bold text-slate-800 text-sm">Choose your remediation path:</h4>
                  </div>
                  <div className="space-y-2.5">

                    {/* Option 1: Report Only */}
                    <a href={LINKS.report} target="_blank" rel="noopener noreferrer"
                      className="block border border-slate-200 hover:border-red-300 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">📋</span>
                            <span className="font-bold text-slate-800 text-sm">Audit Report Only</span>
                          </div>
                          <p className="text-xs text-slate-500">Forensic analysis with findings and remediation roadmap — bring it to your own developer</p>
                          <p className="text-xs font-bold text-green-600 mt-1">✦ Includes 3 months Sentry Shield FREE</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-xl font-black text-slate-800">$149</div>
                          <div className="text-[10px] text-slate-400">one-time</div>
                        </div>
                      </div>
                    </a>

                    {/* Option 2: Safe Harbor */}
                    <a href={LINKS.safeHarbor} target="_blank" rel="noopener noreferrer"
                      className="block border border-slate-200 hover:border-orange-300 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">🔧</span>
                            <span className="font-bold text-slate-800 text-sm">Safe Harbor&trade;</span>
                          </div>
                          <p className="text-xs text-slate-500">Everything in the Audit Report plus ready-made policies, AI disclosures, evidence templates, and implementation blueprint</p>
                          <p className="text-xs font-bold text-green-600 mt-1">✦ Includes 3 months Sentry Shield FREE</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-xl font-black text-slate-800">$249</div>
                          <div className="text-[10px] text-slate-400">one-time</div>
                        </div>
                      </div>
                    </a>

                    {/* Option 3: Sentry Shield — Recommended for violations */}
                    <a href={LINKS.shield} target="_blank" rel="noopener noreferrer"
                      className="block border-2 border-red-500 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 transition-all hover:shadow-lg relative cursor-pointer">
                      <div className="absolute -top-2.5 left-4 bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        Recommended for Your Score
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-red-600" />
                            <span className="font-bold text-slate-800 text-sm">Sentry Shield — Continuous Compliance</span>
                          </div>
                          <p className="text-xs text-slate-500">Free audit report + 24/7 monitoring, live dashboard, quarterly forensic reports, annual certification seal</p>
                          <p className="text-xs font-bold text-red-600 mt-1">✦ Includes free Audit Report + ongoing protection</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-xl font-black text-red-700">$79</div>
                          <div className="text-[10px] text-slate-400">/month</div>
                        </div>
                      </div>
                    </a>

                  </div>
                </div>
              );

// ══════════════════════════════════
// REPLACEMENT CODE ENDS HERE
// ══════════════════════════════════
