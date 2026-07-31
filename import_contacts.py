#!/usr/bin/env python3
import csv
import json
import os
import re
import sys
from datetime import datetime


def normalize_phone(value):
    s = re.sub(r"\D", "", str(value or ""))
    if not s:
        return ""
    if s.startswith('91') and len(s) == 12:
        return s
    if len(s) == 10:
        return '91' + s
    if len(s) == 11 and s.startswith('0'):
        return '91' + s[1:]
    return s


def extract_phones_from_row(row):
    phones = []
    # look for columns with phone in header
    for k, v in row.items():
        if v is None:
            continue
        if re.search(r'phone|mobile|contact|wa|whats', k, re.IGNORECASE):
            p = normalize_phone(v)
            if p:
                phones.append(p)

    # fallback: search any cell for digit sequences
    if not phones:
        for v in row.values():
            if not v:
                continue
            found = re.findall(r"\d{7,13}", str(v))
            for f in found:
                p = normalize_phone(f)
                if p:
                    phones.append(p)

    # dedupe
    seen = []
    for p in phones:
        if p not in seen:
            seen.append(p)
    return seen


def build_name(row):
    parts = []
    for k in ['First Name', 'Middle Name', 'Last Name', 'FirstName', 'LastName', 'Name', 'name', 'Full Name', 'FullName']:
        if k in row and row[k]:
            parts.append(str(row[k]).strip())
    if parts:
        return ' '.join(parts)
    # fallback: use any 'name' like column
    for k, v in row.items():
        if k and 'name' in k.lower() and v:
            return str(v).strip()
    return ''


def main():
    if len(sys.argv) < 2:
        print('Usage: import_contacts.py <contacts.csv>')
        sys.exit(2)

    csv_path = sys.argv[1]
    root = os.path.dirname(os.path.abspath(__file__))
    contacts_json = os.path.join(root, 'backend', 'data', 'contacts.json')
    debug_log = os.path.join(root, 'import_debug.log')

    def dlog(msg):
        try:
            with open(debug_log, 'a', encoding='utf-8') as dl:
                dl.write(msg + "\n")
        except Exception:
            pass

    dlog(f"START import: csv={csv_path} contacts_json={contacts_json}")

    if not os.path.exists(csv_path):
        dlog(f'CSV not found: {csv_path}')
        print('CSV not found:', csv_path)
        sys.exit(1)

    # load existing
    if os.path.exists(contacts_json):
        try:
            with open(contacts_json, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except Exception:
            existing = []
    else:
        existing = []

    existing_mobiles = set([normalize_phone(c.get('mobile') or c.get('phone') or '') for c in existing])

    added = []
    skipped = 0
    rows_seen = 0

    with open(csv_path, 'r', encoding='utf-8', errors='replace') as fh:
        reader = csv.DictReader(fh)
        for idx, row in enumerate(reader):
            rows_seen += 1
            name = build_name(row)
            phones = extract_phones_from_row(row)
            if not phones:
                continue
            primary = phones[0]
            norm = normalize_phone(primary)
            if not norm:
                continue
            if norm in existing_mobiles:
                skipped += 1
                continue

            contact = {
                'id': int(datetime.utcnow().timestamp() * 1000) + idx,
                'name': name or norm,
                'mobile': norm,
                'company': '',
                'city': '',
                'state': '',
                'vehicle_type': '',
                'is_active': 1,
                'created_at': datetime.utcnow().isoformat() + 'Z'
            }
            added.append(contact)
            existing_mobiles.add(norm)

    dlog(f'Rows scanned: {rows_seen}, Added: {len(added)}, Skipped duplicates: {skipped}')

    if not added:
        dlog('No new contacts found to import.')
        print(f'No new contacts found to import. Skipped duplicates: {skipped}')
        return

    # prepend new contacts
    new_list = added + existing
    os.makedirs(os.path.dirname(contacts_json), exist_ok=True)
    with open(contacts_json, 'w', encoding='utf-8') as f:
        json.dump(new_list, f, indent=2, ensure_ascii=False)
    dlog(f'Imported {len(added)} contacts, skipped {skipped} duplicates. Written to {contacts_json}')
    print(f'Imported {len(added)} contacts, skipped {skipped} duplicates. Written to {contacts_json}')


if __name__ == '__main__':
    main()
