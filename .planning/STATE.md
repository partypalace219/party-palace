# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Customers can browse products and services, add to cart, and complete a real payment — every time, without security holes or data loss.
**Current focus:** Phase 2 — Reliability

## Current Position

Phase: 3 of 4 (Cleanup) — IN PROGRESS
Plan: 2 of 3 in current phase (complete)
Status: In progress — plan 03-02 complete
Last activity: 2026-04-09 — Phase 3 Plan 2: DB-driven Popular badge + lazy loading added to all dynamic product imgs

Progress: [████████░░] 72%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 2.5 min
- Total execution time: 0.08 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-security | 3 | 13 min | 4.3 min |
| 02-reliability | 3 | ~17 min | 5.7 min |
| 03-cleanup | 2 | 13 min | 6.5 min |

**Recent Trend:**
- Last 5 plans: 3 min, 2 min, 8 min, 5 min, 8 min
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
- 01-03: escapeHtml() defined once per edge function file (not shared module) — Deno edge functions are isolated deployments
- 01-03: escape-before-replace pattern: escapeHtml(str).replace(/\n/g, '<br>') neutralizes tags before newline conversion
- 01-03: For createProductCard (string-return), data-product-name/data-product-desc attributes enable post-DOM textContent fill
- 02-03: rateLimitMap declared at MODULE SCOPE (outside serve()) in Deno edge functions — inside serve() resets per-request
- 02-03: 429 branch uses return not throw in handleCheckoutSubmit — rate limiting is expected behavior, not a payment failure
- [Phase 02-01]: Use actual orders table column names (items, total) not plan's speculative names (line_items, order_total)
- [Phase 02-01]: 02-01: Supabase client instantiated inside serve() per-request — module scope resets per request in Deno edge functions
- [Phase 02-01]: 02-01: items JSONB stores single entry with comma-joined order_items string — quantity always 1 since Stripe metadata lacks per-item quantities

- [Phase 02-02]: Use raw fetch to Resend REST API — no npm:resend SDK to avoid Deno bundler issues
- [Phase 02-02]: FROM_ADDRESS uses onboarding@resend.dev until thepartypalace.in is verified in Resend Dashboard
- [Phase 02-02]: sendEmail() helper defined per-file (not shared module) — Deno edge functions are isolated deployments
- [Phase 02-02]: Business notification emails route to BUSINESS_EMAIL constant replacing removed SMTP_USER reference
- [Phase 03-01]: Backup files were gitignored but some were tracked — git rm removed tracked ones, disk rm removed untracked ones
- [Phase 03-02]: Removed popularProducts hardcoded override — Supabase featured column is sole source of truth for Popular badge
- [Phase 03-02]: Vases.featured=false in DB — needs manual UPDATE in Supabase dashboard (no service role key available in project)
- [Phase 03-02]: loading=lazy excluded from lightbox img (empty src) and staff admin thumbnail — intentional exclusions

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-04-09
Stopped at: Completed 03-02-PLAN.md (DB-driven Popular badge + lazy loading) — both tasks done
Resume file: None
