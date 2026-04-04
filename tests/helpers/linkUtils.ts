/**
 * Link utilities for KairoLogic deep QA tests.
 * Collects, classifies, and validates links on a page.
 */

import { type Page, expect } from '@playwright/test';

export interface LinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
  isAnchor: boolean;
  isExternal: boolean;
  isMail: boolean;
  isTel: boolean;
}

/** Collect all <a> elements with their href and visible text. */
export async function collectAllLinks(page: Page): Promise<LinkInfo[]> {
  return page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => {
      const href = a.getAttribute('href') || '';
      return {
        href,
        text: (a.textContent || '').trim().slice(0, 80),
        isInternal: href.startsWith('/') && !href.startsWith('//'),
        isAnchor: href.startsWith('#'),
        isExternal: href.startsWith('http'),
        isMail: href.startsWith('mailto:'),
        isTel: href.startsWith('tel:'),
      };
    }),
  );
}

/** Filter to only internal links, deduped and cleaned of hash/query. */
export function getUniqueInternalLinks(links: LinkInfo[]): string[] {
  const cleaned = links
    .filter((l) => l.isInternal)
    .map((l) => l.href.split('#')[0].split('?')[0])
    .filter((href) => href.length > 0);
  return [...new Set(cleaned)];
}

/** Validate that an internal link returns a non-error HTTP status. */
export async function assertLinkResolves(
  page: Page,
  href: string,
  baseURL: string,
  sourcePage: string,
): Promise<{ href: string; status: number; ok: boolean }> {
  const response = await page.request.get(`${baseURL}${href}`);
  const status = response.status();
  expect
    .soft(status, `Broken link: ${href} (found on ${sourcePage})`)
    .toBeLessThan(400);
  return { href, status, ok: status < 400 };
}

/** Collect all visible links and navigate each, asserting no errors. */
export async function crawlAndValidateLinks(
  page: Page,
  baseURL: string,
  sourcePath: string,
  visited: Set<string>,
): Promise<{ total: number; broken: string[] }> {
  const links = await collectAllLinks(page);
  const internal = getUniqueInternalLinks(links).filter((l) => !visited.has(l));
  const broken: string[] = [];

  for (const href of internal) {
    visited.add(href);
    const result = await assertLinkResolves(page, href, baseURL, sourcePath);
    if (!result.ok) broken.push(href);
  }

  return { total: internal.length, broken };
}

/** Check for bad href patterns (empty, javascript:, etc). */
export async function findBadHrefs(page: Page): Promise<{ href: string; text: string }[]> {
  return page.$$eval('a[href]', (anchors) =>
    anchors
      .map((a) => ({
        href: a.getAttribute('href') || '',
        text: (a.textContent || '').trim().slice(0, 60),
      }))
      .filter(({ href }) => href === '' || href === '#' || href.startsWith('javascript:')),
  );
}
