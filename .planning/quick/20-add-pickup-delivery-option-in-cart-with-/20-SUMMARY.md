---
phase: quick-20
plan: 20
subsystem: cart
tags: [fulfillment, cart, rentals, delivery, pickup, fee]
dependency_graph:
  requires: [RENTAL_QTY_CONFIG, hasRentalInCart, saveCart, renderCartItems]
  provides: [fulfillmentMethod, hasRentalInCart, getFulfillmentMethod, setFulfillmentMethod, getDeliveryFee, renderCartFooter]
  affects: [cart.js, styles.css, index.html]
tech_stack:
  added: []
  patterns: [localStorage persistence, module-scoped state, conditional cart footer, checkout gate]
key_files:
  created: []
  modified:
    - cart.js
    - styles.css
    - index.html
decisions:
  - "Flat $25 delivery fee regardless of rental count — simple and transparent"
  - "fulfillmentMethod defaults to null — forces explicit user selection before checkout"
  - "Rental detection via RENTAL_QTY_CONFIG[item.slug] — single source of truth, no hardcoded slug lists"
  - "renderCartFooter() extracted from renderCartItems() — keeps item render logic unchanged"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-25"
  tasks: 3
  files: 3
---

# Quick Task 20: Add Pickup/Delivery Option in Cart with $25 Delivery Fee

**One-liner:** Fulfillment selector (Pickup free / Delivery $25) injected into cart sidebar for rental orders, with localStorage persistence, 3-line total breakdown, and a checkout gate when unselected.

## What Was Built

- **`fulfillmentMethod` state** — module-scoped, null by default, persisted to `localStorage` key `partyPalaceFulfillment`. Restored on page load; cleared when last rental is removed from cart.
- **Four helpers** — `hasRentalInCart()`, `getFulfillmentMethod()`, `setFulfillmentMethod()`, `getDeliveryFee()` — all exported on `window` for onclick handlers.
- **`saveCart()` auto-reset** — when `saveCart()` is called and no rentals remain, `fulfillmentMethod` is set to null and the localStorage key is removed.
- **`renderCartFooter()`** — new private function injected into `#cartFooter`. Renders:
  - Fulfillment selector (two-button grid: Pickup / Delivery) when `hasRentalInCart()` is true
  - Prompt "Please select pickup or delivery" when method is null
  - 3-line breakdown: Subtotal, Delivery Fee (—/$0.00/$25.00), Total
  - Gate message + disabled checkout button when method is null and rentals are present
  - Non-rental carts see original "Estimated Total" single-line footer, no selector
- **`goToCheckout()` gate** — blocks navigation and shows toast "Please select Pickup or Delivery to continue" when rental present and no method selected.
- **CSS** — `.cart-fulfillment`, `.cart-fulfillment-option` (with `.selected` state: gold border + tinted background), `.cart-total-row`, `.cart-total-grand`, `.cart-fulfillment-gate-msg`, `.cart-checkout-btn[disabled]`.
- **Cache-bust** — `ui.js?v=2026-05-25-20`.

## Commits

| Hash | Message |
|------|---------|
| 500ddf6 | feat(quick-20): add fulfillment state, helpers, and constants to cart.js |
| 5be67ea | feat(quick-20): render fulfillment selector, 3-line breakdown, gate checkout in cart.js |
| ea8cc2b | feat(quick-20): style fulfillment selector, bump cache-bust to v=2026-05-25-20 |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `cart.js` modified — 500ddf6, 5be67ea confirmed in git log
- [x] `styles.css` modified — ea8cc2b confirmed in git log
- [x] `index.html` modified — ea8cc2b confirmed in git log, `ui.js?v=2026-05-25-20` present
- [x] `window.hasRentalInCart`, `window.getFulfillmentMethod`, `window.setFulfillmentMethod`, `window.getDeliveryFee` added
- [x] `DELIVERY_FEE = 25`, `PICKUP_FEE = 0` constants present
- [x] `fulfillmentMethod` defaults to null (IIFE reads localStorage, falls back to null)
- [x] `saveCart()` auto-resets fulfillmentMethod when last rental removed
- [x] `goToCheckout()` gate in place
- [x] `git push origin main` exited 0 — branch at ea8cc2b on origin/main

## Self-Check: PASSED
