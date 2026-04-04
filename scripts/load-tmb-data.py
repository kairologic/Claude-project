#!/usr/bin/env python3
"""
load-tmb-data.py

Loads TMB data into the provider_licenses table from two sources:
  1. PHY file (pipe-delimited) — full physician roster with addresses, specialties, statuses
  2. Board Action XLS — disciplinary actions with violations

Usage:
  python scripts/load-tmb-data.py --phy path/to/physician-file.txt [--dry-run]
  python scripts/load-tmb-data.py --bad path/to/202603BAD.XLS [--dry-run]
  python scripts/load-tmb-data.py --phy physician.txt --bad 202603BAD.XLS [--dry-run]

The PHY file should be loaded FIRST (full roster), then the BAD file overlays
disciplinary data on top using license_number as the join key.

Requires:
  pip install xlrd requests
"""

import sys
import os
import json
import requests
from collections import Counter
from datetime import datetime

SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
BATCH_SIZE = 200

# ── Registration status mapping (from Physician_Layout.pdf) ───

STATUS_MAP = {
    'AC': 'ACTIVE',
    'ACN': 'ACTIVE_NOT_PRACTICING',
    'BC': 'BAD_CREDIT',
    'CC': 'CANCELLED_BY_REQUEST',
    'CN': 'CANCELLED_NON_PAYMENT',
    'CNB': 'CANCELLED_NON_PAYMENT_BY_BOARD',
    'CNS': 'CANCELLED_SUPERSEDED',
    'CP': 'COMPLETE_PENDING_REINSTATEMENT',
    'CR': 'INACTIVE_PRELIM_TO_CR',
    'CRB': 'CANCELLED_BY_REQUEST_BY_BOARD',
    'CTL': 'CME_TEMPORARY_LICENSE',
    'DC': 'DECEASED',
    'DQ': 'DELINQUENT_NON_PAYMENT',
    'IA': 'INACTIVE',
    'LD': 'LOAN_DEFAULT',
    'LI': 'LICENSE_ISSUED',
    'LS': 'LICENSE_SUPERSEDED',
    'NA': 'NOT_ACTIVE',
    'NR': 'NON_STANDARD_RETIRED',
    'PPD': 'PAYMENT_PROCESSING_DELAY',
    'PR': 'PENDING_RELICENSURE',
    'SBA': 'SUSPENDED',
    'TI': 'TEXAS_LICENSE_ISSUED',
    'TR': 'TEXAS_RETIRED',
    'VC': 'VOLUNTARY_CHARITY_CARE',
}

CRITICAL_STATUSES = {'SBA', 'DC', 'CN', 'CNB', 'DQ', 'CC'}

# ── Supabase Helper ───────────────────────────────────────

def upsert_batch(rows, on_conflict='license_number,state'):
    url = f"{SUPABASE_URL}/rest/v1/provider_licenses?on_conflict={on_conflict}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    resp = requests.post(url, headers=headers, json=rows)
    if resp.status_code >= 400:
        # Fallback: try ignore-duplicates
        headers['Prefer'] = 'resolution=ignore-duplicates,return=minimal'
        url2 = f"{SUPABASE_URL}/rest/v1/provider_licenses"
        resp2 = requests.post(url2, headers=headers, json=rows)
        if resp2.status_code >= 400:
            raise Exception(f"Upsert failed: {resp2.status_code} {resp2.text[:300]}")

# ── Date Helpers ──────────────────────────────────────────

def parse_date_mmddyyyy(val):
    """Parse MMDDYYYY or MM/DD/YYYY to ISO date string."""
    if not val or val == '0':
        return None
    val = val.strip().replace('/', '')
    if len(val) == 8 and val.isdigit():
        try:
            return datetime.strptime(val, '%m%d%Y').strftime('%Y-%m-%d')
        except ValueError:
            return None
    return None

def parse_date_slash(val):
    """Parse MM/DD/YYYY to ISO date string."""
    if not val:
        return None
    try:
        return datetime.strptime(val.strip(), '%m/%d/%Y').strftime('%Y-%m-%d')
    except ValueError:
        return None

# ════════════════════════════════════════════════════════════
# PHY FILE PARSER (pipe-delimited, full roster)
# ════════════════════════════════════════════════════════════

# Field order from Physician_Layout.pdf (pipe-delimited version)
PHY_FIELDS = [
    'ID', 'LIC', 'FIL', 'LN', 'FN', 'SUF',
    'MA1', 'MA2', 'MC', 'MS', 'MZIP',
    'PA1', 'PA2', 'PC', 'PS', 'PZIP',
    'YOB', 'POB', 'SPEC1', 'SPEC2',
    'SCH', 'GYR', 'DEG',
    'LID', 'MOL', 'REC', 'LED',
    'PTC', 'PSC', 'PMC',
    'RSC', 'RSD',
    'CNTY', 'GEN', 'RAC', 'HIS',
]

