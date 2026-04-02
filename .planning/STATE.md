# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Customers can browse products and services, add to cart, and complete a real payment — every time, without security holes or data loss.
**Current focus:** Phase 1 — Security

## Current Position

Phase: 1 of 4 (Security)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-04-02 — Plan 02 complete: dynamic CORS lockdown on all 4 edge functions

Progress: [██░░░░░░░░] 17%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 2.5 min
- Total execution time: 0.08 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-security | 2 | 5 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 3 min, 2 min
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Server-side price lookup chosen over client-trusted prices (security critical)
- Init: Resend chosen over Gmail SMTP for transactional email (simpler API, free tier)
- Init: ES module split requires no build step (native browser support)
- 01-01: Items without UUID (services) keep client price — server only verifies DB products
- 01-01: Coupon UI accepts any code client-side; server validates and returns 400 for invalid codes
- 01-01: Checkout error handler splits validation errors (show message) from Stripe failures (email fallback)
- 01-02: Dynamic CORS falls back to production domain (not request origin) for unlisted origins — browser rejects mismatch
- 01-02: corsHeaders computed per-request as local variable via getCorsHeaders(req) — pattern established for all future edge functions
- 01-02: stripe-webhook given OPTIONS handler for consistency even though Stripe never sends CORS preflight

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-04-02
Stopped at: Completed 01-security Plan 02 — dynamic CORS lockdown on all 4 edge functions
Resume file: None
