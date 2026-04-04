#!/usr/bin/env python3
"""
scripts/load-oig-leie.py
════════════════════════════════════════════════════════════════
KairoLogic — Phase 1A Task 2: OIG LEIE Exclusion List Ingestion
════════════════════════════════════════════════════════════════

Downloads the OIG List of Excluded Individuals/Entities (LEIE) from HHS
and NPI-matches excluded providers into the provider_exclusions table,
then flags them in the provider_licenses and providers tables.

Data source: https://oig.hhs.gov/exclusions/exclusions_list.asp
Format:      CSV (UPDATED.csv) — published monthly, ~80K rows
Cost:        $0 — public government dataset

What it does:
  1. Downloads the latest EXCLUSIONS.csv from OIG
  2. Parses and NPI-matches to known providers in Supabase
  3. Upserts into the provider_exclusions table
  4. Sets has_oig_exclusion = true on provider_licenses for matched NPIs

Usage:
  python scripts/load-oig-leie.py [--dry-run] [--local path/to/UPDATED.csv]

Requirements:
  pip install requests --break-system-packages
"""

import sys
import os
import csv
import io
import json
import zipfile
import logging
import argparse
import requests
from datetime import datetime, date
from collections import defaultdict

# ── Logging ──────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s  %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger('oig-leie')

# ── Config ────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

# OIG publishes two URLs — the full ZIP and a direct CSV link
OIG_ZIP_URL = 'https://oig.hhs.gov/exclusions/downloadables/UPDATED.zip'
OIG_CSV_URL = 'https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv'

BATCH_SIZE = 500       # Supabase upsert batch size
DOWNLOAD_TIMEOUT = 120 # seconds

# ── Column mapping (OIG LEIE CSV schema as of 2026) ──────────────
# Header row: LASTNAME, FIRSTNAME, MIDNAME, BUSNAME, GENERAL, SPECIALTY,
#             UPIN, NPI, DOB, ADDRESS, CITY, STATE, ZIP, EXCLTYPE,
#             EXCLDATE, REINDATE, WAIVERSTATE, WAIVERDATE

OIG_COLUMNS = {
    'last_name':   'LASTNAME',
    'first_name':  'FIRSTNAME',
    'mid_name':    'MIDNAME',
    'business':    'BUSNAME',
    'type':        'GENERAL',
    'specialty':   'SPECIALTY',
    'upin':        'UPIN',
    'npi':         'NPI',
    'dob':         'DOB',
    'address':     'ADDRESS',
    'city':        'CITY',
    'state':       'STATE',
    'zip':         'ZIP',
    'excl_type':   'EXCLTYPE',
    'excl_date':   'EXCLDATE',
    'rein_date':   'REINDATE',
    'waiver_state':'WAIVERSTATE',
    'waiver_date': 'WAIVERDATE',
}

# ── Supabase helpers ──────────────────────────────────────────────

def supa_request(method: str, path: str, body=None, params: str = '') -> dict:
    """Make a Supabase REST API call. Returns parsed JSON or raises."""
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal,resolution=merge-duplicates',
    }
    res = requests.request(method, url, headers=headers,
                           data=json.dumps(body) if body else None,
                           timeout=30)
    if not res.ok:
        raise RuntimeError(f'Supabase {method} {path}: {res.status_code} {res.text[:300]}')
    return res.json() if res.text else {}


def supa_select(path: str, params: str = '') -> list:
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Accept': 'application/json',
        'Prefer': 'return=representation',
    }
    res = requests.get(url, headers=headers, timeout=30)
    if not res.ok:
        raise RuntimeError(f'Supabase GET {path}: {res.status_code} {res.text[:300]}')
    return res.json() if res.text else []


def supa_upsert(table: str, rows: list[dict]) -> int:
    """Upsert a batch into a Supabase table. Returns rows written."""
    if not rows:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    res = requests.post(url, headers=headers, data=json.dumps(rows), timeout=30)
    if not res.ok:
        raise RuntimeError(f'Supabase upsert {table}: {res.status_code} {res.text[:300]}')
    return len(rows)

