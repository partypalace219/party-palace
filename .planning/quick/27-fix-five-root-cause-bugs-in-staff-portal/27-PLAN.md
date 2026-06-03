---
phase: quick-27
plan: 27
type: execute
wave: 1
depends_on: []
files_modified:
  - js/itemCategories.js
  - products.js
  - staff.js
  - ui.js
  - index.html
autonomous: false

must_haves:
  truths:
    - "Editing a Panels product in staff portal preserves sub_category 'Panels' on save"
    - "Engraving Metal filter shows the black tumbler; Wood filter hides it"
    - "Party Decor products with multiple images display their images on the live site"
    - "Editing a 3D Print without touching the multi-size toggle preserves its size_variants"
    - "Editing a product name preserves the existing slug (no regeneration on edit)"
  artifacts:
    - path: "js/itemCategories.js"
      provides: "Panels in Party Rentals sub-category list"
      contains: "Panels"
    - path: "products.js"
      provides: "Engraving filter by sub_category + image_urls in SELECT/transform"
    - path: "staff.js"
      provides: "size_variants payload guard + slug-on-create-only guard"
  key_links:
    - from: "staff.js populateSubCategoryOptions"
      to: "ITEM_CATEGORIES['Party Rentals']"
      via: "subcategory dropdown population + save validation (line 1338)"
      pattern: "Panels"
    - from: "products.js renderDynamicEngravingProducts"
      to: "card.dataset.material"
      via: "product.sub_category"
      pattern: "sub_category"
    - from: "products.js loadProducts SELECT"
      to: "product.images array"
      via: "image_urls column"
      pattern: "image_urls"
---

<objective>
Fix five independent root-cause bugs in the staff portal save flow, identified by Quick Task 26's diagnostic. Each fix is isolated to a single concern; all five ship together (no half-applied state).

Purpose: Restore correct save/render behavior for Panels, engraving filtering, Party Decor multi-images, 3D Print size variants, and slug stability.
Output: Patched js/itemCategories.js, products.js, staff.js; cache-bust bump; live-site Playwright verification.
</objective>

<execution_context>
@C:/Users/sammy/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/sammy/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@js/itemCategories.js
@products.js
@staff.js
@ui.js
@index.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix 1 + Fix 2 + Fix 3 (itemCategories.js + products.js)</name>
  <files>js/itemCategories.js, products.js</files>
  <action>
**Fix 1 — Add Panels to Party Rentals (js/itemCategories.js):**
In `ITEM_CATEGORIES["Party Rentals"]` (currently `["Tables", "Chairs", "Tents", "Games", "Concessions"]`), insert "Panels" after "Tents" so the final list is:
`["Tables", "Chairs", "Tents", "Panels", "Games", "Concessions"]`.
This unblocks the staff subcategory dropdown (staff.js line 1611) and the save validation (staff.js line 1338) which currently rejects/loses "Panels".

**Fix 2 — Engraving filter reads sub_category, not material (products.js, renderDynamicEngravingProducts ~line 134-188):**
- Line 149: change `const material = product.material || 'Wood';` to `const material = product.sub_category || 'Wood';`
- The `card.dataset.material = material;` at line 168 then correctly carries the sub_category value used by the Metal/Wood filter buttons (filterEngravingProducts at line 804+, which reads `dataset.material`).
- Leave the DB `material` column in the SELECT for backward compat (do NOT remove). Lines 588/590 (product detail page material display) are out of scope for filtering — leave them as-is unless they break; do NOT change detail-page rendering.

**Fix 3 — Add image_urls to loadProducts so multi-images display (products.js, loadProducts ~line 30-59):**
- Line 32: add `image_urls` to the `cols` string. New value:
  `'id,name,slug,category,sub_category,price,sale,emoji,featured,price_label,description,size,material,image_url,image_urls,size_variants'`
- In the transform (lines 41-59), populate the product's `images` array from `image_urls` when present, falling back to `image_url`. createProductCard (line 377+) renders from `product.images` (uses images[0] and images[1] for the multi-image hover). Replace the existing lines:
  ```
  image_url: p.image_url || null,
  images: p.image_url ? [p.image_url] : undefined,
  ```
  with:
  ```
  image_url: p.image_url || (Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls[0] : null),
  images: (Array.isArray(p.image_urls) && p.image_urls.length)
      ? p.image_urls
      : (p.image_url ? [p.image_url] : undefined),
  ```
- Note: the background `loadProductImages()` (line 95-118) only sets `product.images` when `!product.images?.length`, so it will NOT clobber the multi-image array set here. No change needed there.
  </action>
  <verify>
node -e "const {ITEM_CATEGORIES}=(()=>{global.window=undefined; const m={}; return m;})()" is not applicable; instead grep-verify:
- `js/itemCategories.js` contains `"Panels"` inside Party Rentals.
- `products.js` line ~149 reads `product.sub_category` for engraving material.
- `products.js` `cols` string contains `image_urls`.
- `products.js` transform maps `images` from `image_urls`.
Run `node -c products.js 2>&1 || echo "ESM-only, skip syntax"` — file uses ESM, so confirm no obvious syntax error visually. No JS test harness exists; rely on live verification in Task 3.
  </verify>
  <done>itemCategories.js lists Panels; engraving render uses sub_category; loadProducts selects and maps image_urls into the images array.</done>
