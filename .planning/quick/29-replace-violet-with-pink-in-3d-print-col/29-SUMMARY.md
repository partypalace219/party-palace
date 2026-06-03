---
phase: quick-29
plan: 29
subsystem: frontend
tags: [3d-prints, color-picker, staff-portal, cache-bust]
dependency_graph:
  requires: []
  provides: [Pink color in PRINT_COLORS, Pink entry in PRINT_COLOR_HEX]
  affects: [staff.js, products.js, index.html]
tech_stack:
  added: []
  patterns: [replace color constant entry, bump cache-bust version]
key_files:
  created: []
  modified:
    - staff.js
    - products.js
    - index.html
decisions:
  - "Replace Violet (#8B00FF) with Pink (#FFC0CB) as the canonical final 3D Print color"
  - "Bump cache-bust to v2026-06-03-29 for all four js/html asset references"
metrics:
  duration: "< 5 minutes"
  completed: 2026-06-03
---

# Phase quick-29: Replace Violet with Pink in 3D Print Color Picker Summary

**One-liner:** Swapped Violet (#8B00FF) for Pink (#FFC0CB) in both the staff color-picker constant and public card swatch lookup; bumped cache-bust to v29.

## What Was Done

Retired the Violet color from the 3D Prints color system across all source references:

1. `staff.js` PRINT_COLORS array — final entry changed from `{ name: 'Violet', hex: '#8B00FF' }` to `{ name: 'Pink', hex: '#FFC0CB' }`.
2. `products.js` PRINT_COLOR_HEX lookup — `'Violet': '#8B00FF'` replaced with `'Pink': '#FFC0CB'`.
3. `index.html` — four `?v=2026-06-03-28` asset references bumped to `?v=2026-06-03-29`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace Violet with Pink in both color tables | f134184 | staff.js, products.js |
| 2 | Bump cache-bust version and commit + push | f134184 | index.html |

## Verification

- Grep for `Violet` and `8B00FF` in staff.js → 0 matches
- Grep for `Violet` and `8B00FF` in products.js → 0 matches
- `Pink` in staff.js → 1 match: `{ name: 'Pink', hex: '#FFC0CB' }`
- `Pink` in products.js → 1 match: `'Pink': '#FFC0CB'`
- `2026-06-03-28` in index.html → 0 matches
- `2026-06-03-29` in index.html → 4 matches (lines 22, 23, 2355, 2357)
- Atomic commit f134184 on origin/main; push confirmed

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `staff.js` Pink/#FFC0CB entry: FOUND at line 1693
- `products.js` Pink/#FFC0CB entry: FOUND at line 212
- `index.html` v2026-06-03-29 (4 occurrences): FOUND at lines 22, 23, 2355, 2357
- Commit f134184: FOUND on origin/main
