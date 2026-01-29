# Page Content CMS - Usage Guide

## Overview

The Page Content CMS allows you to edit website text without code deployment. Changes sync instantly to production through the Supabase database.

## Features

- ✅ Edit any website text from the admin dashboard
- ✅ Multiple content types (text, HTML, markdown, JSON, image URLs)
- ✅ Instant production sync - no deployment needed
- ✅ Page grouping and search functionality
- ✅ Version tracking with timestamps
- ✅ Easy integration with React hooks

---

## Admin Interface Usage

### Accessing the CMS

1. Navigate to Admin Dashboard → **Page Content** tab
2. Filter by page or search for specific sections
3. Click **Edit** on any section to modify content
4. Click **New Section** to create new content

### Creating a Content Section

1. Click **New Section** button
2. Fill in the form:
   - **Page**: Select the page (Homepage, Services, etc.)
   - **Section Identifier**: Unique key (e.g., `hero_title`, `tier1_price`)
   - **Content Type**: text, HTML, markdown, JSON, or image URL
   - **Content**: The actual text/HTML/etc.
   - **Admin Note**: Optional description for your reference
3. Click **Create Section**

### Editing Content

1. Find the section you want to edit
2. Click the **Edit** button (pencil icon)
3. Modify the content
4. Click **Save Changes**

### Deleting Content

1. Find the section to delete
2. Click the **Delete** button (trash icon)
3. Confirm deletion

---

## Developer Usage

### 1. Simple Text Content

Use the `useCMSContent` hook for simple text:

```tsx
import { useCMSContent } from '../hooks/useCMSContent';

const HeroSection = () => {
  const title = useCMSContent('Homepage', 'hero_title', 'Sovereign Mandate.');
  const subtitle = useCMSContent('Homepage', 'hero_subtitle', 'Default subtitle');

  return (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
};
```

### 2. Entire Page Content

Load all sections for a page at once:

```tsx
import { usePageCMS } from '../hooks/useCMSContent';

const Homepage = () => {
  const { content, isLoading } = usePageCMS('Homepage');

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{content.hero_title || 'Default Title'}</h1>
      <p>{content.hero_subtitle}</p>
      <button>{content.hero_cta_primary || 'Get Started'}</button>
    </div>
  );
};
```

### 3. Using Helper Components

For simple cases, use the helper components:

```tsx
import { CMSText, CMSHtml } from '../hooks/useCMSContent';

const PricingSection = () => (
  <div>
    <h2>
      <CMSText page="Services" section="tier1_name" fallback="Basic Plan" />
    </h2>
    <div className="price">
      $<CMSText page="Services" section="tier1_price" fallback="299" />
    </div>
    <CMSHtml 
      page="Services" 
      section="tier1_description" 
      className="description"
    />
  </div>
);
```

### 4. HTML Content

For rich content with HTML:

```tsx
import { useCMSSection } from '../hooks/useCMSContent';

const AnnouncementBanner = () => {
  const { content, contentType } = useCMSSection('Homepage', 'announcement_html');

  if (contentType === 'html') {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return <p>{content}</p>;
};
```

### 5. JSON Content

Store structured data as JSON:

```tsx
const PricingTiers = () => {
  const { content } = useCMSSection('Services', 'pricing_tiers');
  
  try {
    const tiers = JSON.parse(content);
    return (
      <div>
        {tiers.map(tier => (
          <div key={tier.id}>
            <h3>{tier.name}</h3>
            <p>${tier.price}</p>
          </div>
        ))}
      </div>
    );
  } catch (e) {
    return null;
  }
};
```

---

## Common Section Naming Patterns

### Homepage Sections
- `hero_title` - Main headline
- `hero_subtitle` - Subheadline
- `hero_cta_primary` - Primary button text
- `hero_cta_secondary` - Secondary button text
- `stats_providers` - Provider count stat
- `stats_scans` - Scans performed stat
- `announcement_text` - Site-wide announcement

### Services/Pricing Sections
- `tier1_name` - Free/Basic tier name
- `tier1_price` - Tier 1 price
- `tier1_description` - Tier 1 description
- `tier2_name` - Premium tier name
- `tier2_price` - Tier 2 price
- `tier2_description` - Tier 2 description

### Compliance Sections
- `sb1188_title` - SB 1188 section title
- `sb1188_summary` - SB 1188 summary text
- `hb149_title` - HB 149 section title
- `hb149_summary` - HB 149 summary text

### Contact Sections
- `contact_email` - Contact email address
- `contact_phone` - Contact phone number
- `office_hours` - Business hours text
- `office_address` - Physical address

---

## Database Schema

The `page_content` table has the following structure:

