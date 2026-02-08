"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { Search, Shield, ShieldCheck, Eye, Lock, ChevronRight, X, AlertTriangle, CheckCircle, Loader2, FileText, ChevronLeft, ExternalLink, AlertCircle } from "lucide-react";

type ProviderRow = {
  id: string; npi: string; name: string; city?: string; zip?: string;
  risk_score?: number; risk_level?: string; status_label?: string;
  last_scan_timestamp?: string; last_scan_result?: any; updated_at?: string;
  is_paid?: boolean; is_visible?: boolean; subscription_status?: string;
  url?: string; email?: string;
};
type CityTab = "all" | "austin" | "houston" | "dallas" | "san-antonio";

function timeAgo(d: string | undefined): string {
  if (!d) return "\u2014";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m <= 1 ? "Just now" : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy < 30) return `${dy}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getResidencySignal(p: ProviderRow) {
  const dr = p.last_scan_result?.categoryScores?.data_sovereignty?.percentage ?? null;
  if (dr === null) return { label: "Pending", color: "text-slate-400", dot: "bg-slate-400" };
  if (dr >= 80) return { label: "Anchored", color: "text-emerald-400", dot: "bg-emerald-400" };
  if (dr >= 65) return { label: "Partial", color: "text-amber-400", dot: "bg-amber-400" };
  return { label: "Exposed", color: "text-red-400", dot: "bg-red-400" };
}
function getTransparencySignal(p: ProviderRow) {
  const ai = p.last_scan_result?.categoryScores?.ai_transparency?.percentage ?? null;
  if (ai === null) return { label: "Pending", color: "text-slate-400", dot: "bg-slate-400" };
  if (ai >= 80) return { label: "Compliant", color: "text-emerald-400", dot: "bg-emerald-400" };
  if (ai >= 60) return { label: "Partial", color: "text-amber-400", dot: "bg-amber-400" };
  return { label: "Missing", color: "text-red-400", dot: "bg-red-400" };
}
function getSovStatus(p: ProviderRow) {
  const s = p.risk_score ?? 0;
  const paid = p.is_paid || p.subscription_status === "active";
  if (paid && s >= 80) return { label: "Verified Sovereign", bg: "bg-emerald-900/30 border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" };
  if (s >= 80) return { label: "Sovereign", bg: "bg-emerald-900/20 border-emerald-600/20", text: "text-emerald-400", dot: "bg-emerald-400" };
  if (s >= 60) return { label: "Signal Inconclusive", bg: "bg-amber-900/20 border-amber-600/20", text: "text-amber-400", dot: "bg-amber-400" };
  if (s > 0) return { label: "Audit Pending", bg: "bg-red-900/20 border-red-600/20", text: "text-red-400", dot: "bg-red-400" };
  return { label: "Pre-Audited", bg: "bg-slate-800/50 border-slate-600/20", text: "text-slate-400", dot: "bg-slate-500" };
}
function isHighRisk(p: ProviderRow) { return (p.risk_score ?? 0) > 0 && (p.risk_score ?? 0) < 60; }
function maskName(n: string) {
  const w = n.split(" ");
  if (w.length <= 1) return n.charAt(0) + "\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF";
  return w[0] + " " + w.slice(1).map(x => x.charAt(0) + "\u25CF".repeat(Math.min(x.length - 1, 6))).join(" ");
}

// Extract domain from URL for email verification
function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch { return null; }
}

// Generate personalized findings summary from scan data
function generateFindingsSummary(p: ProviderRow): { critical: string[]; warnings: string[]; passes: string[] } {
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

  return { critical: critical.slice(0, 4), warnings: warnings.slice(0, 3), passes: passes.slice(0, 3) };
}

const CITY_TABS: { key: CityTab; label: string; filter: string[] }[] = [
  { key: "all", label: "All Regions", filter: [] },
  { key: "austin", label: "Austin", filter: ["austin","round rock","cedar park","leander","georgetown","pflugerville","kyle","buda","lakeway","bee cave","dripping springs"] },
  { key: "houston", label: "Houston", filter: ["houston","katy","sugar land","pearland","the woodlands","humble","spring","cypress","tomball","pasadena","baytown","league city","friendswood","missouri city","richmond","bellaire","stafford","magnolia"] },
  { key: "dallas", label: "Dallas\u2013Fort Worth", filter: ["dallas","fort worth","plano","frisco","mckinney","arlington","irving","richardson","garland","denton","carrollton","lewisville","flower mound","allen","addison","sachse","mesquite","rowlett","rockwall"] },
  { key: "san-antonio", label: "San Antonio", filter: ["san antonio","new braunfels","boerne","schertz","cibolo","converse","live oak","universal city","selma","helotes","leon valley","alamo heights","bulverde"] },
];
const PAGE_SIZE = 50;

export default function RegistryPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCity, setActiveCity] = useState<CityTab>("all");
  const [claimModal, setClaimModal] = useState<ProviderRow | null>(null);
  const [claimStep, setClaimStep] = useState<"verify" | "result">("verify");
  const [claimForm, setClaimForm] = useState({ name: "", email: "", npi: "" });
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [stats, setStats] = useState({ sovereign: 0, moderate: 0, atRisk: 0, pending: 0 });
  const [cityCounts, setCityCounts] = useState<Record<CityTab, number>>({ all: 0, austin: 0, houston: 0, dallas: 0, "san-antonio": 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(0); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  const loadStats = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data, count } = await supabase.from("registry").select("risk_score,city", { count: "exact" }).eq("is_visible", true);
      const all = data || [];
      setTotalCount(count || 0);
      setStats({
        sovereign: all.filter(p => (p.risk_score ?? 0) >= 80).length,
        moderate: all.filter(p => (p.risk_score ?? 0) >= 60 && (p.risk_score ?? 0) < 80).length,
        atRisk: all.filter(p => (p.risk_score ?? 0) > 0 && (p.risk_score ?? 0) < 60).length,
        pending: all.filter(p => !p.risk_score || p.risk_score === 0).length,
      });
      const c: Record<CityTab, number> = { all: all.length, austin: 0, houston: 0, dallas: 0, "san-antonio": 0 };
      CITY_TABS.forEach(t => { if (t.key !== "all") c[t.key] = all.filter(p => t.filter.some(f => (p.city||"").toLowerCase().includes(f))).length; });
      setCityCounts(c);
    } catch (e) { console.error(e); }
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      let q = supabase.from("registry")
        .select("id,npi,name,city,zip,risk_score,risk_level,status_label,last_scan_timestamp,last_scan_result,updated_at,is_paid,is_visible,subscription_status,url,email", { count: "exact" })
        .eq("is_visible", true);
      if (activeCity !== "all") {
        const tab = CITY_TABS.find(t => t.key === activeCity);
        if (tab) q = q.or(tab.filter.map(c => `city.ilike.%${c}%`).join(","));
      }
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        q = q.or(`name.ilike.%${s}%,city.ilike.%${s}%,zip.ilike.%${s}%`);
      }
      // Tier filter
      if (activeTier === "sovereign") q = q.gte("risk_score", 80);
      else if (activeTier === "moderate") q = q.gte("risk_score", 60).lt("risk_score", 80);
      else if (activeTier === "atRisk") q = q.gt("risk_score", 0).lt("risk_score", 60);
      else if (activeTier === "pending") q = q.or("risk_score.is.null,risk_score.eq.0");

      const { data, error, count } = await q.order("risk_score", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;

      // Interleaved sort: S-S-I-S-R pattern (only when no tier filter active)
      let sorted = data || [];
      if (!activeTier && !debouncedSearch.trim()) {
        const sovereign = sorted.filter(p => (p.risk_score ?? 0) >= 80);
        const moderate = sorted.filter(p => (p.risk_score ?? 0) >= 60 && (p.risk_score ?? 0) < 80);
        const atRisk = sorted.filter(p => (p.risk_score ?? 0) > 0 && (p.risk_score ?? 0) < 60);
        const pending = sorted.filter(p => !p.risk_score || p.risk_score === 0);
        const interleaved: ProviderRow[] = [];
        let si = 0, mi = 0, ri = 0, pi = 0;
        // Pattern: S, S, I, S, R — repeat
        while (si < sovereign.length || mi < moderate.length || ri < atRisk.length || pi < pending.length) {
          if (si < sovereign.length) interleaved.push(sovereign[si++]);
          if (si < sovereign.length) interleaved.push(sovereign[si++]);
          if (mi < moderate.length) interleaved.push(moderate[mi++]);
          if (si < sovereign.length) interleaved.push(sovereign[si++]);
          if (ri < atRisk.length) interleaved.push(atRisk[ri++]);
        }
        // Append any remaining
        while (si < sovereign.length) interleaved.push(sovereign[si++]);
        while (mi < moderate.length) interleaved.push(moderate[mi++]);
        while (ri < atRisk.length) interleaved.push(atRisk[ri++]);
        while (pi < pending.length) interleaved.push(pending[pi++]);
        sorted = interleaved;
      }

      setProviders(sorted);
      setTotalCount(count || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page, activeCity, debouncedSearch, activeTier]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadProviders(); }, [loadProviders]);
  useEffect(() => { setPage(0); }, [activeCity, activeTier]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showFrom = totalCount > 0 ? page * PAGE_SIZE + 1 : 0;
  const showTo = Math.min((page + 1) * PAGE_SIZE, totalCount);

  // Email domain validation against provider URL
  const validateEmailDomain = (email: string, provider: ProviderRow): string => {
    if (!email || !email.includes("@")) return "";
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (!emailDomain) return "";
    // Common free email providers that aren't practice domains
    const freeProviders = ["gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com","mail.com","protonmail.com"];
    const providerDomain = extractDomain(provider.url || provider.last_scan_result?.url);
    if (providerDomain && freeProviders.includes(emailDomain)) {
      return `For verification, please use an email matching ${providerDomain}`;
    }
    return "";
  };

  const handleClaim = async () => {
    if (!claimForm.email || !claimForm.name) return;
    // Domain check - warn but allow
    const domainWarning = validateEmailDomain(claimForm.email, claimModal!);
    if (domainWarning && !emailError) {
      setEmailError(domainWarning);
      return; // Show warning first time, user can click again to proceed
    }
    setClaimSubmitting(true);
    try {
      const supabase = getSupabase();
      await supabase.from("prospects").insert({
        source: "registry-claim", contact_name: claimForm.name, practice_name: claimModal?.name || "",
        email: claimForm.email, status: "hot", priority: "high",
        admin_notes: `Claimed: ${claimModal?.name}. NPI: ${claimForm.npi || "N/A"}. Score: ${claimModal?.risk_score || "N/A"}. Domain match: ${!emailError ? "yes" : "override"}`,
        form_data: { npi: claimForm.npi, registry_id: claimModal?.id, registry_npi: claimModal?.npi, practice_name: claimModal?.name, city: claimModal?.city, risk_score: claimModal?.risk_score, claim_source: "registry-page", email_domain_verified: !emailError },
      });
      if (claimForm.npi && claimModal) {
        await supabase.from("registry").update({ email: claimForm.email, npi: claimForm.npi, updated_at: new Date().toISOString() }).eq("id", claimModal.id);
      }
      // Track claimed ID locally so action column updates
      setClaimedIds(prev => new Set([...prev, claimModal!.id]));
      setClaimStep("result");
    } catch (e) { console.error(e); } finally { setClaimSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#070d1b]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[11px] font-bold tracking-wider uppercase">Live Monitoring Active</span>
            </div>
            <span className="text-slate-600 text-xs">|</span>
            <span className="text-slate-400 text-xs font-mono">{totalCount.toLocaleString()} entities indexed</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-3 tracking-tight">Texas Sovereignty <span className="text-gold">Registry</span></h1>
          <p className="text-slate-400 text-lg max-w-2xl mb-8">Forensic compliance signals for healthcare entities operating in Texas. Compiled from observable digital infrastructure per SB&nbsp;1188 and HB&nbsp;149.</p>
          <div className="max-w-2xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gold transition-colors" size={18} />
              <input type="text" placeholder="Search by practice name, city, or ZIP code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:border-gold/60 focus:bg-white/15 focus:ring-1 focus:ring-gold/30 transition-all text-sm" />
              {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/[0.08] bg-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-4 gap-4">
            {[{ l:"Sovereign",k:"sovereign",v:stats.sovereign,c:"text-emerald-400",d:"bg-emerald-400" },{ l:"Inconclusive",k:"moderate",v:stats.moderate,c:"text-amber-400",d:"bg-amber-400" },{ l:"At Risk",k:"atRisk",v:stats.atRisk,c:"text-red-400",d:"bg-red-400" },{ l:"Pre-Audited",k:"pending",v:stats.pending,c:"text-slate-400",d:"bg-slate-500" }].map(s=>(
              <button key={s.l} onClick={()=>setActiveTier(activeTier===s.k?null:s.k)} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-left ${activeTier===s.k?"bg-white/[0.08] ring-1 ring-white/[0.15]":"hover:bg-white/[0.04]"}`}><span className={`w-2.5 h-2.5 rounded-full ${s.d}`} /><div><div className={`text-xl font-bold font-mono ${s.c}`}>{s.v}</div><div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{s.l}</div></div></button>
            ))}
          </div>
        </div>
      </section>

      {/* CITY TABS */}
      <section className="border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2 -mb-px">
            {CITY_TABS.map(tab=>(
              <button key={tab.key} onClick={()=>setActiveCity(tab.key)} className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-t-lg ${activeCity===tab.key?"bg-white/[0.08] text-gold border-b-2 border-gold":"text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"}`}>
                {tab.label}<span className={`ml-2 text-[10px] font-mono ${activeCity===tab.key?"text-gold/80":"text-slate-500"}`}>{cityCounts[tab.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {activeTier && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] text-slate-400">Filtered by:</span>
              <span className="inline-flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.1] text-white text-[11px] font-bold px-3 py-1 rounded-lg">
                {activeTier === "sovereign" ? "Sovereign" : activeTier === "moderate" ? "Inconclusive" : activeTier === "atRisk" ? "At Risk" : "Pre-Audited"}
                <button onClick={() => setActiveTier(null)} className="text-slate-400 hover:text-white ml-1"><X size={12} /></button>
              </span>
            </div>
          )}
          {loading ? (
            <div className="text-center py-20"><Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" /><p className="text-slate-400 text-sm">Loading forensic signals...</p></div>
          ) : providers.length === 0 ? (
            <div className="text-center py-20"><Search className="w-12 h-12 text-slate-500 mx-auto mb-4" /><h3 className="text-white font-bold text-lg mb-2">No Results Found</h3>
              <p className="text-slate-400 text-sm mb-6">{searchTerm ? `No entities match "${searchTerm}".` : "No entities found."}</p>
              <Link href="/#scan" className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-navy font-bold px-6 py-3 rounded-lg text-sm transition-colors"><Shield size={16} /> Run a Sentry Scan</Link></div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_140px] gap-0 bg-white/[0.04] border-b border-white/[0.08] px-5 py-3">
                {["Practice Name","Sovereignty Status","Residency Signal","Transparency Seal","Last Scanned"].map(h=>(<div key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</div>))}
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Action</div>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {providers.map(p => {
                  const st = getSovStatus(p); const res = getResidencySignal(p); const tr = getTransparencySignal(p);
                  const hr = isHighRisk(p); const paid = p.is_paid || p.subscription_status === "active";
                  const claimed = claimedIds.has(p.id);
                  return (
                    <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_140px] gap-0 px-5 py-3.5 items-center hover:bg-white/[0.03] transition-colors">
                      <div><div className={`font-semibold text-sm ${hr?"text-slate-400":"text-white"}`}>{hr?maskName(p.name):p.name}</div><div className="text-[11px] text-slate-500 mt-0.5">{p.city||"\u2014"}{p.zip?`, ${p.zip}`:""}</div></div>
                      <div><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span></div>
                      <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${res.dot}`} /><span className={`text-sm font-medium ${res.color}`}>{res.label}</span></div>
                      <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${tr.dot}`} /><span className={`text-sm font-medium ${tr.color}`}>{tr.label}</span></div>
                      <div className="text-sm text-slate-300 font-mono tracking-tight">{timeAgo(p.last_scan_timestamp || p.updated_at)}</div>
                      <div className="text-right">
                        {paid ? (
                          <Link href={`/api/report?npi=${p.npi}&format=html`} className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"><ShieldCheck size={13} /> Certificate</Link>
                        ) : hr ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-500 text-[11px] font-medium px-3 py-1.5"><Lock size={13} /> Restricted</span>
                        ) : claimed ? (
                          <span className="inline-flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-bold px-3 py-1.5 rounded-lg"><CheckCircle size={13} /> Claimed</span>
                        ) : (
                          <button onClick={()=>{setClaimModal(p);setClaimStep("verify");setClaimForm({name:"",email:"",npi:""});setEmailError("");}}
                            className="inline-flex items-center gap-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/20 hover:border-gold/40 text-gold text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"><Eye size={13} /> Claim &amp; Verify</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] text-slate-400 font-mono">Showing <span className="text-slate-200 font-bold">{showFrom}&ndash;{showTo}</span> of <span className="text-slate-200 font-bold">{totalCount.toLocaleString()}</span></div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={14} /> Prev</button>
                  {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
                    let pn = totalPages<=7?i:page<3?i:page>totalPages-4?totalPages-7+i:page-3+i;
                    return <button key={pn} onClick={()=>setPage(pn)} className={`w-8 h-8 text-[11px] font-bold rounded-lg transition-all ${pn===page?"bg-gold/20 text-gold border border-gold/30":"text-slate-400 hover:text-white hover:bg-white/[0.06]"}`}>{pn+1}</button>;
                  })}
                  <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed">Next <ChevronRight size={14} /></button>
                </div>
              </div>
            </div>
          )}
          {providers.length > 0 && (<div className="text-center mt-10"><p className="text-slate-400 text-sm mb-3">Don&apos;t see your practice listed?</p><Link href="/#scan" className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-navy font-bold px-6 py-3 rounded-lg text-sm transition-colors"><Shield size={16} /> Run a Free Sentry Scan</Link></div>)}
        </div>
      </section>

      {/* DISCLOSURE */}
      <section className="border-t border-white/[0.08] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="max-w-3xl">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Public-Interest Disclosure</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">The Texas Sovereignty Registry compiles compliance signals from observable public digital infrastructure including DNS records, IP geolocation, HTTP headers, TLS certificates, and publicly accessible website content. Data is collected and analyzed by the SENTRY engine in accordance with SB&nbsp;1188 (Data Sovereignty) and HB&nbsp;149 (AI Transparency) statutory frameworks. This registry does not constitute a legal endorsement, certification, or guarantee of compliance. Healthcare entities may claim their listing to initiate a verified forensic audit. &copy;&nbsp;{new Date().getFullYear()} KairoLogic.</p>
        </div></div>
      </section>

      {/* CLAIM MODAL */}
      {claimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setClaimModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[#0c1425] border border-white/[0.1] rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            {claimStep === "verify" ? (<>
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-amber-400" /></div><span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Verification Required</span></div><button onClick={()=>setClaimModal(null)} className="text-slate-400 hover:text-white p-1"><X size={18} /></button></div>
                <h3 className="text-white font-bold text-lg">{claimModal.name}</h3>
                <p className="text-slate-400 text-xs mt-1">{claimModal.city}{claimModal.zip?`, ${claimModal.zip}`:""}</p>
              </div>
              <div className="px-6 py-4">
                {(() => {
                  const score = claimModal.risk_score ?? 0;
                  const cs = claimModal.last_scan_result?.categoryScores;
                  const dr = cs?.data_sovereignty?.percentage ?? null;
                  const ai = cs?.ai_transparency?.percentage ?? null;
                  const failCount = (claimModal.last_scan_result?.findings || []).filter((f:any) => f.status === "fail").length;
                  // Build personalized alert
                  let alertTitle = "";
                  let alertDetail = "";
                  if (score === 0 || !cs) {
                    alertTitle = `${claimModal.name} has not yet been audited under SB 1188.`;
                    alertDetail = "Verify your identity to initiate a Preliminary Forensic Scan of your digital infrastructure.";
                  } else if (score < 60) {
                    alertTitle = `Our scan detected ${failCount} statutory exposure${failCount !== 1 ? "s" : ""} for ${claimModal.name}.`;
                    alertDetail = `Sovereignty Score: ${score}/100.${dr !== null && dr < 65 ? " Data residency signals indicate potential out-of-state PHI routing." : ""}${ai !== null && ai < 60 ? " No compliant AI disclosure was detected." : ""} Verify your identity to review the full findings.`;
                  } else if (score < 80) {
                    alertTitle = `${claimModal.name} shows partial compliance with ${failCount} item${failCount !== 1 ? "s" : ""} requiring attention.`;
                    alertDetail = `Sovereignty Score: ${score}/100.${dr !== null && dr < 80 ? " Data residency anchoring is incomplete." : ""}${ai !== null && ai < 80 ? " AI transparency disclosures need strengthening." : ""} Verify to unlock your detailed findings.`;
                  } else {
                    alertTitle = `${claimModal.name} demonstrates strong sovereignty signals.`;
                    alertDetail = `Sovereignty Score: ${score}/100. Verify your identity to claim this listing and access your full compliance certificate.`;
                  }
                  return (
                    <div className={`${score > 0 && score < 60 ? "bg-red-500/5 border-red-500/15" : score < 80 ? "bg-amber-500/5 border-amber-500/15" : "bg-emerald-500/5 border-emerald-500/15"} border rounded-lg p-4 mb-5`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${score > 0 && score < 60 ? "text-red-400" : score < 80 ? "text-amber-400" : "text-emerald-400"}`} />
                        <div>
                          <p className={`text-sm font-semibold ${score > 0 && score < 60 ? "text-red-200" : score < 80 ? "text-amber-200" : "text-emerald-200"}`}>{alertTitle}</p>
                          <p className="text-slate-400 text-xs mt-1">{alertDetail}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="space-y-3">
                  <div><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Your Name</label><input type="text" value={claimForm.name} onChange={e=>setClaimForm({...claimForm,name:e.target.value})} placeholder="Dr. Jane Smith" className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/[0.12] rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20" /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Work Email</label>
                    <input type="email" value={claimForm.email} onChange={e=>{setClaimForm({...claimForm,email:e.target.value});setEmailError("");}} placeholder={extractDomain(claimModal.url||claimModal.last_scan_result?.url)?`you@${extractDomain(claimModal.url||claimModal.last_scan_result?.url)}`:"you@yourpractice.com"} className={`w-full px-3.5 py-2.5 bg-white/[0.06] border rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 ${emailError?"border-amber-500/50 focus:border-amber-500/70 focus:ring-amber-500/20":"border-white/[0.12] focus:border-gold/50 focus:ring-gold/20"}`} />
                    {emailError ? (<p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1"><AlertCircle size={10} />{emailError}. Click verify again to proceed anyway.</p>) : (<p className="text-[10px] text-slate-500 mt-1">Use your practice email to verify ownership</p>)}
                  </div>
                  <div><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">NPI Number <span className="text-slate-500">(optional)</span></label><input type="text" value={claimForm.npi} onChange={e=>setClaimForm({...claimForm,npi:e.target.value.replace(/\D/g,"").slice(0,10)})} placeholder="10-digit NPI" className="w-full px-3.5 py-2.5 bg-white/[0.06] border border-white/[0.12] rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20" /></div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between">
                <p className="text-[10px] text-slate-500 max-w-[200px]">Your data is protected under our privacy policy.</p>
                <button onClick={handleClaim} disabled={!claimForm.name||!claimForm.email||claimSubmitting} className="bg-gold hover:bg-gold-light disabled:opacity-40 text-navy font-bold px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2">{claimSubmitting?<Loader2 className="w-4 h-4 animate-spin" />:<ShieldCheck size={16} />} Verify &amp; Unlock Scan</button>
              </div>
            </>) : (<>
              {/* RESULT STEP - Full scan results breakdown */}
              <div className="sticky top-0 z-10 px-6 pt-6 pb-4 border-b border-white/[0.08] bg-[#0c1425] rounded-t-2xl"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400 text-sm font-bold">Identity Verified</span></div><button onClick={()=>setClaimModal(null)} className="text-slate-400 hover:text-white p-1"><X size={18} /></button></div></div>
              <div className="px-6 py-6">
                <h3 className="text-white font-bold text-lg mb-1">{claimModal.name}</h3>
                <p className="text-slate-400 text-xs mb-5">{claimModal.city}{claimModal.zip?`, ${claimModal.zip}`:""}</p>

                {(claimModal.risk_score ?? 0) > 0 ? (<>
                  {/* Composite Score Header */}
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <div><div className="text-white font-bold text-base">Composite Compliance Score</div>
                        <div className="text-slate-500 text-[10px] font-mono mt-0.5">NPI: {claimModal.npi} &middot; Engine: SENTRY-3.1</div></div>
                      <div className="text-right">
                        <div className={`text-3xl font-black ${(claimModal.risk_score??0)>=80?"text-emerald-400":(claimModal.risk_score??0)>=60?"text-amber-400":"text-red-400"}`}>{claimModal.risk_score}%</div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${(claimModal.risk_score??0)>=80?"bg-emerald-500/20 text-emerald-400":(claimModal.risk_score??0)>=60?"bg-amber-500/20 text-amber-400":"bg-red-500/20 text-red-400"}`}>{(claimModal.risk_score??0)>=80?"Sovereign":(claimModal.risk_score??0)>=60?"Drift":"Violation"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown - Path to 100% */}
                  <div className="mb-4">
                    <div className="text-white font-bold text-sm mb-3">Category Breakdown &mdash; Path to 100%</div>
                    {(() => {
                      const cs = claimModal.last_scan_result?.categoryScores || {};
                      const findings = claimModal.last_scan_result?.findings || [];
                      const cats = [
                        { key: "data_sovereignty", label: "Data Residency", icon: "\uD83C\uDF10", weight: 45 },
                        { key: "ai_transparency", label: "AI Transparency", icon: "\uD83D\uDCE1", weight: 30 },
                        { key: "clinical_integrity", label: "Clinical Integrity", icon: "\uD83D\uDD12", weight: 25 },
                      ];
                      return cats.map(cat => {
                        const catData = cs[cat.key] || { percentage: 0, passed: 0, findings: 0 };
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
                              <div className="flex items-center gap-2"><span>{cat.icon}</span><span className="text-white font-semibold text-sm">{cat.label}</span><span className="text-slate-500 text-[10px]">(weight: {cat.weight}%)</span></div>
                              <div className="flex items-center gap-2"><span className={`font-bold text-sm ${pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400"}`}>{pct}%</span><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tierColor}`}>{tierLabel}</span></div>
                            </div>
                            <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden mb-1.5"><div className={`h-full rounded-full transition-all ${barColor}`} style={{width:`${pct}%`}} /></div>
                            <div className="text-[10px] text-slate-500">{passed}/{catFindings.length} passed{failed > 0 ? <span className="text-red-400"> &middot; {failed} failed</span> : ""}{warned > 0 ? <span className="text-amber-400"> &middot; {warned} warnings</span> : ""}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Personalized findings list */}
                  {(() => {
                    const { critical, warnings, passes } = generateFindingsSummary(claimModal);
                    const hasFindings = critical.length > 0 || warnings.length > 0 || passes.length > 0;
                    return hasFindings ? (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5 space-y-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Scan Summary</div>
                        {critical.length > 0 && (<div className="flex items-center gap-2 text-[11px] text-red-300 py-1"><span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" /><span className="font-bold text-red-400">{critical.length} critical exposure{critical.length !== 1 ? "s" : ""} detected</span><span className="text-slate-600 ml-auto text-[10px]">Details in full report</span></div>)}
                        {warnings.length > 0 && (<div className="flex items-center gap-2 text-[11px] text-amber-300 py-1"><span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" /><span className="font-bold text-amber-400">{warnings.length} warning{warnings.length !== 1 ? "s" : ""} flagged</span><span className="text-slate-600 ml-auto text-[10px]">Details in full report</span></div>)}
                        {passes.length > 0 && (<div><div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 mt-2">Passing ({passes.length})</div>{passes.slice(0, 3).map((f, i) => (<div key={i} className="flex items-center gap-2 text-[11px] text-emerald-300 py-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />{f}</div>))}{passes.length > 3 && <div className="text-[10px] text-slate-500 mt-1">+{passes.length - 3} more passing checks</div>}</div>)}
                      </div>
                    ) : null;
                  })()}
                </>) : (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-5 mb-5 text-center"><p className="text-amber-300 text-sm font-semibold">No scan data available yet</p></div>
                )}

                <p className="text-slate-400 text-xs mb-5">A summary has been sent to <strong className="text-white">{claimForm.email}</strong>. To unlock the full remediation roadmap and evidence documentation:</p>

                {(() => {
                  const clientRef = `?client_reference_id=${encodeURIComponent(claimModal.npi)}&prefilled_email=${encodeURIComponent(claimForm.email)}`;
                  return (
                    <div className="space-y-2.5">
                      <a href={`https://buy.stripe.com/test_dRm4gz9aX7ty9oz6VK4ko02${clientRef}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.1] rounded-xl p-4 transition-all group/btn"><div className="flex items-center gap-3"><FileText className="w-5 h-5 text-gold" /><div><div className="text-white font-bold text-sm">Full Audit Report</div><div className="text-slate-400 text-xs">Detailed forensic analysis with legal evidence mapping</div></div></div><div className="text-right"><div className="text-gold font-black text-lg">$149</div><ChevronRight className="w-4 h-4 text-slate-500 group-hover/btn:text-gold ml-auto transition-colors" /></div></a>
                      <a href={`https://buy.stripe.com/test_8x2bJ14UHbJO30b93S4ko03${clientRef}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full bg-gold/5 hover:bg-gold/10 border-2 border-gold/20 hover:border-gold/40 rounded-xl p-4 transition-all relative group/btn"><div className="absolute -top-2 left-4 bg-gold text-navy text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Recommended</div><div className="flex items-center gap-3 mt-1"><Shield className="w-5 h-5 text-gold" /><div><div className="text-white font-bold text-sm">Safe Harbor&trade; Bundle</div><div className="text-slate-400 text-xs">Audit + policies + AI disclosures + remediation</div></div></div><div className="text-right mt-1"><div className="text-gold font-black text-lg">$249</div><ChevronRight className="w-4 h-4 text-slate-500 group-hover/btn:text-gold ml-auto transition-colors" /></div></a>
                    </div>
                  );
                })()}
              </div>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
