# Quick Task 28 — Plan

**Task:** Update site favicon to use existing Party Palace logo (party-palace-logo.png)
**Date:** 2026-06-03
**Mode:** quick

## Tasks

### Task 1 — Update favicon link tags in index.html
- Replace 5 obsolete favicon `<link>` tags (logo.svg, favicon-32x32.png, favicon-16x16.png, favicon-192x192.png x2) with 2 tags pointing to `party-palace-logo.png?v=2026-06-03-28`
- Bump script cache-bust from v=2026-06-03-27 to v=2026-06-03-28
- Commit and push

### Task 2 — Verify on live site (Playwright)
- Confirm `<link rel="icon">` points to party-palace-logo.png
- Confirm no console errors
- Confirm header logo still renders correctly
