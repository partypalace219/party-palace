# Phase 1: Security - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Close all server-side trust and injection vulnerabilities. The site cannot be exploited via price manipulation, coupon exposure, XSS in emails/cards, or open CORS. Client-facing UX changes are limited to what's required to surface security rejections.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User delegated all implementation decisions to Claude. The following areas are open:

- **Error behavior** — How rejected requests (manipulated prices, invalid coupons) surface to the user. Claude should choose an appropriate response: clear error message preferred over silent fail so users aren't confused by a frozen checkout.
- **CORS allowlist** — Which origins are permitted. Claude should whitelist the production domain and localhost for development, managed via environment variable or hardcoded constant in the edge function.
- **Coupon storage** — Where valid coupons live server-side. Claude should choose the simplest reliable approach — environment variable or Supabase table — with preference for whatever requires the least ongoing maintenance.
- **XSS scope** — Which fields get sanitized. Claude should apply `textContent` (not `innerHTML`) for all user-derived fields in product cards, and HTML-escape all user-supplied strings (name, notes, any other dynamic fields) in email templates.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-security*
*Context gathered: 2026-04-02*
