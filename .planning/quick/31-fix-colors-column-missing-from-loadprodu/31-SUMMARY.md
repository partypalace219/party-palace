# Quick Task 31 Summary: Fix colors column missing from loadProducts SELECT

**One-liner:** Added `colors` to `loadProducts()` SELECT and transform in products.js so 3D Print color swatches now render on the public site.

## What Was Built

### Phase 1 — Diagnostic
- `products.js:32` SELECT confirmed missing `colors` column
- Transform (lines 41-61) had no `colors` field — `product.colors` was always `undefined`
- `staff.js:243` already includes `colors` correctly — no change needed there
- Render function at `products.js:214` already handles the data correctly with `Array.isArray(product.colors) ? product.colors : []`
- Root cause: purely in the fetch/transform, same class as Quick Task 27's `image_urls` fix

### Phase 2 — Fix (2 lines changed in products.js, 1 in index.html)

**`products.js:32`** — Added `colors` to SELECT:
```
Before: '...image_url,image_urls,size_variants'
After:  '...image_url,image_urls,size_variants,colors'
```

**`products.js:60`** — Added colors to transform:
```js
colors: p.colors || [],
```

**`index.html`** — Bumped cache-bust:
```
Before: ui.js?v=2026-06-03-29
After:  ui.js?v=2026-06-04-31
```

### Phase 3 — Optional Violet SQL Cleanup (user runs in Supabase SQL Editor)

The `colors` column is `TEXT[]`. Use `array_remove` to strip "Violet":

```sql
-- Step 1: Remove "Violet" from all products that have it
UPDATE products
SET colors = array_remove(colors, 'Violet')
WHERE 'Violet' = ANY(colors);

-- Step 2: Verify — should return 0 rows
SELECT id, name, colors
FROM products
WHERE 'Violet' = ANY(colors);
```

This is optional — the public render function already silently filters Violet (it's not in `PRINT_COLOR_HEX`), so no swatches appear for Violet entries. The SQL is purely cosmetic data hygiene.

## Commits
- `28a7b57` — fix(quick-31): add colors to loadProducts SELECT + transform; cache-bust v31

## Verification Steps (run Playwright on live site after deploy)

1. Hard-refresh thepartypalace.in in incognito
2. Navigate to 3D Prints
3. Confirm at least one product shows color swatches in the public grid
4. Confirm Pink swatch renders as #FFC0CB
5. Confirm Violet swatches do NOT render (filtered by PRINT_COLOR_HEX)
6. Confirm hover tooltips show color names
7. Confirm white swatch has a thin gray border
8. Confirm products with no colors saved show no swatch row
9. Regression: chairs/tables/tents/panels rental flow still works
10. Regression: multi-size 3D Print dropdown still works
11. No unexpected console errors

## Notes
- Color swatch feature has been broken since Quick Task 4 (colors never included in SELECT)
- `staff.js` was unaffected — staff portal fetches colors separately
- `colors TEXT[]` type confirmed from Quick Task 1 migration history
