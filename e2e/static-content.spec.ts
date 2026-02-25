import { test, expect } from '@playwright/test';

/**
 * Static Content Tests
 *
 * Verifies that every public page renders its expected headings, key text,
 * and structural elements. A failure here means page content was removed or
 * changed unexpectedly after a git update.
 */

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------
test.describe('Homepage – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders primary headline', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /healthcare website.*breaking texas law/i })
    ).toBeVisible();
  });

  test('renders key compliance warning text', async ({ page }) => {
    await expect(
      page.getByText(/fines up to \$50,000 per violation/i)
    ).toBeVisible();
  });

  test('renders "Why Most Healthcare Websites Fail" section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /why most healthcare websites fail/i })
    ).toBeVisible();
  });

  test('renders "Three Steps to Compliance" section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /three steps to compliance/i })
    ).toBeVisible();
  });

  test('renders pricing section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /simple, transparent pricing/i })
    ).toBeVisible();
  });

  test('renders three pricing tiers', async ({ page }) => {
    await expect(page.getByText(/\$149\/report/i)).toBeVisible();
    await expect(page.getByText(/\$249\/bundle/i)).toBeVisible();
    await expect(page.getByText(/\$79\/month/i)).toBeVisible();
  });

  test('renders "Built for Texas Healthcare" section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /built for texas healthcare/i })
    ).toBeVisible();
  });

  test('renders final CTA section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /don.t wait for a regulator/i })
    ).toBeVisible();
  });

  test('renders scan CTA button', async ({ page }) => {
    const ctaButtons = page.getByRole('link', { name: /scan my website/i });
    await expect(ctaButtons.first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Compliance Page
// ---------------------------------------------------------------------------
test.describe('Compliance page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compliance');
  });

  test('renders hero heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /sentry compliance standard/i })
    ).toBeVisible();
  });

  test('renders STATUTORY VANGUARD badge', async ({ page }) => {
    await expect(page.getByText(/statutory vanguard/i)).toBeVisible();
  });

  test('renders SB 1188 legislation card', async ({ page }) => {
    await expect(page.getByText(/SB 1188/)).toBeVisible();
    await expect(page.getByText(/data sovereignty/i)).toBeVisible();
  });

  test('renders HB 149 legislation card', async ({ page }) => {
    await expect(page.getByText(/HB 149/)).toBeVisible();
    await expect(page.getByText(/ai transparency/i)).toBeVisible();
  });

  test('renders enforcement timeline', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /enforcement timeline/i })
    ).toBeVisible();
  });

  test('renders compliance scan CTA', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /run compliance scan/i })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Services Page
