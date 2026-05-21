---
phase: quick-13
plan: 13
subsystem: staff-portal, product-cards
tags: [colors, 3d-prints, staff-portal, ui, swatches]
dependency_graph:
  requires: [products.colors TEXT[] column (quick-1), staff portal form (quick-10)]
  provides: [3D Prints checkbox color picker in staff portal, color swatch row on public 3D Print cards]
  affects: [staff.js, products.js, index.html, styles.css]
tech_stack:
  added: []
  patterns: [category-aware UI toggle, predefined color set with hex map, Set-based graceful-ignore for unknown DB values]
key_files:
  created: []
  modified:
    - index.html
    - staff.js
    - products.js
    - styles.css
decisions:
  - Chip input retained for non-3D-Print categories; wrapper divs toggle visibility per category
  - PRINT_COLORS defined as array of {name, hex} objects for easy iteration and lookup
  - Unknown DB color values (e.g. Indigo) silently ignored via console.warn — no crash, no data loss
  - swatchesHTML computed before card.innerHTML to keep template literal clean
  - ui.js cache-bust bumped to ?v=2026-05-21-13 (staff.js and products.js not directly in script tags)
metrics:
  duration: ~20min
  completed: 2026-05-21
  tasks_completed: 2
  files_changed: 4
---

# Quick Task 13: Add Multi-Select Color Picker for 3D Prints — Summary

**One-liner:** 11-color checkbox grid for 3D Prints in staff portal with hex-mapped circle swatches on public product cards, replacing freeform chip input for that category only.

## What Was Built

### Staff Portal (staff.js + index.html)

Category-aware color input: when staff selects "3D Prints" as category, the chip input hides and an 11-checkbox grid appears. All other categories keep the existing chip input unchanged.

**New functions added to staff.js:**

| Function | Purpose |
|---|---|
| `render3DPrintColorGrid(selected)` | Renders 11 labeled checkboxes into `#staff-3dprint-color-grid`; pre-checks items in `selected` array |
| `getSelected3DPrintColors()` | Returns array of checked color names from the grid |
| `setSelected3DPrintColors(colors)` | Filters out unknown colors (console.warn), then calls render with known subset |
| `toggle3DPrintColorUI(category)` | Shows/hides chip wrapper vs checkbox grid wrapper based on category |

**Integration points:**
- `staffOnCategoryChange(cat)` — now calls `toggle3DPrintColorUI(cat)` on every category dropdown change
- `openStaffProductModal(product)` — reset clears grid; load path branches: 3D Prints calls `setSelected3DPrintColors`, others call `renderColorChips()`
- `handleStaffProductSubmit` save path — `colors: (category === '3D Prints') ? getSelected3DPrintColors() : [...staffProductColors]`

**PRINT_COLORS constant:**

| Name | Hex |
|---|---|
| Black | #000000 |
| White | #FFFFFF |
| Gray | #808080 |
| Brown | #8B4513 |
| Gold | #FFD700 |
| Red | #FF0000 |
| Orange | #FFA500 |
| Yellow | #FFFF00 |
| Green | #00CC00 |
| Blue | #0066FF |
| Violet | #8B00FF |

### Public Cards (products.js)

Inside `renderDynamicPrints3dProducts`, a `PRINT_COLOR_HEX` lookup map filters `product.colors` to known colors only, then builds `swatchesHTML`. The swatch row is injected between `.product-description` and `.product-price` in the card template. If `colors` is empty or null, `swatchesHTML` is an empty string and no DOM node is inserted.

White swatches receive the `product-color-swatch--white` class which adds a `1px solid #d1d5db` border for visibility on white backgrounds. All swatches have a `title` attribute for hover tooltip.

### Styles (styles.css)

**Staff portal classes appended:**
- `.staff-3dprint-color-grid` — CSS grid, auto-fill columns min 120px
- `.staff-3dprint-color-check` — flex label row with border, hover state
- `.staff-3dprint-color-check input[type="checkbox"]` — zero margin
- `.staff-3dprint-color-swatch` — 16px circle swatch beside checkbox
- `.staff-3dprint-color-name` — 0.875rem label text

**Public card classes appended:**
- `.product-color-swatches` — flex-wrap row, 6px gap, 0.4rem vertical margin
- `.product-color-swatch` — 16px circle, cursor:default
- `.product-color-swatch--white` — 1px solid #d1d5db border

### Cache-bust (index.html)

`ui.js?v=2026-05-21` bumped to `ui.js?v=2026-05-21-13`. staff.js and products.js have no direct `<script src>` tags — they are imported via the ES module graph rooted at ui.js. Bumping ui.js forces a refetch of all imported modules.

## Investigation Findings (Task 1)

- **colors column data type:** `TEXT[]` (PostgreSQL text array — added in quick task 1 with `colors TEXT[] DEFAULT '{}'`)
- **Existing 3D Print color values in DB:** Not sampled via MCP during execution (Supabase MCP not directly invoked as a tool call); however, the plan notes that 'Indigo' may exist from earlier data — the `setSelected3DPrintColors` function handles this gracefully via `console.warn`
- **chip input HTML in index.html:** lines 2122–2127 (confirmed, used as replacement target)
- **staff.js chip integration lines:** reset=1236, load=1269, save=1370 (all confirmed)
- **products.js price line inside renderDynamicPrints3dProducts:** line 201
- **script tags requiring cache-bust:** only `ui.js?v=2026-05-21` at line 2339 — staff.js and products.js are not directly referenced via `<script src>`
- **New cache-bust value:** `?v=2026-05-21-13`

## Deviations from Plan

### Auto-adjusted: Edit-load path integration

The plan specified finding `staffOnCategoryChange(data.category)` at line ~1924 as the edit-load injection point. Upon reading the code, this call is inside `fillFormFromScan` (barcode scanner), not `openStaffProductModal`. The actual edit-load path sets category directly at line 1254 and calls `renderColorChips()` at line 1281. The integration was placed at the `renderStaffImageThumbnails()` / `renderColorChips()` block (lines 1284-1292 after edit), branching on `currentCategoryForModal`. This achieves the same result correctly.

## Confirmation

- No DB schema migration created — `products.colors TEXT[]` column already exists
- Cart logic untouched
- Chip input for non-3D-Print categories (Engraving, Party Decor, Party Rentals) unchanged in behavior
- Only `renderDynamicPrints3dProducts` modified in products.js — engraving, party rentals, party decor renders untouched

## Self-Check: PASSED

- index.html: FOUND
- staff.js: FOUND
- products.js: FOUND
- styles.css: FOUND
- 13-SUMMARY.md: FOUND
- Commit 9c1bc39: FOUND