# ── CSV Download ──────────────────────────────────────────────────

def download_oig_csv(local_path: str | None = None) -> str:
    """
    Returns the raw CSV text of the OIG LEIE UPDATED.csv.
    If local_path is provided, reads from disk instead.
    """
    if local_path:
        log.info(f'Reading local LEIE file: {local_path}')
        with open(local_path, 'r', encoding='latin-1') as f:
            return f.read()

    # Try direct CSV URL first (faster)
    log.info(f'Downloading OIG LEIE CSV from {OIG_CSV_URL}')
    try:
        res = requests.get(OIG_CSV_URL, timeout=DOWNLOAD_TIMEOUT,
                           headers={'User-Agent': 'KairoLogic/1.0 (compliance data pipeline)'})
        if res.ok:
            log.info(f'Downloaded {len(res.content):,} bytes via direct CSV link')
            return res.content.decode('latin-1')
    except Exception as e:
        log.warning(f'Direct CSV download failed ({e}), trying ZIP...')

    # Fall back to ZIP
    log.info(f'Downloading OIG LEIE ZIP from {OIG_ZIP_URL}')
    res = requests.get(OIG_ZIP_URL, timeout=DOWNLOAD_TIMEOUT,
                       headers={'User-Agent': 'KairoLogic/1.0 (compliance data pipeline)'})
    res.raise_for_status()
    log.info(f'Downloaded {len(res.content):,} bytes (ZIP)')

    with zipfile.ZipFile(io.BytesIO(res.content)) as zf:
        csv_files = [n for n in zf.namelist() if n.upper().endswith('.CSV')]
        if not csv_files:
            raise RuntimeError('No CSV found in OIG LEIE ZIP archive')
        log.info(f'Extracting {csv_files[0]} from ZIP')
        with zf.open(csv_files[0]) as f:
            return f.read().decode('latin-1')

# ── CSV Parsing ───────────────────────────────────────────────────

def parse_date(raw: str) -> str | None:
    """Parse YYYYMMDD or MM/DD/YYYY into ISO date string."""
    raw = raw.strip()
    if not raw:
        return None
    for fmt in ('%Y%m%d', '%m/%d/%Y', '%m/%d/%y'):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def parse_leie_csv(csv_text: str) -> list[dict]:
    """Parse the LEIE CSV into a list of exclusion dicts."""
    reader = csv.DictReader(io.StringIO(csv_text))
    records = []
    for row in reader:
        # Normalize header names (some years use lowercase)
        row_upper = {k.strip().upper(): v.strip() for k, v in row.items()}

        npi = row_upper.get('NPI', '').strip()
        excl_date = parse_date(row_upper.get('EXCLDATE', ''))
        rein_date = parse_date(row_upper.get('REINDATE', ''))
        waiver_date = parse_date(row_upper.get('WAIVERDATE', ''))

        # Only individuals with NPIs are actionable for provider matching.
        # We still ingest entities (businesses) for completeness.
        records.append({
            'last_name':    row_upper.get('LASTNAME', ''),
            'first_name':   row_upper.get('FIRSTNAME', ''),
            'mid_name':     row_upper.get('MIDNAME', ''),
            'business_name':row_upper.get('BUSNAME', ''),
            'entity_type':  row_upper.get('GENERAL', ''),   # 'Individual' or 'Business'
            'specialty':    row_upper.get('SPECIALTY', ''),
            'upin':         row_upper.get('UPIN', '') or None,
            'npi':          npi or None,
            'dob':          parse_date(row_upper.get('DOB', '')),
            'address':      row_upper.get('ADDRESS', ''),
            'city':         row_upper.get('CITY', ''),
            'state':        row_upper.get('STATE', ''),
            'zip':          row_upper.get('ZIP', ''),
            'excl_type':    row_upper.get('EXCLTYPE', ''),
            'excl_date':    excl_date,
            'rein_date':    rein_date,     # reinstatement date (null = still excluded)
            'waiver_state': row_upper.get('WAIVERSTATE', '') or None,
            'waiver_date':  waiver_date,
            'is_active':    rein_date is None,  # currently excluded if no reinstatement
            'source':       'oig_leie',
            'loaded_at':    datetime.utcnow().isoformat(),
        })

    return records


