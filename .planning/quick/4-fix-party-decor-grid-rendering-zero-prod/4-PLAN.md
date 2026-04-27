---
phase: quick-4
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - products.js
autonomous: false

must_haves:
  truths:
    - "Visiting #partydecor renders all 16 Party Decor product cards inside #productsGrid"
    - "Clicking Arches filter renders 6 cards; Columns 3; Walls 3; Centerpieces 4"
    - "Console logs the actual category and sub_category values present on Party Decor rows so any DB/code mismatch is visible"
    - "3D Prints page (#prints3dGrid) renders 83 cards"
    - "Engraving page (#engravingGrid) renders 9 cards"
    - "Party Rentals page (#page-partyrentals) shows the Coming Soon placeholder (no grid expected — by design)"
  artifacts:
    - path: "products.js"
      provides: "renderCatalog with diagnostic logging that exposes the real cause of an empty grid"
      contains: "Party Decor render:"
  key_links:
    - from: "products.js renderCatalog"
      to: "#productsGrid DOM element"
      via: "innerHTML assignment after filter()"
      pattern: "productsGrid\\.innerHTML"
    - from: "products.js renderCatalog filter"
      to: "products[].category"
      via: "string equality on 'Party Decor'"
      pattern: "p\\.category === 'Party Decor'"
---

<objective>
Diagnose and fix #productsGrid rendering zero Party Decor cards despite Supabase loading 109 products with 16 Party Decor rows in the DB. Verify 3D Prints and Engraving grids render correctly. Confirm Party Rentals page expectation (Coming Soon, no grid).

Purpose: Static code review of products.js + index.html shows the filtering logic is already correct (line 517: `p.category === 'Party Decor'`; line 387 button: `filterProducts('all')`). Memory + Quick Task 3 SUMMARY both assert sub_category was added to the SELECT and the row-mapper, and Quick Task 2 SUMMARY says the migration sets `category='Party Decor'` for all 16 sub-cat rows. So the code SHOULD work — yet the grid is empty.

This means the bug is NOT in the visible filter logic but in a **data shape mismatch we cannot see from static reading alone**. The most likely causes (in priority order):

1. Migration `2026_normalize_categories.sql` was only partially run — the 16 rows may still be stored as `category='arches'/'columns'/'walls'/'centerpieces'` (legacy lowercase) instead of `category='Party Decor'`. Quick Task 2 SUMMARY explicitly notes "The file was NOT executed. The user runs it manually in the Supabase SQL Editor."
2. A subset of rows has `category='Party Decor'` while another subset has legacy values — partial-migration state.
3. A silent JS error in `createProductCard` for one row halts the entire `.map().join('')` and leaves the grid blank.

Output: Diagnostic logging that immediately exposes the real cause, plus a defensive fix that handles legacy category values until the migration is fully run.
</objective>

<execution_context>
@C:/Users/sammy/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/sammy/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/2-normalize-products-category-split-party-/2-SUMMARY.md
@.planning/quick/3-diagnose-and-fix-product-rendering-failu/3-SUMMARY.md
@products.js
@index.html
@migrations/2026_normalize_categories.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add diagnostic logging + defensive legacy-category fallback in renderCatalog</name>
  <files>products.js</files>
  <action>
Open `products.js` and modify the `renderCatalog` function (currently lines 514-539). The current code is:

```js
// Render Catalog
export function renderCatalog() {
    let filtered;
    if (currentFilter === 'all') {
        filtered = products.filter(p => p.category === 'Party Decor');
    } else if (['Arches', 'Columns', 'Walls', 'Centerpieces'].includes(currentFilter)) {
        filtered = products.filter(p => p.category === 'Party Decor' && p.sub_category === currentFilter);
    } else {
        filtered = products.filter(p => p.category === currentFilter);
    }

    // Sort popular items first (by price high to low) when viewing all products
    if (currentFilter === 'all') {
        const popularItems = filtered.filter(p => p.popular).sort((a, b) => b.price - a.price);
        const otherItems = filtered.filter(p => !p.popular);
        filtered = [...popularItems, ...otherItems];
    }

    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = filtered.map(p => createProductCard(p)).join('');
    productsGrid.querySelectorAll('[data-product-name]').forEach((el, i) => {
        el.textContent = filtered[i].name;
    });
    productsGrid.querySelectorAll('[data-product-desc]').forEach((el, i) => {
        el.textContent = filtered[i].description || '';
    });
}
```

