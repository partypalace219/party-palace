---
phase: 02-reliability
plan: 03
subsystem: api
tags: [rate-limiting, stripe, supabase-edge-functions, checkout]

# Dependency graph
requires:
  - phase: 01-security
    provides: getCorsHeaders pattern, create-checkout-session edge function with server-side price/coupon validation
provides:
  - In-memory rate limiting on create-checkout-session (10 req/60s per IP)
  - 429 detection in checkout form with user-facing error message
affects: [02-reliability, checkout flow, edge functions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-scope Map for in-memory rate limiting in Deno edge functions (persists across warm isolate requests)
    - 429 detection before !response.ok in fetch handlers — bypasses error/fallback flows for expected throttle responses

key-files:
  created: []
  modified:
    - supabase-functions/create-checkout-session/index.ts
    - app.js

key-decisions:
  - "rateLimitMap declared at MODULE SCOPE (outside serve()) — inside serve() resets map per request, making rate limiting ineffective"
  - "429 branch in handleCheckoutSubmit returns early before catch block — rate limiting is not a payment failure and must not trigger email fallback"

patterns-established:
  - "Module-scope Map pattern: declare stateful maps before serve() for Deno isolate persistence"
  - "429-before-ok pattern: check response.status === 429 before generic !response.ok to handle throttle responses cleanly"

# Metrics
duration: 1min
completed: 2026-04-08
---

# Phase 2 Plan 3: Rate Limiting Summary

**In-memory rate limiting on checkout endpoint (10 req/60s per IP via module-scope Map) with 429 detection and user-facing error in checkout form**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-08T22:10:12Z
- **Completed:** 2026-04-08T22:10:32Z
- **Tasks:** 2 auto + 1 human-verify checkpoint
- **Files modified:** 2

## Accomplishments
- `rateLimitMap` declared at module scope in create-checkout-session edge function — persists across warm Deno isolate requests
- Rate limit enforces 10 requests per IP per 60-second window, returning HTTP 429 with `{"error":"Too many requests. Please wait a moment and try again."}`
- `handleCheckoutSubmit` in app.js detects 429 before the generic `!response.ok` check, shows the error in the `form-error` div, re-enables the submit button, and returns without triggering the email fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rate limiting to create-checkout-session/index.ts** - `55a8e4a` (feat)
2. **Task 2: Detect 429 in handleCheckoutSubmit and show user-facing message** - `93bf015` (feat)
3. **Task 3: Deploy and verify rate limiting behavior** - checkpoint:human-verify (pending user deployment + verification)

## Files Created/Modified
- `supabase-functions/create-checkout-session/index.ts` - Module-scope rateLimitMap + per-IP window check returning 429
- `app.js` - 429 branch in handleCheckoutSubmit before !response.ok

## Decisions Made
- `rateLimitMap` must be at module scope — inside `serve()` would reset per-request, making throttle useless
- 429 branch uses `return` (not `throw`) — rate limiting is expected behavior, not an error; email fallback must not trigger

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

Task 3 requires manual deployment verification:

1. Deploy updated `create-checkout-session` edge function via Supabase Dashboard
2. Run curl loop (12 requests) — requests 1-10 should pass, 11-12 should return 429
3. Verify checkout form shows "Too many requests. Please wait a moment and try again." on 429
4. Wait 60 seconds — confirm window resets

## Self-Check: PASSED

- `supabase-functions/create-checkout-session/index.ts` — exists, rateLimitMap at line 33, serve() at line 35
- `app.js` — response.status === 429 at line 1839, !response.ok at line 1847 (429 check first)
- Commits 55a8e4a and 93bf015 exist in git log

## Next Phase Readiness
- Rate limiting code complete and committed — awaiting deployment verification (Task 3 checkpoint)
- Once verified, REL-03 is fully satisfied and Phase 2 Plan 3 is complete

---
*Phase: 02-reliability*
*Completed: 2026-04-08*
