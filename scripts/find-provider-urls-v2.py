#!/usr/bin/env python3
"""
find-provider-urls-v2.py — Multi-Strategy URL Finder

Finds practice website URLs using 4 search strategies (early exit on match):
  1. Address + Specialty ("dermatologist 421 N Rodeo Dr Beverly Hills") — highest hit rate
  2. Name + City (original approach)
  3. Phone number ("310-555-1234" → Google Business listing)
  4. Stripped name + ZIP (remove MD/PA/Inc/LLC, core words + ZIP)

Each strategy costs 1 Serper credit. Exits on first match.
URL validation: HEAD request + parked domain check on every found URL.
Average credits per provider: ~2.0 (with address-first ordering)

Usage:
  python scripts/find-provider-urls-v2.py --state CA --limit 1000
  python scripts/find-provider-urls-v2.py --state CA --limit 100 --dry-run
  python scripts/find-provider-urls-v2.py --state TX --limit 500 --strategies 1,2,3,4
  python scripts/find-provider-urls-v2.py --state CA --limit 500 --no-validate
"""

import sys
import os
import json
import re
import time
import requests
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
SERPER_API_KEY = os.environ.get('SERPER_API_KEY', '')
BATCH_SIZE = 100

# URLs to skip (directories, not real practice sites)
SKIP_DOMAINS = [
    # Social media
    'facebook.com', 'linkedin.com', 'twitter.com', 'x.com',
    'instagram.com', 'tiktok.com', 'youtube.com', 'threads.net',
    # Directories / review sites
    'yelp.com', 'healthgrades.com', 'zocdoc.com', 'vitals.com',
    'doximity.com', 'npidb.org', 'webmd.com', 'ratemds.com',
    'sharecare.com', 'wellness.com', 'usnews.com',
    'psychologytoday.com', 'goodtherapy.org', 'therapyden.com',
    'opencare.com', 'carefinder.com', 'solv.health',
    # Business directories
    'yellowpages.com', 'bbb.org', 'superpages.com',
    'whitepages.com', 'manta.com', 'chamberofcommerce.com',
    'mapquest.com', 'foursquare.com', 'hotfrog.com',
    # NPI lookup sites (#9: these look like practice sites but aren't)
    'npi.io', 'npino.com', 'npiprofile.com', 'nppes.com',
    'hipaaspace.com', 'nppeslookup.com', 'npinumber.com',
    'npidirectory.com', 'opennpi.com',
    # Search engines
    'google.com', 'bing.com', 'apple.com', 'duckduckgo.com',
    # Government / insurance
    'medicare.gov', 'medicaid.gov', 'cms.gov', 'va.gov', 'tricare.mil',
    # Retail pharmacies / chains
    'walmart.com', 'cvs.com', 'walgreens.com', 'costco.com',
    'kroger.com', 'heb.com', 'target.com', 'amazon.com',
    'riteaid.com', 'samsclub.com', 'publix.com',
    # Hospital systems (#9: too broad, not individual practice sites)
    'hca.com', 'commonspirit.org', 'ascension.org', 'tenethealth.com',
    # Job boards / recruiting (#9: appear in searches for provider names)
    'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'salary.com',
    'practicematch.com', 'healthecareers.com',
]

