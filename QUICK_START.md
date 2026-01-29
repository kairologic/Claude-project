# KairoLogic Admin v11.0.0 - Quick Start Checklist

## ⚡ 15-Minute Setup Guide

Follow this checklist to get Admin v11.0.0 running in 15 minutes.

---

## ✅ Step 1: Database Setup (5 minutes)

### 1.1 Run Migration SQL

1. Open Supabase Dashboard → Your Project → SQL Editor
2. Click "New Query"
3. Copy content from `sql/kairologic_admin_migration_v11.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Wait for success message

**Verify Success:**
```sql
-- Run this query to verify tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('page_content', 'assets', 'audit_log', 'admin_roles');
```

You should see all 4 tables listed.

---

## ✅ Step 2: Copy Files (3 minutes)

### 2.1 Services
Copy these to `your-project/services/`:
- ✅ `pageContentService.ts`
- ✅ `assetsService.ts`
- ✅ `reportService.ts`

### 2.2 Components
Copy these to `your-project/components/admin/`:
- ✅ `PageContentTab.tsx`
- ✅ `AssetsTab.tsx`
- ✅ `ProviderDetailModal.tsx`

### 2.3 Hooks
Copy these to `your-project/hooks/`:
- ✅ `useCMSContent.tsx`

---

## ✅ Step 3: Add Tabs to Admin (5 minutes)

### 3.1 Import Components

In your main admin file (e.g., `AdminPortal.tsx`):

```tsx
import { PageContentTab } from './admin/PageContentTab';
import { AssetsTab } from './admin/AssetsTab';
import { ProviderDetailModal } from './admin/ProviderDetailModal';
```

### 3.2 Add Tab Definitions

```tsx
const tabs = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'registry', label: 'Registry', icon: <Database size={20} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
  { id: 'templates', label: 'Templates', icon: <Mail size={20} /> },
  // ⬇️ NEW TABS
  { id: 'content', label: 'Page Content', icon: <FileText size={20} /> },
  { id: 'assets', label: 'Assets', icon: <Image size={20} /> },
  // ⬆️ NEW TABS
  { id: 'widgets', label: 'Widgets', icon: <Code size={20} /> }
];
```

### 3.3 Add Tab Rendering

```tsx
// In your tab switcher/renderer:
{activeTab === 'content' && <PageContentTab showNotification={showNotification} />}
{activeTab === 'assets' && <AssetsTab showNotification={showNotification} />}
```

### 3.4 Update Provider Detail Modal

Replace your existing provider detail modal with:

```tsx
{previewEntry && (
  <ProviderDetailModal 
    entry={previewEntry} 
    onClose={() => setPreviewEntry(null)} 
  />
)}
```

---

## ✅ Step 4: Test Features (2 minutes)

### 4.1 Test Page Content CMS

1. Navigate to Admin → Page Content tab
2. Click "New Section"
3. Create a test section:
   - Page: Homepage
   - Section: test_content
   - Content: "Hello World"
4. Click "Create Section"
5. Verify it appears in the list

### 4.2 Test Assets

1. Navigate to Admin → Assets tab
2. Click "New Asset"
3. Create a test code snippet:
   - Name: Test Snippet
   - Type: Code
   - Category: Testing
   - Content: `<div>Test</div>`
4. Click "Create Asset"
5. Click the copy icon - verify clipboard works

### 4.3 Test Reports

1. Navigate to Admin → Registry tab
2. Click on any provider with scan data
3. Verify you see 3 download buttons
4. Click "Download HTML Report"
5. Verify HTML file downloads
6. Open the file - verify it looks professional

---

## ✅ Step 5: Use in Production (Optional)

### 5.1 Use CMS Content in Homepage

In `pages/Homepage.tsx`:

```tsx
import { useCMSContent } from '../hooks/useCMSContent';

const Homepage = () => {
  const title = useCMSContent('Homepage', 'hero_title', 'Sovereign Mandate.');
  
  return <h1>{title}</h1>;
};
```

### 5.2 Edit Content

1. Go to Admin → Page Content
2. Find "Homepage - hero_title"
3. Click Edit
4. Change content to "New Title"
5. Save
6. Refresh homepage - see new title instantly!

---

## 🎯 Success Criteria

You've successfully installed v11.0.0 if:

- ✅ Page Content tab shows pre-seeded content
- ✅ Assets tab shows 3 pre-seeded code snippets
- ✅ Can create new page content sections
- ✅ Can create new assets
- ✅ Can copy code snippets to clipboard
- ✅ Provider detail modal shows download buttons
- ✅ HTML reports download and display correctly
- ✅ CMS content displays on public pages

---

## 🐛 Troubleshooting

### Issue: "Table does not exist"
**Fix**: Migration didn't run. Go back to Step 1.

### Issue: "Cannot find module"
**Fix**: Files not copied correctly. Check Step 2.

### Issue: "Tabs not showing"
**Fix**: Check imports and tab configuration in Step 3.

### Issue: "Content not updating"
**Fix**: 
1. Check Supabase connection
2. Verify RLS policies are set
3. Check browser console for errors

### Issue: "Copy button doesn't work"
**Fix**: Must be on HTTPS. Clipboard API requires secure context.

---

## 📚 Next Steps

Once basic setup works:

1. **Read Documentation**
   - `/docs/PAGE_CONTENT_CMS_GUIDE.md` - CMS usage
   - `/docs/OPTIONS_2_3_IMPLEMENTATION_GUIDE.md` - Assets & Reports

2. **Customize**
   - Add custom page content sections
   - Create client-specific assets
   - Customize report templates

3. **Train Team**
   - Show admins how to edit page content
   - Demonstrate asset management
   - Practice generating reports

---

## 🎉 Congratulations!

You've successfully installed KairoLogic Admin v11.0.0!

**What You Can Do Now:**
- ✅ Edit website text without code deployment
- ✅ Store and manage compliance code snippets
- ✅ Generate professional reports with technical fixes
- ✅ Download reports in 3 formats
- ✅ Manage all your compliance content in one place

**Total Setup Time**: ~15 minutes  
**Production Ready**: Yes ✅  
**Support**: See `/docs` folder for detailed guides

---

**Need Help?**  
Check the main `README.md` or documentation in `/docs` folder.

**Version**: 11.0.0  
**Status**: Production Ready  
**Updated**: January 29, 2026
