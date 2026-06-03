---
phase: quick-24
plan: 24
subsystem: navigation
tags: [nav, cleanup, badge-removal, cache-bust]
dependency_graph:
  requires: []
  provides: [clean-party-rentals-nav]
  affects: [index.html]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - index.html
decisions:
  - "Removed coming-soon-tab class entirely from both buttons — class only appeared in the two nav buttons, not shared elsewhere"
metrics:
  duration: "~5 minutes"
  completed: 2026-06-03
  tasks_completed: 1
  files_changed: 1
---

# Quick Task 24: Remove COMING SOON Badge from Party Rentals Nav Summary

**One-liner:** Stripped `coming-soon-tab` class and `<span class="coming-soon-badge">Coming Soon</span>` from both desktop and mobile Party Rentals nav buttons, and bumped cache-bust versions on styles.css and ui.js.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove COMING SOON badge from both nav links and bump cache-bust | 4e21d35 | index.html |

## What Was Done

The Party Rentals nav buttons in both the desktop nav and mobile menu previously displayed a "Coming Soon" badge that was added during early development. Since the Party Rentals section is fully live (chairs, tables, tents, panels all rentable), the badge was inaccurate and misleading.

Changes made to `index.html`:

1. **Desktop nav (line 155):** Removed `class="coming-soon-tab"` attribute and `<span class="coming-soon-badge">Coming Soon</span>` — button now reads `<button onclick="navigate('partyrentals')" data-page="partyrentals">Party Rentals</button>`

2. **Mobile nav (line 238):** Same removal applied to the mobile menu button.

3. **Cache-bust versions bumped:**
   - `styles.css?v=2026-05-21-1` → `styles.css?v=2026-06-03-24`
   - `ui.js?v=2026-05-25-22` → `ui.js?v=2026-06-03-24`

## Verification Results

- `grep -i "COMING SOON" index.html` → 0 matches (PASS)
- `grep -c "navigate('partyrentals')" index.html` → 2 matches (PASS)
- `grep -c "v=2026-06-03-24" index.html` → 2 matches (PASS)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] index.html modified and committed (4e21d35)
- [x] No "COMING SOON" text in index.html
- [x] Both `navigate('partyrentals')` onclick handlers preserved
- [x] Cache-bust versions updated on styles.css and ui.js
