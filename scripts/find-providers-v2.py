"""
KairoLogic Campaign Provider Finder v2
=======================================
Smarter filtering:
- DR-01: foreign primary domain (excludes Canada/CDN false positives)
- DR-04: third-party endpoints routing to non-US servers
- Email domain validation (must match provider website)
- Non-healthcare entity filter

Usage: py scripts/find-providers-v2.py
"""

import hmac, hashlib, json, re, time, csv, sys

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request, urllib.parse, ssl
    HAS_REQUESTS = False
    print("Note: Install 'requests' for better performance: pip install requests")

# ── CONFIG ──
SUPABASE_URL = 'https://mxrtltezhkxhqizvxvsz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc3MjU4MCwiZXhwIjoyMDg0MzQ4NTgwfQ.ERGZzrpTnQDFsnYegFUBKQAHK6_nALUtGmeTvS7T7oI'
REPORT_SECRET = 'b6f59bad31ffd504440de822bde1d3d84c08658969a2207b23671fe92a373de8'

TARGET_COUNT = 50
MAX_SCORE = 79
PAGE_SIZE = 200

# CDN countries to skip for DR-01 (false positives from anycast)
CDN_FALSE_POSITIVE_COUNTRIES = {'CA', 'US'}

# Known CDN/infrastructure domains to ignore in DR-04
CDN_DOMAINS = {
    'cloudflare.com', 'cloudflare-dns.com', 'cloudflareinsights.com',
    'fastly.net', 'fastlylb.net',
    'akamai.net', 'akamaized.net', 'akamaitechnologies.com',
    'amazonaws.com', 'cloudfront.net',
    'azureedge.net', 'azure.com', 'msecnd.net',
}

URL_BLOCKLIST = [
    'facebook.com', 'yelp.com', 'healthgrades.com', 'vitals.com', 'zocdoc.com',
    'yellowpages.com', 'bbb.org', 'linkedin.com', 'instagram.com', 'twitter.com',
    'npidb.org', 'npino.com', 'npiprofile.com', 'medicare.gov', 'cms.gov',
    'webmd.com', 'google.com', 'bloomberg.com', 'indeed.com', 'glassdoor.com',
    'doximity.com', 'practo.com', 'mapquest.com', 'superpages.com',
    'foundationcenter.org', 'guidestar.org',
]

# Non-healthcare entity keywords to filter out
NON_HEALTHCARE_KEYWORDS = [
    'supermarket', 'grocery', 'school district', 'independent school',
    'catering', 'construction', 'plumbing', 'roofing', 'landscaping',
    'restaurant', 'church', 'ministry', 'realty', 'real estate',
    'auto ', 'automotive', 'car wash', 'gas station',
]

# Junk email domains (web builders, font services, platforms)
JUNK_EMAIL_DOMAINS = [
    'webador.com', 'wix.com', 'wixpress.com', 'squarespace.com',
    'godaddy.com', 'wordpress.com', 'shopify.com', 'weebly.com',
    'latofonts.com', 'latinotype.com', 'fontshare.com',
    'tractionondemand.com', 'hubspot.com', 'mailchimp.com',
    'sentry.io', 'cloudflare.com', 'googleapis.com', 'gstatic.com',
    'example.com', 'test.com', 'ndiscovered.com',
]

COUNTRY_NAMES = {
    'GB': 'Great Britain', 'IE': 'Ireland', 'DE': 'Germany', 'FR': 'France',
    'NL': 'Netherlands', 'BE': 'Belgium', 'DK': 'Denmark', 'SE': 'Sweden',
    'NO': 'Norway', 'FI': 'Finland', 'AU': 'Australia',
    'SG': 'Singapore', 'JP': 'Japan', 'IN': 'India', 'BR': 'Brazil',
    'HK': 'Hong Kong', 'KR': 'South Korea', 'IT': 'Italy', 'ES': 'Spain',
    'LU': 'Luxembourg', 'CH': 'Switzerland', 'AT': 'Austria', 'PL': 'Poland',
    'RO': 'Romania', 'BG': 'Bulgaria', 'CZ': 'Czech Republic', 'RU': 'Russia',
    'CN': 'China', 'TW': 'Taiwan', 'PH': 'Philippines', 'TH': 'Thailand',
    'ZA': 'South Africa', 'MX': 'Mexico', 'AR': 'Argentina', 'CL': 'Chile',
    'CA': 'Canada',
}

