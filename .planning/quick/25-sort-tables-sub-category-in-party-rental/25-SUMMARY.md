---
phase: quick-25
plan: 25
subsystem: ui
tags: [party-rentals, sort, slug, cache-bust]

requires: []
provides:
  - "Stable ascending sort for Tables sub-category (4ft → 6ft → 8ft) in renderDynamicPartyRentalsProducts"
affects: [products.js, ui rendering, party-rentals catalog]

tech-stack:
  added: []
  patterns:
    - "Slug-regex sort: extract leading digit from slug (/^(\\d+)-foot/) to derive ordinal; comparator returns 0 for non-matching pairs to preserve stable order of all other sub-categories"

key-files:
  created: []
  modified:
    - products.js
    - index.html

key-decisions:
  - "Sort only when BOTH compared products are Tables; return 0 otherwise — preserves Chairs/Tents/Panels order without a global reorder"
  - "Slug derived same way as card rendering (p.slug || name.toLowerCase()...) to guarantee consistent foot extraction"
  - "Cache-bust bumped on ui.js (entry module that imports products.js) — products.js has no direct script tag in index.html"

patterns-established:
  - "Sub-category sort pattern: filter → sort with null-guarded comparator → forEach render"

duration: 5min
completed: 2026-06-03
---

# Quick Task 25: Sort Tables Sub-Category Summary

**Slug-regex ascending sort (4ft → 6ft → 8ft) injected into renderDynamicPartyRentalsProducts; Chairs, Tents, and Panels order untouched; cache-bust bumped to v2026-06-03-25**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-03T20:28:00Z
- **Completed:** 2026-06-03T20:33:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Inserted stable slug-based sort block between the `products.filter` and the `.forEach` render loop in `renderDynamicPartyRentalsProducts`
- Sort comparator only reorders when both products are Tables (sub_category === 'Tables' and slug matches `/^(\d+)-foot/`); returns 0 otherwise, preserving Chairs, Tents, and Panels order via JS engine's stable sort
- Bumped `styles.css?v=` and `ui.js?v=` from `2026-06-03-24` to `2026-06-03-25` to bust browser cache for the module graph containing the updated products.js

## Task Commits

1. **Task 1 + Task 2: Sort + cache-bust (atomic)** - `5a8f409` (feat)

## Files Created/Modified

- `products.js` — Added `slugOf`, `tableFeet` helpers and `.sort()` call after filter; 11 lines added
- `index.html` — Bumped `styles.css?v=` and `ui.js?v=` to `2026-06-03-25`; 2 lines changed

## Decisions Made

- Sort BOTH compared items must be Tables for reorder; single non-Table returns 0. Prevents accidentally shifting Chairs or Tent products relative to each other.
- Slug derivation matches the card rendering helper exactly to avoid slug mismatch between sort key and display.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `gsd-tools commit` CLI choked on the arrow characters (`→`) in the commit message, treating them as extra path arguments. Fixed by committing directly with `git commit -m` using plain ASCII text.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Tables catalog now displays in intuitive 4ft → 6ft → 8ft order for customers.
- No follow-up work needed. Other sub-categories (Chairs, Tents, Panels) verified unaffected.

---
*Phase: quick-25*
*Completed: 2026-06-03*
