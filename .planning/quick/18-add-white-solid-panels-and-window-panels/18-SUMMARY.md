---
phase: quick-18
plan: 18
subsystem: products, cart, database
tags: [panel-rentals, party-rentals, supabase, rental-qty-config, tent-dependency, cache-bust]
dependency_graph:
  requires: [quick-17 (tent slugs must exist)]
  provides: [white-solid-panel-rental product, window-panel-rental product, Panels filter, tent-panel dependency enforcement]
  affects: [products.js, cart.js, index.html]
tech_stack:
  added: []
  patterns: [slug-based product identification, dynamic import for circular dep avoidance, Set-based slug lookup, tent/panel dependency enforcement]
key_files:
  created: []
  modified:
    - products.js
    - cart.js
    - index.html
decisions:
  - "Panels stored with sub_category=NULL in Supabase (check constraint only allows Tables/Chairs/Tents/Games/Concessions for Party Rentals); JS layer overrides to 'Panels' using slug-based isPanelProduct() check so filter works correctly"
  - "refreshPartyRentalsGrid() uses dynamic import('./products.js') to avoid circular dependency between cart.js and products.js"
  - "Panel auto-eject fires only when LAST tent is removed (hasTentInCart() returns false after splice), not on every tent removal"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-22"
  tasks_completed: 6
  tasks_total: 6
  files_changed: 3
---

# Quick Task 18: Add White Solid Panels and Window Panels Summary

Two panel rental products added to Party Rentals with a slug-keyed tent dependency: panels are disabled in the UI when no tent is in cart and auto-ejected (with notification) when the last tent is removed.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Insert White Solid Panel + Window Panel rows into Supabase | 1d64268 | (Supabase only) |
| 2 | Add panel slugs to RENTAL_QTY_CONFIG in products.js and cart.js | 1d64268 | products.js, cart.js |
| 3 | Add hasTentInCart() + isPanelProduct() helpers + tent-removal hook in cart.js | 1d64268 | cart.js |
| 4 | Panel-aware card rendering in renderDynamicPartyRentalsProducts (products.js) | 1d64268 | products.js |
| 5 | Add 'Panels' filter button + bump ui.js cache-bust in index.html | 1d64268 | index.html |
| 6 | Commit and push to origin/main | 1d64268 | — |

## Supabase Rows Inserted

| Name | UUID | slug | price | sub_category |
|------|------|------|-------|-------------|
| White Solid Panel 10x10 Rental | a4529577-bf7d-435c-b23b-011fe400226f | white-solid-panel-rental | $25.00 | NULL* |
| Window Panel 10x10 Rental | 6f387da9-ae15-498c-bebd-f1dac03cc3a2 | window-panel-rental | $35.00 | NULL* |

*sub_category is NULL due to the `products_sub_category_check` constraint (see Deviations). Both rows: category = "Party Rentals", featured = false, sale = false.

## RENTAL_QTY_CONFIG Diff (products.js and cart.js — identical in both)

Before:
```js
const RENTAL_QTY_CONFIG = {
    'chair-rental':        { min: 15, max: 100 },
    '4-foot-table-rental': { min: 1,  max: 2   },
    '6-foot-table-rental': { min: 1,  max: 12  },
    '8-foot-table-rental': { min: 1,  max: 3   },
    '10x10-tent-rental':   { min: 1,  max: 2   },
    '10x20-tent-rental':   { min: 1,  max: 2   },
};
```

After (both files identical):
```js
const RENTAL_QTY_CONFIG = {
    'chair-rental':             { min: 15, max: 100 },
    '4-foot-table-rental':      { min: 1,  max: 2   },
    '6-foot-table-rental':      { min: 1,  max: 12  },
    '8-foot-table-rental':      { min: 1,  max: 3   },
    '10x10-tent-rental':        { min: 1,  max: 2   },
    '10x20-tent-rental':        { min: 1,  max: 2   },
    'white-solid-panel-rental': { min: 1,  max: 16  },
    'window-panel-rental':      { min: 1,  max: 8   },
};
```

Existing entries unchanged.

## New Helpers Added (cart.js)

```js
// Slug sets for tent/panel dependency logic
const TENT_SLUGS = new Set(['10x10-tent-rental', '10x20-tent-rental']);
const PANEL_SLUGS = new Set(['white-solid-panel-rental', 'window-panel-rental']);

export function hasTentInCart() {
    return cart.some(item => item.slug && TENT_SLUGS.has(item.slug));
}

export function isPanelProduct(product) {
    return !!(product && product.slug && PANEL_SLUGS.has(product.slug));
}
```

Both exposed on `window.hasTentInCart` and `window.isPanelProduct`.

## Tent-Removal Hook in removeFromCart (cart.js)

