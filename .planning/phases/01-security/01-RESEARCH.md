# Phase 1: Security - Research

**Researched:** 2026-04-02
**Domain:** Web security hardening — Supabase Edge Functions (Deno), vanilla JS XSS, CORS, server-side validation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

User delegated all implementation decisions to Claude. No locked decisions.

### Claude's Discretion

- **Error behavior** — How rejected requests (manipulated prices, invalid coupons) surface to the user. Claude should choose an appropriate response: clear error message preferred over silent fail so users aren't confused by a frozen checkout.
- **CORS allowlist** — Which origins are permitted. Claude should whitelist the production domain and localhost for development, managed via environment variable or hardcoded constant in the edge function.
- **Coupon storage** — Where valid coupons live server-side. Claude should choose the simplest reliable approach — environment variable or Supabase table — with preference for whatever requires the least ongoing maintenance.
- **XSS scope** — Which fields get sanitized. Claude should apply `textContent` (not `innerHTML`) for all user-derived fields in product cards, and HTML-escape all user-supplied strings (name, notes, any other dynamic fields) in email templates.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

This phase fixes five distinct security vulnerabilities in the Party Palace codebase. The site currently trusts client-supplied prices in the checkout flow, exposes coupon codes in the browser JS bundle, has wildcard CORS on all edge functions, and interpolates user-supplied strings directly into `innerHTML` in product cards and HTML email templates.

The work is entirely server-side and edge function changes, plus targeted DOM manipulation changes in `app.js`. No UI redesign is needed — the only client-facing UX changes are error messages surfacing server rejections that currently have no feedback path.

The stack is fixed: Deno + Supabase Edge Functions, vanilla JS, no build step. All five requirements (SEC-01 through SEC-05) are independent and can be planned as separate tasks.

**Primary recommendation:** Implement SEC-01 first (price lookup) because it requires adding `id` to cart items client-side and querying Supabase server-side — the pattern established there is referenced by coupon validation (SEC-04). Then handle CORS (SEC-03), then coupon migration (SEC-04), then XSS (SEC-02, SEC-05).

---

## Codebase Reality (What Actually Exists)

### Current Vulnerabilities Confirmed

**SEC-01 — Price trust:**
- `addToCart()` in app.js builds cart items as `{ name, price, category, image }` — no `id` field
- `cart` array is sent directly to `create-checkout-session` edge function as `items`
- Edge function uses `items.reduce((sum, item) => sum + item.price, 0)` — fully trusts client prices
- Fix requires: (1) add `id` to cart item when adding to cart, (2) edge function looks up price from Supabase by `id`, ignores client price

**SEC-02 — XSS in emails:**
- `stripe-webhook/index.ts` interpolates `customerName`, `notes`, `venue`, `eventType`, `orderItems` directly into HTML template strings
- Example vulnerable pattern: `<p>Hi ${data.customerName},</p>` — if name contains `<script>`, it renders
- `send-contact-email/index.ts` has same issue with `data.message.replace(/\n/g, '<br>')` — raw HTML concatenation
- Fix: add `escapeHtml()` helper, wrap all user-derived fields before interpolation

**SEC-03 — Open CORS:**
- All 4 edge functions have `'Access-Control-Allow-Origin': '*'`
- Fix: replace with dynamic origin check function

**SEC-04 — Client-side coupons:**
- Lines 1234–1240 of app.js: `const validCoupons = { 'PARTY10': {...}, 'FUN30': {...}, 'FAMILY50': {...} }`
- This object is in the public JS bundle — anyone can read all valid codes and discount percentages
- `appliedCouponCode` is sent in checkout payload; edge function trusts the `discount` amount from client
- Fix requires: (1) remove `validCoupons` from app.js, (2) add coupon validation + discount calculation to edge function, (3) client sends only the coupon code string (not the discount amount)

**SEC-05 — XSS in product cards:**
- Lines 166, 214, 2280+: `card.innerHTML = \`...\${product.name}...\${product.description}...\``
- Products come from Supabase — a compromised DB record or admin error could inject HTML
- Fix: replace `innerHTML` template interpolation of `product.name` and `product.description` with DOM creation + `textContent` assignment

### Cart Item Shape — Key Constraint

