# Quick Task 32: Playwright Verification of Quick Task 31 (colors SELECT fix)

## Goal
Run all 11 verification steps from 31-SUMMARY.md against the live thepartypalace.in site to confirm the colors SELECT fix is working end-to-end.

## Tasks

### Task 1: Write and run Playwright verification script

Write `playwright-verify-q32.js` covering all 11 checks:
1. Hard-refresh site in incognito context
2. Navigate to 3D Prints — confirm cards render
3. Confirm at least one product shows color swatches in the public grid
4. Confirm Pink swatch renders as #FFC0CB
5. Confirm Violet swatches do NOT render (filtered)
6. Confirm hover tooltips show color names
7. Confirm white swatch has thin gray border class
8. Confirm products with no colors show no swatch row
9. Regression: rental flow still works
10. Regression: multi-size 3D Print "Starting at" labels still work
11. No unexpected console errors

Pre-flight: Query Supabase to identify which 3D Print products have colors saved.

Report PASS/FAIL per check and count of products with visible swatches.