def parse_phy_file(filepath):
    """Parse the TMB Physician Database pipe-delimited file."""
    records = []
    skipped = 0
    errors = 0
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        for line_num, line in enumerate(f, 1):
            line = line.rstrip('\n\r')
            if not line:
                continue
            
            parts = line.split('|')
            
            if len(parts) < 30:
                skipped += 1
                continue
            
            # Map fields
            row = {}
            for i, field_name in enumerate(PHY_FIELDS):
                row[field_name] = parts[i].strip() if i < len(parts) else ''
            
            license_num = row.get('LIC', '').strip()
            if not license_num:
                skipped += 1
                continue
            
            last_name = row.get('LN', '').strip()
            first_name = row.get('FN', '').strip()
            regstat = row.get('RSC', '').strip()
            
            provider_name = f"{last_name}, {first_name}".strip(', ')
            license_status = STATUS_MAP.get(regstat, regstat or 'UNKNOWN')
            
            # Parse dates
            issue_date = parse_date_mmddyyyy(row.get('LID', ''))
            expiry_date = parse_date_mmddyyyy(row.get('LED', ''))
            status_date = parse_date_mmddyyyy(row.get('RSD', ''))
            
            record = {
                'license_number': license_num,
                'state': 'TX',
                'license_state': row.get('PS', '').strip() or 'TX',
                'board_name': 'Texas Medical Board',
                'licensee_name': provider_name,
                'license_type': 'MD' if row.get('DEG', '') == 'MD' else row.get('DEG', '') or 'MD',
                'license_status': license_status,
                'specialty': row.get('SPEC1', '').strip() or None,
                'address_line_1': row.get('PA1', '').strip() or None,
                'address_line_2': row.get('PA2', '').strip() or None,
                'city': row.get('PC', '').strip() or None,
                'zip_code': row.get('PZIP', '').strip() or None,
                'issue_date': issue_date,
                'expiration_date': expiry_date,
                'has_disciplinary_action': False,
                'source': 'tmb_phy_file',
                'last_synced_at': datetime.utcnow().isoformat(),
            }
            
            # Remove None values
            # Keep all keys — Supabase requires consistent columns across batch
            records.append(record)
            return records, skipped    
            return records, skipped, errors

# ════════════════════════════════════════════════════════════
# BOARD ACTION XLS PARSER (disciplinary records)
# ════════════════════════════════════════════════════════════

def parse_board_actions(filepath):
    """Parse the TMB Board Action XLS file."""
    import xlrd
    wb = xlrd.open_workbook(filepath)
    ws = wb.sheet_by_index(0)
    headers = [ws.cell_value(0, c).strip() for c in range(ws.ncols)]
    
    records = []
    skipped = 0
    
    for r in range(1, ws.nrows):
        row = {}
        for c in range(ws.ncols):
            val = ws.cell_value(r, c)
            if isinstance(val, float):
                val = str(int(val)) if val == int(val) else str(val)
            row[headers[c]] = str(val).strip() if val else ''
        
        license_num = row.get('LICENSE_NUM', '').strip()
        if not license_num:
            skipped += 1
            continue
        
        last_name = row.get('LAST_NAME', '').strip()
        first_name = row.get('FIRST_NAME', '').strip()
        regstat = row.get('REGSTAT', '').strip()
        order_disp = row.get('ORDER_DISP', '').strip()
        mpa_primary = row.get('MPA_PRIMARY', '').strip()
        
        provider_name = f"{last_name}, {first_name}".strip(', ')
        license_status = STATUS_MAP.get(regstat, regstat or 'UNKNOWN')
        
        # Build disciplinary details
        details_parts = []
        if order_disp:
            details_parts.append(f"Action: {order_disp}")
        if mpa_primary:
            details_parts.append(f"Violation: {mpa_primary}")
        disciplinary_details = ' | '.join(details_parts) if details_parts else None
        
        issue_date = parse_date_slash(row.get('LIC_ISSUE_DT', ''))
        
        record = {
            'license_number': license_num,
            'state': 'TX',
            'license_state': 'TX',
            'board_name': 'Texas Medical Board',
            'licensee_name': provider_name,
            'license_type': row.get('DEG', '').strip() or None,
            'license_status': license_status,
            'specialty': row.get('PRIMARY_SPEC', '').strip() or None,
            'address_line_1': row.get('PADD1', '').strip() or None,
            'address_line_2': row.get('PADD2', '').strip() or None,
            'city': row.get('PCITY', '').strip() or None,
            'zip_code': row.get('PZIP', '').strip() or None,
            'issue_date': issue_date,
            'has_disciplinary_action': True,
            'disciplinary_details': disciplinary_details,
            'source': 'tmb_board_action',
            'last_synced_at': datetime.utcnow().isoformat(),
        }
        
       # Keep all keys — Supabase requires consistent columns across batch
        records.append(record)
