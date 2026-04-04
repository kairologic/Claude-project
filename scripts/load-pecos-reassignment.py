#!/usr/bin/env python3
"""
load-pecos-reassignment.py

Loads the CMS PECOS Revalidation Reassignment List CSV and uses it to
pre-populate practice_providers by mapping individual NPIs to practice groups.

Join chain:
  practice_websites.npi (org NPI)
    → provider_pecos (npi → enrollment_id)
      → reassignment CSV (Group Enrollment ID → Individual NPI)
        → INSERT into practice_providers

This dramatically improves provider match rates by using the official
CMS billing relationship data (which individuals bill through which orgs).

Usage:
  python scripts/load-pecos-reassignment.py data/Revalidation_Reassignment_List_Mar_2026.csv --dry-run
  python scripts/load-pecos-reassignment.py data/Revalidation_Reassignment_List_Mar_2026.csv

Requires: pip install requests
"""

import sys
import os
import csv
import json
import requests
from collections import defaultdict
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
BATCH_SIZE = 200

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

def db_post(path, rows):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
    }
    resp = requests.post(url, headers=headers, json=rows)
    if resp.status_code >= 400:
        error_text = resp.text[:200]
        if '23505' not in error_text:  # ignore duplicate key
            raise Exception(f"DB POST error: {resp.status_code} {error_text}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/load-pecos-reassignment.py path/to/reassignment.csv [--dry-run] [--state TX]")
        sys.exit(1)

    filepath = sys.argv[1]
    dry_run = '--dry-run' in sys.argv
    filter_state = 'TX'
    for i, a in enumerate(sys.argv):
        if a == '--state' and i + 1 < len(sys.argv):
            filter_state = sys.argv[i + 1].upper()

    if not os.path.exists(filepath):
        print(f"[FATAL] File not found: {filepath}")
        sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    print("=" * 55)
    print("  KairoLogic - PECOS Reassignment Bridge")
    print("  Map Individual NPIs to Practice Groups")
    print("=" * 55)
    print(f"  File:      {filepath}")
    print(f"  State:     {filter_state}")
    print(f"  Dry run:   {dry_run}")
    print()

    # ── Step 1: Parse reassignment CSV ──
    print("[1/4] Parsing reassignment CSV...")
    
    # Build map: Group Enrollment ID → list of individual NPIs
    group_to_individuals = defaultdict(list)
    total_rows = 0
    filtered_rows = 0
    
    with open(filepath, 'r', encoding='utf-8-sig', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_rows += 1
            
            group_state = (row.get('Group State Code') or '').strip()
            individual_state = (row.get('Individual State Code') or '').strip()
            
            # Filter by state (either group or individual in target state)
            if filter_state and group_state != filter_state and individual_state != filter_state:
                continue
            
            filtered_rows += 1
            
            group_enrl_id = (row.get('Group Enrollment ID') or '').strip()
            group_pac_id = (row.get('Group PAC ID') or '').strip()
            individual_npi = (row.get('Individual NPI') or '').strip()
            individual_fn = (row.get('Individual First Name') or '').strip()
            individual_ln = (row.get('Individual Last Name') or '').strip()
            individual_spec = (row.get('Individual Specialty Description') or '').strip()
            group_name = (row.get('Group Legal Business Name') or '').strip()
            
            if not individual_npi or len(individual_npi) != 10:
                continue
            
            if group_enrl_id:
                group_to_individuals[group_enrl_id].append({
                    'individual_npi': individual_npi,
                    'individual_name': f"{individual_ln}, {individual_fn}".strip(', '),
                    'individual_specialty': individual_spec,
                    'group_pac_id': group_pac_id,
                    'group_name': group_name,
                    'group_state': group_state,
                })
            
            # Also index by PAC ID as backup join key
            if group_pac_id:
                key = f"PAC:{group_pac_id}"
                group_to_individuals[key].append({
                    'individual_npi': individual_npi,
                    'individual_name': f"{individual_ln}, {individual_fn}".strip(', '),
                    'individual_specialty': individual_spec,
                    'group_pac_id': group_pac_id,
                    'group_name': group_name,
                    'group_state': group_state,
                })
    
    unique_groups = len([k for k in group_to_individuals.keys() if not k.startswith('PAC:')])
    unique_individuals = len(set(
        ind['individual_npi']
        for inds in group_to_individuals.values()
        for ind in inds
    ))
    
    print(f"  Total CSV rows:       {total_rows:,}")
    print(f"  {filter_state} rows:            {filtered_rows:,}")
    print(f"  Unique groups:        {unique_groups:,}")
    print(f"  Unique individuals:   {unique_individuals:,}")

    # ── Step 2: Load practice_websites with org NPIs ──
    print(f"\n[2/4] Loading practice_websites (state={filter_state})...")
    
    # Fetch in pages
    all_sites = []
    offset = 0
    page_size = 1000
    while True:
        sites = db_get(
            f"practice_websites?state=eq.{filter_state}&npi=not.is.null"
            f"&select=id,npi,name,url"
            f"&limit={page_size}&offset={offset}"
        )
        if not sites:
            break
        all_sites.extend(sites)
        offset += page_size
        if len(sites) < page_size:
            break
    
    print(f"  Practice websites:    {len(all_sites):,}")

    # ── Step 3: Match via provider_pecos enrollment_id ──
    print(f"\n[3/4] Matching practice orgs to reassignment groups...")
    
    matched_sites = 0
    total_associations = 0
    associations_to_insert = []
    
    # Process in batches of 50 NPIs at a time
    batch_size = 50
    for i in range(0, len(all_sites), batch_size):
        batch_sites = all_sites[i:i + batch_size]
        npi_list = ','.join(f'"{s["npi"]}"' for s in batch_sites)
        
        # Look up enrollment IDs for these org NPIs
        try:
            pecos_records = db_get(
                f"provider_pecos?npi=in.({npi_list})"
                f"&select=npi,enrollment_id"
            )
        except Exception as e:
            print(f"  Warning: PECOS lookup failed for batch {i // batch_size}: {e}")
            continue
        
        # Build NPI → enrollment_id map
        npi_to_enrollment = {}
        for p in pecos_records:
            if p.get('enrollment_id'):
                npi_to_enrollment[p['npi']] = p['enrollment_id']
        
        # For each site, find individuals via enrollment_id
        for site in batch_sites:
            org_npi = site['npi']
            enrollment_id = npi_to_enrollment.get(org_npi)
            
            individuals = []
            
            # Try enrollment ID join first
            if enrollment_id and enrollment_id in group_to_individuals:
                individuals = group_to_individuals[enrollment_id]
            
            if not individuals:
                # No match via enrollment ID — skip
                # (PAC ID join would need additional PECOS column)
                continue
            
            matched_sites += 1
            
            # Deduplicate by NPI
            seen_npis = set()
            for ind in individuals:
                npi = ind['individual_npi']
                if npi in seen_npis:
                    continue
                seen_npis.add(npi)
                
                associations_to_insert.append({
                    'npi': npi,
                    'practice_website_id': site['id'],
                    'association_source': 'DETECTED',
                    'status': 'UNVERIFIED',
                })
                total_associations += 1
        
        # Progress
        processed = min(i + batch_size, len(all_sites))
        if processed % 500 == 0 or processed == len(all_sites):
            print(f"  Processed: {processed:,}/{len(all_sites):,} sites, "
                  f"{matched_sites:,} matched, {total_associations:,} associations")

    print(f"\n  Final: {matched_sites:,} sites matched, {total_associations:,} provider associations")

    # ── Step 4: Insert into practice_providers ──
    if dry_run:
        print(f"\n[4/4] DRY RUN - would insert {total_associations:,} records into practice_providers")
        
        # Show sample
        if associations_to_insert:
            print(f"\n  Sample associations (first 10):")
            for a in associations_to_insert[:10]:
                print(f"    NPI {a['npi']} → site {a['practice_website_id'][:8]}...")
    else:
        print(f"\n[4/4] Inserting {total_associations:,} records into practice_providers...")
        inserted = 0
        errors = 0
        
        for i in range(0, len(associations_to_insert), BATCH_SIZE):
            batch = associations_to_insert[i:i + BATCH_SIZE]
            try:
                db_post('practice_providers', batch)
                inserted += len(batch)
                if inserted % 2000 == 0:
                    print(f"  Inserted {inserted:,}...")
            except Exception as e:
                errors += 1
                if errors <= 3:
                    print(f"  Error on batch {i // BATCH_SIZE + 1}: {e}")
        
        print(f"  Complete: {inserted:,} inserted, {errors} errors")

    print("\n" + "=" * 55)
    print(f"  Reassignment bridge complete")
    if dry_run:
        print("  (DRY RUN - no data written)")
    print("=" * 55)

if __name__ == '__main__':
    main()
