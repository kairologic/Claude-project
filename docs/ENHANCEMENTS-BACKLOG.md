# KairoLogic Product Enhancements Backlog
## Last Updated: Feb 15, 2026

---

## 🔴 V1 — Shield Dashboard & Check Engine v2 (Current Build)
- [x] Architecture defined
- [x] Database migration (check_results, scan_sessions, mismatch_alerts, drift_events)
- [x] Check Engine v2 — plugin-based compliance scanning (NPI-01, NPI-02, NPI-03, RST-01)
- [x] Batch re-scanning capabilities for entire provider registry
- [x] Shield provider dashboard page `/dashboard/[npi]` with token auth
- [x] Dashboard tabs: Overview, NPI Integrity, Data Border Map, Drift Monitor, Scan History, Documents, Settings
- [x] Tiered access (Watch vs Shield visibility)
- [x] Dashboard token generation in admin
- [x] NPI Integrity side-by-side comparison (NPI Registry vs Website)
- [x] Category scores computed from check_results
- [x] Scan results filtered to latest scan session only
- [x] Patient-facing landing page (`/patients`) with mobile responsive fix
- [x] Widget v2 — "Data & AI Trust" badge with trust pane
- [x] Demo harness for 90-second product video (6-step flow)
- [ ] Manual "Trigger Re-scan" button in admin per provider
- [ ] Manual "Generate Monthly Report" button in admin per provider
- [ ] Alert/email integration (drift → email for Shield subscribers)
- [ ] "Send Dashboard Link" button in admin — emails URL to provider
- [ ] "Resend Dashboard Link" if provider loses access
- [ ] Embed dashboard URL in widget's trust pane for Shield subscribers

---

## 🟡 V2 — Scheduled Automation & Website Compliance Checks
- [ ] Monthly re-scan scheduler (cron/Vercel cron)
- [ ] Monthly compliance report auto-generation + email delivery
- [ ] Quarterly forensic report auto-generation (Shield only)
- [ ] Annual certification seal generation (12 consecutive compliant months)
- [ ] `certification_status` field on registry (tracks consecutive compliant months)
- [ ] Trailing 12-month score history for certification eligibility
- [ ] Full website compliance checks: Data Residency (SB 1188), AI Transparency (HB 149), Clinical Integrity
- [ ] Adaptive web crawler (Crawlee + Playwright) for real website scanning
- [ ] IP geolocation for data border mapping (endpoint sovereignty)
- [ ] SSL certificate expiry monitoring
- [ ] Referrer policy checks
- [ ] AI disclosure detection (HB 149)
- [ ] Third-party script inventory and foreign routing detection

---

## 🟠 V2.5 — Shield Trial & Auto-Downgrade
- [ ] Add `shield_trial_start` and `shield_trial_end` fields to registry table
- [ ] Stripe webhook: set shield_trial_start/end (90 days) on report/safe harbor purchase
- [ ] Stripe webhook: set subscription_tier = 'shield' at purchase for trial period
- [ ] Dashboard/API access logic: grant Shield if subscription_tier='shield' OR shield_trial_end > now()
- [ ] Auto-downgrade: when trial expires with no paid subscription, set tier to 'watch' (NOT 'none')
- [ ] Trial expiry email at day 80: "Your Shield trial ends in 10 days — here's what we caught"
- [ ] Trial expiry email at day 90: "Shield access downgraded to Watch — upgrade to keep alerts"
- [ ] Downgrade-not-cancel: widget stays active, heartbeats continue, admin sees everything
- [ ] Provider loses: dashboard access, email alerts. Keeps: widget badge, drift detection (internal)
- [ ] Upgrade CTA in Watch-tier widget badge: "Upgrade to Shield for real-time alerts"

---

## 🟢 V3 — Pricing & Positioning Restructure
- [ ] Restructure to monitoring-first model (report bundled with subscription)
- [ ] $99/$149 initial buy = report + safe harbor + 3 months monitoring
- [ ] Auto-convert to $39/$79 monthly after initial period
- [ ] Messaging update: "includes 3 months" (not "3 months free")
- [ ] Homepage, services, scan results page content refresh
- [ ] A/B test new vs old pricing with new customers
- [ ] Grandfather existing customers on old pricing

---

