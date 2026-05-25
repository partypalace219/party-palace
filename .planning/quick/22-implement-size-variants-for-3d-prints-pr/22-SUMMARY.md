---
phase: quick-22
plan: 22
subsystem: products / cart / staff
tags: [3d-prints, size-variants, cart, staff-portal, supabase]
dependency_graph:
  requires: [size_variants JSONB column exists in products table (DEFAULT NULL)]
  provides: [multi-size pricing UI in staff portal, "Starting at $X" grid cards, size dropdown on 3D Prints detail page, addSizedPrintToCart cart helper]
  affects: [products.js, staff.js, cart.js, index.html, styles.css]
tech_stack:
  added: []
  patterns: [name-based cart dedup with variant suffix, lowest-price-wins rule for DB price field, toggle3DPrintColorUI mirroring pattern]
key_files:
  created: []
  modified:
    - products.js
    - staff.js
    - cart.js
    - index.html
    - styles.css
decisions:
  - Cart identity model kept name-based; variant suffix appended to name ("Product (4x4)") rather than adding a composite key field
  - addToCart untouched; addSizedPrintToCart is a new wrapper calling the existing object overload
  - Lowest-price rule: when staff saves with multi-size toggle ON, products.price = Math.min of variant prices so legacy displays have a sensible "starting" number
  - No DB migration needed; size_variants JSONB column already existed with DEFAULT NULL
metrics:
  duration: ~25 minutes
  completed: 2026-05-25
  tasks: 4
  files: 5
---

# Phase quick-22 Plan 22: Size Variants for 3D Prints Summary

Full size variants feature for 3D Prints: Supabase read-through of size_variants JSONB, cart helper with name-based variant identity, staff form toggle+row CRUD, and public grid/detail render for sized products.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | DB query updates — propagate size_variants | 65c0744 | products.js (cols + transform), staff.js (select + map) |
| 2 | Cart helper — addSizedPrintToCart | 4e8551a | cart.js |
| 3 | Staff form multi-size UI | 9087843 | index.html, staff.js, styles.css |
| 4 | Public render + cache-bust | 84d9cbe | products.js, index.html |

## Files Modified Per Task

### Task 1 — products.js, staff.js
- `products.js` line 32: appended `,size_variants` to the SELECT cols string
- `products.js` lines 55-57: added `size_variants: p.size_variants || null` to the in-memory products transform
- `staff.js` line 243: appended `,size_variants` to the `.select()` string in `loadStaffProducts`
- `staff.js` lines 270-272: added `size_variants: p.size_variants || null` to the staffProducts map

### Task 2 — cart.js
- Inserted `addSizedPrintToCart(product, sizeLabel, price)` immediately before `refreshPartyRentalsGrid` (~line 282)
- Added `window.addSizedPrintToCart = addSizedPrintToCart` after `window.addRentalToCart` (~line 1353)

### Task 3 — index.html, staff.js, styles.css
- `index.html`: inserted multi-size pricing block (`#staff-3dprint-size-variant-wrapper`) directly after the Price + Price Label form-row (before Multi-image uploader)
- `staff.js`: added full size-variant section after `window.toggle3DPrintColorUI`: `renderSizeVariantRows`, `addSizeVariantRow`, `removeSizeVariantRow`, `onSizeVariantInput`, `getSizeVariantRows`, `setSizeVariantRows`, `onMultiSizeToggleChange`, `toggle3DPrintSizeVariantUI`
- `staff.js` `staffOnCategoryChange`: added `toggle3DPrintSizeVariantUI(cat, null)` call
- `staff.js` `openStaffProductModal`: added `toggle3DPrintSizeVariantUI(currentCategoryForModal, product)` call after `toggle3DPrintColorUI`
- `staff.js` `handleStaffProductSubmit`: replaced `productData` block with multi-size price computation + `size_variants` field
- `styles.css`: appended `.staff-size-variant-row`, `.staff-size-variant-label`, `.staff-size-variant-price`, `.staff-size-variant-add-btn`, `.staff-size-variant-remove-btn` styles

