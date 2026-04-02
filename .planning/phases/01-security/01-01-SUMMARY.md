---
phase: 01-security
plan: 01
subsystem: payments
tags: [stripe, supabase, edge-functions, security, coupon, price-verification]

# Dependency graph
requires: []
provides:
  - Server-side price lookup from Supabase products table by UUID
  - Server-side coupon validation from COUPON_CODES environment variable
  - Cart items carry product UUID for server verification
  - Client-side coupon validation removed from browser bundle
affects: [02-reliability, 03-ux, 04-polish]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js@2 (in edge function)"]
  patterns:
    - "Edge function imports Supabase client via esm.sh CDN import"
    - "Price verification: filter items by id, query DB, build Map<string,number>, replace client prices"
    - "Coupon validation: parse COUPON_CODES JSON env var, reject unknown codes with 400 + corsHeaders"
    - "Items without id (services, local 3D-print items) pass through unchanged with client price"

key-files:
  created: []
  modified:
    - supabase-functions/create-checkout-session/index.ts
    - app.js

key-decisions:
  - "Items without UUID (services) keep client-supplied price — server only overrides DB product prices"
  - "Client shows coupon as accepted with deferred message; server validates and returns 400 for bad codes"
  - "Client error handler distinguishes validation errors (show message) from Stripe failures (show email fallback)"

patterns-established:
  - "Security pattern: trust nothing from client for DB products — always re-fetch authoritative price"
  - "Error pattern: 400 JSON responses always include corsHeaders to avoid CORS errors on failure path"

# Metrics
duration: 3min
completed: 2026-04-02
---

# Phase 1 Plan 01: Server-side Price Verification and Coupon Validation Summary

**Checkout edge function now queries Supabase for authoritative product prices by UUID and validates coupon codes from a server-only COUPON_CODES environment variable, removing all coupon data from the browser JS bundle.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T19:00:40Z
- **Completed:** 2026-04-02T19:03:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Edge function queries Supabase products table and replaces client-supplied prices with server-authoritative prices for all DB product UUIDs
- Coupon codes moved from browser-visible `validCoupons` JS object to `COUPON_CODES` Deno environment variable; server validates and calculates discount from verified subtotal
- Cart items now carry `id: product.id` (UUID) enabling server-side price lookup
- Client sends `couponCode` string to server; client no longer computes or sends a dollar discount amount

## Task Commits

Each task was committed atomically:

1. **Task 1: Server-side price lookup and coupon validation in edge function** - `336fba6` (feat)
2. **Task 2: Update app.js — add id to cart items, send couponCode, remove validCoupons** - `fb29d4a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `supabase-functions/create-checkout-session/index.ts` - Added Supabase client import, price lookup by UUID, coupon validation from env var; removed client-trusted discount field
- `app.js` - Added `id` to cart items in addToCart(), replaced `discount` with `couponCode` in checkout payload, removed `validCoupons` object, updated coupon UI to defer validation to server

## Decisions Made
- Items without a UUID (`id` field absent) keep their client-supplied price unchanged. This is intentional: services and local 3D-print items are not in Supabase and cannot be verified. Only DB products (which have UUIDs) are subject to server price enforcement.
- Client-side coupon UI still accepts any code and shows "discount will be applied at checkout". The server returns a clear 400 error if the code is invalid, which is surfaced directly in the checkout UI.
- Checkout error handling was split: validation errors (coupon, product verification) show the server message; payment system errors show the email fallback. This is necessary for usable error UX.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Surface server error messages in checkout error handler**
- **Found during:** Task 2 (updating checkout fetch body)
- **Issue:** The existing catch block showed a generic "Payment system temporarily unavailable" message for all errors, which would hide clear server-sent messages like "Coupon code X is not valid." Users would see a confusing fallback instead of actionable feedback.
- **Fix:** Updated the response parsing to read JSON body before checking `response.ok`. In the catch handler, check if the error message is a validation error (coupon/product) and show it directly; otherwise show the email fallback for genuine payment failures.
- **Files modified:** app.js
- **Verification:** Error message string tested via grep for isValidationError logic; server sends JSON `{ error: "..." }` which is now read before the `!response.ok` throw.
- **Committed in:** fb29d4a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix necessary for correct UX when server rejects an invalid coupon. Without it, users would see "payment system unavailable" instead of "coupon code is not valid." No scope creep.

## Issues Encountered
None.

## User Setup Required

The `COUPON_CODES` environment variable must be set in Supabase for coupon validation to work.

Run the following command to configure it:
```
supabase secrets set COUPON_CODES='{"PARTY10":10,"FUN30":30,"FAMILY50":50}'
```

Without this secret set, `COUPON_CODES` defaults to `{}` (empty object), meaning all coupon codes will be rejected as invalid. The checkout will still work for orders without a coupon code.

## Next Phase Readiness
- SEC-01 (price manipulation) resolved: server enforces authoritative prices from Supabase
- SEC-04 (coupon exposure) resolved: `validCoupons` removed from browser bundle, validation is server-only
- Ready for Phase 1 Plan 02 (remaining security vulnerabilities)

---
*Phase: 01-security*
*Completed: 2026-04-02*

## Self-Check: PASSED

- FOUND: supabase-functions/create-checkout-session/index.ts
- FOUND: app.js
- FOUND: .planning/phases/01-security/01-01-SUMMARY.md
- FOUND: commit 336fba6 (Task 1 — edge function)
- FOUND: commit fb29d4a (Task 2 — app.js)
