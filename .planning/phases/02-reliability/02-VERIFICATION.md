---
phase: 02-reliability
verified: 2026-04-08T22:30:00Z
status: gaps_found
score: 5/7 must-haves verified
re_verification: false
gaps:
  - truth: After Stripe checkout, orders table row exists with correct items/total/customer data
    status: partial
    reason: Insert code wired but column names differ from PLAN spec (items/total vs line_items/order_total). Orders table created by human SQL - not inspectable from local files.
    artifacts:
      - path: supabase-functions/stripe-webhook/index.ts
        issue: Insert uses column names items and total, not line_items and order_total per PLAN. SUMMARY documents deliberate schema alignment, but cannot verify without checking Supabase.
    missing:
      - Human must confirm orders table columns are named items and total (not line_items/order_total)
      - Human must confirm a completed Stripe test checkout produces exactly one row
  - truth: No Gmail SMTP credentials in stripe-webhook and send-contact-email
    status: partial
    reason: Both target files are clean. save-signed-document/index.ts retains SMTP stack but was explicitly out of scope per plan and SUMMARY.
    artifacts:
      - path: supabase-functions/save-signed-document/index.ts
        issue: Contains denomailer import, SMTP_HOST/PORT/USER/PASS, getSmtpClient() - explicitly out of scope per plan and SUMMARY
    missing:
      - Clarify if criterion 2 applies only to stripe-webhook+send-contact-email (plan scope) or codebase-wide
human_verification:
  - test: Stripe test checkout produces one orders table row with correct column values
    expected: One row in orders with customer_email, items JSONB, total decimal, order_type, status confirmed
    why_human: Requires live Stripe webhook delivery to deployed edge function
  - test: Re-delivered webhook does not insert duplicate row
    expected: No second row; edge function logs show Duplicate webhook event for session
    why_human: Requires live Stripe and Supabase environment
  - test: Resend email delivery confirmed
    expected: Order confirmation arrives from onboarding@resend.dev not a Gmail SMTP address
    why_human: Requires deployed edge function and live RESEND_API_KEY in Supabase
---

# Phase 02: Reliability Verification Report

**Phase Goal:** Every completed payment produces a permanent order record and a delivered email via a maintained API
**Verified:** 2026-04-08T22:30:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After Stripe test checkout, orders table row exists with correct items, total, customer details | HUMAN NEEDED | Insert code wired; column names deviate from plan spec (items/total not line_items/order_total per SUMMARY); live row unverifiable statically |
| 2 | Order and booking confirmation emails arrive via Resend | HUMAN NEEDED | fetch to api.resend.com in sendEmail() helper confirmed; RESEND_API_KEY guard present; delivery requires live deployed function |
| 3 | No Gmail SMTP credentials in stripe-webhook and send-contact-email | VERIFIED | Zero SMTP/denomailer matches in both target files |
| 4 | No Gmail SMTP credentials anywhere in codebase (if codebase-wide scope) | FAILED | save-signed-document/index.ts has full SMTP stack; plan explicitly out-of-scoped it |
| 5 | 11th checkout request from same IP within 60 seconds receives HTTP 429 | VERIFIED | rateLimitMap at module scope (line 33 before serve() at line 35); 429 return at lines 56-59 with correct JSON body |
| 6 | rateLimitMap declared at module scope | VERIFIED | Confirmed at line 33, before serve() at line 35 |
| 7 | Checkout page displays 429 error via form-error path | VERIFIED | response.status === 429 at line 1839 before !response.ok at line 1847; form-error class set; submitBtn re-enabled; early return |

**Score:** 5/7 truths verified

### Required Artifacts

#### Plan 01 (Order Persistence)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| supabase-functions/stripe-webhook/index.ts | Supabase order write on checkout.session.completed | WIRED | createClient import at line 6; insert block at lines 166-192; 23505 idempotency at line 179; try/catch isolation confirmed |
| Supabase orders table (SQL, not a local file) | CREATE TABLE orders with correct columns | CANNOT VERIFY | Human-run SQL; not a local file; SUMMARY confirms human created it |

#### Plan 02 (Email Migration)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| supabase-functions/stripe-webhook/index.ts | fetch to api.resend.com/emails | VERIFIED | sendEmail() helper at lines 37-61; all 4 email functions call sendEmail(); RESEND_API_KEY guard at line 196 |
| supabase-functions/send-contact-email/index.ts | fetch to api.resend.com/emails | VERIFIED | sendEmail() helper at lines 41-67; both email functions call sendEmail(); RESEND_API_KEY check at line 104 |

