---
phase: quick-5
plan: 5
subsystem: frontend / navigation / product rendering
tags: [debugging, navigate, renderDynamicProducts, renderCatalog, diagnostics]
dependency_graph:
  requires: []
  provides: [diagnostic-logs, navigate-render-wiring-verified, log-guard-order-fixed]
  affects: [ui.js, products.js]
tech_stack:
  added: []
  patterns: [diagnostic-logging, defensive-guards]
key_files:
  modified:
    - ui.js
    - products.js
---

# Quick Task 5: Diagnose and Fix navigate() Render Wiring

## Goal
Identify why product-listing pages render zero cards on hard reload and navigation, add instrumentation that survives the next test session, and fix any confirmed code bugs.

## Phase 1 Findings (from code read)

### navigate() wiring — ui.js:52-108
- 'partydecor' → renderCatalog() ✓
- 'prints3d' OR 'engraving' → renderDynamicProducts() ✓
- 'services' → renderServices() ✓
- 'gallery' → renderGallery() ✓
- 'partyrentals' → no render (Coming Soon, acceptable) ✓

### DB data (verified via API query)
- '3D Prints': 83 products
- 'Engraving': 9 products
- 'Party Decor': 16 products
- 'Party Rentals': 1 product
- Total: 109 (matches "Loaded 109 products")

### Critical bug: log placement in renderDynamic* functions
- `renderDynamicEngravingProducts` (products.js:116-122): `if (!grid) return` was BEFORE the diagnostic log
- `renderDynamicPrints3dProducts` (products.js:177-183): same — log was AFTER the guard
- Consequence: if grid element is null for any reason, functions returned silently with no log output, making it appear they were never called

### renderCatalog log placement
- `renderCatalog` (products.js:557): log is BEFORE any return guard — fires unconditionally ✓

## Phase 2 Hypothesis

The render functions ARE wired to navigate() correctly. The DB has canonical categories.
The [renderDynamic*] logs were placed AFTER early-return guards, so a silent early-return
(grid not found) would show no trace. Since "Staff portal initialized" (line 471) fires but
[renderCatalog] (line 440) doesn't appear, a likely explanation is that the deployed public
site is running pre-task-3/4 code (before diagnostic logs were added). The log absence
is a deployment lag, not a code-logic gap.

The actionable fix regardless: move all diagnostic logs BEFORE early-return guards so
future silent failures are observable.

## Tasks

### Task 1: Move log lines before early-return guards in renderDynamic* functions
Files: products.js
- renderDynamicEngravingProducts: move console.log to line 1 of function (before grid check), convert `if (!grid) return` to also warn
- renderDynamicPrints3dProducts: same

### Task 2: Add [navigate] and [bootstrap] diagnostic logs to ui.js
Files: ui.js
- Add `[navigate] called with page=` at first line of navigate()
- Add `[navigate] page shown, about to call render for` just before the render dispatch block
- Add `[render-dispatch] calling <fn>` just before each render call
- Add `[bootstrap] initializeApp fired` at start of initializeApp()
- Add products.length === 0 warning guard in navigate() render block

## Success Criteria
- [ ] `[renderDynamic*]` log fires even when grid is missing (before guard)
- [ ] `[navigate]` log fires on every navigate() call
- [ ] `[bootstrap]` log fires when initializeApp runs
- [ ] `[render-dispatch]` logs fire for each page-specific render call
- [ ] products.length === 0 produces a warning log instead of silent empty render