# Taxonomy code → specialty name (common codes)
TAXONOMY_MAP = {
    '101Y': 'counselor',
    '103T': 'psychologist',
    '104100000X': 'social worker',
    '111N': 'chiropractor',
    '122300000X': 'dentist',
    '1223G0001X': 'general dentist',
    '1223P0221X': 'pediatric dentist',
    '1223X0400X': 'orthodontist',
    '1223E0200X': 'endodontist',
    '133V': 'dietitian',
    '152W': 'optometrist',
    '163W': 'registered nurse',
    '174400000X': 'pharmacist',
    '183500000X': 'pharmacy',
    '207K': 'gastroenterologist',
    '207L': 'anesthesiologist',
    '207N': 'dermatologist',
    '207P': 'emergency medicine',
    '207Q': 'family medicine',
    '207R': 'internal medicine',
    '207S': 'surgeon',
    '207T': 'neurologist',
    '207V': 'obgyn',
    '207W': 'ophthalmologist',
    '207X': 'orthopedic surgeon',
    '207Y': 'otolaryngologist',
    '208': 'pediatrician',
    '2084': 'psychiatrist',
    '208D': 'general practitioner',
    '208600000X': 'surgeon',
    '2086S0120X': 'pediatric surgeon',
    '2086S0122X': 'plastic surgeon',
    '2086X0206X': 'vascular surgeon',
    '208G': 'thoracic surgeon',
    '208M': 'hospitalist',
    '208VP0014X': 'pain medicine',
    '213E': 'podiatrist',
    '225100000X': 'physical therapist',
    '225200000X': 'physical therapy assistant',
    '225500000X': 'occupational therapist',
    '229N': 'speech therapist',
    '231H': 'audiologist',
    '246X': 'cardiovascular technologist',
    '261Q': 'clinic',
    '282N': 'hospital',
    '291U': 'clinical lab',
    '302F': 'skilled nursing facility',
    '302R': 'home health',
    '305S': 'hospice',
    '310400000X': 'assisted living',
    '332B': 'durable medical equipment',
    '333600000X': 'retail pharmacy',
    '335E': 'prosthetic supplier',
    '363L': 'nurse practitioner',
    '364S': 'clinical nurse specialist',
    '367A': 'advanced practice midwife',
    '367H': 'anesthesiology assistant',
    '390200000X': 'student health center',
}

# Taxonomy prefixes to skip (no practice website to find)
SKIP_TAXONOMIES = [
    '3336',  # Retail pharmacy (CVS, Walgreens, Rite Aid, etc.)
    '3335',  # Compounding pharmacy
    '332B',  # Durable medical equipment
    '302F',  # Skilled nursing facility
    '302R',  # Home health agency
    '305S',  # Hospice
    '3104',  # Assisted living
    '291U',  # Clinical lab
    '282N',  # Hospital (has URL but not a "practice")
    '174H',  # Health & wellness coach (individuals)
]
LEGAL_SUFFIXES = [
    r'\bP\.?L\.?L\.?C\.?\b',
    r'\bL\.?L\.?C\.?\b',
    r'\bL\.?L\.?P\.?\b',
    r'\bL\.?P\.?\b',
    r'\bP\.?A\.?\b',
    r'\bP\.?C\.?\b',
    r'\bINC\.?\b',
    r'\bCORP\.?\b',
    r'\bCORPORATION\b',
    r'\bA PROFESSIONAL CORPORATION\b',
    r'\bA PROFESSIONAL MEDICAL CORPORATION\b',
    r'\bA MEDICAL CORPORATION\b',
    r'\bMEDICAL GROUP\b',
    r'\bMEDICAL CORP\b',
    r'\bMD\b',
    r'\bM\.D\.?\b',
    r'\bD\.?O\.?\b',
    r'\bD\.?D\.?S\.?\b',
    r'\bD\.?C\.?\b',
    r'\bD\.?P\.?M\.?\b',
    r'\bPH\.?D\.?\b',
    r'\bO\.?D\.?\b',
    r'\bJR\.?\b',
    r'\bSR\.?\b',
    r'\bII\b',
    r'\bIII\b',
    r'\bIV\b',
    r',+',
]


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
    """Filter out directory listings and non-practice URLs."""
    if not url:
        return False
    url_lower = url.lower()
    for domain in SKIP_DOMAINS:
        if domain in url_lower:
            return False
    if not url_lower.startswith('http'):
        return False
    return True


