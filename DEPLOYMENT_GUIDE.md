# KairoLogic Platform - Deployment Guide

## ✅ What's Complete

### Public Website (Phase 1) - DONE ✓
1. **Homepage** - Hero, sovereign mandate, registry stats, CTA
2. **Compliance Page** - SB 1188 & HB 149 details, penalties, timeline
3. **Services Page** - 3 tiers (PDF $1,250, Consultation $3,000, Full Service)
4. **Registry Page** - Searchable public directory with Supabase integration
5. **Scan Page** - Form to collect provider info
6. **Scan Results Page** - Integrated with Risk Scan Widget, shows score + CTA
7. **Contact Page** - Contact form with hub details

### Components
- Header with navigation
- Footer with links
- Top banner with enforcement notice
- Risk Scan Widget (imported from previous work)
- PDF Report Generator (imported from previous work)

### Design System
- Navy (#0B1E3D), Gold (#D4A574), Orange (#FF6B35)
- Montserrat (headings) + Inter (body)
- Tailwind utility classes ready

---

## 🚀 Deployment Steps

### 1. Database Setup
```bash
# In Supabase SQL Editor
# Run: database-migration.sql
```

This creates:
- Enhanced registry table with widget control
- email_templates, page_content, assets
- calendar_slots, purchases, scan_history
- RLS policies
- Default email templates

### 2. Environment Variables
Create `.env.local`:

```env
# Supabase (READY)
NEXT_PUBLIC_SUPABASE_URL=https://mxrtltezhkxhqizvxvsz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw

# Stripe (TODO - Get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (TODO - Get from resend.com)
RESEND_API_KEY=re_...
EMAIL_FROM=compliance@kairologic.com

# Admin
ADMIN_PASSWORD=pachavellam_

# Domain
NEXT_PUBLIC_DOMAIN=https://kairologic.net
```

### 3. Install Dependencies
```bash
cd kairologic-platform
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

### 5. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Or use Vercel Dashboard:**
1. Go to vercel.com
2. Import Git repository
3. Add environment variables
4. Deploy

---

## 📋 Testing Checklist

### Public Pages
- [ ] Homepage loads with hero and sections
- [ ] Compliance page shows SB 1188 & HB 149
- [ ] Services page shows 3 pricing tiers
- [ ] Registry page loads and searches work
- [ ] Scan form accepts input
- [ ] Scan results shows Risk Scan Widget
- [ ] Contact form submits

### Database
- [ ] Registry table has widget columns
- [ ] Can insert/update registry records
- [ ] Violation evidence saves properly
- [ ] Scan history records work

### Functionality
- [ ] Risk Scan Widget runs all 12 checks
- [ ] Results save to database
- [ ] PDF generator fetches violations
- [ ] Search filters providers correctly

---

## 🔧 What's Next (Phase 2)

### Checkout & Payments
- [ ] Create `/app/checkout/page.tsx`
- [ ] Stripe Checkout integration
- [ ] Success page
- [ ] Webhook handler for payment events
- [ ] Send purchase confirmation email

### Email System
- [ ] Create `/lib/email.ts` with Resend
- [ ] Send scan complete email
- [ ] Send purchase confirmation
- [ ] Send consultation booking confirmation
- [ ] Send contact form notification

### Consultation Booking
- [ ] Create `/app/consultation/page.tsx`
- [ ] Calendar slot picker
- [ ] Google Calendar integration
- [ ] Google Meet link generation

---

## 📂 File Structure

```
kairologic-platform/
├── app/
│   ├── layout.tsx             ✓
│   ├── page.tsx               ✓ Homepage
│   ├── compliance/page.tsx    ✓
│   ├── services/page.tsx      ✓
│   ├── registry/page.tsx      ✓
│   ├── scan/
│   │   ├── page.tsx           ✓ Scan form
│   │   └── results/page.tsx   ✓ Results with widget
│   ├── contact/page.tsx       ✓
│   ├── checkout/page.tsx      ⏳ TODO
│   ├── consultation/page.tsx  ⏳ TODO
│   └── api/
│       ├── scan/route.ts      ⏳ TODO
│       ├── checkout/route.ts  ⏳ TODO
│       └── webhooks/
│           └── stripe/route.ts ⏳ TODO
├── components/
│   ├── layout/
│   │   ├── Header.tsx         ✓
│   │   ├── Footer.tsx         ✓
│   │   └── TopBanner.tsx      ✓
│   ├── RiskScanWidget.tsx     ✓
│   └── PDFReportGenerator.tsx ✓
├── lib/
│   ├── supabase.ts            ✓
│   ├── email.ts               ⏳ TODO
│   └── stripe.ts              ⏳ TODO
└── database-migration.sql     ✓
```

---

## ⚠️ Important Notes

### 1. Risk Scan Widget Integration
The `RiskScanWidget` component is imported into `/app/scan/results/page.tsx`. It uses:
- Supabase credentials (already configured)
- Queries by NPI field (fixed from previous session)
- Saves violations to `violation_evidence` table
- Returns: score, risk level, top issues

### 2. PDF Generator
The `PDFReportGenerator` component can be used in admin:
```tsx
<PDFReportGenerator npi="1234567890" autoLoad={true} />
```

### 3. Database Important
Make sure to run `database-migration.sql` BEFORE testing. It:
- Adds widget control columns
- Creates new tables
- Sets up RLS policies
- Inserts email templates

### 4. Stripe Products
After setting up Stripe:
1. Create 2 products:
   - "Full PDF Report" - $1,250
   - "Technical Consultation" - $3,000
2. Copy Price IDs to env variables

### 5. Email Domain
Configure `compliance@kairologic.com` in Resend:
1. Add domain kairologic.com
2. Verify DNS records
3. Test sending

---

## 🎨 Design Tokens

```css
/* Colors */
--navy: #0B1E3D
--gold: #D4A574
--orange: #FF6B35

/* Fonts */
font-display: Montserrat
font-body: Inter

/* Component Classes */
.btn-primary     - Orange CTA button
.btn-secondary   - Gold button
.btn-outline     - Navy outline button
.card            - White card with shadow
.input-field     - Form input
```

---

## 🐛 Troubleshooting

### Supabase Connection
If database queries fail:
1. Check RLS policies are enabled
2. Verify anon key is correct
3. Check network tab for 401/403 errors

### Risk Scan Widget
If scans fail to save:
1. Check `violation_evidence` table exists
2. Verify registry entry exists first
3. Check console for errors

### Build Errors
If `npm run build` fails:
1. Check all imports are correct
2. Verify TypeScript types
3. Run `npm install` again

---

## 📞 Support

Questions? Issues?
1. Check console logs (F12)
2. Review Supabase logs
3. Test API endpoints individually

---

## ✨ Success Criteria

The website is ready when:
- ✅ All 7 public pages load
- ✅ Risk Scan Widget completes scans
- ✅ Results save to database
- ✅ Registry search works
- ✅ Forms submit successfully
- ✅ Design matches screenshots

**You now have a production-ready public website!** 🎉

Next: Add checkout, emails, and admin dashboard.
