# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09 after v1.0)

**Core value:** Customers can browse products and services, add to cart, and complete a real payment — every time, without security holes or data loss.
**Current focus:** Planning next milestone — run `/gsd:new-milestone`

## Current Position

Phase: v1.0 complete — all 4 phases, 11 plans shipped
Status: Milestone archived — ready for next milestone planning
Last activity: 2026-06-04 - Completed quick task 31: Fix colors column missing from loadProducts SELECT; color swatches now render on public 3D Print cards

Progress: [██████████] 100% (v1.0 complete)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (16 decisions across 4 phases).

Quick-18 follow-up: Update products_sub_category_check constraint in Supabase to add 'Panels' to Party Rentals list, then UPDATE panel rows to set sub_category='Panels'. Currently stored as NULL; JS compensates via slug-based isPanelProduct() check.

Notable for next milestone:
- save-signed-document email still uses Gmail SMTP — deferred to future milestone
- Rate limiting is in-memory Map (cold-start caveat) — consider persistent solution if needed
- Resend FROM_ADDRESS is `onboarding@resend.dev` until thepartypalace.in is verified in Resend Dashboard
- Vases.featured=false in DB — needs manual SQL update in Supabase dashboard

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Migrate products table to support multiple images, sizes, colors, and sub-categories | 2026-04-27 | dd04934 | [1-migrate-products-table-to-support-multip](./quick/1-migrate-products-table-to-support-multip/) |
| 2 | Normalize products category, split Party Decor sub-categories, move services rows, update front-end JS | 2026-04-27 | ec14cda | [2-normalize-products-category-split-party-](./quick/2-normalize-products-category-split-party-/) |
| 3 | Fix sub_category fetch + mapper in products.js; fix Party Rentals search routing in index.html | 2026-04-27 | 034ba17 | [3-diagnose-and-fix-product-rendering-failu](./quick/3-diagnose-and-fix-product-rendering-failu/) |
| 4 | Fix zero-product rendering: remove && p.slug gate, add diagnostics, fix gallery category strings, fix back-link routing | 2026-04-27 | 2265066 | [4-fix-party-decor-grid-rendering-zero-prod](./quick/4-fix-party-decor-grid-rendering-zero-prod/) |
| 5 | Diagnose navigate() render wiring: move renderDynamic* logs before guards, add full [navigate]/[bootstrap]/[render-dispatch] tracing | 2026-04-27 | 56b5c7f | [5-diagnose-and-fix-navigate-render-wiring-](./quick/5-diagnose-and-fix-navigate-render-wiring-/) |
| 6 | Engraving filter investigation (PARTIAL MATCH); 3D Prints Miscellaneous filter + empty-state; description clamp; diagnostic log cleanup | 2026-04-27 | 3b0e2a9 | [6-fix-card-description-clamp-3d-prints-fil](./quick/6-fix-card-description-clamp-3d-prints-fil/) |
| 7 | Add ?v=2026-04 cache-busting to favicon link tags in index.html; add 180x180 apple-touch-icon pointing to favicon-192x192.png | 2026-04-27 | 3588b7c | [7-add-cache-busting-query-strings-to-favic](./quick/7-add-cache-busting-query-strings-to-favic/) |
| 8 | Remove "Did we make your day better?" section: markup from index.html, handlers from inline script, resetLoveQuestionSection from ui.js, all CSS from styles.css | 2026-04-27 | 2f51e53 | [8-remove-did-we-make-your-day-better-foote](./quick/8-remove-did-we-make-your-day-better-foote/) |
| 9 | Specialty Materials engraving filter + empty-state for all Engraving filters; Party Rentals rebuilt as filterable catalog (sub_category); Gallery routing confirmed canonical | 2026-04-27 | 920ab24 | [9-add-specialty-materials-filter-to-engrav](./quick/9-add-specialty-materials-filter-to-engrav/) |
| 10 | Rebuild staff portal Add/Edit Item form: multi-image upload, sizes, colors, category/sub-category | 2026-04-27 | 1d9031c | [10-rebuild-staff-portal-add-edit-item-form-](./quick/10-rebuild-staff-portal-add-edit-item-form-/) |
| 11 | Replace incorrect header logo with correct Party Palace logo and remove black oval artifact | 2026-05-21 | 0be80f3 | [11-replace-incorrect-header-logo-with-corre](./quick/11-replace-incorrect-header-logo-with-corre/) |
| 12 | Diagnose and fix 3D Prints sub-category visibility issue | 2026-05-21 | bd33733 | [12-diagnose-and-fix-3d-prints-sub-category-](./quick/12-diagnose-and-fix-3d-prints-sub-category-/) |
| 13 | Add multi-select color picker for 3D Prints + public card swatches | 2026-05-21 | 9c1bc39 | [13-add-multi-select-color-picker-for-3d-pri](./quick/13-add-multi-select-color-picker-for-3d-pri/) |
| 14 | Chair rental quantity dropdown (15-100) + cart enforcement (min/max clamp, +/- controls, typed input) | 2026-05-21 | 94b6991 | [14-add-quantity-dropdown-15-100-to-chairs-r](./quick/14-add-quantity-dropdown-15-100-to-chairs-r/) |
| 15 | Fix broken header logo: commit missing party-palace-logo.jpeg to git and bump cache-bust from ?v=2 to ?v=3 | 2026-05-21 | b3fc262 | [15-diagnose-and-fix-broken-header-logo-on-l](./quick/15-diagnose-and-fix-broken-header-logo-on-l/) |
| 16 | Update header logo from JPEG to PNG with transparent background (v4 cache-bust) | 2026-05-22 | c0d669f | [16-update-header-logo-from-jpeg-to-png-with](./quick/16-update-header-logo-from-jpeg-to-png-with/) |
| 17 | Add 10x10 and 10x20 tent rental products to Party Rentals catalog (Supabase insert + RENTAL_QTY_CONFIG + cache-bust v17) | 2026-05-22 | e926736 | [17-add-10x10-and-10x20-tent-rental-products](./quick/17-add-10x10-and-10x20-tent-rental-products/) |
| 18 | Add White Solid Panel ($25, 1-16) and Window Panel ($35, 1-8) with tent dependency: disabled CTA when no tent in cart, auto-eject on last tent removal | 2026-05-22 | 1d64268 | [18-add-white-solid-panels-and-window-panels](./quick/18-add-white-solid-panels-and-window-panels/) |
| 20 | Add pickup/delivery fulfillment selector in cart sidebar for rental orders: Pickup free, Delivery $25 flat, localStorage persistence, checkout gate when unselected, auto-reset on last rental removal | 2026-05-25 | ea8cc2b | [20-add-pickup-delivery-option-in-cart-with-](./quick/20-add-pickup-delivery-option-in-cart-with-/) |
| 21 | Playwright automated verification of quick task 20 — 11/11 checks PASS on live site, no feature bugs found | 2026-05-25 | 9d7abd5 | [21-playwright-automated-verification-of-qui](./quick/21-playwright-automated-verification-of-qui/) |
| 22 | Size variants for 3D Prints: staff multi-size pricing UI, addSizedPrintToCart, "Starting at $X" grid, size dropdown detail page, cache-bust v22 | 2026-05-25 | 84d9cbe | [22-implement-size-variants-for-3d-prints-pr](./quick/22-implement-size-variants-for-3d-prints-pr/) |
| 23 | Playwright automated verification of Quick Task 22 (size variants for 3D Prints) — 16/16 passing against live site | 2026-05-25 | 7ef4f97 | [23-playwright-automated-verification-of-qui](./quick/23-playwright-automated-verification-of-qui/) |
| 24 | Remove COMING SOON badge from Party Rentals nav link in index.html | 2026-06-03 | 4e21d35 | [24-remove-coming-soon-badge-from-party-rent](./quick/24-remove-coming-soon-badge-from-party-rent/) |
| 25 | Sort Tables sub-category into ascending size order (4ft to 6ft to 8ft) via slug-regex sort in renderDynamicPartyRentalsProducts; cache-bust v25 | 2026-06-03 | 5a8f409 | [25-sort-tables-sub-category-in-party-rental](./quick/25-sort-tables-sub-category-in-party-rental/) |
| 26 | Diagnostic: 3 confirmed staff portal save bugs traced — "Panels" missing from ITEM_CATEGORIES, engraving filter uses material not sub_category, loadProducts() omits image_urls from SELECT | 2026-06-03 | 798c338 | [26-diagnose-staff-portal-save-bug-silent-da](./quick/26-diagnose-staff-portal-save-bug-silent-da/) |
| 27 | Fix five staff portal save bugs: Panels in ITEM_CATEGORIES, engraving filter→sub_category, image_urls in SELECT, size_variants payload guard, slug preserved on edit; 5/5 Playwright PASS | 2026-06-03 | d76d4a4 | [27-fix-five-root-cause-bugs-in-staff-portal](./quick/27-fix-five-root-cause-bugs-in-staff-portal/) |
| 28 | Update site favicon to party-palace-logo.png; remove 5 obsolete favicon tags; cache-bust v28; 5/5 Playwright PASS | 2026-06-03 | fb66b74 | [28-update-site-favicon-to-use-existing-part](./quick/28-update-site-favicon-to-use-existing-part/) |
| 29 | Replace Violet (#8B00FF) with Pink (#FFC0CB) in 3D Print color picker (staff.js PRINT_COLORS + products.js PRINT_COLOR_HEX); cache-bust v29 | 2026-06-03 | f134184 | [29-replace-violet-with-pink-in-3d-print-col](./quick/29-replace-violet-with-pink-in-3d-print-col/) |
| 30 | Playwright automated verification of Quick Task 29 — 8/8 checks PASS; found products.js omits `colors` from SELECT (swatches use mock-inject path); 27 DB products still have Violet (silently filtered) | 2026-06-04 | e771f51 | [30-playwright-automated-verification-of-qui](./quick/30-playwright-automated-verification-of-qui/) |
| 31 | Fix colors column missing from loadProducts SELECT: add colors to SELECT + transform in products.js; cache-bust v31; optional SQL to strip Violet from 27 DB products | 2026-06-04 | 28a7b57 | [31-fix-colors-column-missing-from-loadprodu](./quick/31-fix-colors-column-missing-from-loadprodu/) |

## Engraving Follow-up Decision Needed

RESOLVED by quick-9: Empty-state feedback added to filterEngravingProducts (Option A selected). Leather shows "No items in this category yet" instead of blank grid. The 2 null-material rows still fall back to 'Wood' — a DB fix remains optional.

## Session Continuity

Last session: 2026-06-04
Stopped at: Completed quick task 30 — Playwright verification of Quick Task 29 Violet→Pink swap; 8/8 PASS
Resume file: None