# ── NPI Matching ──────────────────────────────────────────────────

def build_npi_index(records: list[dict]) -> dict[str, dict]:
    """
    Build a lookup dict: npi -> exclusion record.
    Only includes records that have a valid 10-digit NPI.
    """
    index = {}
    for r in records:
        npi = r.get('npi', '')
        if npi and len(npi) == 10 and npi.isdigit():
            index[npi] = r
    return index


def fetch_known_npis_from_supabase(npi_set: set[str]) -> set[str]:
    """
    Given a set of NPIs, return the subset that exist in our providers table.
    Queries in batches to avoid URL length limits.
    """
    found = set()
    npi_list = list(npi_set)
    batch_size = 200

    for i in range(0, len(npi_list), batch_size):
        batch = npi_list[i:i + batch_size]
        npi_param = ','.join(batch)
        try:
            rows = supa_select('providers', f'?npi=in.({npi_param})&select=npi')
            for r in rows:
                found.add(r['npi'])
        except Exception as e:
            log.warning(f'NPI fetch batch {i//batch_size + 1} failed: {e}')

    return found


# ── Write to Supabase ─────────────────────────────────────────────

def upsert_exclusions(records: list[dict], dry_run: bool) -> dict:
    """
    Upsert into provider_exclusions table in batches.
    Returns stats dict.
    """
    stats = {'total': len(records), 'upserted': 0, 'errors': 0}

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        if dry_run:
            log.info(f'[DRY RUN] Would upsert {len(batch)} exclusion rows (batch {i//BATCH_SIZE + 1})')
            stats['upserted'] += len(batch)
            continue
        try:
            written = supa_upsert('provider_exclusions', batch)
            stats['upserted'] += written
        except Exception as e:
            log.error(f'Upsert batch {i//BATCH_SIZE + 1} failed: {e}')
            stats['errors'] += len(batch)

        # Progress every 5 batches
        if (i // BATCH_SIZE + 1) % 5 == 0:
            log.info(f'  ...{stats["upserted"]:,} upserted so far')

    return stats


def flag_providers_with_exclusions(matched_npis: list[str], dry_run: bool) -> int:
    """
    Set has_oig_exclusion = true on provider_licenses for all matched NPIs.
    Returns the count updated.
    """
    if not matched_npis:
        return 0

    updated = 0
    for i in range(0, len(matched_npis), 200):
        batch = matched_npis[i:i + 200]
        npi_param = ','.join(batch)
        if dry_run:
            log.info(f'[DRY RUN] Would flag {len(batch)} NPIs as OIG-excluded in provider_licenses')
            updated += len(batch)
            continue
        try:
            url = f"{SUPABASE_URL}/rest/v1/provider_licenses?npi=in.({npi_param})"
            headers = {
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            }
            res = requests.patch(url, headers=headers,
                                 data=json.dumps({'has_oig_exclusion': True,
                                                  'oig_checked_at': datetime.utcnow().isoformat()}),
                                 timeout=30)
            if res.ok:
                updated += len(batch)
            else:
                log.warning(f'Flag update failed: {res.status_code} {res.text[:200]}')
        except Exception as e:
            log.warning(f'Flag update error: {e}')

    return updated


# ── Main ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Load OIG LEIE exclusion list into KairoLogic Supabase')
    parser.add_argument('--dry-run', action='store_true',
                        help='Parse and report but do not write to DB')
    parser.add_argument('--local', metavar='PATH',
                        help='Use local UPDATED.csv instead of downloading')
    parser.add_argument('--active-only', action='store_true',
                        help='Only ingest currently active exclusions (no reinstatement date)')
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.')
        sys.exit(1)

    print()
    print('═══════════════════════════════════════════════════════════')
    print('  KairoLogic — OIG LEIE Exclusion List Ingestion')
    print('  Phase 1A Task 2: Ingest OIG LEIE, match on NPI')
    print('═══════════════════════════════════════════════════════════')
    print(f'  Supabase:   {SUPABASE_URL}')
    print(f'  Dry run:    {args.dry_run}')
    print(f'  Active only:{args.active_only}')
    print()

    start = datetime.utcnow()

    # ── 1. Download / read the CSV ────────────────────────────────
    log.info('Step 1: Fetching OIG LEIE data...')
    csv_text = download_oig_csv(args.local)

    # ── 2. Parse ──────────────────────────────────────────────────
    log.info('Step 2: Parsing CSV...')
    all_records = parse_leie_csv(csv_text)
    log.info(f'  Total LEIE records: {len(all_records):,}')

    if args.active_only:
        all_records = [r for r in all_records if r['is_active']]
        log.info(f'  Active exclusions (no reinstatement): {len(all_records):,}')

    # ── 3. NPI matching ───────────────────────────────────────────
    log.info('Step 3: Building NPI index...')
    npi_index = build_npi_index(all_records)
    log.info(f'  LEIE records with valid NPI: {len(npi_index):,}')

    log.info('Step 4: Checking which NPIs exist in KairoLogic providers...')
    known_npis = fetch_known_npis_from_supabase(set(npi_index.keys()))
    matched_npis = list(known_npis)
    log.info(f'  Matched providers in KairoLogic DB: {len(matched_npis):,}')

    if matched_npis:
        log.info('  Matched NPIs:')
        for npi in matched_npis[:20]:
            rec = npi_index[npi]
            name = f"{rec['first_name']} {rec['last_name']}".strip() or rec['business_name']
            log.info(f'    {npi}: {name} | excl_date={rec["excl_date"]} | type={rec["excl_type"]}')
        if len(matched_npis) > 20:
            log.info(f'    ... and {len(matched_npis) - 20} more')

    # ── 4. Upsert all exclusions ──────────────────────────────────
    log.info('Step 5: Upserting exclusions into provider_exclusions...')
    upsert_stats = upsert_exclusions(all_records, args.dry_run)
    log.info(f'  Upserted: {upsert_stats["upserted"]:,} / {upsert_stats["total"]:,} '
             f'(errors: {upsert_stats["errors"]})')

    # ── 5. Flag matched providers ─────────────────────────────────
    if matched_npis:
        log.info('Step 6: Flagging has_oig_exclusion on provider_licenses...')
        flagged = flag_providers_with_exclusions(matched_npis, args.dry_run)
        log.info(f'  Flagged {flagged:,} provider_licenses rows')
    else:
        log.info('Step 6: No NPI matches — skipping provider_licenses flag update')

    # ── Summary ───────────────────────────────────────────────────
    elapsed = (datetime.utcnow() - start).total_seconds()
    print()
    print('═══════════════════════════════════════════════════════════')
    print('  SUMMARY')
    print('═══════════════════════════════════════════════════════════')
    print(f'  Total LEIE records parsed:    {len(all_records):,}')
    print(f'  Records with valid NPI:       {len(npi_index):,}')
    print(f'  NPIs matched in KairoLogic:   {len(matched_npis):,}')
    print(f'  Exclusions upserted:          {upsert_stats["upserted"]:,}')
    print(f'  Providers flagged (LEIE):     {len(matched_npis):,}')
    print(f'  Elapsed:                      {elapsed:.1f}s')
    if args.dry_run:
        print()
        print('  ⚠️  DRY RUN — no data was written to Supabase')
    print()


if __name__ == '__main__':
    main()
