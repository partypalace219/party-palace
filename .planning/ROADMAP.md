# Roadmap: Party Palace — Production Hardening

## Overview

This milestone hardens the existing vanilla JS + Supabase + Stripe + Railway stack across four natural delivery boundaries: security first (price manipulation, XSS, CORS, coupon exposure), then reliability (order persistence, transactional email, rate limiting), then quick wins (cleanup, lazy loading, DB-driven features), then the frontend refactor (ES modules, unified product rendering, CSS classes, timer management). Each phase is independently verifiable and leaves the site live throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security** - Close all server-side trust and injection vulnerabilities
- [x] **Phase 2: Reliability** - Guarantee every order is recorded and emails are delivered
- [ ] **Phase 3: Cleanup** - Remove exposed files, eliminate hardcoded data, add lazy loading
- [ ] **Phase 4: Frontend Refactor** - Split app.js into ES modules and unify the product system

## Phase Details

### Phase 1: Security
**Goal**: The site cannot be exploited via price manipulation, coupon exposure, XSS, or open CORS
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. Submitting a checkout request with a manipulated price in the payload results in the server using its own Supabase-looked-up price — the client-supplied value is ignored
  2. Coupon code logic is absent from the browser JS bundle — inspecting app.js reveals no `validCoupons` object
  3. A curl request to the checkout edge function from an unlisted origin receives a CORS rejection
  4. Order confirmation emails display user-supplied strings (name, notes) as literal text — HTML tags entered by a user are not rendered
  5. Dynamic product card HTML sets user-derived fields via `textContent` — no XSS vector exists in rendered cards
**Plans:** 3 plans

Plans:
- [ ] 01-01: Server-side price verification and coupon validation in checkout edge function
- [ ] 01-02: CORS lockdown on all edge functions
- [ ] 01-03: HTML escaping for email templates and textContent for product cards

### Phase 2: Reliability
**Goal**: Every completed payment produces a permanent order record and a delivered email via a maintained API
**Depends on**: Phase 1
**Requirements**: REL-01, REL-02, REL-03
**Success Criteria** (what must be TRUE):
  1. After a successful Stripe test checkout, a row exists in the Supabase `orders` table with the correct line items, total, and customer details
  2. Order confirmation and booking confirmation emails arrive from Resend — no Gmail SMTP credentials or SMTP calls exist in the codebase
  3. Sending more than 10 checkout requests from the same IP within one minute results in HTTP 429 responses for the excess requests
**Plans:** 3 plans

Plans:
- [ ] 02-01: Create orders table and write order record in webhook handler
- [ ] 02-02: Migrate transactional email from Gmail SMTP to Resend API
- [ ] 02-03: Add rate limiting to checkout edge function

### Phase 3: Cleanup
**Goal**: The public web root contains no sensitive or stale files and the site relies on DB-driven data for featured products
**Depends on**: Phase 2
**Requirements**: CLN-01, CLN-02, CLN-03
**Success Criteria** (what must be TRUE):
  1. Requesting any `.backup*` file or Python script URL via HTTP returns 404 — no such paths are served from the public root
  2. The "Popular" badge on product cards is driven by the Supabase `featured` column — removing a product from the hardcoded JS array has no effect because that array no longer exists
  3. All dynamically rendered product `<img>` tags include `loading="lazy"` — verified by inspecting the DOM after products load
**Plans:** 3 plans

Plans:
- [ ] 03-01: Remove backup files and Python scripts from public web root
- [ ] 03-02: Replace hardcoded popularProducts array with Supabase featured column
- [ ] 03-03: Add loading="lazy" to all dynamic product image tags

### Phase 4: Frontend Refactor
**Goal**: app.js is decomposed into maintainable ES modules and the dual product system is eliminated
**Depends on**: Phase 3
**Requirements**: FE-01, FE-02, FE-03, FE-04
**Success Criteria** (what must be TRUE):
  1. The browser network tab shows `cart.js`, `products.js`, `checkout.js`, `staff.js`, and `ui.js` loaded as ES modules — `app.js` as a monolith no longer exists
  2. Engraving and 3D prints product cards are rendered entirely from Supabase data — static `<div class="product-card">` blocks for those categories are absent from index.html
  3. The engraving and 3D prints card builders contain no inline `style="..."` attributes — all visual styling is expressed as CSS class names in styles.css
  4. Rapid tab switching or page revisits do not produce stacked hero slideshow animations — clearing and re-initializing the interval produces a single clean timer
**Plans:** 3 plans

Plans:
- [ ] 04-01: Split app.js into ES modules (cart, products, checkout, staff, ui)
- [ ] 04-02: Migrate engraving and 3D prints to fully dynamic Supabase rendering
- [ ] 04-03: Replace inline styles with CSS classes and fix hero slideshow timer

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security | 3/3 | ✓ Complete | 2026-04-02 |
| 2. Reliability | 3/3 | ✓ Complete | 2026-04-09 |
| 3. Cleanup | 0/3 | Not started | - |
| 4. Frontend Refactor | 0/3 | Not started | - |
