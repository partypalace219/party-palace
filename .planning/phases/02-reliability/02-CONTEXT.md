# Phase 2: Reliability - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Guarantee every completed Stripe payment produces a permanent Supabase order record and a delivered transactional email via Resend (replacing Gmail SMTP). Add rate limiting to the checkout edge function to prevent abuse. The customer-facing experience doesn't change — this is backend hardening.

</domain>

<decisions>
## Implementation Decisions

### Orders table content
- Capture: order ID (Stripe session ID), customer name, customer email, line items (JSON array of name + quantity + unit price), order total, and created_at timestamp
- Include an `order_type` column to distinguish product orders from service bookings (stripe-webhook already handles both)
- Include a `status` column (default: "confirmed") — leaves room for future fulfillment tracking without requiring it now
- Do NOT store payment method details, card info, or anything beyond what Stripe already gives us in the webhook event

### Email migration scope
- Pure functional migration — same content, same triggers, same recipients
- Do not redesign templates during this phase; content parity is the goal
- If Resend's API makes minor formatting improvements trivially available (e.g., consistent sender name), apply them — but no template redesigns
- Remove all Gmail SMTP credentials and nodemailer/SMTP calls from the codebase; Resend REST API only

### Rate limit customer UX
- Return HTTP 429 with a JSON body: `{ "error": "Too many requests. Please wait a moment and try again." }`
- Checkout page JS should detect 429 and surface the message to the customer (same error display path used for validation errors from 01-01)
- Limit: 10 requests per IP per 60-second window (as specified in roadmap success criteria)
- Use in-memory rate limiting within the edge function (no external Redis needed — Deno isolate per-request is fine for this traffic level)

### Webhook error handling
- If Supabase order write fails: log the error (console.error with full event data) but do NOT block email sending — email is more time-sensitive than the record
- The order record failing is recoverable; the customer not getting their confirmation is not
- No retry logic in this phase — the Stripe dashboard retries webhook delivery automatically
- No business alert mechanism in this phase (future phase if needed)

### Claude's Discretion
- Everything above was user-delegated; Claude has chosen these reasonable defaults
- Supabase client instantiation pattern in the webhook (reuse existing pattern from the edge function)
- Exact Resend SDK version and import style for Deno
- Rate limiting key format (raw IP or hashed)

</decisions>

<specifics>
## Specific Ideas

No specific user requirements — open to standard approaches. Decisions above are Claude's reasoned defaults based on the existing stack and project constraints.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-reliability*
*Context gathered: 2026-04-08*