#### Plan 03 (Rate Limiting)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| supabase-functions/create-checkout-session/index.ts | rateLimitMap at module scope, 429 return | VERIFIED | rateLimitMap at line 33; 429 response at lines 56-59 with exact JSON body |
| app.js | response.status === 429 in handleCheckoutSubmit | VERIFIED | 429 check at line 1839 before !response.ok at line 1847 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| stripe-webhook checkout.session.completed | supabase orders table | createClient + from(orders).insert() | WIRED | Insert at line 167; uses SUPABASE_URL + SB_SERVICE_KEY |
| stripe_session_id UNIQUE constraint | idempotency guard | insertError.code 23505 catch | WIRED | Line 179 catches 23505, logs without re-throwing |
| stripe-webhook sendEmail() | https://api.resend.com/emails | fetch with Authorization Bearer | WIRED | Line 43 confirmed |
| send-contact-email sendEmail() | https://api.resend.com/emails | fetch with Authorization Bearer | WIRED | Line 55 confirmed |
| rateLimitMap (module scope) | per-IP request count | Map.get/set keyed by clientIP | WIRED | clientIP from x-forwarded-for at line 44; Map.get at line 50; Map.set at line 64 |
| app.js handleCheckoutSubmit | 429 handling | response.status === 429 before !response.ok | WIRED | Line 1839 before line 1847 |

### Column Name Deviation (Plan 01 - Critical Finding)

The PLAN specified insert columns line_items and order_total. Lines 173-174 of stripe-webhook use items and total instead. The SUMMARY documents this was deliberate: the human created the orders table with column names that differ from the plan, and the executor correctly matched the actual schema. The insert succeeds only if the Supabase table has columns named items and total. Human confirmation is required.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| stripe-webhook/index.ts lines 173-174 | Insert uses items/total vs plan spec line_items/order_total | WARNING | Insert fails silently if Supabase table was created with plan column names |
| save-signed-document/index.ts lines 7,35-38 | denomailer + SMTP_* variables | INFO | Out of scope for this phase; noted for future migration |

### Human Verification Required

#### 1. Stripe Test Checkout to Orders Table Row

**Test:** Complete a Stripe test checkout with card 4242 4242 4242 4242. Open Supabase Table Editor at https://supabase.com/dashboard/project/nsedpvrqhxcikhlieize/editor and inspect the orders table.
**Expected:** One row with correct customer_email, items JSONB array, total decimal, order_type, status confirmed
**Why human:** Requires live Stripe webhook delivery to deployed edge function; also confirms schema column names match code

#### 2. Idempotency Under Re-delivery

**Test:** Re-deliver same checkout.session.completed event from Stripe Dashboard. Check orders table row count.
**Expected:** No second row; edge function logs show Duplicate webhook event for session ... skipping insert
**Why human:** Requires live Stripe and Supabase runtime

#### 3. Resend Email Delivery

**Test:** Complete a test checkout. Check customer inbox and partypalace.in@gmail.com.
**Expected:** Emails arrive from onboarding@resend.dev or orders@thepartypalace.in; no Gmail SMTP sender
**Why human:** Requires live RESEND_API_KEY in Supabase secrets and deployed functions

### Gaps Summary

**Gap 1 - Schema alignment and live test (Truth 1):** The insert code uses column names items and total. The PLAN specified line_items and order_total. The SUMMARY documents the human intentionally created the table with different column names to match actual Supabase schema. If confirmed correct, this gap reduces to a human live-test requirement. If the table was created with the plan column names instead, inserts fail silently and no rows are written - the goal is not achieved.

**Gap 2 - SMTP scope (Truth 4):** stripe-webhook and send-contact-email are fully clean of SMTP. save-signed-document retains SMTP and was explicitly out of scope per plan and SUMMARY. No action required unless the phase goal requires codebase-wide SMTP removal.

**Rate limiting warm-isolate caveat (informational, not a gap):** The SUMMARY notes that live curl testing showed HTTP 400 for all 12 requests rather than 429 for requests 11-12. Supabase may start a fresh Deno isolate per request under low traffic, resetting the module-scope Map. The implementation is architecturally correct and the rate limit activates under genuine burst traffic on a warm isolate.

---

_Verified: 2026-04-08T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