# ── HELPERS ──

def supabase_get(table, query):
    url = SUPABASE_URL + '/rest/v1/' + table + '?' + query
    headers = {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY}
    try:
        if HAS_REQUESTS:
            r = requests.get(url, headers=headers, timeout=15)
            r.raise_for_status()
            return r.json()
        else:
            req = urllib.request.Request(url, headers=headers)
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                return json.loads(resp.read())
    except Exception as e:
        print('  DB error: ' + str(e))
        return []

def get_domain(url):
    try:
        if HAS_REQUESTS:
            from urllib.parse import urlparse
        else:
            from urllib.parse import urlparse
        h = urlparse(url).hostname
        return h.replace('www.', '') if h else ''
    except:
        return ''

def clean_display_url(url):
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        host = p.hostname.replace('www.', '') if p.hostname else ''
        path = p.path.rstrip('/') if p.path and p.path != '/' else ''
        return host + path
    except:
        return url

def is_blocked(url):
    domain = get_domain(url)
    return any(b in domain for b in URL_BLOCKLIST)

def is_good_url(url):
    if not url or url in ('__NOT_FOUND__', 'null', ''):
        return False
    if is_blocked(url):
        return False
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        return p.scheme in ('http', 'https') and p.hostname and '.' in p.hostname
    except:
        return False

def is_healthcare_entity(name):
    name_lower = name.lower()
    for kw in NON_HEALTHCARE_KEYWORDS:
        if kw in name_lower:
            return False
    return True

def gen_code(npi):
    return hmac.new(REPORT_SECRET.encode(), npi.encode(), hashlib.sha256).hexdigest()[:12]

def is_junk_email(email):
    if not email:
        return True
    email_lower = email.lower()
    domain = email_lower.split('@')[1] if '@' in email_lower else ''
    for junk in JUNK_EMAIL_DOMAINS:
        if junk in domain:
            return True
    if email_lower.endswith('.png') or email_lower.endswith('.jpg') or email_lower.endswith('.css'):
        return True
    if 'noreply' in email_lower or 'no-reply' in email_lower:
        return True
    return False

def email_matches_domain(email, url):
    """Check if email domain is related to the website domain."""
    if not email or not url:
        return False
    email_domain = email.lower().split('@')[1] if '@' in email.lower() else ''
    site_domain = get_domain(url).lower()
    if not email_domain or not site_domain:
        return False
    # Exact match or one contains the other
    if email_domain == site_domain:
        return True
    # Strip TLDs and check root match
    email_root = email_domain.rsplit('.', 1)[0]  # e.g. "acupuncturetx" from "acupuncturetx.com"
    site_root = site_domain.rsplit('.', 1)[0]
    if email_root == site_root:
        return True
    if email_root in site_domain or site_root in email_domain:
        return True
    # Gmail/yahoo are OK if it's a small practice
    if email_domain in ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'):
        return True  # Can't validate but acceptable for small practices
    return False

def scrape_email(url, timeout=8):
    """Scrape email from provider website with domain validation."""
    domain = get_domain(url)
    if not domain:
        return None, 'invalid'

    pages = [
        url,
        'https://' + domain + '/contact',
        'https://' + domain + '/contact-us',
        'https://' + domain + '/about',
        'https://' + domain + '/about-us',
    ]

    all_found = []

    for page_url in pages:
        try:
            if HAS_REQUESTS:
                r = requests.get(page_url, timeout=timeout, headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; KairoLogic/1.0)',
                    'Accept': 'text/html',
                }, allow_redirects=True)
                if r.status_code != 200:
                    continue
                html = r.text
            else:
                req = urllib.request.Request(page_url, headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; KairoLogic/1.0)',
                    'Accept': 'text/html',
                })
                ctx = ssl.create_default_context()
                with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')

            email_re = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
            emails = list(set(email_re.findall(html)))

            for e in emails:
                if is_junk_email(e):
                    continue
                from urllib.parse import urlparse
                source = 'homepage' if page_url == url else urlparse(page_url).path.strip('/')
                all_found.append((e, source))

        except:
            continue

    if not all_found:
        return None, 'not_found'

    # Score and pick best email
    def score_email(item):
        e = item[0].lower()
        s = 0
        if email_matches_domain(e, url):
            s += 50  # Strong signal
        if e.startswith('info@'): s += 10
        if e.startswith('contact@'): s += 9
        if e.startswith('office@'): s += 8
        if e.startswith('admin@'): s += 7
        if e.startswith('reception@') or e.startswith('frontdesk@'): s += 6
        if e.startswith('hello@'): s += 5
        if e.startswith('appointments@') or e.startswith('scheduling@'): s += 5
        if domain.lower() in e: s += 20
        # Penalize generic gmail unless it's clearly the practice
        if '@gmail.com' in e: s -= 5
        return s

    all_found.sort(key=score_email, reverse=True)

    best_email, best_source = all_found[0]

    # Final validation: reject if no domain match and not a personal email provider
    if not email_matches_domain(best_email, url):
        email_domain = best_email.lower().split('@')[1] if '@' in best_email else ''
        if email_domain not in ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'):
            return None, 'domain_mismatch'

    return best_email, best_source


