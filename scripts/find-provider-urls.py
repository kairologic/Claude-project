#!/usr/bin/env python3
"""
find-provider-urls.py

Uses the Serper Places API to find practice website URLs for providers
that don't have URLs in practice_websites yet.

Queries: org_name + city + state → Serper Places → website URL
Inserts found URLs into practice_websites.

Usage:
  python scripts/find-provider-urls.py --state CA --limit 100 --dry-run
  python scripts/find-provider-urls.py --state CA --limit 49000
  python scripts/find-provider-urls.py --state TX --limit 6000

Requires: pip install requests
"""

import sys
import os
import json
import time
import requests
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
SERPER_API_KEY = os.environ.get('SERPER_API_KEY', '')
BATCH_SIZE = 100

# Load blocked domains from shared JSON (single source of truth with TS blocklist).
# Falls back to a minimal hardcoded list if the JSON hasn't been generated yet.
def _load_blocked_domains():
    json_path = os.path.join(os.path.dirname(__file__), '..', 'shared', 'blocked-domains.json')
    try:
        with open(json_path, 'r') as f:
            domains = json.load(f)
            print(f"  Loaded {len(domains)} blocked domains from shared/blocked-domains.json")
            return domains
    except FileNotFoundError:
        print("  [WARN] shared/blocked-domains.json not found — run: npm run export-blocklist")
        print("  Using minimal fallback blocklist.")
        return [
            'facebook.com', 'yelp.com', 'healthgrades.com', 'zocdoc.com',
            'vitals.com', 'doximity.com', 'npidb.org', 'webmd.com',
            'yellowpages.com', 'linkedin.com', 'twitter.com', 'instagram.com',
            'google.com', 'walmart.com', 'cvs.com', 'walgreens.com',
        ]

SKIP_DOMAINS = _load_blocked_domains()

def db_get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    resp = requests.get(url, headers=headers)
    if resp.status_code >= 400:
        raise Exception(f"DB GET error: {resp.status_code} {resp.text[:200]}")
    return resp.json()

def db_upsert(rows):
    """Insert rows into practice_websites, skipping duplicates on url."""
    url = f"{SUPABASE_URL}/rest/v1/practice_websites?on_conflict=url"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
    }
    resp = requests.post(url, headers=headers, json=rows)
    if resp.status_code >= 400:
        error_text = resp.text[:200]
        if '23505' not in error_text:
            raise Exception(f"DB POST error: {resp.status_code} {error_text}")
    return resp.status_code

def is_valid_url(url):
    """Filter out directory listings and non-practice URLs.
    Uses exact domain + subdomain matching (same logic as TS isBlockedDomain)."""
    if not url:
        return False
    url_lower = url.lower()
    if not url_lower.startswith('http'):
        return False
    try:
        from urllib.parse import urlparse
        hostname = urlparse(url_lower).hostname or ''
        hostname = hostname.lstrip('www.')
        for domain in SKIP_DOMAINS:
            if hostname == domain or hostname.endswith('.' + domain):
                return False
    except Exception:
        pass
    return True

def search_serper_places(query):
    """Call Serper Places API and return the top result with website."""
    url = 'https://google.serper.dev/places'
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
    }
    payload = {'q': query}

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code == 429:
            # Rate limited — wait and retry
            time.sleep(2)
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code != 200:
            return None
        data = resp.json()
        places = data.get('places', [])
        if not places:
            return None

        # Return first result with a valid website
        for place in places[:3]:
            website = place.get('website')
            if is_valid_url(website):
                return {
                    'url': website,
                    'name': place.get('title', ''),
                    'address': place.get('address', ''),
                    'phone': place.get('phoneNumber', ''),
                    'rating': place.get('rating'),
                }
        return None
    except Exception as e:
        return None