Replace it with the version below. Three changes:
  (a) Add a diagnostic block at the top that logs total products, the unique set of `category` values present, the count + unique `sub_category` values for any row whose category contains "decor" / "arch" / "column" / "wall" / "centerpiece" (case-insensitive), the resolved currentFilter, and the matched count.
  (b) Add a legacy-category fallback to the `'all'` branch so rows still stored under legacy lowercase category names (`arches`, `columns`, `walls`, `centerpieces`) are still picked up if the migration was only partially run. Same for the named sub-cat branch.
  (c) Wrap the per-row card creation in a try/catch so one bad row cannot blank the entire grid; the failed row's name + error are logged, the row is skipped.

```js
// Render Catalog
const PARTY_DECOR_LEGACY_CATEGORIES = ['arches', 'columns', 'walls', 'centerpieces'];
const PARTY_DECOR_SUB_CATEGORIES = ['Arches', 'Columns', 'Walls', 'Centerpieces'];

function isPartyDecorRow(p) {
    if (p.category === 'Party Decor') return true;
    if (typeof p.category === 'string' && PARTY_DECOR_LEGACY_CATEGORIES.includes(p.category.toLowerCase())) return true;
    return false;
}

function getEffectiveSubCategory(p) {
    if (p.sub_category) return p.sub_category;
    // Fallback: if row is stored under legacy lowercase category, treat that as the sub-category
    if (typeof p.category === 'string' && PARTY_DECOR_LEGACY_CATEGORIES.includes(p.category.toLowerCase())) {
        const lc = p.category.toLowerCase();
        return lc.charAt(0).toUpperCase() + lc.slice(1); // 'arches' -> 'Arches'
    }
    return null;
}

export function renderCatalog() {
    // ---- DIAGNOSTIC BLOCK (temporary; remove after the bug is confirmed fixed and stable) ----
    const allCategoryValues = Array.from(new Set(products.map(p => p.category)));
    const decorishRows = products.filter(p => {
        if (typeof p.category !== 'string') return false;
        const c = p.category.toLowerCase();
        return c.includes('decor') || c === 'arches' || c === 'columns' || c === 'walls' || c === 'centerpieces';
    });
    const decorSubCats = Array.from(new Set(decorishRows.map(p => p.sub_category)));
    console.log('[renderCatalog] currentFilter =', currentFilter,
        '| products.length =', products.length,
        '| unique categories =', allCategoryValues,
        '| decor-ish rows =', decorishRows.length,
        '| their sub_category values =', decorSubCats);
    // ---- END DIAGNOSTIC BLOCK ----

    let filtered;
    if (currentFilter === 'all') {
        filtered = products.filter(isPartyDecorRow);
    } else if (PARTY_DECOR_SUB_CATEGORIES.includes(currentFilter)) {
        filtered = products.filter(p => isPartyDecorRow(p) && getEffectiveSubCategory(p) === currentFilter);
    } else {
        filtered = products.filter(p => p.category === currentFilter);
    }

    console.log('[renderCatalog] matched =', filtered.length, 'rows for filter', currentFilter);

    // Sort popular items first (by price high to low) when viewing all products
    if (currentFilter === 'all') {
        const popularItems = filtered.filter(p => p.popular).sort((a, b) => b.price - a.price);
        const otherItems = filtered.filter(p => !p.popular);
        filtered = [...popularItems, ...otherItems];
    }

    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.warn('[renderCatalog] #productsGrid not found in DOM');
        return;
    }

    // Defensive: build cards one at a time so one bad row cannot blank the entire grid
    const safeRows = [];
    const cardsHtml = filtered.map(p => {
        try {
            const html = createProductCard(p);
            safeRows.push(p);
            return html;
        } catch (err) {
            console.error('[renderCatalog] createProductCard failed for row',
                { id: p && p.id, name: p && p.name, category: p && p.category, sub_category: p && p.sub_category },
                err);
            return '';
        }
    }).join('');

    productsGrid.innerHTML = cardsHtml;
    productsGrid.querySelectorAll('[data-product-name]').forEach((el, i) => {
        if (safeRows[i]) el.textContent = safeRows[i].name;
    });
    productsGrid.querySelectorAll('[data-product-desc]').forEach((el, i) => {
        if (safeRows[i]) el.textContent = safeRows[i].description || '';
    });
}
```

