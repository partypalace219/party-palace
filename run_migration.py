#!/usr/bin/env python3
"""
Run SQL migrations on Supabase database
"""

import requests

SUPABASE_URL = 'https://nsedpvrqhxcikhlieize.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g'

# Read the migration SQL
with open('migrate_products.sql', 'r', encoding='utf-8') as f:
    sql_content = f.read()

# Split into individual INSERT statements
statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and 'INSERT INTO' in stmt]

print(f'Found {len(statements)} INSERT statements')
print('Inserting products into Supabase...\n')

# First, delete existing products
delete_url = f'{SUPABASE_URL}/rest/v1/products'
headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Delete all existing products
response = requests.delete(delete_url, headers=headers, params={'id': 'neq.0'})
if response.status_code in [200, 204]:
    print('[OK] Cleared existing products')
else:
    print(f'[WARNING] Could not clear products: {response.status_code}')

# Now insert products using Supabase REST API
# Parse the SQL INSERT statements into JSON
import re

success_count = 0
for statement in statements:
    # Extract values from INSERT statement
    match = re.search(r"VALUES \('([^']+)', '([^']+)', '([^']+)', ([0-9.]+), '([^']+)', (true|false), '([^']+)'\)", statement)
    if match:
        name, category, description, price, price_label, featured, emoji = match.groups()

        product_data = {
            'name': name,
            'category': category,
            'description': description,
            'price': float(price),
            'price_label': price_label,
            'featured': featured == 'true',
            'emoji': emoji
        }

        # Insert using REST API
        insert_url = f'{SUPABASE_URL}/rest/v1/products'
        response = requests.post(insert_url, headers=headers, json=product_data)

        if response.status_code in [200, 201]:
            print(f'[OK] Inserted: {name}')
            success_count += 1
        else:
            print(f'[ERROR] Failed to insert {name}: {response.status_code} - {response.text}')

print(f'\n[SUCCESS] Inserted {success_count} products into Supabase!')
