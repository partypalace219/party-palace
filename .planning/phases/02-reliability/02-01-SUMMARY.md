---
phase: 02-reliability
plan: 01
subsystem: database
tags: [supabase, stripe, webhook, orders, postgres, jsonb]

# Dependency graph
requires:
  - phase: 01-security
    provides: stripe-webhook edge function with verified signature handling and email sending
provides:
  - Supabase orders table for persistent order storage
  - stripe-webhook writes order row on every checkout.session.completed
  - Idempotency guard via 23505 unique violation catch on stripe_session_id
  - DB failure isolation — insert failure never blocks email sending
affects: [future admin/reporting features, order history queries]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js@2 (via esm.sh CDN import in Deno edge function)"]
  patterns:
    - "Supabase client instantiated per-request inside serve() (not module scope) for edge function correctness"
    - "DB write before email send — persistence attempt before side effects"
    - "try/catch around DB insert with 23505 special-casing for idempotent duplicate detection"

key-files:
  created: []
  modified:
    - supabase-functions/stripe-webhook/index.ts

key-decisions:
  - "Use actual orders table column names (items, total) not plan's speculative names (line_items, order_total)"
  - "Supabase client instantiated inside serve() per-request, not at module scope — module scope resets per request in Deno edge functions"
  - "items JSONB stores single entry with comma-joined order_items string — documented limitation, quantity always 1 since Stripe metadata lacks per-item quantities"
  - "status column omitted from INSERT — relies on DEFAULT 'confirmed' in DB schema"

patterns-established:
  - "Idempotency via 23505: catch unique violation by error code, log as duplicate, continue — no re-throw"
  - "DB failure isolation: inner try/catch around insert block, always fall through to email sending"

# Metrics
duration: 10min
completed: 2026-04-08
---

# Phase 2 Plan 1: Order Persistence Summary

**Supabase orders table wired to stripe-webhook — every checkout.session.completed event writes a persistent row with idempotency guard and DB-failure isolation**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-08
- **Completed:** 2026-04-08
- **Tasks:** 2 code tasks (Task 1 was human-run SQL, Task 2 was code)
- **Files modified:** 1

## Accomplishments
- Supabase orders table created by human via SQL (stripe_session_id UNIQUE, items JSONB, total DECIMAL, order_type TEXT, status DEFAULT 'confirmed')
- stripe-webhook/index.ts modified to insert order row on checkout.session.completed before email sending
- 23505 unique violation caught and logged — duplicate webhook deliveries are fully idempotent
- DB failure (any non-23505 error or thrown exception) logs full event data for manual recovery and never blocks email delivery

## Task Commits

Each task was committed atomically:

1. **Task 1: Create orders table in Supabase** — human-run SQL, no commit required
2. **Task 2: Add Supabase order insert to stripe-webhook** — `3ee6a89` (feat)

**Plan metadata:** (to be committed after summary)

## Files Created/Modified
- `supabase-functions/stripe-webhook/index.ts` — Added createClient import, per-request Supabase client, order insert block with idempotency and failure isolation

## Decisions Made
- Column names `items` and `total` used (not `line_items`/`order_total` from plan spec) — matched actual table schema the human created
- `status` omitted from INSERT — table DEFAULT 'confirmed' handles it, avoids hardcoding
- `supabase` client placed inside `serve()` after signature/secret guard but before the try/catch — instantiated per-request per Deno edge function best practice

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected column names to match actual orders table schema**
- **Found during:** Task 2 (applying insert logic)
- **Issue:** Plan specified `line_items` and `order_total`; actual table uses `items` and `total`
- **Fix:** Used correct column names from `<critical_schema_info>` provided in execution context; also omitted `status` from INSERT (relies on DB DEFAULT)
- **Files modified:** supabase-functions/stripe-webhook/index.ts
- **Verification:** Column names confirmed against schema info provided by user
- **Committed in:** `3ee6a89` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (schema column name correction)
**Impact on plan:** Required for correctness — wrong column names would cause insert failures at runtime. No scope creep.

## Issues Encountered
None beyond the schema column name mismatch, which was documented and provided in execution context.

## User Setup Required
**Deployment required.** Task 3 (checkpoint:human-verify) covers:
1. Deploy updated stripe-webhook via Supabase Dashboard → Edge Functions → stripe-webhook → Deploy
2. Run a Stripe test checkout (card: 4242 4242 4242 4242)
3. Confirm order row appears in Supabase Table Editor → orders table
4. Re-deliver same webhook event from Stripe Dashboard to verify idempotency (no second row)
5. Check Edge Function logs for: `Order record written for session: cs_test_...`

## Next Phase Readiness
- Order persistence complete — every payment now produces a queryable record
- Ready for remaining Phase 2 reliability plans (rate limiting was already deployed per STATE.md)

---
*Phase: 02-reliability*
*Completed: 2026-04-08*