`removeFromCart()` was updated to:
1. Detect if the removed item was a tent (`wasTent` flag keyed off `TENT_SLUGS`)
2. After splice, check `hasTentInCart()` — if false (last tent gone) and panels remain, auto-eject them
3. Show a notification: singular "X removed — panels require a tent." or plural "Removed N panels — panels require a tent."
4. Call `refreshPartyRentalsGrid()` (dynamic import of products.js) so panel CTAs re-render enabled/disabled

`addRentalToCart()` also calls `refreshPartyRentalsGrid()` so panel CTAs enable immediately when a tent is added.

## Panel-Aware CTA Branch in renderDynamicPartyRentalsProducts (products.js)

- `subCategory` is overridden to `'Panels'` for panel slugs (compensates for NULL in DB)
- `ctaHtml` branches: if panel and no tent → disabled button + "Add a tent to rent panels" helper text; else normal enabled button
- Click listener guards against `addBtn.disabled` before attaching
- Chairs/tables/tents: no change (not matched by `isPanelProduct()`)

## "Panels" Filter Button in index.html

Added between Tents and Games buttons at line 489:
```html
<button class="filter-btn" data-sub-category="Panels" onclick="filterPartyRentalsProducts('Panels')">Panels</button>
```

## Cache-Bust Bump

`index.html` line 2347: `ui.js?v=2026-05-22-17` → `ui.js?v=2026-05-22-18`

No stale `?v=2026-05-22-17` tokens remain.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Supabase check constraint `products_sub_category_check` does not include 'Panels'**

- **Found during:** Task 1
- **Issue:** The constraint added in quick-2 allows Party Rentals sub_category values: Tables, Chairs, Tents, Games, Concessions. 'Panels' is not in the list. INSERT with sub_category='Panels' fails with PGRST constraint violation.
- **Root cause:** No Supabase personal access token or DB password available in this environment; management API requires a personal access token (service_role JWT does not work). Cannot alter constraint via REST API, CLI (not logged in), or direct psql (no DB password).
- **Fix:** Inserted rows with `sub_category = NULL` (explicitly allowed by the constraint's `sub_category IS NULL` clause). In `renderDynamicPartyRentalsProducts()`, override `subCategory` to `'Panels'` for panel slugs using `isPanelProduct()` — this is consistent with the plan's slug-first identification approach. The Panels filter works correctly because `card.dataset.subCategory` is set to `'Panels'` by the JS renderer, not read from the DB at render time.
- **Impact:** Zero user-facing impact. Filter, CTA gating, cart behavior, and auto-eject all work as specified. The only difference is the Supabase row stores NULL for sub_category instead of 'Panels'.
- **Follow-up:** To align DB with intent, run in Supabase SQL Editor: `ALTER TABLE products DROP CONSTRAINT products_sub_category_check; ALTER TABLE products ADD CONSTRAINT products_sub_category_check CHECK (sub_category IS NULL OR (category = 'Party Decor' AND sub_category IN ('Arches', 'Columns', 'Walls', 'Centerpieces')) OR (category = 'Party Rentals' AND sub_category IN ('Tables', 'Chairs', 'Tents', 'Panels', 'Games', 'Concessions')) OR (category = '3D Prints' AND sub_category IN ('Toys', 'Signs', 'Decor', 'Miscellaneous')) OR (category = 'Engraving' AND sub_category IN ('Wood', 'Metal', 'Leather', 'Acrylic', 'Specialty Materials')));  UPDATE products SET sub_category = 'Panels' WHERE slug IN ('white-solid-panel-rental', 'window-panel-rental');`
- **Commit:** 1d64268

## Commit SHA + Push Confirmation

- Commit: `1d64268` — feat(quick-18): add 10x10 panels (white solid + window) with tent dependency
- Pushed to: `origin/main` — confirmed (`db01cf8..1d64268  main -> main`)

## Self-Check: PASSED

- products.js contains `white-solid-panel-rental`: confirmed (RENTAL_QTY_CONFIG line 12)
- products.js contains `hasTentInCart`: confirmed (import line 2, usage lines 2, 281)
- products.js contains `panel-dependency-note`: confirmed (line 285)
- cart.js contains `hasTentInCart`: confirmed (function definition + window export)
- cart.js contains `TENT_SLUGS`: confirmed (line 23)
- cart.js contains `panels require a tent`: confirmed (removeFromCart hook)
- index.html contains `data-sub-category="Panels"`: confirmed (line 489)
- index.html contains `v=2026-05-22-18`: confirmed (line 2347)
- No stale `v=2026-05-22-17` in index.html: confirmed (grep returns 0 matches)
- Commit 1d64268 exists in git log: confirmed
- Branch up to date with origin/main: confirmed
