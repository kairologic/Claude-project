#!/usr/bin/env python3
"""
KairoLogic — CA Medical Board .accdb Loader
============================================
Reads the MBC Physician & Surgeon Information Access database and loads
physician licenses + disciplinary records into provider_licenses (Supabase).

Source: Medical Board of California (MBC) public data
  - 310K+ physician licenses
  - 13 disciplinary tables (~20K records)
  - Free, weekly refresh from MBC website

Usage:
  python scripts/load-ca-medical-board.py [--dry-run] [--limit 1000]
  python scripts/load-ca-medical-board.py --db-path "C:\\path\\to\\file.accdb"
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error
from datetime import datetime, date
from collections import defaultdict

# ── Config ──────────────────────────────────────────────

SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

DEFAULT_DB_PATH = r'C:\Users\ravic\Claude-project\MBCPhysicianAndSurgeonInformation-PUBLIC.accdb'

BATCH_SIZE = 500
RETRY_DELAY = 2  # seconds between retries
MAX_RETRIES = 3

# All disciplinary tables to scan
DISCIPLINARY_TABLES = [
    'AdministrativeDisciplinaryAction',
    'AdministrativeActionTakenByOtherStateOrFederalGovernment',
    'AdministrativeCitationIssued',
    'ArbitrationAward',
    'CourtOrder',
    'FelonyConviction',
    'HospitalDisciplinaryAction',
    'MalpracticeJudgment',
    'MalpracticeSettlements',
    'MisdemeanorConviction',
    'ProbationaryLicenseIssued',
    'ProbationSummary',
    'PublicLetterOfReprimand',
    'VoluntaryLimitation',
]

# ── Status code mapping (populated from REF_PrimaryStatusCode) ──
# Fallback if REF table can't be read
STATUS_FALLBACK = {
    '20': 'Current',
    '22': 'CurrentTemp - FamilySupport',
    '31': 'Family Support Suspension',
    '32': 'Family Support Denied',
    '45': 'Delinquent',
    '50': 'Cancelled',
    '51': 'Retired',
    '60': 'Denied Renewal',
    '62': 'Voluntary Surrender',
    '63': 'Surrendered',
    '65': 'Revoked',
    '85': 'Deceased',
}


def supabase_request(path, method='GET', body=None, retry=0):
    """Make a request to Supabase REST API with retry logic."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal' if method == 'POST' else '',
    }

    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 201):
                ct = resp.getheader('content-type') or ''
                if 'json' in ct:
                    return json.loads(resp.read())
            return None
    except urllib.error.HTTPError as e:
        status = e.code
        err_body = e.read().decode('utf-8', errors='replace')[:200]
        if status in (502, 503, 504, 429) and retry < MAX_RETRIES:
            delay = RETRY_DELAY * (retry + 1)
            print(f"    Retry {retry + 1}/{MAX_RETRIES} after {status} (waiting {delay}s)...")
            time.sleep(delay)
            return supabase_request(path, method, body, retry + 1)
        raise Exception(f"Supabase {method} {path}: {status} {err_body}")


