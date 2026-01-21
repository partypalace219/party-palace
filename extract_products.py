import re
import json

# Read app.js
with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find products array
match = re.search(r'const products = \[(.*?)\];', content, re.DOTALL)
if not match:
    print("Could not find products array")
    exit(1)

products_str = match.group(1)

# Split by product objects
product_objects = []
current = ""
brace_count = 0
in_string = False
string_char = None
escape_next = False

for i, char in enumerate(products_str):
    prev_char = products_str[i-1] if i > 0 else ''
    
    # Handle escape sequences
    if escape_next:
        escape_next = False
        current += char
        continue
    
    if char == '\\':
        escape_next = True
        current += char
        continue
    
    # Track strings
    if char in ['"', "'"]:
        if not in_string:
            in_string = True
            string_char = char
        elif char == string_char:
            in_string = False
    
    if not in_string:
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
    
    current += char
    
    # When we close a product object
    if not in_string and brace_count == 0 and char == '}':
        product_objects.append(current.strip().rstrip(',').strip())
        current = ""

print(f"Found {len(product_objects)} products")

# Parse product properties
def parse_product(prod_str):
    product = {}
    
    # Extract id
    id_match = re.search(r'id:\s*(\d+)', prod_str)
    if id_match:
        product['id'] = int(id_match.group(1))
    
    # Extract name
    name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", prod_str)
    if name_match:
        product['name'] = name_match.group(1)
    
    # Extract category
    cat_match = re.search(r"category:\s*['\"]([^'\"]+)['\"]", prod_str)
    if cat_match:
        product['category'] = cat_match.group(1)
    
    # Extract price
    price_match = re.search(r'price:\s*(\d+(?:\.\d+)?)', prod_str)
    if price_match:
        product['price'] = float(price_match.group(1))
    
    # Extract priceLabel
    label_match = re.search(r"priceLabel:\s*['\"]([^'\"]+)['\"]", prod_str)
    if label_match:
        product['priceLabel'] = label_match.group(1)
    
    # Extract description
    desc_match = re.search(r"description:\s*['\"]([^'\"]+)['\"]", prod_str)
    if desc_match:
        product['description'] = desc_match.group(1)
    
    # Extract icon
    icon_match = re.search(r"icon:\s*['\"]([^'\"]+)['\"]", prod_str)
    if icon_match:
        product['icon'] = icon_match.group(1)
    
    # Extract popular
    popular_match = re.search(r'popular:\s*(true|false)', prod_str)
    if popular_match:
        product['popular'] = popular_match.group(1) == 'true'
    
    return product

# Parse all products
parsed_products = []
for prod_str in product_objects:
    try:
        product = parse_product(prod_str)
        if product.get('id'):
            parsed_products.append(product)
    except Exception as e:
        print(f"Error parsing product: {e}")

print(f"Parsed {len(parsed_products)} products")

# Generate SQL
sql_lines = []
sql_lines.append("-- Migrate all products from app.js to Supabase")
sql_lines.append("-- Delete existing sample products first")
sql_lines.append("DELETE FROM products;")
sql_lines.append("")

for p in parsed_products:
    name = p.get('name', '').replace("'", "''")
    category = p.get('category', '')
    description = p.get('description', '').replace("'", "''")
    price = p.get('price', 0)
    price_label = p.get('priceLabel', 'starting at').replace("'", "''")
    featured = 'true' if p.get('popular', False) else 'false'
    emoji = p.get('icon', '')
    
    sql = f"INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('{name}', '{category}', '{description}', {price}, '{price_label}', {featured}, '{emoji}');"
    sql_lines.append(sql)

# Write SQL file
with open('migrate_products.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"Generated migrate_products.sql with {len(parsed_products)} products")
