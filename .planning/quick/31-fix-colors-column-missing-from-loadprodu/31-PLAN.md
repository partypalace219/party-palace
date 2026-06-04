# Quick Task 31: Fix colors column missing from loadProducts SELECT + optional Violet data cleanup

## Goal
Add `colors` to the public `loadProducts()` SELECT in `products.js` so color swatches render on 3D Print product cards. Provide optional SQL for Violet data cleanup.

## Diagnostic Findings
- `products.js:32` SELECT is missing `colors` — confirmed bug
- Transform (lines 41-61) has no `colors` field, so `product.colors` is always `undefined`
- `staff.js:243` already includes `colors` and maps it correctly — no change needed there
- Render function at `products.js:214` handles `undefined` gracefully with `Array.isArray(product.colors) ? product.colors : []` — render side is correct
- Bug is purely in the fetch/transform

## Tasks

### Task 1: Add colors to loadProducts SELECT and transform in products.js

**File:** `products.js`

**Change 1 — SELECT (line 32):**
Add `colors` to the cols string after `size_variants`:
```
Before: 'id,name,slug,category,sub_category,price,sale,emoji,featured,price_label,description,size,material,image_url,image_urls,size_variants'
After:  'id,name,slug,category,sub_category,price,sale,emoji,featured,price_label,description,size,material,image_url,image_urls,size_variants,colors'
```

**Change 2 — Transform (line ~59, after size_variants):**
Add colors mapping:
```js
size_variants: p.size_variants || null,
colors: p.colors || [],
hasGallery: true
```

### Task 2: Bump cache-bust in index.html

Update `ui.js?v=2026-06-03-29` to `ui.js?v=2026-06-04-31` in index.html.

### Task 3: Provide optional Violet SQL cleanup

Output a SQL block the user can run in Supabase SQL Editor to strip "Violet" from all products' colors arrays.

## Constraints
- Do NOT modify staff.js, cart.js, ui.js, or render functions
- Do NOT change anything other than the SELECT column list and transform in products.js
- colors default must be empty array (not null, not undefined)