## 🔵 V4 — Platform Expansion
- [ ] Generic compliance framework system (configurable categories per industry)
- [ ] Framework-aware widget: API returns display config (trust rows, banner text, legal refs) per framework
- [ ] Widget trust rows become data-driven — fetched from `/api/widget/config?npi=XXX`
- [ ] Framework display config table: framework_id, banner_text, trust_rows JSON, legal_refs
- [ ] Seed display configs for: TX SB 1188/HB 149, HIPAA, GDPR, ADA/WCAG, SOC 2
- [ ] Widget auto-renders correct trust rows based on provider's framework assignment
- [ ] HIPAA hosting compliance monitoring categories
- [ ] ADA/WCAG accessibility monitoring categories
- [ ] GDPR cookie consent monitoring categories
- [ ] SOC 2 drift detection categories
- [ ] SDK integration for mobile apps (not just websites)
- [ ] API endpoint for app-based compliance state reporting
- [ ] Multi-page monitoring (currently single page per provider)
- [ ] Custom pricing tier for large practices / 100+ page sites
- [ ] White-label option for compliance consultancies

---

## 🟣 Infrastructure & Polish
- [ ] SES production access (remove sandbox limitation)
- [ ] DKIM records in Vercel DNS for better email deliverability
- [ ] Email template preview/edit in admin dashboard
- [ ] Admin "Verify Claim" button → triggers registry-claim-verify email
- [ ] Stripe sandbox → production migration
- [ ] Widget removed detection (no heartbeat for 48+ hours → alert)
- [ ] Provider self-service portal (manage subscription, view invoices)
- [ ] Stripe customer portal integration

---

## 📈 Expandable Check Engine (Plugin Architecture)
- [ ] Broken links across all pages
- [ ] Address validation (Google Places API)
- [ ] Phone number validation (Twilio lookup — optional)
- [ ] ADA/WCAG accessibility scan (lighthouse/axe-core)
- [ ] Page speed / Core Web Vitals (lighthouse)
- [ ] SSL cert expiry warning (TLS handshake)
- [ ] HIPAA BAA checker (vendor pages)
- [ ] Prescription/medication page accuracy (FDA/NLM API)
- [ ] Multi-language compliance (Spanish content analysis)
- [ ] Online scheduling flow testing (headless browser)
- [ ] Multi-URL per NPI support (provider_sites table)
- [ ] Provider URL Finder integration for auto-populating missing URLs

---

## 📣 Go-to-Market: Social Media & Content Strategy

### Phase 1: Foundation (Now → 30 days)
**Primary channel: LinkedIn**
- [ ] Set up LinkedIn company page (copy ready — see linkedin-page.md)
- [ ] Set up Ravi's personal LinkedIn profile as founder (personal posts outperform company 5-10x)
- [ ] Post launch series: 5 articles, one per week
  - Post 1: Data routing awareness (Google Fonts/Analytics going overseas)
  - Post 2: AI transparency requirements (HB 149 disclosure)
  - Post 3: Data sovereignty myths ("our vendor said we're fine")
  - Post 4: NPI integrity / credentialing mismatches (481K providers scanned)
  - Post 5: Product demo with video (90-second harness recording)
- [ ] Connect with 20-30 Texas healthcare attorneys, compliance consultants, practice management groups
- [ ] Join LinkedIn groups: Texas Medical Association, healthcare compliance forums, HIPAA groups
- [ ] Comment on relevant posts from healthcare compliance influencers (build visibility)
- [ ] Add LinkedIn follow button to kairologic.net

### Phase 2: Content & SEO (30-60 days)
**Add: Blog + YouTube**
- [ ] Create blog section on kairologic.net (Next.js MDX or CMS)
- [ ] Publish blog versions of LinkedIn posts (longer, more detailed, SEO-optimized)
- [ ] Target keywords: "SB 1188 compliance," "Texas healthcare data sovereignty," "HB 149 AI disclosure," "NPI verification"
- [ ] Record 90-second product demo video (from demo harness)
- [ ] Record 3-5 minute explainer videos:
  - "Is your provider website sending data overseas?"
  - "What HB 149 means for your practice"
  - "How to check your NPI data in 60 seconds"
  - "What happens when compliance drifts (real examples)"
- [ ] Create YouTube channel: KairoLogic
- [ ] Embed videos on relevant kairologic.net pages
- [ ] Create LinkedIn carousel PDFs from blog content (high engagement format)

### Phase 3: Paid Acquisition (60-90 days)
**Add: Google Ads + LinkedIn Ads + Email**
- [ ] Google Ads campaign targeting:
  - "SB 1188 compliance"
  - "Texas healthcare data sovereignty"
  - "HB 149 AI disclosure requirements"
  - "healthcare website compliance Texas"
  - "NPI verification tool"
