# Party Palace — Production Hardening Milestone

## What This Is

Party Palace is a live e-commerce and event-booking web app for a Northwest Indiana party decoration business. It sells physical products (3D prints, laser engraving) and books balloon/decoration services. This milestone hardens the existing vanilla JS + Supabase + Stripe + Railway stack across security, reliability, performance, and code maintainability — making it production-safe and easier to build on.

## Core Value

Customers can browse products and services, add to cart, and complete a real payment — every time, without security holes or data loss.

## Requirements

### Validated

- ✓ Product catalog loaded from Supabase with two-phase image fetch — existing
- ✓ Shopping cart with localStorage persistence — existing
- ✓ Stripe Checkout via Supabase Edge Function — existing
- ✓ Stripe webhook sends order/booking confirmation emails via Gmail SMTP — existing
- ✓ Staff portal with Supabase auth for product CRUD — existing
- ✓ Static file server on Railway with custom domain — existing

### Active

- [ ] Prices verified server-side in checkout edge function (not client-trusted)
- [ ] Coupon codes validated server-side (not exposed in browser JS)
- [ ] User input sanitized before HTML email interpolation (prevent XSS in emails)
- [ ] CORS restricted to thepartypalace.in on all edge functions
- [ ] Orders table in Supabase — every completed payment writes a record
- [ ] Transactional email migrated from Gmail SMTP to Resend API
- [ ] Rate limiting on checkout edge function
- [ ] Backup files removed from public web root
- [ ] Product images lazy-loaded with loading="lazy"
- [ ] Hero slideshow setInterval stored and clearable
- [ ] Popular products driven by DB featured column (not hardcoded JS array)
- [ ] app.js split into logical ES modules (cart, products, checkout, staff)
- [ ] Inline styles in dynamic card builders replaced with CSS classes
- [ ] Dual product system (static HTML + dynamic JS) unified to fully dynamic

### Out of Scope

- Mobile app — web-first, defer
- Full React/framework rewrite — not worth the cost, vanilla JS is fine
- User accounts / order history for customers — v2
- Real-time inventory tracking — v2
- Stripe Tax integration — hardcoded 7% Indiana rate is acceptable for now

## Context

- Stack: Vanilla HTML/CSS/JS, Supabase (PostgreSQL + Storage + Edge Functions), Stripe Checkout, Railway (Node.js serve-handler), Deno for edge functions
- The app has no build step — ES modules work natively in modern browsers
- Supabase free tier causes statement timeouts when fetching 30+ image_url values at once — two-phase fetch workaround is in place
- 13+ `.backup*` files and Python migration scripts currently live in the public web root and are served publicly
- Cart state is client-only localStorage — no server-side cart
- All product prices currently flow from browser → edge function with no server-side verification
- Gmail SMTP requires app passwords and has rate limits; Resend has a free tier and simple REST API

## Constraints

- **Tech Stack**: Stay vanilla JS + Supabase + Railway — no framework migration
- **No Build Step**: Changes must work without introducing Webpack/Vite/etc.
- **Live Site**: Migrations must be non-breaking — site stays live throughout
- **Free Tier**: Supabase free tier limits — avoid heavy query patterns

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep vanilla JS, split into ES modules | No build step needed, native browser support | — Pending |
| Resend over SendGrid for email | Simpler API, generous free tier, Deno-compatible | — Pending |
| Server-side price lookup in edge function | Prevents price manipulation — critical security fix | — Pending |
| Orders table in Supabase | No order history currently exists — business data at risk | — Pending |

---
*Last updated: 2026-04-02 after initialization*