# ── SCAN PARSING ──

def parse_foreign_findings(scan):
    """
    Extract foreign routing info from scan result.
    Returns dict with:
      - dr01_foreign: bool (primary domain is foreign, excluding CA)
      - dr01_country: str
      - dr01_host: str
      - dr04_foreign_endpoints: list of {domain, country}
      - finding_text: str (for email)
      - source: 'dr01' | 'dr04' | 'both'
    """
    result = {
        'dr01_foreign': False, 'dr01_country': '', 'dr01_host': '',
        'dr04_foreign_endpoints': [],
        'finding_text': '', 'source': None,
    }

    sb = scan.get('sb1188_findings', [])

    # Check DR-01 (primary domain)
    dr01 = next((f for f in sb if f.get('id') == 'DR-01'), None)
    if dr01 and dr01.get('status') == 'fail':
        ev = dr01.get('evidence', {})
        geo = ev.get('geo', '')
        ip_host = str(ev.get('ip', '')).rstrip('.')
        is_us = ev.get('isUS', True)

        if not is_us and geo not in CDN_FALSE_POSITIVE_COUNTRIES:
            result['dr01_foreign'] = True
            result['dr01_country'] = COUNTRY_NAMES.get(geo, geo)
            result['dr01_host'] = ip_host

    # Check DR-04 (third-party endpoints)
    dr04 = next((f for f in sb if f.get('id') == 'DR-04'), None)
    if dr04 and dr04.get('status') == 'fail':
        ev = dr04.get('evidence', {})
        non_us = ev.get('non_us', [])
        if isinstance(non_us, list):
            for ep in non_us:
                # Handle both dict and string formats
                if isinstance(ep, dict):
                    domain = ep.get('domain', 'unknown')
                    country = ep.get('country', 'Foreign')
                elif isinstance(ep, str):
                    domain = ep
                    country = 'Foreign'
                else:
                    continue
                # Skip CDN infrastructure domains
                is_cdn = False
                for cdn in CDN_DOMAINS:
                    if cdn in domain.lower():
                        is_cdn = True
                        break
                if not is_cdn:
                    country_name = COUNTRY_NAMES.get(country, country)
                    result['dr04_foreign_endpoints'].append({
                        'domain': domain,
                        'country': country_name,
                    })

    # Build finding text and determine source
    parts = []

    if result['dr01_foreign']:
        parts.append(
            'Your website is hosted on a server geolocated to ' + result['dr01_country'] +
            ', routing patient data outside the US.'
        )
        result['source'] = 'dr01'

    if result['dr04_foreign_endpoints']:
        ep_count = len(result['dr04_foreign_endpoints'])
        countries = list(set(ep['country'] for ep in result['dr04_foreign_endpoints']))
        country_str = ', '.join(countries[:3])
        if ep_count > 3:
            country_str += ' and others'
        domains = [ep['domain'] for ep in result['dr04_foreign_endpoints'][:3]]
        domain_str = ', '.join(domains)

        parts.append(
            'Your website loads ' + str(ep_count) + ' third-party resource' +
            ('s' if ep_count > 1 else '') + ' (' + domain_str + ') that route data through ' +
            country_str + '.'
        )
        if result['source'] == 'dr01':
            result['source'] = 'both'
        else:
            result['source'] = 'dr04'

    result['finding_text'] = ' '.join(parts)
    return result


# ── MAIN ──