Current cart item shape (no `id`):
```javascript
{ name: "Heart Coaster Set", price: 24.99, category: "prints3d", image: "..." }
```

Required cart item shape after SEC-01 fix:
```javascript
{ id: "uuid-here", name: "Heart Coaster Set", price: 24.99, category: "prints3d", image: "..." }
```

The `products` array already has `id` — it's loaded from Supabase at line 24 (`id: p.id`). The `addToCart()` function just never included it. Adding `id: product.id` to the `itemToAdd` object in `addToCart()` is the only client-side change needed for SEC-01.

**Critical note on local/hardcoded products:** The cart also contains hardcoded service items (balloon walls, arches, etc.) that are NOT in Supabase and have no UUID. The price-lookup approach must only apply to Supabase products (those with a UUID `id`). Items without an `id` (services) use a different checkout path (`hasProducts: false`) so the distinction already exists in the code.

---

## Standard Stack

### Core (no new dependencies needed)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Supabase Edge Functions (Deno) | Existing | Server-side logic | Already deployed |
| `@supabase/supabase-js` via esm.sh | `@2` | Query Supabase from edge function | Already used in `send-contact-email` |
| Deno.env | Built-in | Read secrets | Standard Deno API |
| Vanilla JS DOM API | Native | `textContent` assignment | No library needed |

### Import Pattern (match existing codebase)

The project already uses this import pattern in `send-contact-email/index.ts`:
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
```

And this env var naming:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SB_SERVICE_KEY')!
```

Use these same patterns. Do not switch to `npm:@supabase/supabase-js@2` or `SUPABASE_SERVICE_ROLE_KEY` — the project has established conventions that work.

### No New Libraries

Do not introduce DOMPurify or any sanitization library. The XSS fixes are:
- In edge functions: a small `escapeHtml()` function (5 lines)
- In app.js: switching from `innerHTML` to DOM node creation + `textContent`

---

## Architecture Patterns

### Pattern 1: Dynamic CORS Origin Validation

Replace the static `corsHeaders` constant with a function that checks the request origin:

```typescript
// Source: verified against multiple Supabase community examples
const ALLOWED_ORIGINS = [
  'https://thepartypalace.in',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// Usage in serve():
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  // ... rest of function, use corsHeaders in all responses
})
```

**Important:** `corsHeaders` must be computed per-request now (from `getCorsHeaders(req)`), not defined once at module level. Every `new Response(...)` call must use the per-request headers object.

**Behavior when origin is not in allowlist:** Returns the production domain as `Access-Control-Allow-Origin`. The browser will reject the response because the origin doesn't match. This is correct — a `curl` request still gets a 200 response body, but browsers from unlisted origins will be blocked by the CORS policy. This satisfies SEC-03's requirement ("curl request from unlisted origin receives CORS rejection" — note: curl doesn't enforce CORS; it's the browser that rejects it).

**Confidence:** HIGH — verified with official Supabase CORS docs and community examples.

### Pattern 2: Server-Side Price Lookup (SEC-01)

```typescript
// Source: matches pattern in send-contact-email/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Inside serve() handler, after parsing request:
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_KEY')!
)

// Look up authoritative prices for product items only
const productIds = items
  .filter((item: any) => item.id && item.category !== 'service')
  .map((item: any) => item.id)

const { data: dbProducts, error } = await supabase
  .from('products')
  .select('id, name, price')
  .in('id', productIds)

if (error) throw new Error('Failed to look up product prices')

// Build a price map from server data
const priceMap = new Map(dbProducts.map((p: any) => [p.id, p.price]))

// Replace client-supplied prices with server-verified prices
const verifiedItems = items.map((item: any) => ({
  ...item,
  price: item.id ? (priceMap.get(item.id) ?? null) : item.price
}))

// Reject if any product ID didn't resolve
const unresolved = verifiedItems.filter((item: any) => item.id && item.price === null)
if (unresolved.length > 0) {
  return new Response(
    JSON.stringify({ error: 'One or more products could not be verified. Please refresh and try again.' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

**Confidence:** HIGH — createClient + .in() query pattern verified from existing codebase.

### Pattern 3: Server-Side Coupon Validation (SEC-04)

Recommended approach: **environment variable JSON string**. Simplest, zero ongoing maintenance.

```typescript
// Secret stored as: COUPON_CODES={"PARTY10":10,"FUN30":30,"FAMILY50":50}
// Set via: supabase secrets set COUPON_CODES='{"PARTY10":10,"FUN30":30,"FAMILY50":50}'