- [ ] Landing page optimized for Google Ads (separate from main site, conversion-focused)
- [ ] LinkedIn Ads targeting:
  - Job titles: Practice Administrator, Office Manager, Compliance Officer, Healthcare Attorney
  - Geography: Texas
  - Industry: Healthcare
  - Company size: 11-200 employees
- [ ] Email newsletter setup for scan users who provided email
- [ ] Drip sequence: scan result → educational content → report CTA → Shield CTA
- [ ] Weekly compliance digest email (industry news + KairoLogic insights)

### Phase 4: Community & Partnerships (90-120 days)
**Add: Facebook group + Referral program + Partnerships**
- [ ] Create private Facebook group: "Texas Healthcare Compliance Network"
  - Position as peer community, not sales channel
  - Seed with 20-30 existing contacts before opening
  - Weekly Q&A posts, compliance tip of the week
  - Share anonymized scan findings as discussion starters
- [ ] Referral program for healthcare attorneys and compliance consultants
  - Revenue share or flat fee per referred Shield subscriber
  - Dedicated partner landing page with tracking
  - Co-branded audit reports (consultant's name + KairoLogic)
- [ ] Partnership outreach:
  - Texas Medical Association (TMA) — vendor listing, conference presence
  - Texas Healthcare Information Management Systems Society (HIMSS)
  - State dental and PT associations
  - EHR vendors (integration partnerships)
- [ ] Speaking / webinar circuit: offer free compliance webinars to medical associations
- [ ] Case study development: 2-3 provider success stories with before/after scores

### Phase 5: Scale & National (120+ days)
**When other states pass similar laws:**
- [ ] Monitor state-level healthcare AI and data sovereignty legislation
- [ ] Prepare framework configs for new states (widget, checks, reports)
- [ ] Expand Google Ads to new state-specific keywords
- [ ] LinkedIn thought leadership: "Texas was first — here's what [state] providers need to know"
- [ ] National healthcare compliance positioning (authority built from TX track record)
- [ ] Conference presence at HIMSS national, AHLA annual meeting
- [ ] PR outreach to healthcare trade publications (Becker's, Modern Healthcare, Healthcare IT News)

### Content Calendar Template (Repeating 8-week cycle)
| Week | Theme | Post Type | Channel |
|------|-------|-----------|---------|
| 1 | Data sovereignty explainer | Educational | LinkedIn + Blog |
| 2 | Real scan finding (anonymized) | Case study | LinkedIn |
| 3 | AI disclosure requirements | Thought leadership | LinkedIn + Blog |
| 4 | NPI integrity / credentialing | Educational | LinkedIn |
| 5 | Product update or feature | Demo / announcement | LinkedIn + YouTube |
| 6 | Industry news commentary | Thought leadership | LinkedIn |
| 7 | Provider compliance tip | Quick tip / actionable | LinkedIn |
| 8 | "Compliance myth" debunk | Contrarian / engagement | LinkedIn |

### Channel Priority (Do NOT spread thin)
| Priority | Channel | Audience | Purpose | When |
|----------|---------|----------|---------|------|
| 1 | LinkedIn (company) | Providers, attorneys, consultants | Authority + lead gen | Now |
| 2 | LinkedIn (Ravi personal) | Same + wider network | Trust + reach amplifier | Now |
| 3 | kairologic.net/blog | Google search traffic | SEO + education | Week 2 |
| 4 | YouTube | Providers researching compliance | Demo + explainers | Month 2 |
| 5 | Google Ads | Providers searching SB 1188/HB 149 | Direct lead gen | Month 2-3 |
| 6 | LinkedIn Ads | TX practice administrators | Targeted lead gen | Month 3 |
| 7 | Email newsletter | Scan users + report buyers | Nurture + upsell | Month 2 |
| 8 | Facebook group (private) | Provider community | Trust + retention | Month 4+ |

### Key Principle
**Do NOT create a patient-facing Facebook page.** Patients don't buy KairoLogic — providers do. Every hour spent on patient social media is an hour not spent building authority where actual buyers make decisions (LinkedIn + Google).

---

## 📋 Deferred from Previous Sessions
- [ ] Deploy pending files: RiskScanWidget.tsx, payment-success-page.tsx, admin-dashboard-page.tsx
- [ ] Deploy Safe Harbor download files to public/downloads/safe-harbor/
- [ ] Deploy stripe-test-page.tsx
- [ ] Full Stripe live migration (products, payment links, webhook, env vars)
- [ ] Lazy initialization patterns for Supabase client (Vercel build fix)