def main():
    print('=' * 55)
    print('KairoLogic Campaign Provider Finder v2')
    print('DR-01 (excl. Canada) + DR-04 third-party endpoints')
    print('=' * 55)
    print()

    # Step 1: Existing campaign NPIs
    print('Step 1: Fetching existing campaign records...')
    existing = supabase_get('campaign_outreach', 'select=npi&limit=1000')
    existing_npis = set(str(r['npi']) for r in existing)
    print('  ' + str(len(existing_npis)) + ' existing records to exclude')
    print()

    # Step 2: Query providers
    print('Step 2: Finding providers (score < ' + str(MAX_SCORE) + ', real URLs)...')
    candidates = []
    seen_npis = set()
    offset = 0
    total_scanned = 0
    dr01_count = 0
    dr04_count = 0
    both_count = 0

    while len(candidates) < TARGET_COUNT * 3:
        providers = supabase_get('registry',
            'select=npi,name,city,url,risk_score,last_scan_result'
            '&url=neq.__NOT_FOUND__&risk_score=lt.' + str(MAX_SCORE) + '&risk_score=gt.0'
            '&order=risk_score.asc&offset=' + str(offset) + '&limit=' + str(PAGE_SIZE))

        if not providers:
            break
        total_scanned += len(providers)

        for p in providers:
            if len(candidates) >= TARGET_COUNT * 3:
                break

            npi = str(p.get('npi', ''))
            url = p.get('url', '')
            name = p.get('name', '')

            if npi in existing_npis or npi in seen_npis:
                continue
            if not is_good_url(url):
                continue
            if not is_healthcare_entity(name):
                continue

            raw = p.get('last_scan_result')
            if not raw:
                continue
            scan = raw if isinstance(raw, dict) else {}
            if isinstance(raw, str):
                try:
                    scan = json.loads(raw)
                except:
                    continue

            # Parse foreign findings (DR-01 excl. Canada + DR-04)
            foreign = parse_foreign_findings(scan)

            if not foreign['source']:
                continue  # No foreign routing found

            score = scan.get('score', p.get('risk_score', 50))
            seen_npis.add(npi)

            if foreign['source'] == 'dr01':
                dr01_count += 1
            elif foreign['source'] == 'dr04':
                dr04_count += 1
            else:
                both_count += 1

            # Build foreign country summary
            countries = []
            if foreign['dr01_country']:
                countries.append(foreign['dr01_country'])
            for ep in foreign['dr04_foreign_endpoints']:
                if ep['country'] not in countries:
                    countries.append(ep['country'])

            candidates.append({
                'npi': npi, 'name': name, 'city': p.get('city', ''),
                'url': url, 'clean_url': clean_display_url(url),
                'score': score,
                'countries': ', '.join(countries),
                'source': foreign['source'],
                'dr01_host': foreign['dr01_host'],
                'dr04_endpoints': foreign['dr04_foreign_endpoints'],
                'email': None, 'email_source': '',
                'code': gen_code(npi),
                'report_url': 'https://kairologic.net/report/' + gen_code(npi),
                'finding': foreign['finding_text'],
            })

        offset += PAGE_SIZE
        print('  Scanned ' + str(total_scanned) + ' providers, ' + str(len(candidates)) + ' candidates...')

    print()
    print('  Total candidates: ' + str(len(candidates)))
    print('    DR-01 only (primary domain foreign): ' + str(dr01_count))
    print('    DR-04 only (third-party endpoints):  ' + str(dr04_count))
    print('    Both DR-01 + DR-04:                  ' + str(both_count))
    print()

    # Step 3: Scrape emails
    print('Step 3: Scraping emails (with domain validation)...')
    emails_found = 0
    domain_mismatches = 0
    processed = 0

    for c in candidates:
        processed += 1
        if processed % 5 == 0:
            print('  Progress: ' + str(processed) + '/' + str(len(candidates)) +
                  ' (' + str(emails_found) + ' emails, ' + str(domain_mismatches) + ' mismatches rejected)')

        email, source = scrape_email(c['url'])
        c['email'] = email
        c['email_source'] = source
        if email:
            emails_found += 1
        if source == 'domain_mismatch':
            domain_mismatches += 1

        time.sleep(0.5)

        if emails_found >= TARGET_COUNT:
            print('  Reached ' + str(TARGET_COUNT) + ' validated emails, stopping.')
            break

    processed_candidates = candidates[:processed]
    print()
    print('  Emails found: ' + str(emails_found) + ' out of ' + str(processed) + ' scraped')
    print('  Domain mismatches rejected: ' + str(domain_mismatches))
    print()

    # Step 4: Output
    print('Step 4: Generating outputs...')

    with_email = sorted([c for c in processed_candidates if c['email']], key=lambda x: x['score'])
    without_email = sorted([c for c in processed_candidates if not c['email']], key=lambda x: x['score'])
    final = (with_email[:TARGET_COUNT] + without_email)[:TARGET_COUNT]

    # CSV
    with open('campaign-expansion-v2.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['NPI', 'Practice Name', 'City', 'Score', 'Countries', 'Source', 'DR01 Host',
                     'DR04 Endpoints', 'URL', 'Email', 'Email Source', 'HMAC Code',
                     'Landing Page URL', 'Finding Text', 'Campaign Status'])
        for c in final:
            dr04_str = '; '.join(ep['domain'] + ' (' + ep['country'] + ')' for ep in c['dr04_endpoints'][:5])
            w.writerow([
                c['npi'], c['name'], c['city'], c['score'], c['countries'], c['source'],
                c['dr01_host'], dr04_str, c['clean_url'], c['email'] or '', c['email_source'],
                c['code'], c['report_url'], c['finding'], 'Not sent'
            ])

    print('  CSV: campaign-expansion-v2.csv (' + str(len(final)) + ' providers)')

    # SQL
    email_rows = [c for c in final if c['email']]
    if email_rows:
        lines = []
        for c in email_rows:
            # Escape single quotes in email
            safe_email = c['email'].replace("'", "''")
            lines.append("  ('" + c['npi'] + "', '" + c['code'] + "', '" + safe_email + "', 'sb1188-foreign-v1')")

        sql_text = '-- Campaign Expansion v2: ' + str(len(email_rows)) + ' providers with validated emails\n'
        sql_text += '-- DR-01 (excl. Canada) + DR-04 third-party endpoints\n'
        sql_text += '-- Generated by find-providers-v2.py\n'
        sql_text += 'INSERT INTO campaign_outreach (npi, report_code, email_sent_to, campaign_name) VALUES\n'
        sql_text += ',\n'.join(lines)
        sql_text += '\nON CONFLICT DO NOTHING;'

        with open('campaign-expansion-v2.sql', 'w') as f:
            f.write(sql_text)
        print('  SQL: campaign-expansion-v2.sql (' + str(len(email_rows)) + ' records)')
    else:
        print('  SQL: no validated emails found')

    # Summary
    print()
    print('=' * 55)
    print('SUMMARY')
    print('=' * 55)
    print('  Providers scanned:       ' + str(total_scanned))
    print('  Foreign routing found:   ' + str(len(candidates)))
    print('    - DR-01 only:          ' + str(dr01_count))
    print('    - DR-04 only:          ' + str(dr04_count))
    print('    - Both:                ' + str(both_count))
    print('  Websites scraped:        ' + str(processed))
    print('  Emails found:            ' + str(emails_found))
    print('  Domain mismatches:       ' + str(domain_mismatches))
    print('  Ready to send:           ' + str(len(email_rows) if email_rows else 0))
    print('  Need emails:             ' + str(len(final) - (len(email_rows) if email_rows else 0)))
    print()

    print('  Score distribution:')
    for label, lo, hi in [('< 40 Critical', 0, 40), ('40-59 At Risk', 40, 60), ('60-79 Drift', 60, 80)]:
        n = len([c for c in final if lo <= c['score'] < hi])
        print('    ' + label + ': ' + str(n))
    print()

    print('  Country distribution:')
    country_counts = {}
    for c in final:
        for country in c['countries'].split(', '):
            if country:
                country_counts[country] = country_counts.get(country, 0) + 1
    for country, count in sorted(country_counts.items(), key=lambda x: -x[1]):
        print('    ' + country + ': ' + str(count))
    print()

    print('  Source distribution:')
    for src in ['dr01', 'dr04', 'both']:
        n = len([c for c in final if c['source'] == src])
        if n > 0:
            print('    ' + src + ': ' + str(n))

    print()
    print('Done! Review campaign-expansion-v2.csv, then run campaign-expansion-v2.sql in Supabase.')


if __name__ == '__main__':
    main()