### Task 4 — products.js, index.html
- `products.js` `renderDynamicPrints3dProducts`: inserted `sv`/`validSv`/`priceDisplayHTML` computation + replaced hardcoded price div with `${priceDisplayHTML}`
- `products.js` `renderProductDetail`: inserted `detailSv`/`detailValidSv`/`hasSizeVariants`/`sizeVariantCtaHTML` block before `container.innerHTML`; updated default CTA branch to `hasSizeVariants ? sizeVariantCtaHTML : ...`
- `products.js`: added `onSizeVariantDetailChange()` and `addSelectedSizedPrint(slug)` helpers after `renderProductDetail`
- `index.html`: bumped ui.js cache-bust from `?v=2026-05-25-20` to `?v=2026-05-25-22`

## New Functions Added

### cart.js
- `addSizedPrintToCart(product, sizeLabel, price)` — exported + window-bound; constructs `{id, name: "${product.name} (${sizeLabel})", price, category, image}` and calls existing `addToCart(itemObj)`

### staff.js
- `renderSizeVariantRows()` — renders `staffSizeVariantRows` array into `#staff-3dprint-size-variant-rows` DOM
- `addSizeVariantRow()` — pushes empty row and re-renders
- `removeSizeVariantRow(idx)` — splices row at index and re-renders
- `onSizeVariantInput(idx, field, value)` — updates in-memory row without re-rendering (preserves focus)
- `getSizeVariantRows()` — returns only valid rows (label non-empty, price > 0)
- `setSizeVariantRows(variants)` — replaces `staffSizeVariantRows` from DB data and re-renders
- `onMultiSizeToggleChange(checked)` — shows/hides body; seeds one empty row on first check
- `toggle3DPrintSizeVariantUI(category, product)` — shows wrapper for 3D Prints, pre-populates on edit, resets on other categories

### products.js
- `onSizeVariantDetailChange()` — exported + window-bound; enables/disables `#detailSizeVariantAddBtn` based on `<select>` value
- `addSelectedSizedPrint(slug)` — exported + window-bound; reads selected option's `data-label`/`data-price`, finds product by slug, calls `window.addSizedPrintToCart`

## CSS Classes Added

| Class | Purpose |
|-------|---------|
| `.staff-size-variant-row` | Grid layout (label input, price input, remove button) |
| `.staff-size-variant-label` | Text input styling for size label |
| `.staff-size-variant-price` | Number input styling for variant price |
| `.staff-size-variant-add-btn` | "+ Add Size" button styling |
| `.staff-size-variant-remove-btn` | "×" remove button styling |

## Lowest-Price Rule

When staff saves a 3D Print product with the multi-size toggle ON and at least one valid row:

```
effectivePrice = Math.min(...validVariants.map(v => v.price))
productData.price = effectivePrice
productData.size_variants = validVariants  // [{label, price}, ...]
```

When toggle is OFF, has zero valid rows, or category is not 3D Prints:
```
productData.price = manualPrice  // from #staff-product-price input
productData.size_variants = null
```

## Cart Identity Model Decision

Name-based dedup preserved. `addToCart` is byte-for-byte unchanged. Variant lines get names like `"Mini Vase (4x4)"` — each size dedups independently. Same product + same size = "Item already in cart!"; same product + different size = new cart line.

## Cache-Bust

`ui.js?v=2026-05-25-22` — forces full module-graph refetch covering products.js, staff.js, cart.js.

## Confirmations

- No DB migration: `size_variants` JSONB column already existed with DEFAULT NULL
- `addToCart` is untouched (verified: no modification to function body or signature)
- Non-3D-Print render paths unchanged: Engraving, Party Decor, Party Rentals, Party Rentals panels all render exactly as before
- 4 atomic commits in git log: 65c0744, 4e8551a, 9087843, 84d9cbe

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified present:
- products.js: `size_variants` in cols string (line 32), transform (line 57), grid render (line 219-224), detail render (lines 515-543), helpers (lines 628-658)
- staff.js: `size_variants` in select (line 243), map (line 272), `toggle3DPrintSizeVariantUI` defined + exported + called in 2 places
- cart.js: `addSizedPrintToCart` exported (line 286), window-bound (line 1353)
- index.html: `#staff-3dprint-size-variant-wrapper` present (line 2093), cache-bust `?v=2026-05-25-22` (line 2360)
- styles.css: `.staff-size-variant-row` present (line 5009)

Commits verified: 65c0744, 4e8551a, 9087843, 84d9cbe all in git log.