# Deduplicate by license_number — keep last (most recent) action
    seen = {}
    for r in records:
        key = r.get('license_number', '')
        seen[key] = r  # last one wins
    unique = list(seen.values())
    
    return unique, skipped + (len(records) - len(unique))
    
    return records, skipped

# ════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════

def print_stats(records, label):
    statuses = Counter(r.get('license_status', '') for r in records)
    with_addr = sum(1 for r in records if r.get('address_line_1'))
    with_spec = sum(1 for r in records if r.get('specialty'))
    disciplined = sum(1 for r in records if r.get('has_disciplinary_action'))
    
    print(f"\n[{label}] Data quality:")
    print(f"  Total records:         {len(records):,}")
    print(f"  With practice address: {with_addr:,}")
    print(f"  With specialty:        {with_spec:,}")
    print(f"  With disciplinary:     {disciplined:,}")
    print(f"\n  Status breakdown (top 10):")
    for status, count in statuses.most_common(10):
        marker = " ***" if status == 'SUSPENDED' else ""
        print(f"    {count:>6,}  {status}{marker}")

def do_upsert(records, label, dry_run):
    if dry_run:
        print(f"\n[{label}] DRY RUN — would upsert {len(records):,} records")
        return 0
    
    print(f"\n[{label}] Upserting {len(records):,} records...")
    inserted = 0
    errors = 0
    
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            upsert_batch(batch)
            inserted += len(batch)
            if inserted % 2000 == 0:
                print(f"  Upserted {inserted:,}...")
        except Exception as e:
            errors += 1
            if errors <= 3:
                print(f"  Error on batch {i // BATCH_SIZE + 1}: {e}")
            elif errors == 4:
                print(f"  (suppressing further error messages)")
    
    print(f"[{label}] Complete: {inserted:,} upserted, {errors} batch errors")
    return inserted

def main():
    args = sys.argv[1:]
    dry_run = '--dry-run' in args
    phy_file = None
    bad_file = None
    
    for i, a in enumerate(args):
        if a == '--phy' and i + 1 < len(args):
            phy_file = args[i + 1]
        if a == '--bad' and i + 1 < len(args):
            bad_file = args[i + 1]
    
    if not phy_file and not bad_file:
        print("Usage:")
        print("  python scripts/load-tmb-data.py --phy physician.txt [--dry-run]")
        print("  python scripts/load-tmb-data.py --bad 202603BAD.XLS [--dry-run]")
        print("  python scripts/load-tmb-data.py --phy physician.txt --bad 202603BAD.XLS [--dry-run]")
        sys.exit(1)
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    print("═" * 55)
    print("  KairoLogic — TMB Data Loader")
    print("  Physician Roster + Board Action Records")
    print("═" * 55)
    if phy_file:
        print(f"  PHY file:  {phy_file}")
    if bad_file:
        print(f"  BAD file:  {bad_file}")
    print(f"  Dry run:   {dry_run}")
    print()
    
    total_inserted = 0
    
    # Step 1: Load PHY file (full roster)
    if phy_file:
        if not os.path.exists(phy_file):
            print(f"[FATAL] PHY file not found: {phy_file}")
            sys.exit(1)
        
        print("[PHY] Parsing pipe-delimited physician roster...")
        phy_records, phy_skipped, phy_errors = parse_phy_file(phy_file)
        print(f"[PHY] Parsed: {len(phy_records):,} records ({phy_skipped} skipped)")
        print_stats(phy_records, 'PHY')
        total_inserted += do_upsert(phy_records, 'PHY', dry_run)
    
    # Step 2: Load Board Action XLS (overlay disciplinary data)
    if bad_file:
        if not os.path.exists(bad_file):
            print(f"[FATAL] BAD file not found: {bad_file}")
            sys.exit(1)
        
        print("\n[BAD] Parsing Board Action XLS...")
        bad_records, bad_skipped = parse_board_actions(bad_file)
        print(f"[BAD] Parsed: {len(bad_records):,} records ({bad_skipped} skipped)")
        print_stats(bad_records, 'BAD')
        
        # Show newsroom suspension matches
        suspensions = [r for r in bad_records if r.get('license_status') == 'SUSPENDED']
        if suspensions:
            print(f"\n  Active suspensions (SBA): {len(suspensions)}")
            for s in suspensions[:15]:
                print(f"    {s['licensee_name']:<35} Lic: {s['license_number']:<10}")
        
        total_inserted += do_upsert(bad_records, 'BAD', dry_run)
    
    print("\n" + "═" * 55)
    print(f"  Total records loaded: {total_inserted:,}")
    if dry_run:
        print("  ⚠ DRY RUN — no data was written")
    print("═" * 55)

if __name__ == '__main__':
    main()
