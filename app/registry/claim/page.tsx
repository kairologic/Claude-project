"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { Shield, ShieldCheck, ChevronLeft, X, AlertTriangle, CheckCircle, Loader2, FileText, Eye, AlertCircle, ChevronRight, ArrowLeft } from "lucide-react";

type ProviderRow = {
  id: string; npi: string; name: string; city?: string; zip?: string;
  risk_score?: number; risk_level?: string; last_scan_result?: any;
  is_paid?: boolean; subscription_status?: string; url?: string; email?: string;
};

function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch { return null; }
}

function getResidencyColor(pct: number | null) {
  if (pct === null) return "text-slate-400";
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 65) return "text-amber-400";
  return "text-red-400";
}

function getTransparencyColor(pct: number | null) {
  if (pct === null) return "text-slate-400";
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-amber-400";
  return "text-red-400";
}

function generateFindingsSummary(p: ProviderRow) {
  const findings = p.last_scan_result?.findings || [];
  const critical: string[] = [];
  const warnings: string[] = [];
  const passes: string[] = [];
  findings.forEach((f: any) => {
    const status = (f.status || "").toLowerCase();
    const label = f.check || f.name || f.label || "Unknown check";
    if (status === "fail") critical.push(label);
    else if (status === "warn") warnings.push(label);
    else if (status === "pass") passes.push(label);
  });
  return { critical, warnings, passes };
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070d1b] flex items-center justify-center"><Loader2 className="w-8 h-8 text-gold animate-spin" /></div>}>
      <ClaimContent />
    </Suspense>
  );
}

function ClaimContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const providerId = searchParams.get("id");

  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"verify" | "result">("verify");
  const [form, setForm] = useState({ name: "", email: "", npi: "" });
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.from("registry")
          .select("id,npi,name,city,zip,risk_score,risk_level,last_scan_result,is_paid,subscription_status,url,email")
          .eq("id", providerId).single();
        setProvider(data as ProviderRow);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [providerId]);

  const validateEmailDomain = (email: string): string => {
    if (!email || !email.includes("@")) return "";
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (!emailDomain) return "";
    const freeProviders = ["gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com","mail.com","protonmail.com"];
    const providerDomain = extractDomain(provider?.url || provider?.last_scan_result?.url);
    if (providerDomain && freeProviders.includes(emailDomain)) {
      return `For verification, please use an email matching ${providerDomain}`;
    }
    return "";
  };

  const handleClaim = async () => {
    if (!form.email || !form.name || !provider) return;
    const domainWarning = validateEmailDomain(form.email);
    if (domainWarning && !emailError) {
      setEmailError(domainWarning);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/registry-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registryId: provider.id,
          name: form.name,
          email: form.email,
          npi: form.npi || undefined,
        }),
      });
      if (!res.ok) throw new Error("Claim failed");
      setStep("result");
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d1b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-[#070d1b] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-2">Provider Not Found</h2>
          <p className="text-slate-400 mb-4">This listing may have been removed or is not available.</p>
          <Link href="/registry" className="text-gold hover:text-gold-light font-bold">&larr; Back to Registry</Link>
        </div>
      </div>
    );
  }

  const score = provider.risk_score ?? 0;
  const cs = provider.last_scan_result?.categoryScores;
  const dr = cs?.data_sovereignty?.percentage ?? null;
  const ai = cs?.ai_transparency?.percentage ?? null;
  const ci = cs?.clinical_integrity?.percentage ?? null;
  const findings = provider.last_scan_result?.findings || [];
  const failCount = findings.filter((f: any) => f.status === "fail").length;
  const providerDomain = extractDomain(provider.url || provider.last_scan_result?.url);

  // Personalized alert
  let alertTitle = "";
  let alertDetail = "";
  let alertColor = "amber";
  if (score === 0 || !cs) {
    alertTitle = `${provider.name} has not yet been audited under SB 1188.`;
    alertDetail = "Verify your identity to initiate a Preliminary Forensic Scan.";
  } else if (score < 60) {
    alertTitle = `Our scan detected ${failCount} statutory exposure${failCount !== 1 ? "s" : ""} for ${provider.name}.`;
    alertDetail = `Sovereignty Score: ${score}/100.${dr !== null && dr < 65 ? " Data residency signals indicate potential out-of-state PHI routing." : ""}${ai !== null && ai < 60 ? " No compliant AI disclosure was detected." : ""}`;
    alertColor = "red";
  } else if (score < 80) {
    alertTitle = `${provider.name} shows partial compliance with ${failCount} item${failCount !== 1 ? "s" : ""} requiring attention.`;
    alertDetail = `Sovereignty Score: ${score}/100.${dr !== null && dr < 80 ? " Data residency anchoring is incomplete." : ""}${ai !== null && ai < 80 ? " AI transparency disclosures need strengthening." : ""}`;
  } else {
    alertTitle = `${provider.name} demonstrates strong sovereignty signals.`;
    alertDetail = `Sovereignty Score: ${score}/100. Verify your identity to claim this listing and access your compliance certificate.`;
    alertColor = "emerald";
  }

  return (
    <div className="min-h-screen bg-[#070d1b]">
      {/* Back nav */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        <Link href="/registry" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Back to Registry
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        {step === "verify" ? (
          <div className="bg-[#0c1425] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Verification Required</span>
              </div>
              <h1 className="text-white font-bold text-2xl mb-1">{provider.name}</h1>
              <p className="text-slate-400 text-sm">{provider.city}{provider.zip ? `, ${provider.zip}` : ""}</p>
            </div>

            {/* Personalized alert */}
            <div className="px-8 py-6">
              <div className={`bg-${alertColor}-500/5 border border-${alertColor}-500/15 rounded-lg p-5 mb-6`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 text-${alertColor}-400 flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-${alertColor}-200 text-sm font-semibold`}>{alertTitle}</p>
                    <p className="text-slate-400 text-xs mt-1">{alertDetail}</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Your Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Dr. Jane Smith"
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Work Email</label>
                  <input type="email" value={form.email}
                    onChange={e => { setForm({ ...form, email: e.target.value }); setEmailError(""); }}
                    placeholder={providerDomain ? `you@${providerDomain}` : "you@yourpractice.com"}
                    className={`w-full px-4 py-3 bg-white/[0.06] border rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 ${emailError ? "border-amber-500/50 focus:border-amber-500/70 focus:ring-amber-500/20" : "border-white/[0.12] focus:border-gold/50 focus:ring-gold/20"}`} />
                  {emailError ? (
                    <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{emailError}. Click verify again to proceed anyway.</p>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-1">Use your practice email to verify ownership</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">NPI Number <span className="text-slate-500">(optional)</span></label>
                  <input type="text" value={form.npi}
                    onChange={e => setForm({ ...form, npi: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="10-digit NPI"
                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="px-8 py-5 border-t border-white/[0.08] flex items-center justify-between">
              <p className="text-[10px] text-slate-500 max-w-[200px]">Your data is protected under our privacy policy.</p>
              <button onClick={handleClaim} disabled={!form.name || !form.email || submitting}
                className="bg-gold hover:bg-gold-light disabled:opacity-40 text-navy font-bold px-6 py-3 rounded-lg text-sm transition-colors flex items-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck size={16} />} Verify &amp; Unlock Scan
              </button>
            </div>
          </div>
        ) : (
          /* ─── RESULT STEP ─── */
          <div className="bg-[#0c1425] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-bold">Identity Verified</span>
              </div>
              <h1 className="text-white font-bold text-2xl mb-1">{provider.name}</h1>
              <p className="text-slate-400 text-sm">{provider.city}{provider.zip ? `, ${provider.zip}` : ""}</p>
            </div>

            <div className="px-8 py-6">
              {score > 0 ? (<>
                {/* Composite Score */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <div className="text-white font-bold text-base">Composite Compliance Score</div>
                      <div className="text-slate-500 text-[10px] font-mono mt-0.5">NPI: {provider.npi} &middot; Engine: SENTRY-3.1</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-black ${score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>{score}%</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${score >= 80 ? "bg-emerald-500/20 text-emerald-400" : score >= 60 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                        {score >= 80 ? "Sovereign" : score >= 60 ? "Drift" : "Violation"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="mb-5">
                  <div className="text-white font-bold text-sm mb-3">Category Breakdown &mdash; Path to 100%</div>
                  {[
                    { key: "data_sovereignty", label: "Data Residency", icon: "\uD83C\uDF10", weight: 45 },
                    { key: "ai_transparency", label: "AI Transparency", icon: "\uD83D\uDCE1", weight: 30 },
                    { key: "clinical_integrity", label: "Clinical Integrity", icon: "\uD83D\uDD12", weight: 25 },
                  ].map(cat => {
                    const catData = (cs || {})[cat.key] || { percentage: 0 };
                    const pct = catData.percentage ?? 0;
                    const catFindings = findings.filter((f: any) => f.category === cat.key);
                    const passed = catFindings.filter((f: any) => f.status === "pass").length;
                    const failed = catFindings.filter((f: any) => f.status === "fail").length;
                    const warned = catFindings.filter((f: any) => f.status === "warn").length;
                    const tierLabel = pct >= 80 ? "Sovereign" : pct >= 60 ? "Drift" : "Violation";
                    const tierColor = pct >= 80 ? "text-emerald-400 bg-emerald-500/20" : pct >= 60 ? "text-amber-400 bg-amber-500/20" : "text-red-400 bg-red-500/20";
                    const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
                    return (
                      <div key={cat.key} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span className="text-white font-semibold text-sm">{cat.label}</span>
                            <span className="text-slate-500 text-[10px]">(weight: {cat.weight}%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400"}`}>{pct}%</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tierColor}`}>{tierLabel}</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden mb-1.5">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {passed}/{catFindings.length} passed
                          {failed > 0 && <span className="text-red-400"> &middot; {failed} failed</span>}
                          {warned > 0 && <span className="text-amber-400"> &middot; {warned} warnings</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scan Summary - counts only, details gated */}
                {(() => {
                  const { critical, warnings, passes } = generateFindingsSummary(provider);
                  const hasFindings = critical.length > 0 || warnings.length > 0 || passes.length > 0;
                  return hasFindings ? (
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-6 space-y-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Scan Summary</div>
                      {critical.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-red-300 py-1">
                          <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                          <span className="font-bold text-red-400">{critical.length} critical exposure{critical.length !== 1 ? "s" : ""} detected</span>
                          <span className="text-slate-600 ml-auto text-[10px]">Details in full report</span>
                        </div>
                      )}
                      {warnings.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-amber-300 py-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                          <span className="font-bold text-amber-400">{warnings.length} warning{warnings.length !== 1 ? "s" : ""} flagged</span>
                          <span className="text-slate-600 ml-auto text-[10px]">Details in full report</span>
                        </div>
                      )}
                      {passes.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 mt-2">Passing ({passes.length})</div>
                          {passes.slice(0, 3).map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-emerald-300 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />{f}
                            </div>
                          ))}
                          {passes.length > 3 && <div className="text-[10px] text-slate-500 mt-1">+{passes.length - 3} more passing checks</div>}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </>) : (
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-6 mb-6 text-center">
                  <p className="text-amber-300 text-sm font-semibold">No scan data available yet</p>
                  <p className="text-slate-400 text-xs mt-1">Run a full audit to generate compliance findings.</p>
                </div>
              )}

              <p className="text-slate-400 text-xs mb-6">
                A summary has been sent to <strong className="text-white">{form.email}</strong>. To unlock the full remediation roadmap and evidence documentation:
              </p>

              {/* CTA cards with Stripe links */}
              {(() => {
                const clientRef = `?client_reference_id=${encodeURIComponent(provider.npi)}&prefilled_email=${encodeURIComponent(form.email)}`;
                return (
                  <div className="space-y-3">
                    {/* Audit Report — $149 + Shield Trial */}
                    <a href={`https://buy.stripe.com/REPORT_LINK_PLACEHOLDER${clientRef}`} target="_blank" rel="noopener noreferrer"
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
                    <a href={`https://buy.stripe.com/SAFE_HARBOR_LINK_PLACEHOLDER${clientRef}`} target="_blank" rel="noopener noreferrer"
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
                    <a href={`https://buy.stripe.com/SHIELD_LINK_PLACEHOLDER${clientRef}`} target="_blank" rel="noopener noreferrer"
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

              <div className="mt-8 text-center">
                <Link href="/registry" className="text-slate-400 hover:text-white text-sm transition-colors inline-flex items-center gap-2">
                  <ArrowLeft size={14} /> Return to Registry
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
