---
phase: 01-security
plan: 02
subsystem: api
tags: [cors, security, edge-functions, supabase, deno]

# Dependency graph
requires: []
provides:
  - Dynamic CORS origin validation on all 4 Supabase edge functions
  - ALLOWED_ORIGINS allowlist with production domain and localhost dev variants
  - getCorsHeaders(req) pattern for per-request origin checking
  - OPTIONS preflight handling on stripe-webhook (previously missing)
affects: [any future edge functions, stripe-webhook, create-checkout-session, send-contact-email, save-signed-document]

# Tech tracking
tech-stack:
  added: []
  patterns: [getCorsHeaders(req) per-request CORS pattern for Deno edge functions]

key-files:
  created: []
  modified:
    - supabase-functions/create-checkout-session/index.ts
    - supabase-functions/send-contact-email/index.ts
    - supabase-functions/save-signed-document/index.ts
    - supabase-functions/stripe-webhook/index.ts

key-decisions:
  - "01-02: Dynamic CORS checks request Origin against ALLOWED_ORIGINS; falls back to production domain (not request origin) for unlisted origins"
  - "01-02: corsHeaders computed per-request as local variable via getCorsHeaders(req) — all existing response spreads work unchanged"
  - "01-02: stripe-webhook given OPTIONS handler for consistency even though Stripe itself never sends preflight"

patterns-established:
  - "getCorsHeaders(req): Place ALLOWED_ORIGINS + getCorsHeaders function at top of file; call const corsHeaders = getCorsHeaders(req) as first line of serve() handler; spread into all responses"

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 1 Plan 02: Dynamic CORS Lockdown Summary

**Wildcard CORS removed from all 4 edge functions — origin allowlist restricts API access to thepartypalace.in and localhost dev origins via per-request getCorsHeaders(req) pattern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T19:06:03Z
- **Completed:** 2026-04-02T19:07:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Removed `Access-Control-Allow-Origin: *` from all 4 edge functions (zero wildcard CORS remaining)
- Implemented ALLOWED_ORIGINS allowlist + getCorsHeaders(req) per-request function in all 4 files
- Added OPTIONS preflight handler to stripe-webhook (was completely absent before)
- All existing response objects continue working unchanged — corsHeaders computed once at handler start then spread into responses as before

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace wildcard CORS in create-checkout-session, send-contact-email, save-signed-document** - `805d21e` (feat)
2. **Task 2: Add dynamic CORS headers to stripe-webhook** - `db1e8c6` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `supabase-functions/create-checkout-session/index.ts` - Static corsHeaders replaced with ALLOWED_ORIGINS + getCorsHeaders(req); per-request variable at handler start
- `supabase-functions/send-contact-email/index.ts` - Same pattern; all 5 response paths already had corsHeaders spread
- `supabase-functions/save-signed-document/index.ts` - Same pattern; all 3 response paths already had corsHeaders spread
- `supabase-functions/stripe-webhook/index.ts` - Added ALLOWED_ORIGINS + getCorsHeaders; added OPTIONS handler; added corsHeaders to all 4 responses (missing-sig, invalid-sig, success, catch)

## Decisions Made
- Dynamic CORS falls back to production domain (not the request's Origin) for unlisted origins — browser correctly rejects the mismatch, attacker cannot obtain a matching header
- stripe-webhook gets an OPTIONS preflight handler for defense-in-depth even though Stripe's server-to-server calls never send CORS preflight
- corsHeaders computed as a per-request local variable (not module-level) so the pattern is identical across all 4 functions and future edge functions can copy it verbatim

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Changes are code-only; deployed to Supabase via normal edge function deployment.

## Next Phase Readiness
- SEC-03 CORS requirement fully satisfied across all 4 edge functions
- Ready for Plan 03 (remaining security items in phase)
- Pattern established: any new edge functions must use getCorsHeaders(req) — wildcard CORS must not be reintroduced

---
*Phase: 01-security*
*Completed: 2026-04-02*

## Self-Check: PASSED

- FOUND: supabase-functions/create-checkout-session/index.ts
- FOUND: supabase-functions/send-contact-email/index.ts
- FOUND: supabase-functions/save-signed-document/index.ts
- FOUND: supabase-functions/stripe-webhook/index.ts
- FOUND: .planning/phases/01-security/01-02-SUMMARY.md
- FOUND commit: 805d21e
- FOUND commit: db1e8c6