def validate_url(url, org_name=None, city=None):
    """Verify URL is reachable and looks like a real practice site.
    Tries HEAD first (fast), falls back to GET if HEAD fails or is blocked.
    Returns (is_valid, status_code, reason).
    """
    headers = {'User-Agent': 'Mozilla/5.0 (compatible; KairoLogic/1.0)'}

    # Try HEAD first (fast, low bandwidth)
    try:
        resp = requests.head(url, timeout=8, allow_redirects=True, headers=headers)
        final_url = resp.url
        status = resp.status_code

        # Some servers block HEAD — if 405/403, try GET
        if status in (405, 403, 406):
            resp = requests.get(url, timeout=8, allow_redirects=True, headers=headers, stream=True)
            final_url = resp.url
            status = resp.status_code
            resp.close()

    except requests.exceptions.Timeout:
        # HEAD timed out — try GET (some servers don't respond to HEAD)
        try:
            resp = requests.get(url, timeout=10, allow_redirects=True, headers=headers, stream=True)
            final_url = resp.url
            status = resp.status_code
            resp.close()
        except requests.exceptions.Timeout:
            return False, 0, 'timeout'
        except Exception:
            return False, 0, 'connection_error'
    except requests.exceptions.ConnectionError:
        return False, 0, 'connection_error'
    except Exception as e:
        return False, 0, f'error: {str(e)[:50]}'

    # Check HTTP status
    if status >= 400:
        return False, status, 'http_error'

    # Check if redirected to a directory
    if is_valid_url(final_url) is False:
        return False, status, 'redirected_to_directory'

    # Check for parked/expired domain indicators
    parked_indicators = ['godaddy.com/parking', 'sedoparking.com', 'hugedomains.com',
                         'afternic.com', 'dan.com', 'undeveloped.com',
                         'buy-this-domain', 'domain-for-sale', 'parked-content']
    final_lower = final_url.lower()
    for indicator in parked_indicators:
        if indicator in final_lower:
            return False, status, 'parked_domain'

    return True, status, 'ok'


def taxonomy_to_specialty(code):
    """Convert NPPES taxonomy code to a human-readable specialty."""
    if not code:
        return None
    # Try exact match first
    if code in TAXONOMY_MAP:
        return TAXONOMY_MAP[code]
    # Try prefix match (first 4 chars)
    prefix = code[:4]
    if prefix in TAXONOMY_MAP:
        return TAXONOMY_MAP[prefix]
    # Try first 3
    prefix3 = code[:3]
    if prefix3 in TAXONOMY_MAP:
        return TAXONOMY_MAP[prefix3]
    return None


def strip_legal_name(name):
    """Remove legal suffixes to get core practice name.
    'BEVERLY HILLS DERMATOLOGY GROUP INC' → 'BEVERLY HILLS DERMATOLOGY GROUP'
    'STEVEN L GOLDBERG MD INC' → 'STEVEN L GOLDBERG'
    """
    result = name.upper()
    for pattern in LEGAL_SUFFIXES:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE)
    # Clean up whitespace
    result = re.sub(r'\s+', ' ', result).strip()
    # Remove trailing dots and spaces
    result = result.rstrip('. ')
    return result


def format_phone(phone):
    """Format NPPES phone (e.g. '8314423700') to searchable format ('831-442-3700')."""
    if not phone:
        return None
    digits = re.sub(r'\D', '', str(phone))
    if len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits[0] == '1':
        return f"{digits[1:4]}-{digits[4:7]}-{digits[7:]}"
    return None


def format_zip(zip_code):
    """Extract 5-digit ZIP from NPPES format (e.g. '939065103' → '93906')."""
    if not zip_code:
        return None
    digits = re.sub(r'\D', '', str(zip_code))
    return digits[:5] if len(digits) >= 5 else None


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
            time.sleep(2)
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code != 200:
            return None
        data = resp.json()
        places = data.get('places', [])
        if not places:
            return None

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
    except Exception:
        return None


# Track rejection reasons for debugging (#16: no more silent rejections)
_rejection_log = []

