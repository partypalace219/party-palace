# Requirements: Party Palace — Production Hardening

**Defined:** 2026-04-02
**Core Value:** Customers can browse products and services, add to cart, and complete a real payment — every time, without security holes or data loss.

## v1 Requirements

### Security

- [ ] **SEC-01**: Checkout edge function looks up product prices from Supabase by ID — never trusts client-supplied price values
- [ ] **SEC-02**: All user-supplied strings (name, notes, venue, event type) are HTML-escaped before interpolation into email templates
- [ ] **SEC-03**: CORS `Access-Control-Allow-Origin` on all edge functions is locked to `https://thepartypalace.in` (not `*`)
- [ ] **SEC-04**: Coupon codes and discount logic live in the edge function — `validCoupons` object removed from browser JS
- [ ] **SEC-05**: Dynamic product card HTML uses `textContent` for user-derived fields instead of `innerHTML` interpolation

### Reliability & Payments

- [ ] **REL-01**: Supabase `orders` table exists and every `checkout.session.completed` webhook event writes a row with full order details
- [ ] **REL-02**: Transactional email (order confirmation, booking confirmation, business notification) is sent via Resend API — Gmail SMTP removed
- [ ] **REL-03**: Checkout edge function enforces rate limiting (max 10 requests per IP per minute) using Supabase rate-limiting table

### Cleanup & Quick Wins

- [ ] **CLN-01**: All `.backup*` files removed from the public web root; Python migration scripts moved to a non-served `/scripts` directory
- [ ] **CLN-02**: Product `featured` column from Supabase drives the "Popular" badge — hardcoded `popularProducts` array in app.js removed
- [ ] **CLN-03**: All dynamic product `<img>` tags include `loading="lazy"` attribute

### Frontend Refactor

- [ ] **FE-01**: `app.js` is split into ES modules: `cart.js`, `products.js`, `checkout.js`, `staff.js`, `ui.js` — loaded via `<script type="module">` in index.html
- [ ] **FE-02**: All product cards for engraving and 3D prints categories are rendered fully from Supabase — static HTML product cards in index.html removed
- [ ] **FE-03**: Inline `style="..."` attributes in `renderDynamicEngravingProducts` and `renderDynamicPrints3dProducts` replaced with named CSS classes in styles.css
- [ ] **FE-04**: Hero slideshow `setInterval` return value is stored and cleared before re-initializing to prevent stacking timers

## v2 Requirements

### Customer Accounts

- **ACCT-01**: Customer can create an account and view order history
- **ACCT-02**: Customer receives account-linked receipts
- **ACCT-03**: Customer can track order status

### Admin Dashboard

- **ADMIN-01**: Staff can view and search all orders from the staff portal
- **ADMIN-02**: Staff can mark orders as shipped with tracking number
- **ADMIN-03**: Staff can export orders to CSV

### Performance

- **PERF-01**: Static assets served with long-lived Cache-Control headers via Cloudflare CDN
- **PERF-02**: Product images served as WebP with fallback
- **PERF-03**: Error tracking via Sentry

## Out of Scope

| Feature | Reason |
|---------|--------|
| React / framework migration | Vanilla JS is working — rewrite cost not justified |
| Build step (Webpack/Vite) | ES modules work natively; no bundler needed |
| Stripe Tax integration | Indiana 7% hardcoded rate is accurate and sufficient |
| Real-time inventory | Physical business doesn't need this in v1 |
| Mobile app | Web-first |
| Full RLS audit | Supabase policies already configured; out of scope for this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| REL-01 | Phase 2 | Pending |
| REL-02 | Phase 2 | Pending |
| REL-03 | Phase 2 | Pending |
| CLN-01 | Phase 3 | Pending |
| CLN-02 | Phase 3 | Pending |
| CLN-03 | Phase 3 | Pending |
| FE-01 | Phase 4 | Pending |
| FE-02 | Phase 4 | Pending |
| FE-03 | Phase 4 | Pending |
| FE-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after initial definition*
