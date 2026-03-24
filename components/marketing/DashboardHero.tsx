'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from "react";

/* ══════════════════════════════════════════════════════════════
   KairoLogic — Animated Dashboard Hero
   Mirrors the real Practice Intelligence Dashboard with:
   1. Staggered sidebar + stat cards entrance
   2. Provider rows sliding in
   3. After 3s, provider detail slide-over animates in
   4. Data accuracy table with cross-source mismatches
   5. License & credentialing status badges
   ══════════════════════════════════════════════════════════════ */

function useCounter(target: number, dur: number = 1400, delay: number = 500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (target === 0) { setV(0); return; }
      let c = 0;
      const step = target / (dur / 16);
      const id = setInterval(() => {
        c += step;
        if (c >= target) { setV(target); clearInterval(id); } else setV(Math.floor(c));
      }, 16);
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return v;
}

function Fade({ delay = 0, children, style = {} }: { delay?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const [s, setS] = useState(false);
  useEffect(() => { const t = setTimeout(() => setS(true), delay); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      ...style,
      opacity: s ? 1 : 0,
      transform: s ? "translateY(0)" : "translateY(12px)",
      transition: "all 0.5s cubic-bezier(.4,0,.2,1)",
    }}>{children}</div>
  );
}

function SlideX({ delay = 0, children, from = -16, style = {} }: { delay?: number; children: React.ReactNode; from?: number; style?: React.CSSProperties }) {
  const [s, setS] = useState(false);
  useEffect(() => { const t = setTimeout(() => setS(true), delay); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      ...style,
      opacity: s ? 1 : 0,
      transform: s ? "translateX(0)" : `translateX(${from}px)`,
      transition: "all 0.45s cubic-bezier(.4,0,.2,1)",
    }}>{children}</div>
  );
}

// ─── Stat Card ───
function Stat({ value, label, color, bg, delay }: { value: number; label: string; color: string; bg: string; delay: number }) {
  const c = useCounter(value, 1200, delay);
  return (
    <Fade delay={delay} style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        background: bg, borderRadius: 8, padding: "12px 14px",
        border: "1px solid #e5e7eb",
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{c}</div>
        <div style={{ fontSize: 10, color, marginTop: 5, fontWeight: 600 }}>{label}</div>
      </div>
    </Fade>
  );
}

// ─── Provider Row ───
function PRow({ initials, name, npi, spec, issues, tags, delay, bg, highlight, onClick }: { initials: string; name: string; npi: string; spec: string; issues: number; tags: string[]; delay: number; bg: string; highlight?: boolean; onClick?: () => void }) {
  return (
    <SlideX delay={delay}>
      <div onClick={onClick} style={{
        background: "#fff", borderRadius: 8, padding: "10px 12px",
        border: highlight ? "2px solid #d4a017" : "1px solid #e5e7eb",
        marginBottom: 6, cursor: "pointer",
        boxShadow: highlight ? "0 0 0 3px rgba(212,160,23,0.12)" : "none",
        transition: "border 0.3s, box-shadow 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", background: bg || "#fef3c7",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#92400e", flexShrink: 0,
            }}>{initials}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{name}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'Courier New',monospace" }}>{npi}</div>
            </div>
          </div>
          <span style={{
            background: issues > 1 ? "#fef2f2" : "#fff7ed",
            color: issues > 1 ? "#dc2626" : "#ea580c",
            fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
          }}>{issues} issue{issues > 1 ? "s" : ""}</span>
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#64748b" }}>{spec}</span>
          {tags.map((t, i) => (
            <span key={i} style={{
              fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
              background: t === "Credentialing" ? "#eff6ff" : t === "Address" ? "#fef2f2" : "#fff7ed",
              color: t === "Credentialing" ? "#2563eb" : t === "Address" ? "#dc2626" : "#ea580c",
            }}>{t}</span>
          ))}
        </div>
      </div>
    </SlideX>
  );
}