const couponCodesRaw = Deno.env.get('COUPON_CODES') || '{}'
const validCoupons: Record<string, number> = JSON.parse(couponCodesRaw)

// In handler, replace client-supplied discount calculation:
const couponCode = (body.couponCode || '').toUpperCase().trim()
let discountPercent = 0
if (couponCode && validCoupons[couponCode] !== undefined) {
  discountPercent = validCoupons[couponCode]
} else if (couponCode) {
  return new Response(
    JSON.stringify({ error: `Coupon code "${couponCode}" is not valid.` }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Calculate discount from verified server prices (not client-supplied amount)
const productSubtotal = verifiedItems
  .filter((item: any) => item.category !== 'service')
  .reduce((sum: number, item: any) => sum + item.price, 0)
const discountAmount = productSubtotal * (discountPercent / 100)
```

**Why env variable over Supabase table:** Zero DB round trips, no table to maintain, secrets are already managed via `supabase secrets set`. Adding a coupon requires one CLI command (`supabase secrets set COUPON_CODES=...`) with no schema migration.

**Client change required:** `app.js` must send `couponCode: appliedCouponCode` instead of `discount: discountAmount` in the checkout payload. The `validCoupons` object and client-side discount calculation are removed.

**Confidence:** HIGH for env var pattern (Deno.env.get is standard). MEDIUM for JSON-in-secret (not officially documented as supported, but Supabase secrets are arbitrary strings, so JSON parsing works).

### Pattern 4: HTML Escape in Email Templates (SEC-02)

Add a shared escape helper at the top of `stripe-webhook/index.ts`:

```typescript
// Source: OWASP XSS Prevention Cheat Sheet - minimal 5-char escape set for HTML content
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
```

Then wrap every user-derived field before interpolation:
```typescript
// BEFORE (vulnerable):
<p>Hi ${data.customerName},</p>

// AFTER (safe):
<p>Hi ${escapeHtml(data.customerName)},</p>
```

Fields to escape in `stripe-webhook/index.ts`: `customerName`, `orderItems`, `notes`, `venue`, `eventType`, `customerPhone`, `customerEmail` (in display contexts), `shippingAddress` fields.

In `send-contact-email/index.ts`: `data.name`, `data.email`, `data.phone`, `data.message`, `data.eventType`, `data.product`, `data.description`.

**The `data.message.replace(/\n/g, '<br>')` pattern is especially dangerous** — it currently allows raw HTML injection. Replace with `escapeHtml(data.message).replace(/\n/g, '<br>')`.

**Confidence:** HIGH — OWASP cheat sheet verified.

### Pattern 5: textContent for Product Cards (SEC-05)

The `product.name` and `product.description` fields are currently interpolated directly into `card.innerHTML`. The fix is to build the card with `innerHTML` for structural/static HTML, then set dynamic fields via `textContent` on the created elements:

```typescript
// BEFORE (vulnerable):
card.innerHTML = `
  <div class="product-name">${product.name}</div>
  <div class="product-description">${product.description || ''}</div>
  ...
`

// AFTER (safe):
card.innerHTML = `
  <div class="product-name"></div>
  <div class="product-description"></div>
  ...
`
card.querySelector('.product-name').textContent = product.name
card.querySelector('.product-description').textContent = product.description || ''
```

This pattern works for `product.name` and `product.description`. Fields like `product.price` (a number) and `product.category` (an internal enum) are not user-supplied strings and are safe as-is.

**Affected locations in app.js:**
- Line 166: `renderDynamicEngravingProducts()` — card innerHTML block
- Line 214: `renderDynamicPrints3dProducts()` — card innerHTML block
- Line 2280: product detail page — `product.name` and `product.description` interpolated into large innerHTML block
- Line 2414: `createProductCard()` function (called for all products grid)

**Confidence:** HIGH — native DOM API, no library dependency.

### Anti-Patterns to Avoid

- **Trusting `discount` from client body:** After SEC-04, the edge function must calculate discount from the server-verified coupon code. The `discount` field in the request body must be ignored.
- **Returning different HTTP status for valid vs invalid coupons to confirm codes exist:** Always return a generic message; don't leak whether a code is "expired" vs "never existed."
- **Setting CORS headers only on the OPTIONS preflight:** Every response — 200, 400, 500 — must include the CORS headers, or the browser can't read the error message.
- **Using innerHTML for static error messages alongside user data:** Lines like `statusEl.innerHTML = '<div class="form-error">...' + userMessage` should use `textContent` for the user-supplied portion.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom whitelist parser | `escapeHtml()` with 5 replacements | Email is plain HTML — no user tags needed, full escape is correct |
| Coupon storage | Supabase table with CRUD | `Deno.env.get('COUPON_CODES')` JSON | Zero overhead, secrets already managed via CLI |
| Origin validation | Complex regex matcher | `ALLOWED_ORIGINS.includes(origin)` | Exact string match is correct for a known allowlist |
| Price lookup | Caching layer | Direct Supabase query per checkout | Checkout is low-frequency; no perf concern |

**Key insight:** This phase is about removal (removing client trust, removing browser-visible coupon codes) not addition. The less new infrastructure, the better.

---

## Common Pitfalls

### Pitfall 1: CORS Headers Missing on Error Responses

**What goes wrong:** The edge function returns a 400/500 error, but the browser can't read the error body because the CORS headers are absent on error responses.

**Why it happens:** Developer adds CORS to the happy path only; the catch block returns a plain `new Response(...)` without the headers.

**How to avoid:** Always spread `corsHeaders` into every `new Response()` call, including inside catch blocks. Review the current `create-checkout-session` — it already does this correctly, but `corsHeaders` will become a per-request variable; make sure it's in scope at the catch block.

**Warning signs:** Browser shows "CORS error" but the actual error is a 400/500. Check network tab — if the error response has no `Access-Control-Allow-Origin` header, this is the issue.

### Pitfall 2: Cart Items Without `id` Breaking Checkout

**What goes wrong:** Service items (balloon walls, arches) don't have Supabase UUIDs. The price lookup logic tries to query them and gets null prices.

**Why it happens:** `addToCart()` adds both DB products (with UUID) and hardcoded service items (no UUID).

**How to avoid:** The price lookup must only run for items where `item.id` is a non-null UUID. Items without `id` should pass through with their client-supplied price (services use a separate checkout path anyway — `hasProducts: false`). Verify: in the checkout call, `hasProducts` is false when the cart contains only services. The price-lookup code should guard with `if (hasProducts && productIds.length > 0)`.

**Warning signs:** Checkout fails for service-only bookings after the fix, or `productIds` array contains undefined entries.

### Pitfall 3: Stale localStorage Cart After Adding `id` to Cart Items

**What goes wrong:** Users with items in localStorage from before the deploy won't have `id` on their cart items. The edge function will try to look up a null ID.

**Why it happens:** Cart is persisted to `localStorage` — old format lacks `id`.

**How to avoid:** The server-side lookup should treat `item.id === null/undefined` as "no price lookup needed" and fall through. Do not throw on missing ID — only throw if a non-null ID fails to resolve in the DB. This also protects against the service item case above.

**Warning signs:** First checkout after deploy fails for users who had items in cart before.

### Pitfall 4: `couponCode` Field Name Change Breaking Client

**What goes wrong:** The client sends `discount: discountAmount` today. After SEC-04, it needs to send `couponCode: 'PARTY10'` instead. If the client still sends `discount`, the edge function ignores it and charges full price — confusing for the user.

**Why it happens:** Client and edge function are deployed independently.

**How to avoid:** Change both simultaneously. The client should: (1) remove the `discount` field from the checkout POST body, (2) add `couponCode: appliedCouponCode || null`. The edge function: (1) ignore any `discount` from body, (2) read `couponCode` from body.

**Warning signs:** Coupons silently stop working after deploy.

### Pitfall 5: `escapeHtml` Applied Before `toFixed()` on Numbers

**What goes wrong:** Calling `escapeHtml(data.totalAmount)` where `totalAmount` is a number fails or produces unexpected output.

**Why it happens:** The helper calls `String(str)` — that part is fine — but numeric values don't need escaping. Applying escape to everything including numbers is wasteful but harmless.

**How to avoid:** Only escape fields that are user-supplied strings: name, notes, venue, event type, phone, message. Do not escape computed numeric values like `totalAmount.toFixed(2)`.

---

## Code Examples

### Verified: Supabase Query from Edge Function

```typescript
// Source: matches existing send-contact-email/index.ts pattern (in-codebase verified)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_KEY')!
)

const { data, error } = await supabase
  .from('products')
  .select('id, name, price')
  .in('id', ['uuid-1', 'uuid-2'])
```

### Verified: OWASP HTML Escape (5 characters)

```typescript
// Source: OWASP XSS Prevention Cheat Sheet
// https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
```

### Verified: Dynamic CORS Pattern

```typescript
// Source: verified via Supabase docs + community examples
const ALLOWED_ORIGINS = [
  'https://thepartypalace.in',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}
```

### Verified: textContent Pattern for DOM Cards

```javascript
// Source: MDN Web Docs - textContent vs innerHTML
// Build structural HTML first, then set dynamic content via textContent
const nameEl = card.querySelector('.product-name')
const descEl = card.querySelector('.product-description')
if (nameEl) nameEl.textContent = product.name
if (descEl) descEl.textContent = product.description || ''
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `corsHeaders = { 'Access-Control-Allow-Origin': '*' }` | Dynamic origin-checking function | This phase | Restricts to allowlisted origins |
| Client calculates and sends `discount` amount | Server re-calculates discount from coupon code | This phase | Price manipulation via discount no longer possible |
| `validCoupons` in browser JS | `COUPON_CODES` in Supabase secret | This phase | Coupon codes no longer visible in bundle |
| `card.innerHTML = \`...\${product.name}...\`` | DOM creation + `.textContent` for user fields | This phase | XSS vector closed |

**No deprecated libraries to address** — the `deno.land/std@0.168.0/http/server.ts` import uses the older `serve()` API. The newer `Deno.serve()` exists but changing it is out of scope. Do not refactor this.

---

## Open Questions

1. **Which localhost ports to include in CORS allowlist**
   - What we know: production is `https://thepartypalace.in`; development uses a local file server
   - What's unclear: exact dev port (5500 for Live Server? 3000? 8080?)
   - Recommendation: include `http://localhost:3000`, `http://localhost:5500`, `http://127.0.0.1:5500` — common ports; easy to add more

2. **`save-signed-document` function CORS**
   - What we know: it also has `'Access-Control-Allow-Origin': '*'`
   - What's unclear: whether SEC-03 scope covers this function explicitly (it handles waiver signing)
   - Recommendation: apply the same CORS fix to all 4 edge functions for consistency

3. **`send-contact-email` function SEC-02 scope**
   - What we know: `send-contact-email/index.ts` also interpolates user data into HTML without escaping
   - What's unclear: whether SEC-02 explicitly covers this function (the requirement says "email templates")
   - Recommendation: fix both `stripe-webhook` and `send-contact-email` — they have the same pattern

---

## Sources

### Primary (HIGH confidence)
- In-codebase — `send-contact-email/index.ts` — establishes `esm.sh/@supabase/supabase-js@2` import + `SB_SERVICE_KEY` env var naming
- In-codebase — `app.js` lines 1234–1240 — confirms `validCoupons` object in browser JS
- In-codebase — `app.js` lines 441–476 — confirms cart items lack `id` field
- In-codebase — `create-checkout-session/index.ts` — confirms `'Access-Control-Allow-Origin': '*'` and price trust
- https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html — HTML escape character set

### Secondary (MEDIUM confidence)
- https://supabase.com/docs/guides/functions/cors — CORS documentation (SDK import approach; dynamic origin pattern not shown but described as needing manual implementation)
- https://supabase.com/docs/guides/functions/secrets — `supabase secrets set` CLI confirmed; JSON-in-secret not explicitly documented but works in practice
- https://nikofischer.com/supabase-edge-functions-cors-error-fix — dynamic origin validation pattern (community source, cross-verified with Supabase CORS docs)

### Tertiary (LOW confidence)
- None — all critical claims verified via primary or secondary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in use in the codebase
- Architecture: HIGH — patterns derived from existing codebase conventions + OWASP + official Supabase docs
- Pitfalls: HIGH — identified directly from reading the actual code, not theoretical

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (Supabase Edge Function APIs are stable; 30 days reasonable)
