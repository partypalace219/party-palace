# Phase 2: Reliability - Research

**Researched:** 2026-04-08
**Domain:** Supabase Edge Functions (Deno) — order persistence, email API migration, rate limiting
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Orders table content**
- Capture: order ID (Stripe session ID), customer name, customer email, line items (JSON array of name + quantity + unit price), order total, and created_at timestamp
- Include an `order_type` column to distinguish product orders from service bookings (stripe-webhook already handles both)
- Include a `status` column (default: "confirmed") — leaves room for future fulfillment tracking without requiring it now
- Do NOT store payment method details, card info, or anything beyond what Stripe already gives us in the webhook event

**Email migration scope**
- Pure functional migration — same content, same triggers, same recipients
- Do not redesign templates during this phase; content parity is the goal
- If Resend's API makes minor formatting improvements trivially available (e.g., consistent sender name), apply them — but no template redesigns
- Remove all Gmail SMTP credentials and nodemailer/SMTP calls from the codebase; Resend REST API only

**Rate limit customer UX**
- Return HTTP 429 with a JSON body: `{ "error": "Too many requests. Please wait a moment and try again." }`
- Checkout page JS should detect 429 and surface the message to the customer (same error display path used for validation errors from 01-01)
- Limit: 10 requests per IP per 60-second window (as specified in roadmap success criteria)
- Use in-memory rate limiting within the edge function (no external Redis needed — Deno isolate per-request is fine for this traffic level)

**Webhook error handling**
- If Supabase order write fails: log the error (console.error with full event data) but do NOT block email sending — email is more time-sensitive than the record
- The order record failing is recoverable; the customer not getting their confirmation is not
- No retry logic in this phase — the Stripe dashboard retries webhook delivery automatically
- No business alert mechanism in this phase (future phase if needed)

### Claude's Discretion
- Supabase client instantiation pattern in the webhook (reuse existing pattern from the edge function)
- Exact Resend SDK version and import style for Deno
- Rate limiting key format (raw IP or hashed)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 2 touches three independent areas of the `stripe-webhook` edge function and the `create-checkout-session` edge function. The existing codebase already establishes patterns for Supabase client usage (in `create-checkout-session`) and IP extraction for rate limiting (in `send-contact-email`). All three tasks can reuse these patterns directly.

The email migration from Gmail SMTP (`denomailer`) to Resend is a straightforward swap: replace the `SMTPClient` instantiation and four `client.send()` calls with four `fetch('https://api.resend.com/emails', ...)` calls. The official Supabase docs use the raw Resend REST API (not the npm SDK) for edge functions. The HTML email content stays identical — only the transport changes.

For rate limiting, the user has decided on in-memory state. The Supabase architecture docs note that an isolate can persist for up to 400 seconds and handle multiple sequential requests within that window — meaning in-memory Maps will work for rate limiting for moderate traffic, though they will not persist across cold starts or concurrent isolate instances. This is an acceptable tradeoff explicitly accepted by the user. The existing `send-contact-email` function already demonstrates IP extraction and 429 response patterns.

**Primary recommendation:** Work in this order — (1) orders table + webhook write, (2) Resend migration in webhook, (3) rate limiting in checkout. Each plan is independent; the webhook plans touch the same file so they must be sequenced.

---

## Standard Stack

### Core (what's already in the codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | `2` via `esm.sh` | Supabase DB client in edge functions | Already used in `create-checkout-session` |
| Resend REST API | N/A (HTTP fetch) | Transactional email | Official Supabase docs use raw fetch, not npm SDK |
| Deno `std` HTTP server | `0.168.0` | Edge function serve() | Already pinned across all functions |

### What Gets Removed

| Removed | Replacing With | Reason |
|---------|----------------|--------|
| `denomailer@1.6.0` SMTP client | Resend REST API (fetch) | Gmail SMTP unreliable; Resend is an API service with guaranteed delivery |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars | `RESEND_API_KEY` env var | Simpler credential management |

### Installation

No npm install needed. Resend is called via `fetch`. Supabase client is already imported via `esm.sh` in the project pattern.

Add one new Supabase secret:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
```

Remove secrets no longer needed (after migration verified):
```bash
# SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
```

---

## Architecture Patterns

### Pattern 1: Supabase Client in Webhook (reuse existing pattern)

**What:** Instantiate the Supabase client using `SUPABASE_URL` + `SB_SERVICE_KEY` env vars.
**When to use:** Any edge function that needs to write to the database.

```typescript
// Source: create-checkout-session/index.ts (existing pattern)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SB_SERVICE_KEY') as string
)

