#!/usr/bin/env python3
"""
load-tmb-board-actions.py

Loads the TMB Board Action Data XLS file into the provider_licenses table.
15,835 disciplinary action records with license numbers, statuses, and violations.

This is a one-time bootstrap loader. After loading, the TMB Newsroom Monitor
handles ongoing detection and the ORSSP PHY file provides the full roster quarterly.

Usage:
  python scripts/load-tmb-board-actions.py path/to/202603BAD.XLS [--dry-run]

Requires:
  pip install xlrd requests
"""

import sys
import os
import json
import xlrd
import requests
from collections import Counter

# ── Config ────────────────────────────────────────────────

SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
BATCH_SIZE = 200

# Status codes that represent critical disciplinary states
CRITICAL_STATUSES = {'SBA', 'DC', 'CN', 'CNB', 'DQ', 'CC', 'TR'}
SUSPENSION_STATUSES = {'SBA'}
REVOKED_STATUSES = {'DC', 'CN', 'CNB'}

# ── Supabase Helper ───────────────────────────────────────

def upsert_batch(rows):
    """Upsert a batch of rows to provider_licenses."""
    url = f"{SUPABASE_URL}/rest/v1/provider_licenses?on_conflict=license_number,source"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    resp = requests.post(url, headers=headers, json=rows)
    if resp.status_code >= 400:
        # Try without on_conflict if the constraint doesn't exist
        if 'could not find' in resp.text.lower() or '42P10' in resp.text:
            url2 = f"{SUPABASE_URL}/rest/v1/provider_licenses"
            headers['Prefer'] = 'resolution=ignore-duplicates,return=minimal'
            resp2 = requests.post(url2, headers=headers, json=rows)
            if resp2.status_code >= 400:
                raise Exception(f"Upsert failed: {resp2.status_code} {resp2.text[:200]}")
            return
        raise Exception(f"Upsert failed: {resp.status_code} {resp.text[:200]}")

# ── Status Mapping ────────────────────────────────────────

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

# ── Parse XLS ─────────────────────────────────────────────

def parse_board_actions(filepath):
    """Parse the TMB Board Action XLS file into provider_licenses rows."""
    wb = xlrd.open_workbook(filepath)
    ws = wb.sheet_by_index(0)
    headers = [ws.cell_value(0, c).strip() for c in range(ws.ncols)]
    
    records = []
    seen_keys = set()
    skipped = 0
    
    for r in range(1, ws.nrows):
        row = {}
        for c in range(ws.ncols):
            val = ws.cell_value(r, c)
            if isinstance(val, float):
                val = str(int(val)) if val == int(val) else str(val)
            row[headers[c]] = str(val).strip() if val else ''
        
        license_num = row.get('LICENSE_NUM', '').strip()
        last_name = row.get('LAST_NAME', '').strip()
        first_name = row.get('FIRST_NAME', '').strip()
        
        # Skip records without a license number (unlicensed practice cases)
        if not license_num:
            skipped += 1
            continue
        
        regstat = row.get('REGSTAT', '').strip()
        order_disp = row.get('ORDER_DISP', '').strip()
        mpa_primary = row.get('MPA_PRIMARY', '').strip()
        
        # Deduplicate: keep the most recent action per license number
        # (file may have multiple actions for the same physician)
        dedup_key = f"{license_num}|{order_disp}"
        if dedup_key in seen_keys:
            skipped += 1
            continue
        seen_keys.add(dedup_key)
        
        # Build provider name
        provider_name = f"{last_name}, {first_name}".strip(', ')
        
        # Map status
        license_status = STATUS_MAP.get(regstat, regstat or 'UNKNOWN')
        
        # Determine severity
        is_critical = regstat in CRITICAL_STATUSES
        is_suspended = regstat in SUSPENSION_STATUSES
        
        # Build the record for provider_licenses
        record = {
            'license_number': license_num,
            'license_state': 'TX',
            'provider_name': provider_name,
            'first_name': first_name,
            'last_name': last_name,
            'license_status': license_status,
            'registration_status_code': regstat,
            'specialty': row.get('PRIMARY_SPEC', '').strip() or None,
            'secondary_specialty': row.get('SECONDARY_SPEC', '').strip() or None,
            'address_line_1': row.get('PADD1', '').strip() or None,
            'city': row.get('PCITY', '').strip() or None,
            'state': row.get('PST', '').strip() or 'TX',
            'zip_code': row.get('PZIP', '').strip() or None,
            'source': 'tmb_board_action',
            'source_file': os.path.basename(filepath),
            'board_action_type': order_disp[:200] if order_disp else None,
            'board_action_violation': mpa_primary[:200] if mpa_primary else None,
            'is_critical': is_critical,
            'degree': row.get('DEG', '').strip() or None,
            'county': row.get('COUNTY_NAME', '').strip() or None,
            'updated_at': None,  # will be set by DB default
        }
        
        # Clean None values for JSON
        record = {k: v for k, v in record.items() if v is not None}
        
        records.append(record)
    
    return records, skipped

