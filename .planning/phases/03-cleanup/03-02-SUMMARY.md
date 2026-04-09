---
phase: 03-cleanup
plan: 02
subsystem: ui
tags: [supabase, featured, lazy-loading, performance, product-cards]

# Dependency graph
requires:
  - phase: 02-reliability
    provides: Supabase products table with featured column
provides:
  - Popular badge driven by Supabase featured column (no hardcoded override)
  - All dynamic customer-facing product img tags with loading=lazy
affects: [app.js, product rendering, performance]

# Tech tracking
tech-stack:
  added: []
  patterns: [DB-driven featured flag via p.featured mapping, loading=lazy on all dynamic product imgs]

key-files:
  created: []
  modified: [app.js]

key-decisions:
  - "Removed popularProducts hardcoded override — Supabase featured column is sole source of truth for Popular badge"
  - "Vases.featured=false in DB — not updated (no service role key available); Popular badge for Vases will not show until manually set to true in Supabase dashboard"
  - "loading=lazy excluded from lightbox img (empty src placeholder) and staff admin thumbnail — intentional"

patterns-established:
  - "DB-driven flags: product.popular comes from p.featured at load time — never override in JS"
  - "All dynamic customer-facing img tags must include loading=lazy"

# Metrics
duration: 8min
completed: 2026-04-09
---

# Phase 03 Plan 02: DB-driven Popular Badge and Lazy Image Loading Summary

**Hardcoded popularProducts array removed from app.js — Popular badge now driven by Supabase featured column, and loading="lazy" added to all 5 dynamic product image locations (7 total occurrences)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-09T21:09:00Z
- **Completed:** 2026-04-09T21:17:48Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Removed 5-line popularProducts override block that was hardcoding which products show Popular badge
- Popular badge now reads directly from Supabase `featured` column (mapped as `product.popular = p.featured` at load)
- Added `loading="lazy"` to all 5 dynamic img locations: renderDynamicEngravingProducts, renderDynamicPrints3dProducts, createProductCard (primary + secondary), renderProductDetail main image, renderProductDetail thumbnails
- Lightbox img and staff thumbnail correctly excluded from lazy loading

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove hardcoded popularProducts override** - `943cb76` (feat)
2. **Task 2: Add loading="lazy" to all dynamic product img tags** - `e6379dc` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `app.js` - Removed popularProducts array/forEach, added loading=lazy to 5 img locations

## Decisions Made
- Removed hardcoded override regardless of Vases.featured DB value — DB is the source of truth, not JS override
- Vases.featured=false in Supabase (all others are true) — needs manual update in Supabase dashboard since no service role key is available in the project; this is a data issue not a code issue
- loading=lazy excluded from lightbox (empty src, src set imperatively by JS) and staff admin thumbnail (admin-only, not customer-facing)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Data Issue (not a code deviation)

The plan instructed updating Vases.featured=true in Supabase before removing the override. The anon key PATCH returned 204 but RLS blocked the actual write (authenticated role required). No service role key is stored in the project.

**Decision:** Proceed with removing the override anyway — the DB is now the source of truth. Vases will not show Popular badge until `featured=true` is manually set in the Supabase dashboard.

**Action required:** In Supabase SQL Editor run:
```sql
UPDATE products SET featured = true WHERE name = 'Vases';
```

## Issues Encountered
- Supabase anon key cannot UPDATE with RLS requiring authenticated role — silently returns 204 but does not apply change. Noted and documented above.

## User Setup Required

**Manual DB update needed:** Set `featured=true` for Vases in Supabase:
1. Go to https://supabase.com/dashboard → SQL Editor
2. Run: `UPDATE products SET featured = true WHERE name = 'Vases';`

## Next Phase Readiness
- CLN-02 (DB-driven featured) and CLN-03 (lazy loading) objectives complete
- Ready for next cleanup plan (03-03)

---
*Phase: 03-cleanup*
*Completed: 2026-04-09*
