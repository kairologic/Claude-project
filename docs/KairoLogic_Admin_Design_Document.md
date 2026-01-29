# KairoLogic Sentry Control Center - Admin Interface Design Document

## Version 10.0.0 | Implementation Specification

---

## 1. Executive Summary

The **KairoLogic Sentry Control Center** is a comprehensive admin dashboard for managing Texas healthcare data compliance operations. This document details the complete implementation of all admin interface requirements as specified in the project scope.

### Key Features Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| Registry CRUD | ✅ Complete | Full create, read, update, delete operations |
| Bulk Operations | ✅ Complete | CSV import, export, bulk scan, bulk delete |
| Provider Search | ✅ Complete | Multi-axis search (name, NPI, city, zip, email) |
| Scan Management | ✅ Complete | Manual scan trigger, scan history tracking |
| Widget Governance | ✅ Complete | Status control (active/warning/hidden) |
| Calendar/Appointments | ✅ Complete | 15-minute slots, 9AM-5PM, booking management |
| Email Templates | ✅ Complete | Template CRUD with event triggers |
| Visibility Toggle | ✅ Complete | Control public registry visibility |

---

## 2. Technical Architecture

### 2.1 Technology Stack

```
Frontend Framework:  React 18+ with Hooks
Styling:             Tailwind CSS (Core Utilities)
Icons:               Lucide React
State Management:    React useState/useEffect/useMemo/useCallback
Backend:             Supabase (PostgreSQL + Edge Functions)
Authentication:      Password-protected admin access
```

### 2.2 Component Structure

```
AdminDashboard/
├── Main Dashboard Component
│   ├── Header (with ATX-01 status indicator)
│   ├── Stats Bar (real-time metrics)
│   └── Tab Navigation
├── Tabs/
│   ├── OverviewTab (dashboard summary)
│   ├── RegistryTab (provider management)
│   ├── CalendarTab (appointment scheduling)
│   ├── TemplatesTab (email template management)
│   └── WidgetTab (widget governance)
├── Modals/
│   ├── ProviderForm (add/edit provider)
│   ├── ProviderDetailView (full provider info)
│   ├── TemplateEditor (email template editing)
│   └── WidgetCodeModal (embed code generator)
└── Utilities/
    ├── StatusBadge (status indicators)
    ├── Modal (reusable modal wrapper)
    └── Notification (toast notifications)
```

---

## 3. Database Schema Enhancements

### 3.1 Registry Table Extensions

```sql
ALTER TABLE public.registry ADD COLUMN IF NOT EXISTS (
    -- Widget Management
    widget_status TEXT DEFAULT 'hidden' CHECK (widget_status IN ('active', 'warning', 'hidden')),
    widget_id TEXT UNIQUE,
    last_widget_check TIMESTAMPTZ,
    
    -- Subscription Management
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'inactive')),
    
    -- Scan Tracking
    scan_count INTEGER DEFAULT 0,
    scan_history JSONB DEFAULT '[]'::jsonb,
    
    -- Contact Information
    contact_first_name TEXT,
    contact_last_name TEXT,
    phone TEXT,
    
    -- Visibility Control
    is_visible BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for widget lookups
CREATE INDEX IF NOT EXISTS idx_registry_widget_status ON registry(widget_status);
CREATE INDEX IF NOT EXISTS idx_registry_subscription ON registry(subscription_status);
```

### 3.2 Email Templates Table

```sql
CREATE TABLE IF NOT EXISTS public.email_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('marketing', 'transactional', 'notification', 'report')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    event_trigger TEXT,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Calendar Slots Table

```sql
CREATE TABLE IF NOT EXISTS public.calendar_slots (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT false,
    booked_by JSONB,  -- {name, email, npi, practiceName}
    meeting_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(date, time)
);

