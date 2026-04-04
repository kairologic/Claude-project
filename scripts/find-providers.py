"""
KairoLogic Campaign Provider Finder + Email Scraper
====================================================
Finds high-drift providers with confirmed foreign data routing,
scrapes contact emails from their websites, generates HMAC codes.

Usage:
  python find-providers.py

Outputs:
  - campaign-expansion.csv (review this)
  - campaign-expansion.sql (run in Supabase)

Requirements: pip install requests (if not already installed)
"""

import hmac, hashlib, json, re, time, csv, sys

# Try requests, fall back to urllib
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request, urllib.parse, ssl
    HAS_REQUESTS = False
    print("Note: 'requests' not installed, using urllib (slower). Install with: pip install requests")

# ── CONFIG ──
SUPABASE_URL = 'https://mxrtltezhkxhqizvxvsz.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc3MjU4MCwiZXhwIjoyMDg0MzQ4NTgwfQ.ERGZzrpTnQDFsnYegFUBKQAHK6_nALUtGmeTvS7T7oI'
REPORT_SECRET = 'b6f59bad31ffd504440de822bde1d3d84c08658969a2207b23671fe92a373de8'

TARGET_COUNT = 50
MAX_SCORE = 79
PAGE_SIZE = 200

URL_BLOCKLIST = [
    'facebook.com','yelp.com','healthgrades.com','vitals.com','zocdoc.com',
    'yellowpages.com','bbb.org','linkedin.com','instagram.com','twitter.com',
    'npidb.org','npino.com','npiprofile.com','medicare.gov','cms.gov',
    'webmd.com','google.com','bloomberg.com','indeed.com','glassdoor.com',
    'doximity.com','practo.com','mapquest.com','superpages.com',
]

COUNTRY_NAMES = {
    'GB':'Great Britain','IE':'Ireland','DE':'Germany','FR':'France',
    'NL':'Netherlands','BE':'Belgium','DK':'Denmark','SE':'Sweden',
    'NO':'Norway','FI':'Finland','CA':'Canada','AU':'Australia',
    'SG':'Singapore','JP':'Japan','IN':'India','BR':'Brazil',
    'HK':'Hong Kong','KR':'South Korea','IT':'Italy','ES':'Spain',
}

# ── HELPERS ──

def supabase_get(table, query):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
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
        print(f"  DB error: {e}")
        return []

def get_domain(url):
    try:
        from urllib.parse import urlparse
        return urlparse(url).hostname.replace('www.','') if urlparse(url).hostname else ''
    except:
        return ''

def clean_display_url(url):
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        host = p.hostname.replace('www.','') if p.hostname else ''
        path = p.path.rstrip('/') if p.path and p.path != '/' else ''
        return host + path
    except:
        return url

def is_blocked(url):
    domain = get_domain(url)
    return any(b in domain for b in URL_BLOCKLIST)

def is_good_url(url):
    if not url or url in ('__NOT_FOUND__','null',''): return False
    if is_blocked(url): return False
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        return p.scheme in ('http','https') and p.hostname and '.' in p.hostname
    except:
        return False

def gen_code(npi):
    return hmac.new(REPORT_SECRET.encode(), npi.encode(), hashlib.sha256).hexdigest()[:12]