```sql
CREATE TABLE page_content (
    id TEXT PRIMARY KEY,
    page TEXT NOT NULL,              -- e.g., 'Homepage'
    section TEXT NOT NULL,            -- e.g., 'hero_title'
    content TEXT NOT NULL,            -- The actual content
    content_type TEXT DEFAULT 'text', -- 'text', 'html', 'json', 'markdown', 'image_url'
    description TEXT,                 -- Admin note
    last_updated TIMESTAMPTZ,         -- Auto timestamp
    updated_by TEXT,                  -- Admin user
    UNIQUE(page, section)
);
```

---

## Migration SQL

To set up the page_content table with initial data, run this in Supabase SQL Editor:

```sql
-- Create the table
CREATE TABLE IF NOT EXISTS public.page_content (
    id TEXT PRIMARY KEY DEFAULT ('PG-' || gen_random_uuid()::text),
    page TEXT NOT NULL,
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'json', 'markdown', 'image_url')),
    description TEXT,
    last_updated TIMESTAMPTZ DEFAULT now(),
    updated_by TEXT,
    UNIQUE(page, section)
);

-- Enable RLS
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Page content is publicly readable" ON public.page_content
    FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Page content is editable by service role" ON public.page_content
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed initial content
INSERT INTO public.page_content (page, section, content, content_type, description) VALUES
-- Homepage
('Homepage', 'hero_title', 'Sovereign Mandate.', 'text', 'Main hero headline'),
('Homepage', 'hero_subtitle', 'SB 1188 and HB 149 are now law. Texas healthcare data must stay in Texas.', 'text', 'Hero subheadline'),
('Homepage', 'hero_cta_primary', 'Run Free Compliance Scan', 'text', 'Primary CTA button'),
('Homepage', 'stats_providers', '487', 'text', 'Number of providers in registry'),
('Homepage', 'stats_scans', '12,847', 'text', 'Total scans performed'),

-- Services
('Services', 'tier1_name', 'Sentry Scan', 'text', 'Free tier name'),
('Services', 'tier1_price', '0', 'text', 'Free tier price'),
('Services', 'tier2_name', 'Sentry Shield', 'text', 'Paid tier name'),
('Services', 'tier2_price', '299', 'text', 'Monthly price'),

-- Compliance
('Compliance', 'sb1188_title', 'Senate Bill 1188', 'text', 'SB 1188 section title'),
('Compliance', 'hb149_title', 'House Bill 149', 'text', 'HB 149 section title'),

-- Contact
('Contact', 'contact_email', 'support@kairologic.com', 'text', 'Support email'),
('Contact', 'office_hours', 'Monday - Friday, 9AM - 5PM CST', 'text', 'Business hours')
ON CONFLICT (page, section) DO NOTHING;
```

---

## Best Practices

### 1. Section Naming
- Use lowercase with underscores: `hero_title`, `tier1_price`
- Be descriptive: `contact_email` not `email`
- Group related sections: `tier1_name`, `tier1_price`, `tier1_description`

### 2. Content Types
- **text**: Simple strings, numbers, short text
- **html**: Rich formatted content with tags
- **markdown**: Longer content that needs formatting
- **json**: Structured data (arrays, objects)
- **image_url**: CDN or Supabase Storage URLs

### 3. Fallbacks
Always provide fallback values in case CMS content isn't loaded:
```tsx
const title = useCMSContent('Homepage', 'hero_title', 'Default Title');
```

### 4. Loading States
Handle loading states for better UX:
```tsx
const { content, isLoading } = usePageCMS('Homepage');
if (isLoading) return <Skeleton />;
```

### 5. Admin Notes
Use the description field to document what each section is for:
```
"Main headline that appears on homepage hero section"
```

---

## Performance Tips

1. **Use usePageCMS for multiple sections** - Fetches all page content in one query
2. **Cache at the component level** - React hooks cache automatically
3. **Consider static generation** - For frequently accessed content
4. **Minimize HTML content** - Large HTML blocks slow down the admin interface

---

## Troubleshooting

### Content Not Updating
1. Check browser console for errors
2. Verify Supabase connection in admin dashboard
3. Check RLS policies are set correctly
4. Clear browser cache

### Content Not Showing
1. Verify the page and section names match exactly
2. Check for typos in section identifiers
3. Ensure fallback values are provided
4. Check browser console for fetch errors

### Permission Errors
1. Verify RLS policies are enabled
2. Check service_role has write access
3. Confirm anon key has read access

---

## Future Enhancements

- [ ] Content versioning and rollback
- [ ] Multi-language support
- [ ] Image upload with Supabase Storage
- [ ] Scheduled content publishing
- [ ] A/B testing for content variants
- [ ] Content preview before publishing
- [ ] Audit log for content changes

---

**Version**: 11.0.0  
**Last Updated**: January 29, 2026  
**Author**: KairoLogic Development Team