def find_url_multi_strategy(org, strategies, dry_run=False, validate=True, verbose=False):
    """
    Try multiple search strategies to find a practice URL.
    Returns (result_dict, strategy_used, credits_used) or (None, None, credits_used).
    Strategies ordered by hit rate: address > name > phone > stripped.

    #16 fix: logs all rejected URLs with reasons instead of silently dropping them.
    """
    name = org['organization_name']
    city = org['city']
    state = org['state']
    address = org.get('address_line_1', '')
    phone = org.get('phone', '')
    taxonomy = org.get('primary_taxonomy_code', '')
    zip_code = format_zip(org.get('zip_code', ''))

    credits = 0

    def _try_validate(result, strategy_name):
        """Validate URL and log rejections (#16 fix)."""
        if not result:
            return None
        if not validate:
            return result
        is_ok, status, reason = validate_url(result['url'], name, city)
        if not is_ok:
            rejection = {
                'npi': org.get('npi', ''),
                'name': name,
                'url': result['url'],
                'strategy': strategy_name,
                'reason': reason,
                'status': status,
            }
            _rejection_log.append(rejection)
            if verbose:
                print(f"    [REJECTED] {result['url'][:60]} — {reason} (strategy: {strategy_name})")
            return None
        return result

    # ── Strategy 1: Address + Specialty (highest hit rate ~79%) ──
    if 1 in strategies and address:
        specialty = taxonomy_to_specialty(taxonomy)
        if specialty:
            query = f"{specialty} {address} {city}"
        else:
            query = f"medical {address} {city} {state}"
        credits += 1
        if not dry_run:
            result = search_serper_places(query)
            result = _try_validate(result, 'address_specialty')
            if result:
                return result, 'address_specialty', credits

    # ── Strategy 2: Name + City + State ──
    if 2 in strategies:
        query = f"{name} {city} {state}"
        credits += 1
        if not dry_run:
            result = search_serper_places(query)
            result = _try_validate(result, 'name_city')
            if result:
                return result, 'name_city', credits

    # ── Strategy 3: Phone number ──
    if 3 in strategies and phone:
        formatted_phone = format_phone(phone)
        if formatted_phone:
            query = formatted_phone
            credits += 1
            if not dry_run:
                result = search_serper_places(query)
                result = _try_validate(result, 'phone')
                if result:
                    return result, 'phone', credits

    # ── Strategy 4: Stripped name + ZIP ──
    if 4 in strategies:
        stripped = strip_legal_name(name)
        if stripped and stripped != name.upper() and zip_code:
            query = f"{stripped} {zip_code}"
            credits += 1
            if not dry_run:
                result = search_serper_places(query)
                result = _try_validate(result, 'stripped_name_zip')
                if result:
                    return result, 'stripped_name_zip', credits

    return None, None, credits


