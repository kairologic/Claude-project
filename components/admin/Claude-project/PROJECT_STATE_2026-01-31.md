# KairoLogic Project State - January 31, 2026

## Project Overview
**Platform**: KairoLogic - Texas Healthcare Compliance Platform
**Purpose**: Help Texas healthcare providers comply with SB 1188 (Data Sovereignty) and HB 149 (AI Transparency)
**Tech Stack**: Next.js 14, TypeScript, Tailwind CSS, Supabase, Vercel

---

## Current Deployment
- **Vercel URL**: https://claude-project-ggg65d54a-ravis-projects-ef02094b.vercel.app
- **GitHub**: Connected to Vercel for auto-deploy
- **Supabase**: https://mxrtltezhkxhqizvxvsz.supabase.co

---

## Session Summary (Jan 31, 2026)

### What Was Built This Session

#### 1. Embeddable Sentry Widget System
**Files Created:**
- `public/sentry.js` - Embeddable JavaScript widget (18KB)
- `app/api/widget/[npi]/route.ts` - API endpoint for widget status
- `public/widget-test.html` - Test page simulating practice website

**Widget Business Logic:**
- Score ≥ 75% → Widget VISIBLE with green "COMPLIANCE VERIFIED" badge
- Score < 75% → Widget HIDDEN from public, admin sees yellow/warning status
- Subscription inactive → Widget hidden
- Links to `/scan/results?npi=XXX&mode=verified` for public report view

**Embed Code for Practices:**
```html
<script 
  src="https://kairlogic-website.vercel.app/sentry.js" 
  data-npi="1234567890"
  data-position="bottom-right"
  data-theme="light"
  data-size="standard">
</script>
```

#### 2. Admin Templates Tab Fix
**Problem**: Templates tab showed only 2 hardcoded templates, not fetching from database
**Solution**: Updated `/app/admin/dashboard/page.tsx` to:
- Fetch from `email_templates` table (4 records: scan_complete, purchase_success, consultation_booked, contact_form)
- Fetch from `templates` table (14 records: TMP-001 to TMP-014 marketing assets)
- Display both sections in Templates tab

#### 3. CMS-Enabled Pages
**Files Modified:**
- `app/page.tsx` (Homepage) - Now uses `usePageCMS('Homepage')` hook
- `app/compliance/page.tsx` - Now uses `usePageCMS('Compliance')` hook

**New SQL Script:**
- `database-seed-page-content.sql` - Populates `page_content` table with ~100+ content sections

**CMS Coverage:**
| Page | Sections Created |
|------|------------------|
| Homepage | 28 sections (hero, trust stats, value props, notice, CTA) |
| Compliance | 35 sections (hero, SB1188, HB149, timeline, CTA) |
| Services | Seed data ready |
| Contact | Seed data ready |
| Scan | Seed data ready |
| Registry | Seed data ready |
| Header/Footer | Seed data ready |

#### 4. Verified Report Page
**Modified**: `app/scan/results/page.tsx`
- Added `mode=verified` URL parameter handling
- When accessed from widget link, shows green verified report with compliance badges
- Normal scan flow remains unchanged

---

## Database Schema (Supabase Tables)

### Core Tables
| Table | Records | Purpose |
|-------|---------|---------|
| `registry` | 481,277 | Texas provider directory |
| `email_templates` | 4 | Transactional email templates |
| `templates` | 14 | Marketing assets (PDFs, collateral) |
| `page_content` | ~100+ | CMS content for pages |
| `scan_history` | - | Scan results history |
| `scan_results` | - | Detailed scan results |
| `violation_evidence` | - | Violation details per scan |
| `email_logs` | - | Email send logs |
| `purchases` | - | Payment records |

### Registry Table Key Fields
- `id`, `npi`, `name`, `url`
- `risk_score` (0-100)
- `widget_status` (active, warning, hidden, inactive)
- `subscription_status` (trial, active, inactive)
- `last_scan_timestamp`