def safe_date(val):
    """Convert Access date to ISO string, or None."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()[:10]
    if isinstance(val, str) and len(val) >= 10:
        return val[:10]
    return None


def safe_str(val, max_len=500):
    """Convert to string, strip, truncate."""
    if val is None:
        return None
    s = str(val).strip()
    return s[:max_len] if s else None


def load_status_codes(cursor):
    """Return short status labels keyed by PrimaryStatusCode."""
    # Use authoritative short labels — REF table has long descriptions we don't need
    print(f"  Using {len(STATUS_FALLBACK)} status code mappings")
    return dict(STATUS_FALLBACK)


def load_disciplinary_records(cursor):
    """Load all disciplinary tables and aggregate by LicenseID."""
    disc_by_license = defaultdict(list)
    total = 0

    for table in DISCIPLINARY_TABLES:
        try:
            cursor.execute(f'SELECT * FROM [{table}]')
            cols = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            count = 0

            for row in rows:
                row_dict = dict(zip(cols, row))
                license_id = row_dict.get('LicenseID')
                if not license_id:
                    continue

                # Build summary entry
                entry = {'type': table}

                # Extract common fields
                for key in ['Description', 'DescriptionOfAction', 'ProbationSummary',
                            'CaseNumber', 'Court', 'Docket', 'Sentence',
                            'HealthCareFacility', 'JudgmentAmount', 'SettlementHistory']:
                    val = row_dict.get(key)
                    if val:
                        entry[key] = safe_str(val, 300)

                # Extract date fields
                for key in ['EffectiveDate', 'EffectiveDateOfAction', 'DateOfAction']:
                    val = row_dict.get(key)
                    if val:
                        entry['effective_date'] = safe_date(val)
                        break

                disc_by_license[license_id].append(entry)
                count += 1

            total += count
            if count > 0:
                print(f"    {table}: {count:,} records")

        except Exception as e:
            print(f"    Warning: Could not read {table}: {e}")

    unique_licenses = len(disc_by_license)
    print(f"  Total: {total:,} disciplinary records across {unique_licenses:,} unique licenses")
    return disc_by_license


def build_provider_license(row_dict, status_map, disc_by_license):
    """Map one Access License row to a provider_licenses record."""
    license_id = row_dict.get('LicenseID')
    first_name = safe_str(row_dict.get('FirstName'))
    last_name = safe_str(row_dict.get('LastName'))
    middle_name = safe_str(row_dict.get('MiddleName'))

    # Build licensee_name
    parts = [first_name, middle_name, last_name]
    licensee_name = ' '.join(p for p in parts if p)

    # License number
    license_num = safe_str(row_dict.get('LicenseNumber'))
    license_type = safe_str(row_dict.get('LicenseType'))

    # Status code decode
    raw_status = safe_str(row_dict.get('PrimaryStatusCode'))
    license_status = status_map.get(raw_status, raw_status) if raw_status else None

    # Disciplinary data
    disc_records = disc_by_license.get(license_id, [])
    has_disciplinary = len(disc_records) > 0

    # Build disciplinary_details JSON (truncate to fit text column)
    disc_details = None
    if has_disciplinary:
        summary = {
            'total_actions': len(disc_records),
            'types': list(set(d['type'] for d in disc_records)),
            'actions': disc_records[:20],  # cap at 20 entries to avoid column overflow
        }
        disc_details = json.dumps(summary, default=str)
        # Truncate if needed (Supabase text columns have practical limits)
        if len(disc_details) > 10000:
            summary['actions'] = disc_records[:5]
            summary['note'] = f'Truncated: {len(disc_records)} total actions'
            disc_details = json.dumps(summary, default=str)

    return {
        'license_number': f"CA-{license_num}" if license_num else None,
        'state': 'CA',
        'board_name': 'Medical Board of California',
        'licensee_name': licensee_name or None,
        'first_name': first_name,
        'last_name': last_name,
        'license_type': license_type,
        'license_status': license_status,
        'address_line_1': safe_str(row_dict.get('AddressOfRecordLine1')),
        'address_line_2': safe_str(row_dict.get('AddressOfRecordLine2')),
        'city': safe_str(row_dict.get('AddressOfRecordCity')),
        'license_state': safe_str(row_dict.get('AddressOfRecordState')),
        'zip_code': safe_str(row_dict.get('AddressOfRecordZipCode')),
        'issue_date': safe_date(row_dict.get('OriginalIssueDate')),
        'expiration_date': safe_date(row_dict.get('ExpirationDate')),
        'has_disciplinary_action': has_disciplinary,
        'disciplinary_details': disc_details,
        'source': 'CA_MB_ACCDB',
        'source_updated_at': datetime.utcnow().isoformat(),
        'last_synced_at': datetime.utcnow().isoformat(),
    }


def main():
    parser = argparse.ArgumentParser(description='Load CA Medical Board .accdb into provider_licenses')
    parser.add_argument('--db-path', default=DEFAULT_DB_PATH, help='Path to .accdb file')
    parser.add_argument('--dry-run', action='store_true', help='Preview without inserting')
    parser.add_argument('--limit', type=int, default=0, help='Limit rows (0=all)')
    args = parser.parse_args()

    print('═' * 55)
    print('  KairoLogic — CA Medical Board .accdb Loader')
    print('═' * 55)
    print(f'  Database:  {args.db_path}')
    print(f'  Dry run:   {args.dry_run}')
    print(f'  Limit:     {args.limit or "ALL"}')
    print()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
        sys.exit(1)

    # ── Connect to Access DB ──
    try:
        import pyodbc
    except ImportError:
        print('[FATAL] pyodbc not installed. Run: pip install pyodbc')
        sys.exit(1)

    conn_str = f'DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={args.db_path};'
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        print('[1/4] Connected to Access database')
    except Exception as e:
        print(f'[FATAL] Cannot open database: {e}')
        sys.exit(1)

    # ── Step 1: Load status code reference ──
    print('\n[2/4] Loading reference data...')
    status_map = load_status_codes(cursor)

    # ── Step 2: Load all disciplinary records ──
    print('\n[3/4] Loading disciplinary records...')
    disc_by_license = load_disciplinary_records(cursor)

    # ── Step 3: Process License table and upsert ──
    print(f'\n[4/4] Processing License table...')
    query = 'SELECT * FROM License'
    if args.limit > 0:
        query = f'SELECT TOP {args.limit} * FROM License'

    cursor.execute(query)
    cols = [desc[0] for desc in cursor.description]

    inserted = 0
    errors = 0
    batch = []
    start_time = time.time()

    # Status distribution tracking
    status_counts = defaultdict(int)
    disc_count = 0

    while True:
        rows = cursor.fetchmany(1000)
        if not rows:
            break

        for row in rows:
            row_dict = dict(zip(cols, row))
            record = build_provider_license(row_dict, status_map, disc_by_license)

            if record['license_number'] is None:
                continue

            # Track stats
            status_counts[record['license_status'] or 'Unknown'] += 1
            if record['has_disciplinary_action']:
                disc_count += 1

            batch.append(record)

            if len(batch) >= BATCH_SIZE:
                # Deduplicate within batch by license_number (keep last occurrence)
                seen_keys = {}
                for rec in batch:
                    key = (rec['license_number'], rec['state'])
                    seen_keys[key] = rec
                batch = list(seen_keys.values())
                if args.dry_run:
                    inserted += len(batch)
                else:
                    try:
                        supabase_request(
                            'provider_licenses?on_conflict=license_number,state',
                            method='POST',
                            body=batch
                        )
                        inserted += len(batch)
                    except Exception as e:
                        print(f'  Error on batch: {str(e)[:200]}')
                        errors += 1

                batch = []

                if inserted % 5000 == 0:
                    elapsed = time.time() - start_time
                    rate = inserted / elapsed if elapsed > 0 else 0
                    print(f'  Inserted: {inserted:,}  ({rate:.0f}/s)')

                # Small delay to avoid Supabase rate limits
                time.sleep(0.1)

    # Final batch
    if batch:
        # Deduplicate within batch
        seen_keys = {}
        for rec in batch:
            key = (rec['license_number'], rec['state'])
            seen_keys[key] = rec
        batch = list(seen_keys.values())

        if args.dry_run:
            inserted += len(batch)
        else:
            try:
                supabase_request(
                    'provider_licenses?on_conflict=license_number,state',
                    method='POST',
                    body=batch
                )
                inserted += len(batch)
            except Exception as e:
                print(f'  Error on final batch: {str(e)[:200]}')
                errors += 1

    conn.close()

    # ── Summary ──
    elapsed = time.time() - start_time
    print()
    print('═' * 55)
    print(f'  CA Medical Board load complete in {elapsed:.1f}s')
    print(f'  Licenses loaded:   {inserted:,}')
    print(f'  With disciplinary: {disc_count:,}')
    print(f'  Errors:            {errors}')
    print()
    print('  Status distribution:')
    for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f'    {status:30s} {count:>8,}')
    print('═' * 55)

    if args.dry_run:
        print('\n  DRY RUN — no data written to Supabase')
        print('  Sample record:')
        # Re-read one row for sample
        conn2 = pyodbc.connect(conn_str)
        c2 = conn2.cursor()
        c2.execute('SELECT TOP 1 * FROM License')
        sample_cols = [d[0] for d in c2.description]
        sample_row = dict(zip(sample_cols, c2.fetchone()))
        sample = build_provider_license(sample_row, status_map, disc_by_license)
        for k, v in sample.items():
            if v is not None:
                print(f'    {k}: {str(v)[:80]}')
        conn2.close()


if __name__ == '__main__':
    main()