-- Generate slots for next 30 days (Edge Function)
-- Runs daily to maintain availability
```

---

## 4. Feature Specifications

### 4.1 Registry Management

#### Search Capabilities
- **All Fields**: Searches name, NPI, city, zip, email simultaneously
- **Specific Axis**: Filter by single field for precise results
- **Real-time**: Debounced search with 300ms delay

#### Provider Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Auto | UUID or REG-{timestamp} |
| npi | string | Yes | 10-digit NPI number |
| name | string | Yes | Practice name |
| contactFirstName | string | No | Contact first name |
| contactLastName | string | No | Contact last name |
| email | string | No | Email address |
| phone | string | No | Phone number |
| city | string | No | City |
| zip | string | No | ZIP code |
| url | string | No | Website URL |
| widgetStatus | enum | Yes | active/warning/hidden |
| widgetId | string | Auto | WGT-{NPI} format |
| subscriptionStatus | enum | Yes | trial/active/inactive |
| scanCount | number | Auto | Total scan count |
| lastScanDate | string | Auto | YYYY-MM-DD format |
| riskScore | number | Auto | 0-100 score |
| complianceStatus | enum | Auto | Verified/Warning/Revoked |
| isVisible | boolean | Yes | Public registry visibility |

#### Bulk Operations
1. **CSV Import**: Accepts columns matching provider fields
2. **CSV Export**: Exports all visible columns
3. **Bulk Scan**: Queue multiple providers for scanning
4. **Bulk Delete**: Delete multiple selected records

### 4.2 Calendar System

#### Configuration
- **Hours**: 9:00 AM - 5:00 PM
- **Slot Duration**: 15 minutes
- **Days**: Monday - Friday
- **Lookahead**: 14 days rolling window

#### Slot States
| State | Display | Action |
|-------|---------|--------|
| Available | Green, "Open" | Click to view |
| Booked | Gray, Contact name | Cancel option |

#### Booking Data Structure
```typescript
interface CalendarSlot {
  id: string;           // SLOT-{date}-{time}
  date: string;         // YYYY-MM-DD
  time: string;         // HH:MM (24h)
  isBooked: boolean;
  bookedBy?: {
    name: string;
    email: string;
    npi?: string;
    practiceName?: string;
  };
  meetingUrl?: string;  // Auto-generated meet link
}
```

### 4.3 Email Template System

#### Template Categories
- **Marketing**: Outreach and promotional emails
- **Transactional**: System-triggered confirmations
- **Notification**: Alerts and reminders
- **Report**: Scheduled report deliveries

#### Event Triggers
| Trigger | Description |
|---------|-------------|
| risk_scan_high | When scan returns score < 34 |
| risk_scan_complete | After any scan completion |
| verification_complete | When status changes to Verified |
| subscription_activated | When payment confirmed |
| subscription_expiring | 7 days before expiration |
| weekly_report | Every Monday 9 AM |

#### Template Variables
```
{{practiceName}}     - Provider practice name
{{contactName}}      - Contact full name
{{npi}}              - NPI number
{{riskScore}}        - Current risk score
{{sealId}}           - Sentry seal ID
{{verificationDate}} - Date of verification
{{expirationDate}}   - Subscription expiration
{{dateRange}}        - Report date range
```

### 4.4 Widget Governance

#### Widget Status Logic
```
IF complianceStatus === 'Verified' AND subscriptionStatus === 'active':
    widgetStatus = 'active'  // Widget visible
    
IF complianceStatus === 'Warning':
    widgetStatus = 'warning' // Widget auto-hidden
    
IF subscriptionStatus === 'inactive':
    widgetStatus = 'hidden'  // Widget removed
```

#### Embed Code Structure
```html
<!-- KairoLogic Sentry Widget -->
<script>
  (function(){
    var e = document.createElement('script');
    e.src = 'https://widget.kairologic.com/sentry.js';
    e.async = true;
    e.dataset.widgetId = 'WGT-{NPI}';
    e.dataset.npi = '{NPI}';
    document.body.appendChild(e);
  })();
</script>
```

---

## 5. UI/UX Design System

### 5.1 Color Palette

```css
/* Primary Colors */
--slate-800: #1e293b    /* Headers, buttons */
--slate-600: #475569    /* Secondary text */
--slate-100: #f1f5f9    /* Backgrounds */

/* Accent Colors */
--amber-400: #fbbf24    /* Primary accent, CTAs */
--amber-500: #f59e0b    /* Hover states */

/* Status Colors */
--emerald-500: #10b981  /* Success, Verified, Active */
--amber-500: #f59e0b    /* Warning states */
--red-500: #ef4444      /* Error, Revoked */
--blue-500: #3b82f6     /* Info, Trial */
```

### 5.2 Typography

```css
/* Headers */
font-family: system-ui, sans-serif
font-weight: 700-900
text-transform: uppercase
letter-spacing: 0.05em - 0.1em