</task>

<task type="auto">
  <name>Task 2: Fix 4 + Fix 5 + cache-bust bump (staff.js, ui.js, index.html)</name>
  <files>staff.js, ui.js, index.html</files>
  <action>
**Fix 5 — Slug regeneration guard (staff.js ~line 1352-1355):**
Currently slug is always regenerated from name:
```
const id = staffEditingProductId;
const isEditing = id != null;
const name = document.getElementById('staff-product-name').value.trim();
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
```
Change so slug is only generated when CREATING. When editing, preserve the existing product's slug. Use the slug captured when the edit form was opened. Check `startEditProduct`/edit-load code (around staff.js line 1259 where `populateSubCategoryOptions(product.category, product.sub_category)` runs) — store the loaded product's slug into a module variable (e.g., `staffEditingProductSlug`) at edit time. Then:
```
const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slug = isEditing ? (staffEditingProductSlug || generatedSlug) : generatedSlug;
```
If no existing slug is available on the loaded product (legacy rows with null slug), fall back to the generated slug — that is acceptable since the row had no stable slug. Use `uploadAllNewImages(slug)` with this resolved slug. Reset `staffEditingProductSlug = null` wherever `staffEditingProductId` is reset (e.g., line 1418).

**Fix 4 — size_variants payload guard (staff.js ~line 1377-1395):**
Currently `size_variants: useVariants ? validVariants : null` is always present in `productData`, nulling variants on every save where the toggle is off (including non-3D-Prints and 3D Prints edited without touching the toggle).
Replace the inline key with conditional inclusion. Remove `size_variants` from the `productData` object literal, then after building `productData`:
```
// size_variants policy:
// - Not a 3D Print: never touch size_variants (omit key).
// - 3D Print, multi-size toggle ON with valid rows: write the array.
// - 3D Print, multi-size toggle rendered AND explicitly OFF: intentional wipe (null).
// - 3D Print, toggle not present in DOM (edit didn't render it): omit key (preserve existing).
if (category === '3D Prints') {
    const toggleRendered = !!multiSizeToggle;
    if (useVariants) {
        productData.size_variants = validVariants;
    } else if (toggleRendered) {
        productData.size_variants = null;
    }
    // else: toggle not rendered -> omit, preserving stored value
}
// non-3D-Prints: key omitted entirely
```
Confirm `multiSizeToggle`, `isMultiSize`, `validVariants`, `useVariants` remain defined above this block (they are, at lines 1368-1371). Do NOT change cart.js, ui.js rental logic, or panel tent-dependency logic.

**Cache-bust bump:**
- index.html line 2360: bump `ui.js?v=2026-06-03-25c` -> `ui.js?v=2026-06-03-27`.
- ui.js line 4: bump `./products.js?v=2026-06-03-25c` -> `./products.js?v=2026-06-03-27`.
- ui.js line 8: change `import { initStaffPortal } from './staff.js';` to `import { initStaffPortal } from './staff.js?v=2026-06-03-27';` so the staff.js fix is force-fetched.
- itemCategories.js is loaded via plain `<script src="js/itemCategories.js">` (index.html line 2358, not a module). Add a query string: `<script src="js/itemCategories.js?v=2026-06-03-27"></script>`.
  </action>
  <verify>
- staff.js: slug resolves via `isEditing ? existing : generated`; `staffEditingProductSlug` is set at edit-load and reset alongside `staffEditingProductId`.
- staff.js: `size_variants` no longer unconditionally in `productData`; conditional block matches the policy above.
- index.html and ui.js show `v=2026-06-03-27` on ui.js, products.js, staff.js, itemCategories.js.
Visual ESM syntax check only (no test harness).
  </verify>
  <done>Editing preserves slug; size_variants only written/nulled per policy; all four script references cache-busted to v=2026-06-03-27.</done>
</task>

<task type="auto">
  <name>Task 3: Commit, push, deploy</name>
  <files>(git)</files>
  <action>