// ---------------------------------------------------------------------------
test.describe('Services page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services');
  });

  test('renders main heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /your compliance.*handled/i })
    ).toBeVisible();
  });

  test('renders Free Scan tier', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /free compliance scan/i })
    ).toBeVisible();
  });

  test('renders Audit Report tier', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /sovereignty audit report/i })
    ).toBeVisible();
  });

  test('renders Safe Harbor tier', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /safe harbor.*bundle/i })
    ).toBeVisible();
  });

  test('renders Sentry Shield tier', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /sentry shield/i })
    ).toBeVisible();
  });

  test('renders verification matrix', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /verification matrix/i })
    ).toBeVisible();
  });

  test('renders FAQ section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /common questions/i })
    ).toBeVisible();
  });

  test('renders all FAQ questions', async ({ page }) => {
    const faqs = [
      /why do i need the report if the scan is free/i,
      /why do i need safe harbor/i,
      /what happens after the 3-month/i,
      /is sentry shield worth/i,
      /can i just fix things once/i,
      /what if i don.t have a web developer/i,
    ];
    for (const faq of faqs) {
      await expect(page.getByText(faq)).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Contact Page
// ---------------------------------------------------------------------------
test.describe('Contact page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('renders page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /contact.*briefing/i })
    ).toBeVisible();
  });

  test('renders hub details', async ({ page }) => {
    await expect(page.getByText(/compliance@kairologic\.net/i)).toBeVisible();
    await expect(page.getByText(/\(512\) 402-2237/)).toBeVisible();
    await expect(page.getByText(/austin, tx/i)).toBeVisible();
  });

  test('renders contact form fields', async ({ page }) => {
    await expect(page.getByLabel(/contact name/i)).toBeVisible();
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expect(page.getByLabel(/practice name/i)).toBeVisible();
    await expect(page.getByLabel(/subject/i)).toBeVisible();
    await expect(page.getByLabel(/narrative/i)).toBeVisible();
  });

  test('renders remediation alert card', async ({ page }) => {
    await expect(page.getByText(/cure notice/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scan Page
// ---------------------------------------------------------------------------
test.describe('Scan page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scan');
  });

  test('renders scanner heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /texas healthcare compliance scanner/i })
    ).toBeVisible();
  });

  test('renders compliance subtitle', async ({ page }) => {
    await expect(
      page.getByText(/SB.?1188.*HB.?149.*compliance/i)
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Terms of Service Page
// ---------------------------------------------------------------------------
test.describe('Terms page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/terms');
  });

  test('renders page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /terms of service/i })
    ).toBeVisible();
  });

  test('renders all required sections', async ({ page }) => {
    const sections = [
      /acceptance of terms/i,
      /services provided/i,
      /user responsibilities/i,
      /limitation of liability/i,
      /payment terms/i,
      /intellectual property/i,
      /termination/i,
      /governing law/i,
      /changes to terms/i,
      /contact/i,
    ];
    for (const heading of sections) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Privacy Policy Page
// ---------------------------------------------------------------------------
test.describe('Privacy page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy');
  });

  test('renders page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /privacy policy/i })
    ).toBeVisible();
  });

  test('renders all required sections', async ({ page }) => {
    const sections = [
      /information we collect/i,
      /how we use your information/i,
      /data storage.*security/i,
      /data sharing/i,
      /your rights/i,
      /contact us/i,
    ];
    for (const heading of sections) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Registry Page
// ---------------------------------------------------------------------------
test.describe('Registry page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registry');
  });

  test('renders registry heading', async ({ page }) => {
    await expect(
      page.getByText(/texas healthcare compliance registry/i)
    ).toBeVisible();
  });

  test('renders search box', async ({ page }) => {
    await expect(
      page.getByPlaceholder(/search by name.*city.*zip.*npi/i)
    ).toBeVisible();
  });

  test('renders city filter tabs', async ({ page }) => {
    await expect(page.getByText(/all regions/i)).toBeVisible();
    await expect(page.getByText(/austin/i)).toBeVisible();
    await expect(page.getByText(/houston/i)).toBeVisible();
    await expect(page.getByText(/dallas/i)).toBeVisible();
    await expect(page.getByText(/san antonio/i)).toBeVisible();
  });

  test('renders legal disclaimer', async ({ page }) => {
    await expect(
      page.getByText(/public-interest disclosure/i)
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Patients Page
// ---------------------------------------------------------------------------
test.describe('Patients page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients');
  });

  test('renders main heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /is your provider compliant/i })
    ).toBeVisible();
  });

  test('renders "Your Data, Your Rights" section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /your data, your rights/i })
    ).toBeVisible();
  });

  test('renders three rights cards', async ({ page }) => {
    await expect(page.getByText(/data stays in the us/i)).toBeVisible();
    await expect(page.getByText(/ai must be disclosed/i)).toBeVisible();
    await expect(page.getByText(/proper security/i)).toBeVisible();
  });

  test('renders "3 Questions to Ask" section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /3 questions to ask/i })
    ).toBeVisible();
  });

  test('renders quick check input', async ({ page }) => {
    await expect(
      page.getByPlaceholder(/hillcountryfamilymed/i)
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Insights Page
// ---------------------------------------------------------------------------
test.describe('Insights page – static content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/insights');
  });

  test('renders article cards', async ({ page }) => {
    const titles = [
      /is your patient data leaving the country/i,
      /is your website hiding what patients need to know/i,
      /\$250,000 texas compliance risk/i,
      /med spas/i,
      /complaint handling.*digital records/i,
    ];
    for (const title of titles) {
      await expect(page.getByText(title).first()).toBeVisible();
    }
  });

  test('renders article categories', async ({ page }) => {
    await expect(page.getByText(/data sovereignty/i).first()).toBeVisible();
    await expect(page.getByText(/ai transparency/i).first()).toBeVisible();
  });
});