const { error } = await supabase
  .from('orders')
  .insert({ ... })

if (error) {
  console.error('Order write failed:', error, JSON.stringify(event))
  // DO NOT return — continue to send email
}
```

**IMPORTANT:** The `SB_SERVICE_KEY` (service role key) bypasses RLS. The orders table must have RLS enabled with a policy that allows service role inserts, OR RLS disabled entirely for this table. The latter is acceptable since orders are only written by the webhook (server-to-server), never by public clients.

### Pattern 2: Resend Email via REST Fetch

**What:** Replace every `SMTPClient.send()` call with a `fetch` to Resend's API endpoint.
**When to use:** All four email functions in `stripe-webhook/index.ts`.

```typescript
// Source: https://resend.com/docs/send-with-supabase-edge-functions (official)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

async function sendEmail(params: {
  from: string
  to: string | string[]
  subject: string
  html: string
}): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Resend error: ${JSON.stringify(err)}`)
  }
}
```

**From address format:** Resend supports `"Friendly Name <address@domain.com>"` in the `from` field. The domain `thepartypalace.in` must be verified in the Resend dashboard before sending from it. Until verification, use `onboarding@resend.dev` for testing only.

### Pattern 3: In-Memory Rate Limiting (module-scope Map)

**What:** A `Map` declared at module scope (outside `serve()`) persists across requests that hit the same warm isolate.
**When to use:** `create-checkout-session/index.ts` — applied before the main handler logic.

```typescript
// Source: pattern derived from Supabase architecture docs (isolate lifespan up to 400s)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true // allowed
  }

  if (entry.count >= 10) {
    return false // blocked
  }

  entry.count++
  return true // allowed
}
```

**IP extraction** (already proven in `send-contact-email/index.ts`):
```typescript
const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                 req.headers.get('x-real-ip') ||
                 'unknown'
```

**Rate limit response** (per locked decision):
```typescript
return new Response(
  JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
  { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)
```

### Pattern 4: Orders Table SQL

```sql
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  line_items JSONB NOT NULL,        -- [{name, quantity, unit_price}]
  order_total DECIMAL(10,2) NOT NULL,
  order_type TEXT NOT NULL,         -- 'product' or 'booking'
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service role can insert; no public access needed
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert orders"
  ON orders FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read orders"
  ON orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
```

### Anti-Patterns to Avoid

- **Blocking email on DB failure:** If the Supabase insert fails, log it and continue — do NOT return early. The user's locked decision is explicit: email is higher priority.
- **Using the Resend npm SDK with `npm:resend`:** The official Supabase example uses raw `fetch`. The npm SDK approach may also work but introduces a dependency. Use `fetch` for consistency with the project's no-build-step philosophy.
- **Awaiting both DB write and email sequentially before returning 200:** Return 200 to Stripe quickly. Do writes/emails in sequence but don't let a slow SMTP-style connection hold up the webhook response. Resend's REST API is fast, so this is less of a concern than SMTP was.
- **Putting rate limit Map inside the serve() callback:** The Map must be at module scope to persist across requests within the same isolate. A Map inside the callback is created fresh every request.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP retry logic | Resend REST API | Resend handles delivery, retry, bounce tracking |
| Webhook signature verification | Custom HMAC — already done | Existing `verifyStripeSignature()` | Already implemented correctly with Web Crypto in Phase 1 |
| SQL migration tooling | Manual ALTER TABLE | Supabase SQL editor or migration file | Existing project pattern is direct SQL |
| line_items serialization | Custom encoding | JSON.stringify / JSONB column | PostgreSQL JSONB handles arbitrary JSON natively |

**Key insight:** The project has deliberately avoided external dependencies in edge functions (no Stripe SDK, no SMTP library going forward). The same principle applies here — use built-in `fetch` for Resend.

---

## Common Pitfalls

### Pitfall 1: Resend Domain Not Verified
**What goes wrong:** Emails are rejected or delivered to spam if the sending domain is not verified in Resend.
**Why it happens:** Resend requires DNS records (SPF, DKIM, DMARC) to be set on the domain before it allows sending from it.
**How to avoid:** Before the plan runs, verify `thepartypalace.in` in the Resend dashboard and add the required DNS records. Use `onboarding@resend.dev` only for local testing.
**Warning signs:** Resend API returns 422 or 403 with a domain verification error message.

