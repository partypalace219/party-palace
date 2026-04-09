# Milestones

## v1.0 Production Hardening (Shipped: 2026-04-09)

**Phases completed:** 4 phases, 11 plans  
**Timeline:** 2026-04-02 → 2026-04-09 (7 days)  
**Scope:** 48 files changed, +10,996 / -9,554 lines

**Key accomplishments:**
1. Checkout edge function verifies prices and coupons server-side — client-supplied values can't manipulate totals
2. CORS locked to `thepartypalace.in` and XSS prevented via `escapeHtml()` across all 3 edge functions
3. Every completed Stripe payment writes an idempotent order record to Supabase `orders` table
4. Transactional email migrated from Gmail SMTP to Resend API; rate limiting added to checkout (10 req/IP/min)
5. 31 backup files and migration scripts purged from public web root; Popular badge driven by DB `featured` column
6. `app.js` 5,633-line monolith split into 5 ES modules; 61 static product cards eliminated; inline styles replaced with CSS classes

**Archive:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) · [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---