/* Body */
font-size: 14px (base)
font-weight: 400-600

/* Labels */
font-size: 9px-10px
font-weight: 700
text-transform: uppercase
letter-spacing: 0.1em
```

### 5.3 Component Patterns

#### Status Badge
```jsx
<StatusBadge status="Verified" size="sm" />
// Renders: pill with icon + text
// Colors based on status mapping
```

#### Modal
```jsx
<Modal isOpen={true} onClose={fn} title="Title" size="lg">
  {children}
</Modal>
// Sizes: sm, md, lg, xl
// Backdrop blur with click-outside-to-close
```

---

## 6. API Integration Points

### 6.1 Supabase Functions

```typescript
// Registry Operations
supabase.from('registry').select('*')
supabase.from('registry').upsert(entry, { onConflict: 'id' })
supabase.from('registry').delete().eq('id', id)

// Scan Trigger
supabase.functions.invoke('calculate-risk', {
  body: { npi, url, practiceName }
})

// Calendar Operations
supabase.from('calendar_slots').select('*').gte('date', today)
supabase.from('calendar_slots').update({ isBooked: true, bookedBy: data })

// Email Sending
supabase.functions.invoke('sentry-notify', {
  body: { templateId, recipient, variables }
})
```

### 6.2 Edge Function Endpoints

| Function | Purpose |
|----------|---------|
| calculate-risk | Run compliance scan |
| npi-relay | Validate NPI with CMS |
| sentry-notify | Send templated emails |
| generate-report | Create PDF reports |

---

## 7. Implementation Checklist

### Phase 1: Core Registry ✅
- [x] Registry table display with all columns
- [x] Add/Edit/Delete provider functionality
- [x] Search with multiple axes
- [x] Sort by column headers
- [x] Bulk selection and actions
- [x] Visibility toggle for public registry
- [x] CSV export functionality

### Phase 2: Scan Management ✅
- [x] Manual scan trigger per provider
- [x] Bulk scan for selected providers
- [x] Scan history display in detail view
- [x] Risk score visualization
- [x] Compliance status badges

### Phase 3: Calendar System ✅
- [x] 15-minute slot grid display
- [x] Date navigation (14-day window)
- [x] Booking status visualization
- [x] Cancel booking functionality
- [x] Today's bookings counter

### Phase 4: Email Templates ✅
- [x] Template CRUD operations
- [x] Category classification
- [x] Event trigger assignment
- [x] Variable placeholder support
- [x] Active/inactive toggle

### Phase 5: Widget Governance ✅
- [x] Widget status control panel
- [x] Status dropdown per provider
- [x] Embed code generator
- [x] Installation instructions
- [x] Stats by status (active/warning/hidden)

---

## 8. Future Enhancements

### Planned Features
1. **Assets Management Tab**: Image upload, code snippet library
2. **Page Content CMS**: Edit website sections directly
3. **Report Templates**: PDF generation with CTA linking
4. **Bulk NPI Import**: Stream large NPI data files
5. **Global Scan**: Edge function for full registry scan
6. **Audit Logging**: Track all admin actions
7. **Role-Based Access**: Multiple admin permission levels

### Integration Opportunities
- Stripe webhook for subscription sync
- Resend/SendGrid for email delivery
- Puppeteer for PDF generation
- CloudFlare Workers for widget delivery

---

## 9. Deployment Notes

### Environment Variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_PASSWORD=pachavellam_
```

### Build Commands
```bash
npm run build        # Production build
npm run preview      # Preview build locally
```

### Hosting
- **Vercel**: Recommended for Next.js deployment
- **Supabase Functions**: Deploy via CLI
- **Widget CDN**: Serve from CloudFlare R2

---

## 10. Component Code Reference

The complete React implementation is provided in the accompanying `KairoLogic_Admin_Dashboard.jsx` file, which includes:

- Full AdminDashboard component (~1500 lines)
- All tab components (Overview, Registry, Calendar, Templates, Widgets)
- Utility components (Modal, StatusBadge, Notification)
- Mock data generators for testing
- Type-safe patterns throughout

---

**Document Version**: 1.0.0  
**Last Updated**: January 28, 2026  
**Author**: KairoLogic Development Team  
**Classification**: Internal Technical Documentation