### Pitfall 2: RESEND_API_KEY Not Set in Supabase Secrets
**What goes wrong:** Emails silently fail — `Deno.env.get('RESEND_API_KEY')` returns `undefined`, `fetch` sends `Authorization: Bearer undefined`, Resend returns 401.
**Why it happens:** Supabase edge function secrets are set separately from local `.env` files.
**How to avoid:** After writing the code, verify the secret is set: `supabase secrets list`.
**Warning signs:** Resend returns 401 Unauthorized.

### Pitfall 3: In-Memory Rate Limit Resets on Cold Start
**What goes wrong:** A burst of 10+ requests that crosses a cold start boundary is not rate-limited — each cold isolate starts with a fresh Map.
**Why it happens:** Isolates are stateless by default; the Map only persists during the isolate's warm lifespan (up to 400s).
**How to avoid:** This is an accepted tradeoff (per user decision). Document it as expected behavior. For this traffic level (small business checkout), the probability of a burst crossing a cold start is low. The Stripe webhook delivery mechanism also prevents true DDoS from this vector.
**Warning signs:** Would only manifest as rate limit bypass during very high traffic spikes.

### Pitfall 4: Stripe Metadata Character Limits
**What goes wrong:** The `line_items` field in Stripe metadata has a 500-character limit per value. If order_items strings are too long, the checkout session creation fails upstream.
**Why it happens:** Stripe session metadata values are limited to 500 chars.
**How to avoid:** The `line_items` column in the orders table should be built from the Stripe session data available in the webhook event (not metadata). The `session.metadata.order_items` is a text summary; for the JSON line items array, construct it from the session's `line_items` via a Stripe API call, OR store the items_subtotal/discount/shipping/tax already available in metadata as a simplified structure.
**Warning signs:** Stripe API error at checkout creation time mentioning metadata limits.

**CRITICAL NOTE ON LINE ITEMS:** The webhook currently has order item data only as a flat string in `metadata.order_items` (e.g. `"Balloon Arch, Column Set"`). To store a proper JSON array `[{name, quantity, unit_price}]` in the orders table, the webhook would need to either: (a) call the Stripe API to retrieve line items, or (b) store structured data in metadata at checkout session creation time. The current `create-checkout-session` only puts item names as a comma-joined string in metadata. The plan for 02-01 must account for this — the simplest approach is to store the available metadata fields as the line_items JSON, accepting that quantity is always 1 per line item in the current implementation.

### Pitfall 5: RLS Blocks Service Role Inserts
**What goes wrong:** The Supabase insert fails with a permissions error even though service role key is used.
**Why it happens:** If RLS is enabled with only `authenticated` role policies (no `service_role` policy), even the service key is blocked.
**How to avoid:** Add an explicit `TO service_role` policy, or use `USING (true)` policies that don't restrict by role. The existing project pattern uses `auth.role() = 'authenticated'` for INSERT which means service_role bypasses RLS by default — verify this behavior.
**Warning signs:** Supabase returns `row-level security policy violation` error.