def main():
    args = sys.argv[1:]
    dry_run = '--dry-run' in args
    state = 'CA'
    limit = 100
    offset = 0

    for i, a in enumerate(args):
        if a == '--state' and i + 1 < len(args):
            state = args[i + 1].upper()
        if a == '--limit' and i + 1 < len(args):
            limit = int(args[i + 1])
        if a == '--offset' and i + 1 < len(args):
            offset = int(args[i + 1])

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    if not SERPER_API_KEY:
        print("[FATAL] Missing SERPER_API_KEY")
        print("Set in .env.local or: $env:SERPER_API_KEY='your-key'")
        sys.exit(1)

    print("=" * 55)
    print("  KairoLogic — Provider URL Finder")
    print("  Serper Places API → practice_websites")
    print("=" * 55)
    print(f"  State:     {state}")
    print(f"  Limit:     {limit}")
    print(f"  Offset:    {offset}")
    print(f"  Dry run:   {dry_run}")
    print()

    # ── Step 1: Get providers without URLs ──
    print("[1/3] Finding providers without practice URLs...")

    # Get Type 2 orgs in target state that DON'T have a practice_website yet
    all_orgs = []
    page_size = 1000
    page_offset = offset

    while len(all_orgs) < limit:
        fetch_size = min(page_size, limit - len(all_orgs))
        orgs = db_get(
            f"providers?entity_type_code=eq.2&state=eq.{state}"
            f"&deactivation_date=is.null"
            f"&organization_name=not.is.null"
            f"&city=not.is.null"
            f"&select=npi,organization_name,city,state,zip_code"
            f"&order=npi.asc"
            f"&limit={fetch_size}&offset={page_offset}"
        )
        if not orgs:
            break

        # Filter out orgs that already have a practice_website
        npi_list = ','.join(f'"{o["npi"]}"' for o in orgs)
        existing = set()
        try:
            existing_rows = db_get(
                f"practice_websites?npi=in.({npi_list})&select=npi"
            )
            existing = set(r['npi'] for r in existing_rows)
        except:
            pass

        for org in orgs:
            if org['npi'] not in existing:
                all_orgs.append(org)

        page_offset += page_size
        if len(orgs) < fetch_size:
            break

    print(f"  Found {len(all_orgs)} providers without URLs")

    if not all_orgs:
        print("  Nothing to search. All providers have URLs.")
        return

    # ── Step 2: Search Serper Places API ──
    print(f"\n[2/3] Searching Serper Places API...")

    found = []
    not_found = 0
    errors = 0
    credits_used = 0
    total_flushed = 0

    for i, org in enumerate(all_orgs):
        name = org['organization_name']
        city = org['city']
        st = org['state']

        # Build search query
        query = f"{name} {city} {st}"
        credits_used += 1

        if not dry_run:
            result = search_serper_places(query)
        else:
            result = None  # Don't burn credits on dry run

        if result:
            found.append({
                'npi': org['npi'],
                'name': name,
                'url': result['url'],
                'state': st,
                'city': city,
                'scan_tier': 'monthly',
                'scan_status': 'pending',
            })

            # Flush every 200 found URLs
            if len(found) >= 200 and not dry_run:
                try:
                    db_upsert(found)
                    total_flushed += len(found)
                    print(f"  >> Flushed {len(found)} URLs to DB (total flushed: {total_flushed})")
                except Exception as e:
                    print(f"  >> Flush error: {e}")
                found = []
        else:
            not_found += 1

        # Progress
        processed = i + 1
        if processed % 50 == 0 or processed == len(all_orgs):
            print(f"  Searched: {processed}/{len(all_orgs)}, "
                  f"found: {len(found)}, "
                  f"not found: {not_found}, "
                  f"credits used: {credits_used}")

        # Rate limiting: ~5 requests per second
        if not dry_run and processed % 5 == 0:
            time.sleep(0.2)

    total_found = total_flushed + len(found)
    print(f"\n  Total URLs found: {total_found}")
    print(f"  Already flushed:  {total_flushed}")
    print(f"  Remaining:        {len(found)}")
    print(f"  Not found:        {not_found}")
    print(f"  Credits used:     {credits_used}")

    # ── Step 3: Insert remaining into practice_websites ──
    if dry_run:
        print(f"\n[3/3] DRY RUN — would insert {total_found} practice websites")
        if found:
            print(f"\n  Sample (first 5):")
            for f in found[:5]:
                print(f"    {f['name'][:40]:<40} → {f['url']}")
    else:
        if found:
            print(f"\n[3/3] Inserting remaining {len(found)} practice websites...")
            try:
                db_upsert(found)
                total_flushed += len(found)
                print(f"  Complete: {len(found)} inserted")
            except Exception as e:
                print(f"  Error: {e}")
        else:
            print(f"\n[3/3] All URLs already flushed during search.")

    print("\n" + "=" * 55)
    print(f"  URL finder complete")
    print(f"  Total URLs sent to DB: {total_flushed}")
    if dry_run:
        print("  (DRY RUN — no API calls made, no data written)")
    print("=" * 55)

if __name__ == '__main__':
    main()