def scrape_email(url, timeout=8):
    """Scrape email from provider website. Checks homepage + /contact pages."""
    domain = get_domain(url)
    if not domain: return None, 'invalid'

    pages = [
        url,
        f'https://{domain}/contact',
        f'https://{domain}/contact-us',
        f'https://{domain}/about',
        f'https://{domain}/about-us',
    ]

    for page_url in pages:
        try:
            if HAS_REQUESTS:
                r = requests.get(page_url, timeout=timeout, headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; KairoLogic/1.0)',
                    'Accept': 'text/html',
                }, allow_redirects=True)
                if r.status_code != 200: continue
                html = r.text
            else:
                req = urllib.request.Request(page_url, headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; KairoLogic/1.0)',
                    'Accept': 'text/html',
                })
                ctx = ssl.create_default_context()
                with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')

            # Extract emails
            email_re = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
            all_emails = list(set(email_re.findall(html)))

            # Filter junk
            filtered = [e for e in all_emails if not any(x in e.lower() for x in [
                '.png','.jpg','.gif','.css','.js','noreply','no-reply',
                'example.com','test.com','sentry.io','wordpress','wixpress',
                'squarespace','cloudflare','googleapis','gstatic',
            ])]

            if not filtered: continue

            # Prioritize same-domain, then info@, contact@, office@
            same_domain = [e for e in filtered if domain.lower() in e.lower()]
            pool = same_domain if same_domain else filtered

            def score_email(e):
                s = 0
                el = e.lower()
                if el.startswith('info@'): s += 10
                if el.startswith('contact@'): s += 9
                if el.startswith('office@'): s += 8
                if el.startswith('admin@'): s += 7
                if el.startswith('reception@') or el.startswith('frontdesk@'): s += 6
                if el.startswith('hello@'): s += 5
                if domain.lower() in el: s += 20
                return s

            pool.sort(key=score_email, reverse=True)
            from urllib.parse import urlparse
            source = 'homepage' if page_url == url else urlparse(page_url).path.strip('/')
            return pool[0], source

        except:
            continue

    return None, 'not_found'

# ── MAIN ──