// ─── Sidebar Nav Item ───
function NavI({ icon, label, active, delay }: { icon: string; label: string; active?: boolean; delay: number }) {
  return (
    <SlideX delay={delay}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
        borderRadius: 6, fontSize: 11.5, fontWeight: active ? 600 : 400,
        color: active ? "#fff" : "rgba(255,255,255,0.5)",
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        cursor: "pointer",
      }}>
        <span style={{ fontSize: 13, width: 18, textAlign: "center" }}>{icon}</span>
        <span>{label}</span>
      </div>
    </SlideX>
  );
}

// ─── Data Accuracy Row ───
function AccRow({ field, nppes, uhc, aetna, cigna, humana, delay, mismatch }: { field: string; nppes: string; uhc: string; aetna: string; cigna: string; humana: string; delay: number; mismatch?: boolean }) {
  const cellStyle = (_val: string, isMismatch: boolean): React.CSSProperties => ({
    fontSize: 9.5, padding: "6px 4px", color: isMismatch ? "#dc2626" : "#475569",
    fontWeight: isMismatch ? 600 : 400,
    borderBottom: "1px solid #f1f5f9",
    overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const, maxWidth: 110,
  });
  return (
    <Fade delay={delay}>
      <div style={{ display: "grid", gridTemplateColumns: "62px 1fr 1fr 50px 50px 60px", gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#334155", padding: "6px 4px", borderBottom: "1px solid #f1f5f9" }}>{field}</div>
        <div style={cellStyle(nppes, false)}>{nppes}</div>
        <div style={cellStyle(uhc, mismatch)}>{uhc}</div>
        <div style={cellStyle(aetna, false)}>{aetna}</div>
        <div style={cellStyle(cigna, mismatch)}>{cigna}</div>
        <div style={cellStyle(humana, mismatch)}>{humana}</div>
      </div>
    </Fade>
  );
}

// ═══════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════
export default function DashboardHero() {
  const [mounted, setMounted] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [clickPulse, setClickPulse] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Simulate click on Robert Connaughton row after 3s
    const t1 = setTimeout(() => setClickPulse(true), 2600);
    const t2 = setTimeout(() => setShowPanel(true), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <>
      <style>{`
        @keyframes pDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.4} }
        @keyframes cursorClick {
          0% { transform: translate(0,0) scale(1); }
          40% { transform: translate(160px, 260px) scale(1); }
          60% { transform: translate(160px, 260px) scale(0.85); }
          80% { transform: translate(160px, 260px) scale(1); }
          100% { transform: translate(160px, 260px) scale(1); opacity: 0; }
        }
        @keyframes healthBar { 0%{width:0} 100%{width:0%} }
        @keyframes panelSlide {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .slide-panel {
          animation: panelSlide 0.4s cubic-bezier(.4,0,.2,1) forwards;
        }
      `}</style>

      <div style={{
        position: "relative", maxWidth: 980, margin: "0 auto",
        perspective: "1200px", fontFamily: "'Plus Jakarta Sans','Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
          width: 700, height: 350,
          background: "radial-gradient(ellipse, rgba(212,160,23,0.07) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* Browser chrome */}
        <div style={{
          position: "relative", borderRadius: 12, overflow: "hidden",
          boxShadow: "0 30px 80px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "rotateX(0deg) scale(1)" : "rotateX(3deg) scale(0.97)",
          transition: "opacity 0.6s ease, transform 0.7s cubic-bezier(.4,0,.2,1)",
          zIndex: 1,
        }}>

          {/* ── Tab bar ── */}
          <div style={{
            background: "#1e293b", padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 10,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#f87171","#fbbf24","#34d399"].map((c,i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{
              flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 5,
              padding: "5px 10px", display: "flex", alignItems: "center", gap: 5,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ fontSize: 10.5, color: "#94a3b8", fontFamily: "'Courier New',monospace", letterSpacing: -0.3 }}>
                kairologic.net/practice/dashboard
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ position: "relative", display: "inline-block", width: 7, height: 7 }}>
                <span style={{
                  position: "absolute", inset: 0, borderRadius: "50%", background: "#34d399",
                  animation: "pDot 2s ease-in-out infinite",
                }} />
              </span>
              <span style={{ fontSize: 9, color: "#34d399", fontWeight: 600 }}>Operational</span>
            </div>
          </div>

          {/* ── Dashboard body ── */}
          <div style={{ display: "flex", background: "#f8fafc", minHeight: 420, position: "relative", overflow: "hidden" }}>

            {/* ═══ SIDEBAR ═══ */}
            <div style={{
              width: 175, background: "#0A192F", padding: "14px 0",
              borderRight: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
            }}>
              {/* Logo */}
              <Fade delay={100} style={{ padding: "0 14px 14px" }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5 }}>
                  <span style={{ color: "#e2e8f0" }}>Kairo</span>
                  <span style={{ color: "#d4a017" }}>Logic</span>
                </div>
              </Fade>

              {/* Practice selector */}
              <Fade delay={200} style={{ padding: "0 10px 12px" }}>
                <div style={{
                  background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.3 }}>
                    NORTH TEXAS MEDICAL<br/>SURGICAL CLINIC PA
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>DENTON, TX · 18 providers</div>
                </div>
              </Fade>

              {/* Nav items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 4 }}>
                <NavI icon="●" label="Dashboard" active delay={300} />
                <NavI icon="⚡" label="Workflows" delay={380} />
                <NavI icon="👥" label="Provider roster" delay={460} />
                <NavI icon="🔔" label="Alerts" delay={540} />
                <NavI icon="📄" label="Documents" delay={620} />
                <NavI icon="🏥" label="Payer directories" delay={700} />
                <NavI icon="🔍" label="NL Search" delay={780} />
                <NavI icon="📊" label="Reports" delay={860} />
                <NavI icon="⚙" label="Settings" delay={940} />
              </div>

              <Fade delay={1000} style={{ padding: "12px 14px 0" }}>
                <div style={{ fontSize: 9, color: "#475569", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Coming soon</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>Credentialing</div>
              </Fade>
            </div>

            {/* ═══ MAIN CONTENT ═══ */}
            <div style={{ flex: 1, padding: "16px 20px", overflow: "hidden", position: "relative" }}>

              {/* Header row */}
              <Fade delay={200}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Dashboard</div>
                    <div style={{ fontSize: 9.5, color: "#94a3b8" }}>NORTH TEXAS MEDICAL SURGICAL CLINIC PA · 18 providers · Last sync: 2 hours ago</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      background: "#f1f5f9", borderRadius: 6, padding: "5px 10px",
                      display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#94a3b8",
                    }}>
                      🔍 Ask anything... <span style={{ fontSize: 8, color: "#cbd5e1", fontFamily: "monospace" }}>⌘K</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#64748b", textAlign: "right", lineHeight: 1.3 }}>
                      Monday, March 23,<br/>2026
                    </div>
                  </div>
                </div>
              </Fade>

              {/* Welcome banner */}
              <Fade delay={350}>
                <div style={{
                  background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 8,
                  padding: "12px 16px", marginBottom: 14, position: "relative",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Welcome, Ravi</span>
                    <span style={{
                      background: "#d4a017", color: "#fff", fontSize: 8, fontWeight: 800,
                      padding: "2px 7px", borderRadius: 3, letterSpacing: 0.5,
                    }}>FREE TRIAL</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.5 }}>
                    17 of your 19 providers need attention. Click any provider below to review issues, approve corrections, and track resolution.
                  </div>
                  <div style={{ position: "absolute", top: 10, right: 12, fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>✕</div>
                </div>
              </Fade>

              {/* Stat cards */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <Stat value={17} label="Needs attention" color="#dc2626" bg="#fef2f2" delay={500} />
                <Stat value={0} label="In progress" color="#64748b" bg="#fff" delay={600} />
                <Stat value={0} label="Monitoring" color="#64748b" bg="#fff" delay={700} />
                <Stat value={2} label="All clear" color="#16a34a" bg="#f0fdf4" delay={800} />
              </div>

              {/* Two column: Providers + Compliance */}
              <div style={{ display: "flex", gap: 14 }}>

                {/* Left: Priority Providers */}
                <div style={{ flex: 1.2 }}>
                  <Fade delay={850}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase" }}>
                        Priority Providers
                      </span>
                      <span style={{ fontSize: 10, color: "#d4a017", fontWeight: 600, cursor: "pointer" }}>
                        View all 19 providers →
                      </span>
                    </div>
                  </Fade>

                  <PRow initials="DW" name="David Willingham" npi="1750312120" spec="Optometry" issues={1} tags={["Credentialing"]} delay={950} bg="#fef3c7" />
                  <PRow initials="RC" name="Robert Connaughton" npi="1326061003" spec="Plastic Surgery" issues={2} tags={["Address","Phone"]} delay={1050} bg="#fecaca" highlight={clickPulse} />
                  <PRow initials="MB" name="Michael Brooks" npi="1891040577" spec="Plastic Surgery" issues={2} tags={["Address","Phone"]} delay={1150} bg="#fecaca" />
                </div>

                {/* Right: Practice Compliance */}
                <div style={{ flex: 0.8 }}>
                  <Fade delay={900}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                      Practice Compliance
                    </span>
                  </Fade>
                  <Fade delay={1000}>
                    <div style={{
                      background: "#fff", borderRadius: 8, padding: "14px",
                      border: "1px solid #e5e7eb",
                    }}>
                      {/* Score bar */}
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Compliance score</div>
                      <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4, marginBottom: 14, overflow: "hidden" }}>
                        <div style={{
                          width: "35%", height: "100%", background: "#2563eb", borderRadius: 4,
                          transition: "width 1.5s cubic-bezier(.4,0,.2,1)",
                        }} />
                      </div>

                      {[
                        { name: "SB 1188 (Data sovereignty)", status: "Pending", color: "#d4a017" },
                        { name: "HB 149 (AI transparency)", status: "Pending", color: "#d4a017" },
                        { name: "AB 3030 (CA AI disclosure)", status: "N/A", color: "#94a3b8" },
                      ].map((r, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "7px 0", borderBottom: i < 2 ? "1px solid #f1f5f9" : "none",
                        }}>
                          <span style={{ fontSize: 10.5, color: "#475569" }}>{r.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: r.color }}>{r.status}</span>
                        </div>
                      ))}

                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 14, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                        Payer Sync Status
                      </div>
                    </div>
                  </Fade>
                </div>
              </div>
            </div>

            {/* ═══ SLIDE-OVER PANEL ═══ */}
            {showPanel && (
              <div className="slide-panel" style={{
                position: "absolute", top: 0, right: 0, bottom: 0, width: 380,
                background: "#fff", borderLeft: "1px solid #e5e7eb",
                boxShadow: "-8px 0 30px rgba(0,0,0,0.08)",
                padding: "18px", overflowY: "auto", zIndex: 10,
              }}>
                {/* Close */}
                <div style={{ position: "absolute", top: 12, right: 14, fontSize: 16, color: "#94a3b8", cursor: "pointer" }}>✕</div>

                {/* Provider header */}
                <Fade delay={3300}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", background: "#fecaca",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 700, color: "#991b1b",
                    }}>RC</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Robert Connaughton</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Courier New',monospace" }}>NPI 1326061003</span>
                        <span style={{
                          background: "#fef2f2", color: "#dc2626", fontSize: 9, fontWeight: 700,
                          padding: "1px 7px", borderRadius: 8,
                        }}>2 issues</span>
                        <span style={{
                          background: "#f0fdf4", color: "#16a34a", fontSize: 9, fontWeight: 700,
                          padding: "1px 7px", borderRadius: 8,
                        }}>Active</span>
                      </div>
                    </div>
                  </div>
                </Fade>

                {/* Health bar */}
                <Fade delay={3450}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: "#94a3b8" }}>0% health</span>
                    </div>
                    <div style={{ height: 3, background: "#e5e7eb", borderRadius: 3 }}>
                      <div style={{ width: "0%", height: "100%", background: "#dc2626", borderRadius: 3 }} />
                    </div>
                  </div>
                </Fade>

                {/* Tabs */}
                <Fade delay={3550}>
                  <div style={{ display: "flex", gap: 16, borderBottom: "2px solid #e5e7eb", marginBottom: 14 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: "#0f172a", paddingBottom: 8,
                      borderBottom: "2px solid #0f172a", marginBottom: -2,
                    }}>Overview</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", paddingBottom: 8 }}>
                      History <span style={{ background: "#e5e7eb", borderRadius: 8, padding: "0 5px", fontSize: 9, fontWeight: 600 }}>2</span>
                    </div>
                  </div>
                </Fade>

                {/* DATA ACCURACY TABLE */}
                <Fade delay={3650}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 0.4, marginBottom: 8 }}>
                    DATA ACCURACY ACROSS SOURCES
                  </div>
                </Fade>

                {/* Table header */}
                <Fade delay={3700}>
                  <div style={{ display: "grid", gridTemplateColumns: "62px 1fr 1fr 50px 50px 60px", gap: 2, marginBottom: 2 }}>
                    {["FIELD","NPPES","UHC","AETNA","CIGNA","HUMANA"].map((h, i) => (
                      <div key={i} style={{
                        fontSize: 8, fontWeight: 700, color: "#94a3b8", padding: "4px 4px",
                        borderBottom: "2px solid #e5e7eb", letterSpacing: 0.3,
                      }}>{h}</div>
                    ))}
                  </div>
                </Fade>

                <AccRow field="Address" nppes="1105 Central Exp..." uhc="1105 Central Exp..." aetna="—" cigna="800 8th Ave #306" humana="85 Maui L..." delay={3800} mismatch />
                <AccRow field="Phone" nppes="(692) 848-9904" uhc="(469) 284-8990" aetna="—" cigna="(682) 224-3748" humana="(808) 44..." delay={3900} mismatch />
                <AccRow field="Specialty" nppes="Plastic Surgery" uhc="Surgery Physician" aetna="—" cigna="—" humana="Surgery P..." delay={4000} mismatch />

                <Fade delay={4100}>
                  <div style={{ fontSize: 9, color: "#94a3b8", margin: "8px 0 16px", fontStyle: "italic" }}>
                    Credential: M.D. · Specialty: Plastic Surgery
                  </div>
                </Fade>

                {/* LICENSE & CREDENTIALING */}
                <Fade delay={4200}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 0.4, marginBottom: 10 }}>
                    LICENSE & CREDENTIALING
                  </div>
                </Fade>

                <Fade delay={4300}>
                  <div style={{
                    background: "#f8fafc", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden",
                  }}>
                    {[
                      { label: "TX medical license", status: "Active", color: "#16a34a" },
                      { label: "Disciplinary", status: "None", color: "#16a34a" },
                      { label: "PECOS enrollment", status: "Enrolled", color: "#2563eb" },
                    ].map((r, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "9px 14px",
                        borderBottom: i < 2 ? "1px solid #e5e7eb" : "none",
                      }}>
                        <span style={{ fontSize: 11, color: "#475569" }}>{r.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: r.color }}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </Fade>

                {/* PROVIDER REFERENCE */}
                <Fade delay={4500}>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 0.4, marginBottom: 10 }}>
                      PROVIDER REFERENCE
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                      {[
                        { label: "NPI", val: "1326061003" },
                        { label: "Specialty", val: "Plastic Surgery" },
                        { label: "Credential", val: "M.D." },
                      ].map((r, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 14px",
                          borderBottom: i < 2 ? "1px solid #e5e7eb" : "none",
                        }}>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{r.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Fade>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
