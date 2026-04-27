---
phase: quick-3
plan: 3
subsystem: product-rendering
tags: [bug-fix, supabase, filtering, search-routing]
dependency_graph:
  requires: [quick-2 normalize_categories migration]
  provides: [Party Decor sub-category filtering, Party Rentals search navigation]
  affects: [products.js, index.html]
tech_stack:
  added: []
  patterns: [Supabase column selection, client-side filtering, navigate() page-id resolution]
key_files:
  created: []
  modified:
    - products.js
    - index.html
decisions:
  - Added sub_category to SELECT column list and row-mapper in products.js — two-line surgical fix
  - Changed targetPage from 'rentals' to 'partyrentals' in index.html handleSearch() — one-line fix
metrics:
  duration: ~10 minutes
  completed: 2026-04-27
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 3: Diagnose and Fix Product Rendering Failure Summary

**One-liner:** Two surgical fixes — `sub_category` added to Supabase fetch+mapper so Party Decor sub-filters work, and search routing corrected from non-existent `'rentals'` to real page id `'partyrentals'`.

## Root Cause

### Bug A — `sub_category` never fetched from Supabase (products.js)

The 2026_normalize_categories.sql migration set `sub_category` on all Party Decor rows (`Arches`, `Columns`, `Walls`, `Centerpieces`), but `products.js` never requested the column nor copied it into in-memory product objects.

**Line 16 — SELECT column list was missing `sub_category`:**
```
BEFORE: 'id,name,slug,category,price,sale,emoji,featured,...'
AFTER:  'id,name,slug,category,sub_category,price,sale,emoji,featured,...'
```

**Line 30 — row-mapper had no sub_category entry:**
```
BEFORE: category: p.category,
        price: p.price,

AFTER:  category: p.category,
        sub_category: p.sub_category,
        price: p.price,
```

Without `sub_category`, all downstream code that filters, labels, and renders Party Decor sub-categories was receiving `undefined`, causing:
- `renderCatalog()` line 519: `p.sub_category === currentFilter` → always `undefined === 'Arches'` → zero results for every sub-filter button
- `createProductCard()` gradient and label fallbacks to top-level `'Party Decor'` — sub-category visual identity lost
- `renderProductDetail()` feature list fallback — sub-category-specific features (e.g. Columns: "Matching pairs available") never shown

### Bug B — Search routes Party Rentals to non-existent page id (index.html)

**Line 2388 in `handleSearch()` used `'rentals'`**, but `navigate()` in `ui.js` does `getElementById('page-' + page)`. The actual container is `id="page-partyrentals"`. `#page-rentals` does not exist.

```
BEFORE: targetPage = 'rentals';
AFTER:  targetPage = 'partyrentals';
```

## Edits Applied

| File | Line | Change |
|------|------|--------|
| products.js | 16 | Added `sub_category` to SELECT string between `category` and `price` |
| products.js | 30 | Added `sub_category: p.sub_category,` line to row-mapper after `category: p.category,` |
| index.html | 2388 | Changed `targetPage = 'rentals'` to `targetPage = 'partyrentals'` |

## Verification Results

Verified by static analysis and code trace (live browser verification requires a running server):

- `grep -n "sub_category" products.js` returns hits on lines 16 and 30 only (no other lines altered)
- `grep -n "targetPage = 'rentals'" index.html` returns zero results
- `grep -n "targetPage = 'partyrentals'" index.html` returns exactly one result on line 2388
- All downstream filter/render code (`renderCatalog` line 519, `createProductCard` lines 244/255/262, `renderProductDetail` lines 348/369/403/449, `getProductFeatures` line 501) was already correct — it only needed `sub_category` populated on product objects

**Expected product counts after fix:**
- Party Decor → All: 16 cards; Arches: 6; Columns: 3; Walls: 3; Centerpieces: 4
- 3D Prints → All: 83 cards (unaffected — uses `category` only)
- Engraving → All: 9 cards (unaffected — uses `category` only)
- Party Rentals search → navigates to `#page-partyrentals` (Coming Soon page activates)

## Deviations from Plan

None — plan executed exactly as written. Both bugs were precisely located at the predicted lines. No surrounding code was touched.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 607c0e2 | fix(quick-3): add sub_category to Supabase SELECT and product row-mapper |
| 2 | 034ba17 | fix(quick-3): fix search routing for Party Rentals to use real page id |

## Self-Check: PASSED

- products.js modified: confirmed (2 insertions, 1 deletion per git)
- index.html modified: confirmed (1 insertion, 1 deletion per git)
- commits 607c0e2 and 034ba17 exist in git log
- No additional files modified
