---
phase: 04-frontend-refactor
plan: 01
subsystem: ui
tags: [es-modules, javascript, refactor, modularization]

requires:
  - phase: 03-payment-integration
    provides: checkout flow and order creation that moved into checkout.js

provides:
  - 5 ES module files splitting 5,633-line app.js monolith
  - Native browser ES module import graph rooted at ui.js
  - All ~70 onclick-referenced functions exported to window
  - Mutable shared state (products, cart) via exported const arrays

affects: [04-02, 04-03, 04-04]

tech-stack:
  added: []
  patterns:
    - ES module circular dependency broken via dynamic import() inside function body
    - Shared mutable array pattern: export const arr = []; mutated via arr.length=0; arr.push(...)
    - window.X export pattern for all onclick-referenced functions in HTML templates
    - window.supabaseClient access pattern for modules that need Supabase but can't import CDN script

key-files:
  created:
    - products.js
    - cart.js
    - checkout.js
    - staff.js
    - ui.js
  modified:
    - index.html

key-decisions:
  - "ui.js is the single root entry point — only it has a script tag in index.html; all other modules load via import graph"
  - "products and cart are exported as const arrays mutated in-place so all importers share the same reference"
  - "Dynamic import('./ui.js') inside loadProducts() body breaks the products->ui circular dependency"
  - "window.supabaseClient used explicitly in checkout.js and staff.js since supabase CDN is a plain script, not a module"
  - "window.products exposed from products.js for inline search script in index.html that cannot use ES imports"

patterns-established:
  - "Module entry: ui.js imports all other modules and boots the app with loadProducts(false)"
  - "Cross-module navigate calls use window.navigate to avoid circular imports"
  - "Staff portal CRUD reloads main-site products via window.loadProducts(true) and window.renderCatalog/renderServices"

duration: 90min
completed: 2026-04-09
---

# Phase 04 Plan 01: App.js Modularization Summary

**5,633-line app.js monolith split into 5 native ES modules (products, cart, checkout, staff, ui) loaded via browser import graph from ui.js entry point**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-04-09T15:00:00Z
- **Completed:** 2026-04-09T17:10:00Z
- **Tasks:** 2
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments

- Extracted all 5,633 lines of app.js into 5 focused ES module files with correct imports/exports
- Updated index.html to remove app.js script tag and add single `<script type="module" src="ui.js">` entry point
- Preserved all business logic identically — pure mechanical extraction with module wiring
- Implemented in-place array mutation pattern for shared `products` and `cart` state across modules

## Task Commits

1. **Task 1: Extract app.js into 5 ES module files** - `927955a` (feat)
2. **Task 2: Update index.html script tags** - `bc9a348` (feat)

## Files Created/Modified

- `products.js` — Product data loading, rendering, filtering, navigation, contact form (38KB)
- `cart.js` — Cart state, add/remove/clear, all ~25 specialty add-to-cart functions (37KB)
- `checkout.js` — Checkout flow, payment, coupons, orders, 5 modal objects (61KB)
- `staff.js` — Staff portal login, product CRUD, orders, barcode scanner (73KB)
- `ui.js` — Navigation, gallery, lightbox, hero slideshow, initializeApp bootstrap (18KB)
- `index.html` — Replaced `app.js?v=4` script tag with `<script type="module" src="ui.js">`

## Decisions Made

- Used `window.navigate` (not top-level import) inside products.js and cart.js to avoid circular static imports with ui.js
- Exposed `window.products` from products.js so the inline search script in index.html (a plain non-module script) can access the products array
- Only ui.js gets a `<script type="module">` tag — the browser fetches products.js, cart.js, checkout.js, staff.js automatically via the import graph
- `displaySuccessOrderSummary` and `createOrderInSupabase` added as exports from checkout.js (were private functions in app.js but needed by ui.js's `initPageFromHash`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Exposed window.products for inline search script**
- **Found during:** Task 2 (index.html audit)
- **Issue:** index.html contains an inline `handleSearch` function that references `products` as a global variable. In the module world, `products` is no longer a global — it's a module-scoped export. The search would silently fail.
- **Fix:** Added `window.products = products;` to products.js window exports section
- **Files modified:** products.js
- **Verification:** Inline script uses `typeof products !== 'undefined'` guard which will now pass
- **Committed in:** `927955a` (Task 1 commit)

**2. [Rule 1 - Bug] Added missing exports for displaySuccessOrderSummary and createOrderInSupabase**
- **Found during:** Task 1 (ui.js creation)
- **Issue:** `initPageFromHash` in ui.js calls `displaySuccessOrderSummary` and `createOrderInSupabase` from checkout.js, but those functions were private (no `export` keyword)
- **Fix:** Added `export` keyword to both function declarations in checkout.js
- **Files modified:** checkout.js
- **Verification:** ui.js can import and call both functions at checkout-success hash
- **Committed in:** `927955a` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- `categoryLabels` referenced in `getCategoryForProduct` (ui.js) needed explicit import from products.js — added to import statement
- Static circular import between cart.js and products.js is safe because neither module uses the other's exports at initialization time (only inside function bodies)

## Next Phase Readiness

- All 5 module files in place and correctly wired
- 04-02 can now modify checkout.js for booking gate improvements
- 04-03 can now modify ui.js for hero slideshow timer fix
- 04-04 can now modify products.js for product card layout changes
- app.js still on disk as reference but not loaded by browser

---
*Phase: 04-frontend-refactor*
*Completed: 2026-04-09*
