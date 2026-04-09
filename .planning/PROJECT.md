# Party Palace — Project

## What This Is

Party Palace is a production-hardened e-commerce and event-booking web app for a Northwest Indiana party decoration business. It sells physical products (3D prints, laser engraving) and books balloon/decoration services. The app uses a vanilla JS + Supabase + Stripe + Railway stack with no build step. v1.0 shipped full security hardening (server-side price/coupon verification, CORS lockdown, XSS prevention), reliable order persistence and email delivery via Resend, a clean public web root, and a modular ES module codebase with fully dynamic Supabase-driven product rendering.

## Core Value

Customers can browse products and services, add to cart, and complete a real payment — every time, without security holes or data loss.

## Requirements

### Validated

- ✓ Product catalog loaded from Supabase with two-phase image fetch — existing
- ✓ Shopping cart with localStorage persistence — existing
- ✓ Stripe Checkout via Supabase Edge Function — existing
- ✓ Stripe webhook sends order/booking confirmation emails via Gmail SMTP — existing (migrated to Resend v1.0)
- ✓ Staff portal with Supabase auth for product CRUD — existing
- ✓ Static file server on Railway with custom domain — existing
- ✓ Prices verified server-side in checkout edge function (not client-trusted) — v1.0
- ✓ Coupon codes validated server-side (COUPON_CODES env var, not exposed in browser JS) — v1.0
- ✓ User input sanitized before HTML email interpolation (escapeHtml() in all 3 edge functions) — v1.0
- ✓ CORS restricted to thepartypalace.in on all edge functions — v1.0
- ✓ Orders table in Supabase — every completed payment writes an idempotent record — v1.0
- ✓ Transactional email migrated from Gmail SMTP to Resend API — v1.0
- ✓ Rate limiting on checkout edge function (10 req/IP/min, in-memory Map) — v1.0
- ✓ Backup files removed from public web root (31 files deleted) — v1.0
- ✓ Product images lazy-loaded with loading="lazy" — v1.0
- ✓ Hero slideshow setInterval stored and clearable (module-level variable) — v1.0
- ✓ Popular products driven by DB featured column (not hardcoded JS array) — v1.0
- ✓ app.js split into 5 ES modules (cart, products, checkout, staff, ui) — v1.0
- ✓ Inline styles in dynamic card builders replaced with CSS classes — v1.0
- ✓ Dual product system (static HTML + dynamic JS) unified to fully dynamic Supabase rendering — v1.0

### Active

*(No active requirements — plan next milestone with `/gsd:new-milestone`)*

### Out of Scope

- Mobile app — web-first, defer
- Full React/framework rewrite — not worth the cost, vanilla JS is fine
- User accounts / order history for customers — v2
- Real-time inventory tracking — v2
- Stripe Tax integration — hardcoded 7% Indiana rate is acceptable for now
- save-signed-document email migration to Resend — deferred, low-traffic path

## Context

- Stack: Vanilla HTML/CSS/JS, Supabase (PostgreSQL + Storage + Edge Functions), Stripe Checkout, Railway (Node.js serve-handler), Deno for edge functions
- Codebase: ~7,400 LOC JS/TS across 5 ES modules + 4 edge functions, 4,700 CSS, 2,700 HTML
- The app has no build step — ES modules work natively in modern browsers
- Cart state is client-only localStorage — no server-side cart
- Orders table exists in Supabase with `items` (JSONB), `total` (decimal), `stripe_session_id` (unique for idempotency)
- Resend API handles transactional email; `save-signed-document` edge function still uses Gmail SMTP (out of scope for v1.0)
- Rate limiting uses in-memory Map — resets on Supabase cold start; effective under genuine burst traffic
- `Vases.featured=false` in DB — needs manual `UPDATE products SET featured=true WHERE name='Vases'` in Supabase dashboard

## Constraints

- **Tech Stack**: Stay vanilla JS + Supabase + Railway — no framework migration
- **No Build Step**: Changes must work without introducing Webpack/Vite/etc.
- **Live Site**: Migrations must be non-breaking — site stays live throughout
- **Free Tier**: Supabase free tier limits — avoid heavy query patterns

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep vanilla JS, split into ES modules | No build step needed, native browser support | ✓ Good — clean module graph, no bundler needed |
| Resend over SendGrid for email | Simpler API, generous free tier, Deno-compatible | ✓ Good — raw fetch to REST API, no SDK issues |
| Server-side price lookup in edge function | Prevents price manipulation — critical security fix | ✓ Good — client prices ignored, Supabase is authoritative |
| Orders table in Supabase | No order history currently exists — business data at risk | ✓ Good — idempotent via stripe_session_id UNIQUE |
| Items without UUID (services) keep client price | Services aren't in products table; server can't verify | ✓ Good — hybrid verification model |
| Dynamic CORS falls back to production domain | Unlisted origins get wrong Allow-Origin → browser rejects | ✓ Good — no wildcard ever returned |
| escapeHtml() defined per-file, not shared | Deno edge functions are isolated deployments | ✓ Good — escape-before-replace pattern consistent |
| rateLimitMap at module scope, not inside serve() | Inside serve() resets per-request in Deno | ✓ Good — effective under warm isolate burst traffic |
| orders column names: items/total (not line_items/order_total) | Human created table before plan finalized | ✓ Good — code aligned to actual schema |
| ui.js as sole ES module entry point | One script tag, explicit import graph | ✓ Good — no duplicate script tags |
| products/cart as mutable const arrays | All modules share same reference without reassignment | ✓ Good — no stale reference bugs |
| Dynamic import('./ui.js') inside loadProducts() body | Breaks circular dependency at runtime | ✓ Good — no circular import error |
| grid.innerHTML='' full-replace for product cards | Cleaner than existingSlugs deduplication now grids start empty | ✓ Good — simpler render logic |
| heroSlideshowInterval at module scope, cleared before re-init | Prevents timer stacking on repeated init | ✓ Good — no animation doubling |
| deposit_amount written to Stripe metadata for service deposits | Webhook needs it to show correct amount in booking email | ✓ Good — fixed during audit |

---
*Last updated: 2026-04-09 after v1.0 Production Hardening milestone*