Notes on the change:
- The two `const` arrays + two helpers go ABOVE `renderCatalog` (replacing the single comment line `// Render Catalog`). The current file has no other helper between line 511 and 514, so this is a clean insert.
- `isPartyDecorRow` and `getEffectiveSubCategory` are NOT exported — they are private to this module.
- The diagnostic console.logs are temporary; they will be removed in Task 3 once the real cause is observed and the data is in the right shape.
- Do NOT touch `filterProducts`, `createProductCard`, or any other function. Only `renderCatalog` and the two helpers above it.
- Do NOT touch `renderDynamicEngravingProducts` or `renderDynamicPrints3dProducts` in this task.
  </action>
  <verify>
1. `grep -n "isPartyDecorRow" products.js` returns 3 hits (definition + 2 usages in renderCatalog)
2. `grep -n "\[renderCatalog\]" products.js` returns at least 4 hits (3 console.log/warn lines + 1 console.error)
3. `grep -n "PARTY_DECOR_LEGACY_CATEGORIES" products.js` returns 2 hits (declaration + use inside helpers)
4. `node --check products.js` exits 0 (no syntax errors)
  </verify>
  <done>renderCatalog now logs diagnostics, accepts both canonical and legacy category values for Party Decor rows, and survives a bad row without blanking the grid. Two private helpers and two const arrays added above renderCatalog. No other functions touched.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Diagnostic logging in renderCatalog plus a legacy-category fallback that should surface the real cause of the empty grid AND likely auto-fix it if the cause is "migration was only partially run".</what-built>
  <how-to-verify>
1. Hard-reload the site (Ctrl+Shift+R or Cmd+Shift+R) to bypass cache.
2. Open DevTools console BEFORE navigating anywhere.
3. Click the Party Decor nav link (or visit `#partydecor`).
4. In the console, find the `[renderCatalog]` log line. Copy its full output and paste into the resume signal.