Stage only the five touched files plus this plan:
`git add js/itemCategories.js products.js staff.js ui.js index.html .planning/quick/27-fix-five-root-cause-bugs-in-staff-portal/27-PLAN.md`
Commit:
```
fix(quick-27): fix five staff portal save-flow root-cause bugs

- Panels added to Party Rentals ITEM_CATEGORIES (sub_category preserved on edit)
- Engraving filter reads sub_category not material column
- image_urls added to loadProducts SELECT + images array (Party Decor multi-images)
- size_variants payload guarded (omit unless 3D Print toggle explicitly changes it)
- slug preserved on edit, generated only on create
- cache-bust bump to v=2026-06-03-27

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
Push to origin/main: `git push origin main`.
Wait for Vercel to redeploy (the site auto-deploys from main). Confirm deploy by fetching the live ui.js URL and checking it returns 200 with the new version reference, or wait ~60-90s before Task 4.
  </action>
  <verify>`git log -1 --oneline` shows the quick-27 commit; `git status` clean for the five files; push succeeded (no rejection).</verify>
  <done>Commit pushed to origin/main, Vercel deploy triggered.</done>
</task>

<task type="auto">
  <name>Task 4: Playwright live-site verification</name>
  <files>playwright-verify-q27.js</files>
  <action>
Write a Playwright script `playwright-verify-q27.js` (mirror the structure of the existing `playwright-verify-q20.js` in the repo root) that runs against the LIVE Vercel site and checks all five fixes plus regression. Use a wait/retry for deploy propagation (re-load with cache-busting if needed).

Checks:
1. FIX 2 (engraving filter): navigate to Engraving page, click Metal filter -> assert the black tumbler card is visible; click Wood filter -> assert the black tumbler card is NOT visible. (This is fully verifiable headless.)
2. FIX 3 (Party Decor multi-images): navigate to Party Decor catalog; find a product known to have multiple images; assert its card renders an `<img>` (not just emoji span) and, if it has a secondary image, the `.has-secondary`/secondary-image element exists.
3. REGRESSION: assert no uncaught console errors during page loads and filter interactions; assert engraving Wood/Metal/All filter buttons and Party Decor sub-category filters still toggle without throwing.

FIX 1, FIX 4, FIX 5 require authenticated staff-portal save round-trips (edit a Panels product, edit a 3D Print without touching variants, edit a name) — these are not safely automatable headless without staff auth and would mutate live data. Defer them to the human-verify checkpoint (Task 5) rather than mutating production rows in Playwright.

Run the script with `node playwright-verify-q27.js`. Capture screenshots on any failure (e.g., `fail-check-q27-N.png`).
  </action>
  <verify>`node playwright-verify-q27.js` exits 0; engraving Metal/Wood filter assertions pass; Party Decor multi-image assertion passes; zero uncaught console errors logged.</verify>
  <done>Automated checks for Fix 2, Fix 3, and regression pass on the live site.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5: Human verification of save-flow fixes (Fix 1, 4, 5)</name>
  <what-built>
All five fixes are deployed to the live site. Tasks 1-2 applied the code; Task 4 auto-verified Fix 2 (engraving filter), Fix 3 (Party Decor multi-images), and regression. The remaining three fixes require authenticated staff-portal save round-trips that should not be automated against production data.
  </what-built>
  <how-to-verify>
Open the live staff portal and sign in, then:

1. FIX 1 (Panels sub_category): Edit an existing Party Rentals "Panels" product. Confirm the Sub-category dropdown SHOWS "Panels" and it is selected. Save. Re-open the product -> sub_category is still "Panels" (did not flip to Tables/etc.).

2. FIX 5 (slug stable on edit): Edit any existing product. Change ONLY its name (e.g., append " X"). Save. Inspect the product's slug (via staff list or DB) -> the slug is UNCHANGED from before the rename (not regenerated from the new name).

3. FIX 4 (size_variants preserved): Edit an existing 3D Print that has size_variants, WITHOUT touching the multi-size toggle. Save. Re-open / check DB -> its size_variants array is still intact (not nulled). Then, as a counter-check, a 3D Print with the toggle explicitly turned OFF should null its size_variants on save (intentional wipe).

4. Re-confirm Fix 2 / Fix 3 visually if desired: Engraving Metal shows the black tumbler, Wood does not; a multi-image Party Decor product shows real images.

5. REGRESSION: Click through filters and product pages — no visible breakage, no console errors (DevTools console).
  </how-to-verify>
  <resume-signal>Type "approved" if all five fixes verified, or describe which fix failed and the observed behavior.</resume-signal>
</task>

</tasks>

<verification>
- Fix 1: Panels selectable + preserved on edit (human-verify).
- Fix 2: Engraving Metal/Wood filter correctly includes/excludes by sub_category (Playwright + human).
- Fix 3: Party Decor multi-image products render images (Playwright + human).
- Fix 4: 3D Print size_variants preserved when toggle untouched; nulled only when toggle explicitly off (human-verify).
- Fix 5: Slug unchanged on edit-rename (human-verify).
- Regression: No console errors; all filters/controls function (Playwright + human).
</verification>

<success_criteria>
- All five fixes present in js/itemCategories.js, products.js, staff.js.
- Cache-bust bumped to v=2026-06-03-27 on ui.js, products.js, staff.js, itemCategories.js.
- Commit pushed to origin/main and deployed.
- Playwright auto-checks (Fix 2, Fix 3, regression) pass on live site.
- Human verification of Fix 1, Fix 4, Fix 5 returns "approved".
- No DB schema changes, no mass row updates, material column left in SELECT for backward compat.
</success_criteria>

<output>
After completion, create `.planning/quick/27-fix-five-root-cause-bugs-in-staff-portal/27-SUMMARY.md`
</output>
