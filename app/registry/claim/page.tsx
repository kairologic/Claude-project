/*
 * ═══════════════════════════════════════════════════════════════
 * app/registry/claim/page.tsx — STRIPE LINK REPLACEMENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Replace the CTA section (lines ~366-402) with this code.
 * 
 * Now shows 3 products:
 *   1. Full Audit Report ($149) + 3 months Shield FREE
 *   2. Safe Harbor Bundle ($249) + 3 months Shield FREE  [Recommended]
 *   3. Sentry Shield ($79/mo) — immediate billing, includes free report
 * 
 * Replace YOUR_REPORT_LINK, YOUR_SAFE_HARBOR_LINK, YOUR_SHIELD_LINK
 * with your actual live Stripe Payment Link URLs.
 */

              {/* CTA cards with Stripe links */}
              {(() => {
                const clientRef = `?client_reference_id=${encodeURIComponent(provider.npi)}&prefilled_email=${encodeURIComponent(form.email)}`;
                return (
                  <div className="space-y-3">
                    {/* Audit Report — $149 + Shield Trial */}
                    <a href={`https://buy.stripe.com/YOUR_REPORT_LINK${clientRef}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.1] rounded-xl p-5 transition-all group">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gold" />
                        <div>
                          <div className="text-white font-bold text-sm">Full Audit Report</div>
                          <div className="text-slate-400 text-xs">Forensic analysis + remediation roadmap</div>
                          <div className="text-green-400 text-xs font-bold mt-0.5">+ 3 months Sentry Shield FREE</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-gold font-black text-lg">$149</div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-gold transition-colors" />
                      </div>
                    </a>

                    {/* Safe Harbor — $249 + Shield Trial [Recommended] */}
                    <a href={`https://buy.stripe.com/YOUR_SAFE_HARBOR_LINK${clientRef}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full bg-gold/5 hover:bg-gold/10 border-2 border-gold/20 hover:border-gold/40 rounded-xl p-5 transition-all relative group">
                      <div className="absolute -top-2.5 left-4 bg-gold text-navy text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">Recommended</div>
                      <div className="flex items-center gap-3 mt-1">
                        <Shield className="w-5 h-5 text-gold" />
                        <div>
                          <div className="text-white font-bold text-sm">Safe Harbor&trade; Bundle</div>
                          <div className="text-slate-400 text-xs">Audit + policies + AI disclosures + remediation</div>
                          <div className="text-green-400 text-xs font-bold mt-0.5">+ 3 months Sentry Shield FREE</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-gold font-black text-lg">$249</div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-gold transition-colors" />
                      </div>
                    </a>

                    {/* Sentry Shield — $79/mo standalone */}
                    <a href={`https://buy.stripe.com/YOUR_SHIELD_LINK${clientRef}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between w-full bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-5 transition-all group">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-white font-bold text-sm">Sentry Shield — Continuous Compliance</div>
                          <div className="text-slate-400 text-xs">24/7 monitoring + live dashboard + free audit report</div>
                          <div className="text-emerald-400 text-xs font-bold mt-0.5">Quarterly forensic reports &bull; Annual certification</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-emerald-400 font-black text-lg">$79</div>
                          <div className="text-slate-500 text-[10px]">/month</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                    </a>
                  </div>
                );
              })()}