Note: Service role key DOES bypass RLS by default in Supabase (it's a superuser equivalent). The policy is belt-and-suspenders but not strictly required.

### Pitfall 6: `stripe_session_id` Uniqueness — Idempotency
**What goes wrong:** Stripe may deliver the same webhook event more than once. Without a UNIQUE constraint on `stripe_session_id`, duplicate orders get written.
**Why it happens:** Stripe retries webhooks on non-2xx responses and even on some 2xx responses during infra issues.
**How to avoid:** The orders table schema above includes `stripe_session_id TEXT NOT NULL UNIQUE`. On duplicate insert, catch the unique violation error and log it as a duplicate (not a real error) — return 200 to Stripe regardless.
**Warning signs:** Duplicate rows in the orders table with same session ID.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Resend REST API Call (official Supabase docs pattern)
```typescript
// Source: https://resend.com/docs/send-with-supabase-edge-functions
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: 'Party Palace <orders@thepartypalace.in>',
    to: [customerEmail],
    subject: 'Order Confirmed - Party Palace',
    html: emailHtml,
  }),
})

if (!res.ok) {
  const err = await res.json()
  throw new Error(`Resend error ${res.status}: ${JSON.stringify(err)}`)
}
```

### IP Extraction (existing codebase pattern)
```typescript
// Source: supabase-functions/send-contact-email/index.ts (existing)
const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                 req.headers.get('x-real-ip') ||
                 'unknown'
```

### Supabase Insert with Error Isolation
```typescript
// Source: adapted from create-checkout-session/index.ts (existing pattern)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SB_SERVICE_KEY') as string
)

// Attempt order write — failure does NOT block email
try {
  const { error: insertError } = await supabase
    .from('orders')
    .insert({
      stripe_session_id: session.id,
      customer_name: customerName,
      customer_email: customerEmail,
      line_items: buildLineItemsJson(metadata),
      order_total: parseFloat(totalAmount),
      order_type: hasProducts ? 'product' : 'booking',
      status: 'confirmed',
    })

  if (insertError) {
    // Check for duplicate (idempotency)
    if (insertError.code === '23505') {
      console.log('Duplicate webhook event, order already exists:', session.id)
    } else {
      console.error('Order insert failed:', insertError, 'Event:', JSON.stringify(event))
    }
  }
} catch (dbErr) {
  console.error('Order write exception:', dbErr, 'Event:', JSON.stringify(event))
}
// Always continue to email sending below
```

### Module-Scope Rate Limit Map (in create-checkout-session)
```typescript
// Source: derived from Supabase architecture docs (isolate warm window)
// Place OUTSIDE serve() at module scope
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SMTP via `denomailer` (Gmail) | Resend REST API | This phase | Simpler auth (API key vs app password), better deliverability, no port 465/587 issues |
| No order persistence | `orders` table with JSONB line items | This phase | Recoverable payment records, basis for future fulfillment tracking |
| No rate limiting on checkout | In-memory Map in checkout edge function | This phase | Prevents checkout endpoint abuse |

**Deprecated/outdated in this project after Phase 2:**
- `denomailer` import: removed from `stripe-webhook/index.ts`
- `getSmtpClient()` function: removed
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` environment variables: removed from Supabase secrets

---

## Open Questions

1. **Line items JSON construction from webhook metadata**
   - What we know: `session.metadata.order_items` is a comma-joined string of item names. There is no per-item quantity or unit_price in metadata. The `totalAmount`, `itemsSubtotal`, `discount`, `shipping`, `tax` are all in metadata as strings.
   - What's unclear: The user decision says "line items (JSON array of name + quantity + unit price)" — but the current checkout session doesn't put structured line items in metadata.
   - Recommendation: In 02-01, construct the line_items JSONB as best-effort from available metadata. A reasonable shape: `[{"name": "<comma-joined names>", "quantity": 1, "unit_price": <itemsSubtotal>}]`. This is a known limitation of the current checkout session design, not a blocker. Future phases could improve metadata richness. Plan should document this explicitly so it doesn't become a surprise.

2. **Resend domain verification status**
   - What we know: `thepartypalace.in` must be verified in Resend before production sends.
   - What's unclear: Whether domain DNS has already been configured, or if this is a new requirement.
   - Recommendation: Make domain verification a prerequisite step in the 02-02 plan. The verification task is outside the code — it requires DNS access. Include a verification step that tests with a Stripe test webhook before marking the plan complete.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase-functions/stripe-webhook/index.ts` — complete SMTP implementation to be migrated
- Existing codebase: `supabase-functions/create-checkout-session/index.ts` — Supabase client instantiation pattern (`SB_SERVICE_KEY`, `esm.sh/@supabase/supabase-js@2`)
- Existing codebase: `supabase-functions/send-contact-email/index.ts` — IP extraction pattern, 429 response pattern, existing rate limit approach
- `https://resend.com/docs/send-with-supabase-edge-functions` — Official Resend docs showing raw fetch approach for Supabase edge functions (not npm SDK)
- `https://supabase.com/docs/guides/functions/architecture` — Isolate lifecycle: can persist up to 400s handling multiple requests (confirms in-memory Map can work within warm window)

### Secondary (MEDIUM confidence)
- `https://resend.com/docs/api-reference/emails/send-email` — Full request body fields (from, to, subject, html, text, reply_to, cc, bcc); success response is `{"id": "uuid"}`
- WebSearch finding: `import { Resend } from 'npm:resend@4.0.0'` is an alternative import style but official Supabase examples use raw fetch

### Tertiary (LOW confidence)
- WebSearch finding: `x-forwarded-for` header "isn't always set — half the time it's just empty" — this is unverified anecdote from a GitHub discussion. The existing `send-contact-email` already uses it with `x-real-ip` fallback, so the pattern is proven in this project.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against existing codebase and official Resend/Supabase docs
- Architecture patterns: HIGH — IP extraction and Supabase client patterns taken directly from existing working code
- Resend API: HIGH — official docs confirmed raw fetch approach, confirmed request shape
- Rate limiting: MEDIUM — in-memory Map works but has documented limitations around cold starts; user accepted this tradeoff
- Line items JSON: MEDIUM — construction from available metadata is constrained by what the checkout session currently stores; open question documented

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (Resend and Supabase APIs are stable; Deno import URLs are pinned)
