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
  - "Panels originally inserted with sub_category=NULL due to check constraint; DDL fix applied 2026-05-25 — constraint updated and both rows SET sub_category='Panels'. JS slug-override workaround removed (products.js now reads sub_category directly from DB)"
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
| White Solid Panel 10x10 Rental | a4529577-bf7d-435c-b23b-011fe400226f | white-solid-panel-rental | $25.00 | Panels |
| Window Panel 10x10 Rental | 6f387da9-ae15-498c-bebd-f1dac03cc3a2 | window-panel-rental | $35.00 | Panels |

Both rows: category = "Party Rentals", featured = false, sale = false. DDL fix applied 2026-05-25 updated the check constraint and set sub_category = 'Panels' for both rows.

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

- `subCategory` reads directly from `product.sub_category` (DB value, now 'Panels' after DDL fix)
- `ctaHtml` branches: if panel and no tent → disabled button + "Add a tent to rent panels" helper text; else normal enabled button
- Click listener guards against `addBtn.disabled` before attaching
- Chairs/tables/tents: no change (not matched by `isPanelProduct()`)

## "Panels" Filter Button in index.html

Added between Tents and Games buttons at line 489:
```html
<button class="filter-btn" data-sub-category="Panels" onclick="filterPartyRentalsProducts('Panels')">Panels</button>
```

## Cache-Bust Bumps

- Initial commit: `ui.js?v=2026-05-22-17` → `ui.js?v=2026-05-22-18`
- DDL fix + workaround removal (2026-05-25): `ui.js?v=2026-05-22-18` → `ui.js?v=2026-05-25-19`

## Deviations from Plan

### Resolved Deviations

**1. Supabase check constraint `products_sub_category_check` did not include 'Panels' — RESOLVED 2026-05-25**

- **Originally found during:** Task 1 (commit 1d64268)
- **Original workaround:** Rows inserted with `sub_category = NULL`; JS layer overrode to `'Panels'` using `isPanelProduct()` slug check.
- **DDL fix applied 2026-05-25:** Constraint dropped and recreated with 'Panels' added to Party Rentals allowed values. Both panel rows updated: `SET sub_category = 'Panels'`. JS slug-override removed from `renderDynamicPartyRentalsProducts()` (products.js now reads `product.sub_category` directly).
- **Verification:** Playwright regression — 23/23 checks passed. Both panel cards appear on Panels filter; all sub-category filters, quantity dropdowns, tent-dependency gating, and auto-eject confirmed on live site.

## Commit SHA + Push Confirmation

- Commit 1: `1d64268` — feat(quick-18): add 10x10 panels (white solid + window) with tent dependency (2026-05-22)
- Commit 2: `[see final commit]` — fix(quick-18): apply DDL fix + remove slug-override workaround (2026-05-25)
- Pushed to: `origin/main`

## Self-Check: PASSED (final state 2026-05-25)

- products.js `subCategory` reads `product.sub_category` directly (workaround removed): confirmed
- products.js contains `white-solid-panel-rental` in RENTAL_QTY_CONFIG: confirmed
- products.js contains `panel-dependency-note` CTA: confirmed
- cart.js `isPanelProduct()` uses slug check (correct — used for cart logic, not filtering): confirmed
- cart.js `hasTentInCart()` + tent-removal auto-eject: confirmed
- index.html `data-sub-category="Panels"` filter button: confirmed
- index.html `v=2026-05-25-19` cache-bust: confirmed
- Supabase: both panel rows `sub_category = 'Panels'`: confirmed
- Live site Playwright regression: 23/23 passed