---

## Files Structure

```
Claude-project/
├── app/
│   ├── page.tsx                    # Homepage (CMS-enabled)
│   ├── compliance/page.tsx         # Compliance page (CMS-enabled)
│   ├── services/page.tsx           # Service tiers
│   ├── contact/page.tsx            # Contact form
│   ├── scan/
│   │   ├── page.tsx                # Scan form
│   │   └── results/page.tsx        # Results + verified mode
│   ├── registry/page.tsx           # Provider search
│   ├── consultation/page.tsx       # Consultation booking
│   ├── admin/
│   │   ├── page.tsx                # Admin login
│   │   └── dashboard/page.tsx      # Admin dashboard (1100+ lines)
│   └── api/
│       ├── widget/[npi]/route.ts   # Widget status API
│       ├── contact/route.ts        # Contact form API
│       └── fillout/webhook/route.ts
├── components/
│   ├── RiskScanWidget.tsx          # Internal scan component (978 lines)
│   ├── PDFReportGenerator.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── TopBanner.tsx
│   └── admin/
│       ├── PageContentTab.tsx      # CMS editor
│       ├── AssetsTab.tsx
│       └── ProviderDetailModal.tsx
├── services/
│   ├── pageContentService.ts       # CMS service
│   ├── assetsService.ts
│   └── reportService.ts
├── hooks/
│   └── useCMSContent.tsx           # CMS React hooks
├── public/
│   ├── sentry.js                   # Embeddable widget
│   ├── widget-test.html            # Widget test page
│   └── logo.svg
├── database-seed-page-content.sql  # CMS seed data
├── database-migration.sql
└── database-migration-v2.sql
```

---

## Pending Tasks / Known Issues

### Not Yet Deployed
The following changes were made locally but may not be deployed to Vercel yet:
1. Admin Templates tab fetching from database
2. CMS-enabled Homepage and Compliance pages
3. Sentry Widget files

### To Deploy
```bash
# Extract KairoLogic-SentryWidget-Complete.zip to project folder
git add .
git commit -m "Add Sentry Widget + CMS + Templates fix"
git push
```

### To Run After Deploy
1. Run `database-seed-page-content.sql` in Supabase SQL Editor
2. Test widget at `/widget-test.html`
3. Test CMS at `/admin` → Content tab

### Future Enhancements (Phase 2)
- [ ] Enhanced Stripe checkout integration
- [ ] Expanded Mailjet email automation
- [ ] More pages converted to CMS
- [ ] Widget analytics tracking
- [ ] Subscription management in admin

---

## Key API Credentials (Environment Variables)

```env
NEXT_PUBLIC_SUPABASE_URL=https://mxrtltezhkxhqizvxvsz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_PUBLISHABLE_KEY=pk_live_...
MAILJET_API_KEY=...
FILLOUT_API_KEY=...
```

---

## Important Code Patterns

### CMS Content Hook Usage
```tsx
const { content: cms, isLoading } = usePageCMS('Homepage');
const c = (key: string, fallback: string) => cms[key] || fallback;

// In JSX:
<h1>{c('hero_title', 'Default Title')}</h1>
```

### Widget API Response Format
```json
{
  "npi": "1234567890",
  "name": "Healthcare Provider",
  "verified": true,
  "compliance_score": 85,
  "widget_status": "verified",
  "last_scan_timestamp": "2026-01-30T10:00:00Z"
}
```

### Compliance Threshold
```typescript
const COMPLIANCE_THRESHOLD = 75; // Widget only visible if score >= 75%
```

---

## Contact / Admin Access
- **Admin URL**: /admin
- **Admin Password**: pachavellam_
- **Contact Email**: compliance@kairologic.com

---

## Last Updated
- **Date**: January 31, 2026
- **Session Focus**: Sentry Widget, Templates Tab, CMS Integration
- **Zip File**: KairoLogic-SentryWidget-Complete.zip