# ── Main ──────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/load-tmb-board-actions.py path/to/202603BAD.XLS [--dry-run]")
        sys.exit(1)
    
    filepath = sys.argv[1]
    dry_run = '--dry-run' in sys.argv
    
    if not os.path.exists(filepath):
        print(f"[FATAL] File not found: {filepath}")
        sys.exit(1)
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        print("Set in .env.local or environment variables")
        sys.exit(1)
    
    print("═" * 55)
    print("  KairoLogic — TMB Board Action Data Loader")
    print("  Loading disciplinary records into provider_licenses")
    print("═" * 55)
    print(f"  File:      {filepath}")
    print(f"  Dry run:   {dry_run}")
    print()
    
    # Parse
    print("[TMB] Parsing XLS file...")
    records, skipped = parse_board_actions(filepath)
    
    print(f"[TMB] Parsed: {len(records)} records ({skipped} skipped)")
    
    # Stats
    statuses = Counter(r.get('registration_status_code', '') for r in records)
    critical = sum(1 for r in records if r.get('is_critical'))
    with_address = sum(1 for r in records if r.get('address_line_1'))
    with_specialty = sum(1 for r in records if r.get('specialty'))
    
    print(f"\n[TMB] Data quality:")
    print(f"  With practice address: {with_address}")
    print(f"  With specialty:        {with_specialty}")
    print(f"  Critical status:       {critical}")
    print(f"\n  Status breakdown:")
    for status, count in statuses.most_common(10):
        label = STATUS_MAP.get(status, status)
        marker = " *** " if status in SUSPENSION_STATUSES else ""
        print(f"    {count:>5}  {status:<5} ({label}){marker}")
    
    # Upsert
    if dry_run:
        print(f"\n[TMB] DRY RUN — would upsert {len(records)} records")
        
        # Show the 4 newsroom suspension matches
        suspensions = [r for r in records if r.get('registration_status_code') == 'SBA']
        print(f"\n  Active suspensions (SBA): {len(suspensions)}")
        for s in suspensions[:10]:
            print(f"    {s['provider_name']:<30} Lic: {s['license_number']:<10} Action: {s.get('board_action_type', '')[:50]}")
    else:
        print(f"\n[TMB] Upserting {len(records)} records to provider_licenses...")
        inserted = 0
        errors = 0
        
        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i:i + BATCH_SIZE]
            try:
                upsert_batch(batch)
                inserted += len(batch)
                if inserted % 1000 == 0:
                    print(f"  Upserted {inserted}...")
            except Exception as e:
                errors += 1
                print(f"  Error on batch {i // BATCH_SIZE + 1}: {e}")
        
        print(f"\n[TMB] Complete: {inserted} upserted, {errors} errors")
    
    print("\n" + "═" * 55)
    print("  Done.")
    print("═" * 55)

if __name__ == '__main__':
    main()