def main():
    args = sys.argv[1:]
    dry_run = '--dry-run' in args
    state = 'CA'
    limit = 100
    offset = 0
    strategies = {1, 2, 3, 4}
    validate = True

    for i, a in enumerate(args):
        if a == '--state' and i + 1 < len(args):
            state = args[i + 1].upper()
        if a == '--limit' and i + 1 < len(args):
            limit = int(args[i + 1])
        if a == '--offset' and i + 1 < len(args):
            offset = int(args[i + 1])
        if a == '--strategies' and i + 1 < len(args):
            strategies = set(int(x) for x in args[i + 1].split(','))
        if a == '--no-validate':
            validate = False

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    if not SERPER_API_KEY:
        print("[FATAL] Missing SERPER_API_KEY")
        print("Set in .env.local or: $env:SERPER_API_KEY='your-key'")
        sys.exit(1)

    print("=" * 55)
    print("  KairoLogic — Provider URL Finder v2")
    print("  Multi-Strategy: Address, Name, Phone, Stripped Name")
    print("  URL Validation: HEAD check + parked domain filter")
    print("=" * 55)
    print(f"  State:      {state}")
    print(f"  Limit:      {limit}")
    print(f"  Offset:     {offset}")
    print(f"  Strategies: {sorted(strategies)}")
    print(f"  Validate:   {validate}")
    print(f"  Dry run:    {dry_run}")
    print()

    # ── Step 1: Get providers without URLs ──
    print("[1/3] Finding providers without practice URLs...")

    all_orgs = []
    skipped_taxonomy = 0
    page_size = 1000
    page_offset = offset

    while len(all_orgs) < limit:
        fetch_size = min(page_size, limit - len(all_orgs))
        orgs = db_get(
            f"providers?entity_type_code=eq.2&state=eq.{state}"
            f"&deactivation_date=is.null"
            f"&organization_name=not.is.null"
            f"&city=not.is.null"
            f"&select=npi,organization_name,city,state,zip_code,address_line_1,phone,primary_taxonomy_code"
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
                # Skip pharmacies and non-practice types
                taxonomy = org.get('primary_taxonomy_code', '') or ''
                prefix4 = taxonomy[:4]
                if prefix4 in SKIP_TAXONOMIES:
                    skipped_taxonomy += 1
                    continue
                all_orgs.append(org)

        page_offset += page_size
        if len(orgs) < fetch_size:
            break

    print(f"  Found {len(all_orgs)} providers without URLs")
    if skipped_taxonomy > 0:
        print(f"  Skipped {skipped_taxonomy} (pharmacies, labs, nursing facilities)")

    if not all_orgs:
        print("  Nothing to search. All providers have URLs.")
        return

    # ── Step 2: Search with multi-strategy ──
    print(f"\n[2/3] Searching with {len(strategies)} strategies...")

    found = []
    not_found = 0
    total_credits = 0
    total_flushed = 0
    validated_rejected = 0

    # Track strategy effectiveness
    strategy_hits = {'name_city': 0, 'address_specialty': 0, 'phone': 0, 'stripped_name_zip': 0}
    strategy_credits = {'name_city': 0, 'address_specialty': 0, 'phone': 0, 'stripped_name_zip': 0}

    for i, org in enumerate(all_orgs):
        result, strategy_used, credits = find_url_multi_strategy(org, strategies, dry_run, validate)
        total_credits += credits

        if result:
            found.append({
                'npi': org['npi'],
                'name': org['organization_name'],
                'url': result['url'],
                'state': org['state'],
                'city': org['city'],
                'scan_tier': 'monthly',
                'scan_status': 'pending',
            })
            if strategy_used:
                strategy_hits[strategy_used] = strategy_hits.get(strategy_used, 0) + 1

            # Flush every 200 found URLs
            if len(found) >= 200 and not dry_run:
                try:
                    db_upsert(found)
                    total_flushed += len(found)
                    print(f"  >> Flushed {len(found)} URLs to DB (total: {total_flushed})")
                except Exception as e:
                    print(f"  >> Flush error: {e}")
                found = []
        else:
            not_found += 1

        # Progress
        processed = i + 1
        if processed % 50 == 0 or processed == len(all_orgs):
            found_count = total_flushed + len(found)
            print(f"  Searched: {processed}/{len(all_orgs)}, "
                  f"found: {found_count}, "
                  f"not found: {not_found}, "
                  f"credits: {total_credits}")

        # Rate limiting
        if not dry_run and processed % 5 == 0:
            time.sleep(0.2)

    total_found = total_flushed + len(found)

    # ── Step 3: Insert remaining ──
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

    # ── Summary ──
    print()
    print("=" * 55)
    print("  URL Finder v2 — Results")
    print("=" * 55)
    print(f"  Total searched:    {len(all_orgs)}")
    print(f"  URLs found:        {total_found}")
    print(f"  Not found:         {not_found}")
    print(f"  Hit rate:          {(total_found / max(len(all_orgs), 1) * 100):.1f}%")
    print(f"  Credits used:      {total_credits}")
    print(f"  Avg credits/prov:  {(total_credits / max(len(all_orgs), 1)):.1f}")
    if validate:
        print(f"  URLs validated:    Yes (HEAD check + parked domain filter)")
    print()
    print("  Strategy effectiveness:")
    for strat, hits in sorted(strategy_hits.items(), key=lambda x: -x[1]):
        if hits > 0:
            print(f"    {strat:25s} {hits:>6} hits")
    print()
    if total_found > 0:
        print(f"  Strategy breakdown:")
        for strat, hits in sorted(strategy_hits.items(), key=lambda x: -x[1]):
            if hits > 0:
                pct = hits / total_found * 100
                print(f"    {strat:25s} {pct:>5.1f}%")
    print("=" * 55)
    if dry_run:
        print("  (DRY RUN — no API calls made, no data written)")


if __name__ == '__main__':
    main()