def main():
    print('=' * 50)
    print('KairoLogic Campaign Provider Finder')
    print('=' * 50)
    print()

    # Step 1: Get existing campaign NPIs
    print('Step 1: Fetching existing campaign records...')
    existing = supabase_get('campaign_outreach', 'select=npi&limit=1000')
    existing_npis = set(str(r['npi']) for r in existing)
    print(f'  {len(existing_npis)} existing records to exclude')
    print()

    # Step 2: Query providers
    print(f'Step 2: Finding providers (score < {MAX_SCORE}, real URLs, foreign routing)...')
    candidates = []
    offset = 0
    total_scanned = 0

    while len(candidates) < TARGET_COUNT * 3:
        providers = supabase_get('registry',
            f'select=npi,name,city,url,risk_score,last_scan_result'
            f'&url=neq.__NOT_FOUND__&risk_score=lt.{MAX_SCORE}&risk_score=gt.0'
            f'&order=risk_score.asc&offset={offset}&limit={PAGE_SIZE}')

        if not providers:
            break
        total_scanned += len(providers)

        for p in providers:
            if len(candidates) >= TARGET_COUNT * 3: break
            npi = str(p.get('npi',''))
            url = p.get('url','')
            name = p.get('name','')

            if npi in existing_npis: continue
            if not is_good_url(url): continue

            # Parse scan
            raw = p.get('last_scan_result')
            if not raw: continue
            scan = raw if isinstance(raw, dict) else {}
            if isinstance(raw, str):
                try: scan = json.loads(raw)
                except: continue

            # Check DR-01
            sb = scan.get('sb1188_findings', [])
            dr01 = next((f for f in sb if f.get('id') == 'DR-01'), None)
            if not dr01 or dr01.get('status') != 'fail': continue
            ev = dr01.get('evidence', {})
            if ev.get('isUS', True): continue

            geo = ev.get('geo', '')
            ip_host = str(ev.get('ip', '')).rstrip('.')
            country = COUNTRY_NAMES.get(geo, geo)
            score = scan.get('score', p.get('risk_score', 50))

            candidates.append({
                'npi': npi, 'name': name, 'city': p.get('city',''),
                'url': url, 'clean_url': clean_display_url(url),
                'score': score, 'country': country, 'country_code': geo,
                'host': ip_host, 'email': None, 'email_source': '',
                'code': gen_code(npi),
                'report_url': f'https://kairologic.net/report/{gen_code(npi)}',
                'finding': f'Your website is hosted on a server geolocated to {country}, routing patient data outside the US.',
            })

        offset += PAGE_SIZE
        print(f'  Scanned {total_scanned} providers, {len(candidates)} candidates...')

    print(f'\n  Total foreign routing candidates: {len(candidates)}')
    print()

    # Step 3: Scrape emails
    print(f'Step 3: Scraping emails from provider websites...')
    emails_found = 0
    processed = 0

    for c in candidates:
        processed += 1
        if processed % 5 == 0:
            print(f'  Progress: {processed}/{len(candidates)} ({emails_found} emails found)')

        email, source = scrape_email(c['url'])
        c['email'] = email
        c['email_source'] = source
        if email:
            emails_found += 1

        time.sleep(0.5)  # Rate limit

        if emails_found >= TARGET_COUNT:
            print(f'  Reached {TARGET_COUNT} emails, stopping.')
            break

    processed_candidates = candidates[:processed]
    print(f'\n  Emails found: {emails_found} out of {processed} scraped')
    print()

    # Step 4: Sort and output
    print('Step 4: Generating outputs...')

    with_email = sorted([c for c in processed_candidates if c['email']], key=lambda x: x['score'])
    without_email = sorted([c for c in processed_candidates if not c['email']], key=lambda x: x['score'])
    final = (with_email[:TARGET_COUNT] + without_email)[:TARGET_COUNT]

    # CSV
    with open('campaign-expansion.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['NPI','Practice Name','City','Score','Country','IP/Host','URL','Email','Email Source','HMAC Code','Landing Page URL','Finding Text','Campaign Status'])
        for c in final:
            w.writerow([c['npi'],c['name'],c['city'],c['score'],c['country'],c['host'],c['clean_url'],c['email'] or '',c['email_source'],c['code'],c['report_url'],c['finding'],'Not sent'])

    print(f'  CSV: campaign-expansion.csv ({len(final)} providers)')

    # SQL (only those with emails)
    email_rows = [c for c in final if c['email']]
    if email_rows:
        lines = []
        for c in email_rows:
            lines.append("  ('" + c['npi'] + "', '" + c['code'] + "', '" + c['email'] + "', 'sb1188-foreign-v1')")
        sql_text = "-- Campaign Expansion: " + str(len(email_rows)) + " providers with emails\n"
        sql_text += "-- Generated by find-providers.py\n"
        sql_text += "INSERT INTO campaign_outreach (npi, report_code, email_sent_to, campaign_name) VALUES\n"
        sql_text += ',\n'.join(lines)
        sql_text += '\nON CONFLICT DO NOTHING;'

        with open('campaign-expansion.sql', 'w') as f:
            f.write(sql_text)
        print('  SQL: campaign-expansion.sql (' + str(len(email_rows)) + ' records)')
    else:
        print('  SQL: no emails found, skipping')

    # Summary
    print()
    print('=' * 50)
    print('SUMMARY')
    print('=' * 50)
    print(f'  Providers scanned:     {total_scanned}')
    print(f'  Foreign routing found: {len(candidates)}')
    print(f'  Websites scraped:      {processed}')
    print(f'  Emails found:          {emails_found}')
    print(f'  Ready to send:         {len(email_rows)}')
    print(f'  Need emails:           {len(final) - len(email_rows)}')
    print()

    # Score distribution
    print('  Score distribution:')
    for label, lo, hi in [('< 40 Critical',0,40),('40-59 At Risk',40,60),('60-79 Drift',60,80)]:
        n = len([c for c in final if lo <= c['score'] < hi])
        print(f'    {label}: {n}')
    print()

    # Country distribution
    print('  Country distribution:')
    countries = {}
    for c in final:
        countries[c['country']] = countries.get(c['country'], 0) + 1
    for country, count in sorted(countries.items(), key=lambda x: -x[1]):
        print(f'    {country}: {count}')

    print()
    print('Done! Review campaign-expansion.csv, then run campaign-expansion.sql in Supabase.')

if __name__ == '__main__':
    main()
