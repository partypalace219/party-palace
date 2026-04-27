---
phase: quick-7
plan: 7
subsystem: html/favicons
tags: [cache-busting, favicon, html]
dependency_graph:
  requires: []
  provides: [versioned-favicon-hrefs]
  affects: [index.html]
tech_stack:
  added: []
  patterns: [cache-busting query string on static assets]
key_files:
  created: []
  modified:
    - index.html
decisions:
  - "180x180 apple-touch-icon points to favicon-192x192.png (no separate 180x180 asset exists)"
  - "logo.svg link tag excluded from versioning per spec"
metrics:
  duration: "< 5 minutes"
  completed: "2026-04-27"
  tasks_completed: 2
  files_modified: 1
---

# Quick Task 7: Add Cache-Busting Query Strings to Favicon Link Tags — Summary

**One-liner:** Appended `?v=2026-04` to all non-SVG favicon hrefs in index.html and added a 180x180 apple-touch-icon pointing to favicon-192x192.png.

---

## What Was Done

Added `?v=2026-04` cache-busting version query strings to the three non-SVG favicon `<link>` tags in `index.html` so that browsers and iOS home-screen caches will pick up updated favicon files (which are being committed under the same filenames). Also inserted a new 180x180 `apple-touch-icon` link tag — Apple's preferred size for modern iOS — pointing to `favicon-192x192.png?v=2026-04` since no separate 180x180 asset exists in the repo.

The SVG icon link (`logo.svg`) was intentionally left unchanged per spec.

---

## Diff of Changed Lines

```diff
--- a/index.html
+++ b/index.html
@@ -20,9 +20,10 @@

     <!-- Favicons -->
     <link rel="icon" type="image/svg+xml" href="logo.svg">
-    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
-    <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
-    <link rel="apple-touch-icon" sizes="192x192" href="favicon-192x192.png">
+    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png?v=2026-04">
+    <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png?v=2026-04">
+    <link rel="apple-touch-icon" sizes="192x192" href="favicon-192x192.png?v=2026-04">
+    <link rel="apple-touch-icon" sizes="180x180" href="favicon-192x192.png?v=2026-04">
     <meta name="theme-color" content="#667eea">
```

---

## Every Updated Tag (File / Line)

| File       | Line | Change                                                                                     |
|------------|------|--------------------------------------------------------------------------------------------|
| index.html | 23   | MODIFIED — `favicon-32x32.png` → `favicon-32x32.png?v=2026-04`                            |
| index.html | 24   | MODIFIED — `favicon-16x16.png` → `favicon-16x16.png?v=2026-04`                            |
| index.html | 25   | MODIFIED — `favicon-192x192.png` → `favicon-192x192.png?v=2026-04`                        |
| index.html | 26   | ADDED — `<link rel="apple-touch-icon" sizes="180x180" href="favicon-192x192.png?v=2026-04">` |

---

## logo.svg Confirmation

Line 22 of `index.html` is byte-identical to the original:

```html
    <link rel="icon" type="image/svg+xml" href="logo.svg">
```

No version string was added. No other modification of any kind was made to this line.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Commits

| Hash    | Message                                                          |
|---------|------------------------------------------------------------------|
| 3588b7c | feat(quick-7): add ?v=2026-04 cache-busting to favicon link tags |

## Self-Check: PASSED

- index.html exists and contains all 5 expected favicon link tags (lines 22-26).
- Commit 3588b7c found in git log.
- logo.svg link tag unchanged at line 22.
- No other files modified.