Expected outcomes — three possible scenarios:

  **Scenario A (best case): grid now shows 16 cards.** The log line will read something like
    `currentFilter = all | products.length = 109 | unique categories = [...] | decor-ish rows = 16 | their sub_category values = [...]`
    and `matched = 16 rows for filter all`. This means the migration was either fully run OR the legacy-fallback caught the partial-run case. Either way, the bug is fixed. Proceed to verify the four sub-filter buttons:
      - Arches -> 6 cards
      - Columns -> 3 cards
      - Walls -> 3 cards
      - Centerpieces -> 4 cards
    Also visit `#prints3d` (expect ~83 cards in #prints3dGrid) and `#engraving` (expect ~9 cards in #engravingGrid). Visit `#partyrentals` and confirm the Coming Soon placeholder appears (no grid is expected on this page — by design).
    If all of the above pass, type **"approved scenario A"** plus paste the log line.

  **Scenario B (partial migration confirmed): grid shows >0 but ≠ 16, or sub-cat counts are wrong.** The log line `unique categories` will include legacy names like `'arches'` or `'columns'` mixed with `'Party Decor'`. Paste the full log line + the actual counts you see for All/Arches/Columns/Walls/Centerpieces. Type **"diagnosed scenario B"** plus the values.

  **Scenario C (createProductCard error): grid still empty OR partial.** The console will contain one or more `[renderCatalog] createProductCard failed for row {...}` lines. Paste those error lines (with the row id/name/category/sub_category and the JS error message). Type **"diagnosed scenario C"** plus the error excerpt.

  **Scenario D (zero decor-ish rows): the log shows `decor-ish rows = 0`.** This means none of the 109 rows have any category value that resembles Party Decor — the migration either didn't run, was rolled back, or the rows are stored under a category name we haven't anticipated. Paste the full `unique categories` array. Type **"diagnosed scenario D"** plus the categories list.
  </how-to-verify>
  <resume-signal>Type one of: "approved scenario A", "diagnosed scenario B", "diagnosed scenario C", or "diagnosed scenario D" — and paste the [renderCatalog] log output and any related counts/errors.</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Apply scenario-specific fix and remove diagnostic logs</name>
  <files>products.js</files>
  <action>
Branch on what the human reported in Task 2's resume signal:

**If "approved scenario A":**
  - The legacy-fallback already fixed it OR the data is fully canonical. The defensive helpers (`isPartyDecorRow`, `getEffectiveSubCategory`, `PARTY_DECOR_LEGACY_CATEGORIES`, `PARTY_DECOR_SUB_CATEGORIES`) STAY — they protect against future drift at near-zero cost.
  - REMOVE the temporary diagnostic console.log/console.warn lines (the entire `// ---- DIAGNOSTIC BLOCK ----` block and the `console.log('[renderCatalog] matched =', ...)` line and the `console.warn('[renderCatalog] #productsGrid not found in DOM')` line).
  - KEEP the `console.error('[renderCatalog] createProductCard failed for row', ...)` line — it is a real safety net, not a diagnostic.
  - KEEP the try/catch around card creation — it is a real safety net.

**If "diagnosed scenario B":**
  - The legacy-fallback already turned the empty grid into a working grid. Same removal as scenario A — strip diagnostic logs, keep helpers + try/catch.
  - ALSO: leave a one-line comment above `PARTY_DECOR_LEGACY_CATEGORIES` reading: `// Legacy lowercase category names tolerated for rows that pre-date 2026_normalize_categories.sql; remove this fallback once a SELECT against Supabase confirms zero rows with these category values.`

**If "diagnosed scenario C":**
  - Read the human's pasted error message carefully. Identify the exact line in `createProductCard` (lines 232-280) that throws. The most common cause will be a row with `product.name === null/undefined` causing `.toLowerCase()` to throw, or `product.images` being a non-array.
  - Make the minimal fix in `createProductCard` to guard against that specific input shape (e.g. `const productSlug = (product.name || '').toLowerCase().replace(...)`). Do NOT redesign the function.
  - Remove the diagnostic console.log/console.warn lines as in scenario A. Keep the try/catch and the console.error safety net.

**If "diagnosed scenario D":**
  - Stop and tell the user: "The 109 rows in Supabase do not have Party Decor / Arches / Columns / Walls / Centerpieces in their category column. The 2026_normalize_categories.sql migration has not been run, or was rolled back. Open the Supabase SQL Editor and run `migrations/2026_normalize_categories.sql` end-to-end. Then re-run this verification."
  - Do NOT modify code further. The diagnostic logs stay in place for the user's next browser test.
  - Mark this task complete with status "blocked-on-user-action: run migration".

Final cleanup (scenarios A, B, C only):
- After removing diagnostic lines, run `node --check products.js` to confirm no syntax errors.
- The final renderCatalog should be ~25 lines: helpers + filter logic + safe map+join + DOM updates.
  </action>
  <verify>
1. For scenarios A/B/C: `grep -c "console.log('\[renderCatalog\]'" products.js` returns 0 (diagnostic logs removed).
2. For scenarios A/B/C: `grep -c "console.error('\[renderCatalog\]'" products.js` returns 1 (safety-net log retained).
3. For scenarios A/B/C: `grep -n "isPartyDecorRow" products.js` still returns 3 hits (helpers retained).
4. `node --check products.js` exits 0.
5. Reload the site one more time. Party Decor: 16 cards (All), 6 (Arches), 3 (Columns), 3 (Walls), 4 (Centerpieces). 3D Prints: ~83 cards. Engraving: ~9 cards. Party Rentals: Coming Soon placeholder.
  </verify>
  <done>Diagnostic logs removed; defensive helpers + try/catch retained; site renders all expected counts on every page; OR (scenario D) user has been notified to run the migration and the diagnostic logs remain in place for their next test.</done>
</task>

</tasks>

<verification>
1. `node --check products.js` exits 0
2. Browser console at `#partydecor` shows zero `[renderCatalog]` log lines (after Task 3, scenarios A/B/C)
3. `#productsGrid` contains 16 `.product-card` children when "All" is active; correct counts under each sub-cat filter
4. `#prints3dGrid` contains ~83 `.product-card.prints3d-product` children
5. `#engravingGrid` contains ~9 `.product-card.engraving-product` children
6. `#page-partyrentals` shows the Coming Soon block; no grid expected
</verification>

<success_criteria>
- Party Decor "All" view renders 16 cards (the four sub-cat counts: 6/3/3/4 sum to 16)
- Each Party Decor sub-cat filter button renders the correct subset
- 3D Prints and Engraving pages still render their full sets (no regression)
- products.js retains the defensive `isPartyDecorRow` / `getEffectiveSubCategory` helpers and the try/catch safety net around `createProductCard` calls
- All temporary diagnostic console.log/console.warn lines are removed (the scenario-A console.error safety-net log is kept)
- Zero changes to staff.js, schema.sql, migrations/, cart.js, supabase-client.js, js/itemCategories.js
</success_criteria>

<output>
After completion, create `.planning/quick/4-fix-party-decor-grid-rendering-zero-prod/4-SUMMARY.md` documenting which scenario (A/B/C/D) was hit, what the diagnostic log revealed, and the final state of products.js.
</output>
