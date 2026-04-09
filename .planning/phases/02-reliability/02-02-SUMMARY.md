---
phase: 02-reliability
plan: 02
subsystem: infra
tags: [resend, email, transactional, edge-functions, deno, fetch]

# Dependency graph
requires:
  - phase: 02-01
    provides: stripe-webhook edge function with order insert logic

provides:
  - Resend REST API email sending in stripe-webhook (4 email types)
  - Resend REST API email sending in send-contact-email (2 email types)
  - Shared sendEmail() helper pattern in both edge functions

affects:
  - Any future email additions to stripe-webhook or send-contact-email
  - Domain verification step (thepartypalace.in in Resend Dashboard)

# Tech tracking
tech-stack:
  added: [resend (REST API via fetch — no SDK)]
  patterns:
    - sendEmail() helper with typed opts centralizes Resend API calls per function
    - RESEND_API_KEY + FROM_ADDRESS + BUSINESS_EMAIL constants at module scope
    - reply_to field used for contact/custom-order so business can reply directly to customer

key-files:
  created: []
  modified:
    - supabase-functions/stripe-webhook/index.ts
    - supabase-functions/send-contact-email/index.ts

key-decisions:
  - "02-02: Use raw fetch to Resend REST API — no npm:resend SDK to avoid Deno bundler issues"
  - "02-02: FROM_ADDRESS uses onboarding@resend.dev until thepartypalace.in is verified in Resend"
  - "02-02: sendEmail() helper defined per-file (not shared module) — Deno edge functions are isolated deployments"
  - "02-02: Business notification emails route to BUSINESS_EMAIL constant replacing SMTP_USER reference"

patterns-established:
  - "Resend send pattern: fetch('https://api.resend.com/emails') with Authorization Bearer header and JSON body"
  - "Email guard: if (customerEmail && RESEND_API_KEY) replaces SMTP credential check"
  - "reply_to support: optional field in sendEmail() opts, conditionally included in request body as reply_to"

# Metrics
duration: ~20min
completed: 2026-04-08
---

# Phase 02 Plan 02: Email Migration Summary

**Replaced Gmail SMTP (denomailer) with Resend REST API across all 6 transactional email sends in stripe-webhook and send-contact-email edge functions**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-08
- **Completed:** 2026-04-08
- **Tasks:** 2 of 4 auto tasks completed (Task 1 was human-completed pre-session, Task 4 is a human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Removed denomailer import, SMTP_HOST/PORT/USER/PASS constants, and getSmtpClient() from both edge functions
- Added sendEmail() helper in each function using fetch('https://api.resend.com/emails')
- All 4 email types in stripe-webhook (product confirm, product biz notification, booking confirm, booking biz notification) now send via Resend
- Both email types in send-contact-email (contact inquiry, custom order) now send via Resend with reply_to support preserved
- Guard condition updated from SMTP credential check to RESEND_API_KEY presence check

## Task Commits

Each task was committed atomically:

1. **Task 1: Set up Resend account + RESEND_API_KEY secret** - human-completed (no commit)
2. **Task 2: Migrate stripe-webhook** - `783e858` (feat)
3. **Task 3: Migrate send-contact-email** - `f5892ab` (feat)
4. **Task 4: Deploy + verify** - checkpoint (pending human verification)

## Files Created/Modified

- `supabase-functions/stripe-webhook/index.ts` - Replaced SMTP with Resend; sendEmail() helper; 4 email functions rewritten
- `supabase-functions/send-contact-email/index.ts` - Replaced SMTP with Resend; sendEmail() helper with replyTo; 2 email functions rewritten

## Decisions Made

- Used raw fetch to `https://api.resend.com/emails` instead of the npm:resend SDK — avoids Deno bundler issues that affected denomailer
- FROM_ADDRESS set to `Party Palace <onboarding@resend.dev>` until thepartypalace.in is verified in Resend Dashboard
- sendEmail() defined per-file rather than a shared module — Deno edge functions are isolated deployments with no shared module layer
- Business notification emails use the explicit BUSINESS_EMAIL constant (`partypalace.in@gmail.com`) instead of the removed SMTP_USER variable

## Deviations from Plan

None - plan executed exactly as written. All HTML templates, rate limiting logic, honeypot checks, order insert logic, and CORS handling preserved without modification.

## Issues Encountered

**Deployment via MCP tool:** The `mcp__claude_ai_Supabase__deploy_edge_function` tool was not available in this agent context, and the Supabase CLI requires a `SUPABASE_ACCESS_TOKEN` environment variable not present in the shell. Deployment must be completed via the Supabase Dashboard (see Task 4 checkpoint below).

## User Setup Required

Task 4 is a human-verify checkpoint. To complete deployment:

1. Go to https://supabase.com/dashboard/project/nsedpvrqhxcikhlieize/functions
2. Click `stripe-webhook` → Deploy (or redeploy)
3. Click `send-contact-email` → Deploy (or redeploy)
4. Trigger a test checkout (Stripe test card 4242 4242 4242 4242) — confirm email arrives
5. Submit contact form on https://thepartypalace.in — confirm email arrives at partypalace.in@gmail.com
6. Sender will show `onboarding@resend.dev` until thepartypalace.in domain is verified in Resend

**Future:** After verifying thepartypalace.in in Resend Dashboard, update FROM_ADDRESS in both files from `onboarding@resend.dev` to `orders@thepartypalace.in`.

## Next Phase Readiness

- Code migration is complete and committed
- Deployment pending (human action required via Supabase Dashboard)
- Once deployed and verified, email infrastructure is on Resend — no more SMTP credential maintenance
- Phase 3 can begin once deployment is confirmed working

---
*Phase: 02-reliability*
*Completed: 2026-04-08*
