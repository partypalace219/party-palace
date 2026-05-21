---
phase: quick-13
plan: 13
type: execute
wave: 1
depends_on: []
files_modified:
  - index.html
  - staff.js
  - products.js
  - styles.css
autonomous: true

must_haves:
  truths:
    - "When staff selects category='3D Prints', the Colors field renders an 11-checkbox grid (Black, White, Gray, Brown, Gold, Red, Orange, Yellow, Green, Blue, Violet) — NOT the chip input"
    - "When staff selects any other category, the Colors field shows the existing chip input behavior unchanged"
    - "Saving a 3D Print product writes a JSON array of the checked color names to products.colors in Supabase"
    - "Editing an existing 3D Print product pre-checks the boxes for previously-saved colors"
    - "Unknown color values in the DB (e.g., 'Indigo') are gracefully ignored on edit (console.warn only, no crash)"
    - "Public product cards for 3D Print products with a non-empty colors array render 16px circle swatches below the price/name area"
    - "Swatch hover shows a tooltip with the color name (title attribute)"
    - "White swatch (#FFFFFF) renders with a thin gray border so it is visible on white card background"
    - "Product cards in non-3D-Print categories render no swatch row"
    - "3D Print cards with empty/null colors render no swatch row (no empty container in DOM)"
    - "Modified JS files in index.html have updated ?v= cache-busting query strings"
  artifacts:
    - path: "index.html"
      provides: "3D Prints color checkbox grid container + retained chip input + updated cache-bust query strings"
      contains: "staff-3dprint-color-grid"
    - path: "staff.js"
      provides: "PRINT_COLORS constant, toggle3DPrintColorUI, render3DPrintColorGrid, get/setSelected3DPrintColors, integration with category change + load + save"
      exports: ["staffOnCategoryChange", "renderColorChips"]
    - path: "products.js"
      provides: "Color swatch row rendering inside renderDynamicPrints3dProducts (uses PRINT_COLORS lookup)"
      contains: "product-color-swatches"
    - path: "styles.css"
      provides: "Styles for .staff-3dprint-color-grid, .staff-3dprint-color-check, .product-color-swatches, .product-color-swatch"
      contains: ".product-color-swatch"
  key_links:
    - from: "staff.js staffOnCategoryChange"
      to: "staff.js toggle3DPrintColorUI"
      via: "category-change handler hides chip input / shows checkbox grid when cat === '3D Prints'"
      pattern: "toggle3DPrintColorUI"
    - from: "staff.js handleStaffProductSubmit (save path)"
      to: "products.colors column"
      via: "if category === '3D Prints', use getSelected3DPrintColors() instead of staffProductColors"
      pattern: "getSelected3DPrintColors"
    - from: "staff.js openStaffProductModal (load/edit path)"
      to: "checkbox.checked state"
      via: "if category === '3D Prints', call setSelected3DPrintColors(product.colors)"
      pattern: "setSelected3DPrintColors"
    - from: "products.js renderDynamicPrints3dProducts"
      to: "PRINT_COLORS hex map"
      via: "lookup color name → hex, render swatch <span style=background:HEX>"
      pattern: "product-color-swatch"
---

<objective>
Add a category-aware color picker for 3D Prints: replace the freeform chip input with an 11-checkbox grid of predefined colors (each with a known hex), persist as JSON array in `products.colors`, and render 16px circle swatches on public 3D Print product cards. Other categories keep the existing chip input unchanged.

Purpose: 3D Prints need a controlled, deterministic color set so staff can't enter typos or unknown values, and public cards can show meaningful colored swatches instead of plain text. Engraving/Party Decor/Party Rentals continue to use freeform chips because their color sets are open-ended.

Output: Staff portal renders different color UI per category, saves arrays correctly, edits pre-fill checkboxes, ignores unknown colors gracefully. Public 3D Print cards show colored circle swatches with tooltips when colors are present.
</objective>

<execution_context>
@C:/Users/sammy/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/sammy/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@index.html
@staff.js
@products.js
@styles.css

Key reference points (already read during planning):
- index.html line 2122-2127: existing `<div class="staff-form-group">` containing the chip input (`#staff-color-chips`, `#staff-color-input`). The new checkbox grid will live in the same form-group, hidden by default, toggled by category change.
- index.html line 2059: `#staff-product-category` select (drives the toggle).
- index.html line 2337-2339: current `<script>` tags. Cache-bust query strings live here. Currently `ui.js?v=2026-05-21`. Other JS files (staff.js, products.js, supabase-client.js, product_image_urls.js, js/itemCategories.js) have no ?v= and are loaded via either ui.js imports (staff.js, products.js) or directly (the others). Only files whose direct `<script src=>` tags appear in index.html need ?v= updates — staff.js and products.js are imported as ES modules through ui.js, so updating `ui.js?v=...` is sufficient to cache-bust the whole module graph.
- staff.js line 22: `let staffProductColors = [];` — the existing chip array. Keep for non-3D-Print categories.
- staff.js line 1236, 1269, 1370: places staffProductColors is reset, loaded, and saved. The save path at 1370 needs to branch on category.
- staff.js line 1575-1578: `staffOnCategoryChange(cat)` — currently just repopulates sub-category. Will also call `toggle3DPrintColorUI(cat)`.
- staff.js line 1595-1630: chip helpers (renderColorChips, addColorChip, removeColorChip, handleColorChipKeydown). DO NOT MODIFY — they remain for non-3D-Print categories.
- staff.js line 1924-1926: edit path calls `staffOnCategoryChange(data.category)` — perfect injection point. After that fires, we also need to call `setSelected3DPrintColors(data.colors)`.
- products.js line 173-210: `renderDynamicPrints3dProducts` — the swatch row inserts here, after the `.product-name`/`.product-description` block and before `.product-price`.
- styles.css line 4500-4570: existing staff form styles (`.staff-size-check`, `.staff-color-chips`, `.staff-chip*`) — match these patterns for the new `.staff-3dprint-color-grid`.

Constraints (from task spec):
- DO NOT change DB schema (`products.colors` already exists as TEXT[] from quick task 1).
- DO NOT change cart logic.
- DO NOT touch color logic for non-3D-Print categories.
- DO NOT include Indigo in the predefined list (DB may still have it from earlier data — gracefully ignore on read).
- DO NOT allow freeform color entry for 3D Prints.
- Stay surgical. No styling sweep, no refactor of unrelated functions.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Investigation — confirm DB column type, locate exact code regions, report findings</name>
  <files>(read-only investigation — no files modified)</files>
  <action>
This is a pure investigation pass. DO NOT EDIT FILES in this task. Use the Supabase MCP server and grep to confirm the following, then report findings inline in your task output so Task 2 can proceed with full confidence.

STEP A — Supabase column type check. Use the Supabase MCP tool `list_tables` (filter to schemas=['public']) to inspect the `products` table. Confirm:
1. The `colors` column exists.
2. Note its exact data type. We expect `text[]` (PostgreSQL array of text — added in quick task 1 as `colors TEXT[] DEFAULT '{}'`). Some Supabase responses may also describe it as `ARRAY`. Either is acceptable; the JS layer treats it as a JSON array.
3. Sample a few existing 3D Print rows: use `execute_sql` to run `SELECT id, name, category, colors FROM products WHERE category = '3D Prints' AND colors IS NOT NULL AND array_length(colors, 1) > 0 LIMIT 5;` — record what color name strings already exist in the DB (case, spelling). This determines whether case-insensitive matching is needed in the public render.

STEP B — Locate existing chip input code (verify line numbers haven't drifted). Run these greps and record the exact line numbers:
- `grep -n "staff-color-chips" index.html` (expected: ~2125)
- `grep -n "staff-color-input" index.html` (expected: ~2126)
- `grep -n "let staffProductColors" staff.js` (expected: ~22)
- `grep -n "staffProductColors = \[\.\.\.(product.colors" staff.js` (expected: ~1269)
- `grep -n "colors: \[\.\.\.staffProductColors\]" staff.js` (expected: ~1370)
- `grep -n "function staffOnCategoryChange" staff.js` (expected: ~1575)
- `grep -n "function renderColorChips" staff.js` (expected: ~1599)

STEP C — Locate public card render. Run:
- `grep -n "renderDynamicPrints3dProducts" products.js`
- `grep -n "product-price product-price-bottom" products.js` (find the exact line inside the 3D Print card innerHTML where the price block sits — swatches go immediately ABOVE this line so they read between name/description and price)

STEP D — Cache-bust audit. Run `grep -n "\\.js" index.html` filtered to `<script` tags only (use `grep -nE "<script.*\\.js"`). Confirm which JS files are referenced directly via `<script src=>`. We expect:
- `supabase-client.js` (line ~125)
- `js/itemCategories.js` (line ~2337)
- `product_image_urls.js` (line ~2338)
- `ui.js?v=2026-05-21` (line ~2339, ES module entry point)
Note that staff.js and products.js are NOT in the script tag list — they're loaded by ui.js as ES module imports. So cache-busting in this plan touches only the `ui.js?v=` query string (bumping it forces all ES modules to refetch). Confirm this is the case; if any of staff.js or products.js are actually referenced via `<script src=>` directly, list those line numbers.

STEP E — Report findings. In your task summary output, produce a compact report block with this format:

```
INVESTIGATION FINDINGS
- colors column data type: <e.g., text[]>
- existing color values in 3D Print rows: <list distinct values found, e.g., ["Indigo","blue","White"]>
- chip input HTML lines in index.html: <lines>
- staff.js chip integration lines: reset=<line>, load=<line>, save=<line>
- products.js price line inside renderDynamicPrints3dProducts: <line>
- script tags requiring cache-bust: <list of files with current ?v= values>
- recommended new ?v= value for ui.js: <ISO date 2026-05-21 or increment>
```

If any expected location is missing or significantly different from the line numbers above, surface it explicitly so Task 2 can adapt.
  </action>
  <verify>
- The investigation report block exists in the task summary with all 7 bullet entries filled in.
- No files were modified (`git status` shows no changes after this task).
- Supabase MCP `list_tables` was successfully invoked and the `colors` column data type is confirmed.
- Distinct existing color values in 3D Print rows are listed (this informs the "graceful ignore unknown" requirement).
  </verify>
  <done>
Findings report produced. Task 2 has confirmed line numbers, confirmed column type, confirmed which JS files need cache-bust query string updates, and a list of any unexpected DB color values (e.g., 'Indigo') that the load path must ignore.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement 3D Prints color picker (staff portal + public cards + styles + cache-bust)</name>
  <files>index.html, staff.js, products.js, styles.css</files>
  <action>
Five coordinated edits. Use the line numbers and findings from Task 1 — adjust if they drifted.

EDIT 1 — index.html, inside the Colors form-group (currently lines 2122–2127). Replace the contents of `<div class="staff-form-group">` for Colors with a structure containing BOTH the existing chip UI (for non-3D-Print categories) AND a new checkbox grid (for 3D Prints). The grid is hidden by default; staff.js toggles visibility.

Replace lines 2122–2127 with exactly:

```html
                <!-- Colors -->
                <div class="staff-form-group">
                    <label>Colors</label>
                    <!-- Chip input (used for all categories except 3D Prints) -->
                    <div id="staff-color-chip-wrapper">
                        <div class="staff-color-chips" id="staff-color-chips"></div>
                        <input type="text" id="staff-color-input" class="staff-chip-input" placeholder="Type a color and press Enter" onkeydown="handleColorChipKeydown(event)">
                    </div>
                    <!-- Checkbox grid (used ONLY for 3D Prints) -->
                    <div id="staff-3dprint-color-wrapper" style="display:none;">
                        <div class="staff-3dprint-color-grid" id="staff-3dprint-color-grid"></div>
                    </div>
                </div>
```

EDIT 2 — staff.js, add the predefined color constant + helpers. Insert this block immediately AFTER the existing chip helpers section (after `window.handleColorChipKeydown = handleColorChipKeydown;` at line ~1630). Add a clear section banner comment:

```js
// ============================================
// 3D PRINT COLOR PICKER (predefined, multi-select)
// ============================================

const PRINT_COLORS = [
    { name: 'Black',  hex: '#000000' },
    { name: 'White',  hex: '#FFFFFF' },
    { name: 'Gray',   hex: '#808080' },
    { name: 'Brown',  hex: '#8B4513' },
    { name: 'Gold',   hex: '#FFD700' },
    { name: 'Red',    hex: '#FF0000' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Green',  hex: '#00CC00' },
    { name: 'Blue',   hex: '#0066FF' },
    { name: 'Violet', hex: '#8B00FF' }
];
window.PRINT_COLORS = PRINT_COLORS;

function render3DPrintColorGrid(selected = []) {
    const grid = document.getElementById('staff-3dprint-color-grid');
    if (!grid) return;
    const selectedSet = new Set((selected || []).map(s => String(s)));
    grid.innerHTML = PRINT_COLORS.map(c => `
        <label class="staff-3dprint-color-check" title="${c.name}">
            <input type="checkbox" name="staff-3dprint-color" value="${c.name}" ${selectedSet.has(c.name) ? 'checked' : ''}>
            <span class="staff-3dprint-color-swatch" style="background:${c.hex};${c.hex.toUpperCase() === '#FFFFFF' ? 'border:1px solid #ccc;' : ''}"></span>
            <span class="staff-3dprint-color-name">${c.name}</span>
        </label>
    `).join('');
}
window.render3DPrintColorGrid = render3DPrintColorGrid;

function getSelected3DPrintColors() {
    return Array.from(document.querySelectorAll('#staff-3dprint-color-grid input[type="checkbox"]:checked'))
        .map(cb => cb.value);
}
window.getSelected3DPrintColors = getSelected3DPrintColors;

function setSelected3DPrintColors(colors) {
    const known = new Set(PRINT_COLORS.map(c => c.name));
    const safe = [];
    (colors || []).forEach(name => {
        if (known.has(name)) {
            safe.push(name);
        } else {
            console.warn(`[staff] Ignoring unknown 3D Print color from DB: "${name}"`);
        }
    });
    render3DPrintColorGrid(safe);
}
window.setSelected3DPrintColors = setSelected3DPrintColors;

function toggle3DPrintColorUI(category) {
    const chipWrap = document.getElementById('staff-color-chip-wrapper');
    const gridWrap = document.getElementById('staff-3dprint-color-wrapper');
    if (!chipWrap || !gridWrap) return;
    if (category === '3D Prints') {
        chipWrap.style.display = 'none';
        gridWrap.style.display = '';
        // If grid was never rendered (e.g., first time switching to 3D Prints on a fresh form), render empty.
        if (!document.querySelector('#staff-3dprint-color-grid label')) {
            render3DPrintColorGrid([]);
        }
    } else {
        chipWrap.style.display = '';
        gridWrap.style.display = 'none';
    }
}
window.toggle3DPrintColorUI = toggle3DPrintColorUI;
```

EDIT 3 — staff.js, integrate the three call sites:

3a. `staffOnCategoryChange` (line ~1575). Currently:
```js
function staffOnCategoryChange(cat) {
    populateSubCategoryOptions(cat, '');
}
```
Change to:
```js
function staffOnCategoryChange(cat) {
    populateSubCategoryOptions(cat, '');
    toggle3DPrintColorUI(cat);
}
```

3b. The edit-load path (line ~1269) currently runs:
```js
staffProductColors = [...(product.colors || [])];
```
and then later (line ~1924-1926) calls `staffOnCategoryChange(data.category)`. After that category-change call, add a follow-up that branches on category. Locate the block at line ~1924 that looks like:

```js
const catSelect = document.getElementById('staff-product-category');
if (catSelect) { catSelect.value = data.category || ''; }
staffOnCategoryChange(data.category);
populateSubCategoryOptions(data.category, data.sub_category || '');
```

Immediately AFTER `staffOnCategoryChange(data.category);` and BEFORE the `populateSubCategoryOptions(...)` call (or at the equivalent place — keep relative order with the existing code), add:

```js
if (data.category === '3D Prints') {
    setSelected3DPrintColors(data.colors || []);
} else {
    renderColorChips();
}
```

Rationale: chip render already happens via existing logic after staffProductColors is populated; this `else` is a no-op safety call to ensure chip rendering for non-3D-Print categories — only add the `else` branch IF reading the surrounding code confirms `renderColorChips()` is not already called there. If it is already called, drop the `else` branch and use only the `if` branch.

3c. The new-product reset path (line ~1236) currently sets `staffProductColors = [];`. Right after that line, add:
```js
if (document.getElementById('staff-3dprint-color-grid')) {
    render3DPrintColorGrid([]);
}
```
This ensures opening the "Add Item" modal twice in a row with 3D Prints selected previously doesn't carry over checkmarks.

3d. The save path (line ~1370) currently writes:
```js
colors: [...staffProductColors]
```
Change to:
```js
colors: (category === '3D Prints') ? getSelected3DPrintColors() : [...staffProductColors]
```
Note: `category` is already in scope here (set at line ~1313 from `document.getElementById('staff-product-category').value`). If for some reason `category` is not in scope at this exact line, read it inline: `colors: (document.getElementById('staff-product-category').value === '3D Prints') ? getSelected3DPrintColors() : [...staffProductColors]`.

EDIT 4 — products.js, add swatch row to `renderDynamicPrints3dProducts` (line ~173–209). Inside the `prints3dProducts.forEach(product => { ... })` block, build a swatch HTML string before assigning `card.innerHTML`. Insert this immediately before the `const card = document.createElement('div');` line (which is around line ~189):

```js
        // Build color swatches row (3D Prints only; empty array → no row)
        const PRINT_COLOR_HEX = {
            'Black': '#000000', 'White': '#FFFFFF', 'Gray': '#808080', 'Brown': '#8B4513',
            'Gold': '#FFD700', 'Red': '#FF0000', 'Orange': '#FFA500', 'Yellow': '#FFFF00',
            'Green': '#00CC00', 'Blue': '#0066FF', 'Violet': '#8B00FF'
        };
        const productColors = Array.isArray(product.colors) ? product.colors : [];
        const knownColors = productColors.filter(c => PRINT_COLOR_HEX[c]);
        const swatchesHTML = knownColors.length === 0 ? '' : `
            <div class="product-color-swatches" aria-label="Available colors">
                ${knownColors.map(c => `<span class="product-color-swatch${c === 'White' ? ' product-color-swatch--white' : ''}" style="background:${PRINT_COLOR_HEX[c]}" title="${c}"></span>`).join('')}
            </div>`;
```

Then modify the template literal that builds the card. Currently `card.innerHTML` contains a `.product-info` block with name → description → price → button. Insert `${swatchesHTML}` between the `.product-description` div and the `.product-price` div. So the relevant portion changes from:

```html
                <div class="product-description"></div>
                <div class="product-price product-price-bottom">$${(product.price || 0).toFixed(2)}</div>
```

to:

```html
                <div class="product-description"></div>
                ${swatchesHTML}
                <div class="product-price product-price-bottom">$${(product.price || 0).toFixed(2)}</div>
```

DO NOT touch the engraving render, the party rentals render, or any other category render. Only `renderDynamicPrints3dProducts`.

EDIT 5 — styles.css, append the following at the end of the file (or insert right after the `.staff-chip-input` block at line ~4570). Match existing class-naming conventions:

```css
/* 3D Prints color picker (staff portal) */
.staff-3dprint-color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
    margin-top: 0.25rem;
}
.staff-3dprint-color-check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    background: #fff;
    transition: background 0.15s ease;
}
.staff-3dprint-color-check:hover {
    background: #f9fafb;
}
.staff-3dprint-color-check input[type="checkbox"] {
    margin: 0;
}
.staff-3dprint-color-swatch {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
}
.staff-3dprint-color-name {
    font-size: 0.875rem;
    color: #374151;
}

/* Public product card color swatches (3D Prints) */
.product-color-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0.4rem 0;
}
.product-color-swatch {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    cursor: default;
}
.product-color-swatch--white {
    border: 1px solid #d1d5db;
}
```

EDIT 6 — index.html cache-bust. At line ~2339 the current entry-point script is:
```html
<script type="module" src="ui.js?v=2026-05-21"></script>
```
Bump the version string. Use today's date suffix from the investigation findings, e.g., `?v=2026-05-21-13` (the `-13` denotes quick task 13). If Task 1's findings showed any other JS files referenced directly via `<script src=>` (e.g., supabase-client.js, product_image_urls.js, js/itemCategories.js) that are MODIFIED by this plan, also bump those. As of planning, only `ui.js` needs bumping because staff.js and products.js are imported through ui.js (module graph) — bumping ui.js forces a refetch of all imported modules.

Final form:
```html
<script type="module" src="ui.js?v=2026-05-21-13"></script>
```
Do NOT add ?v= to staff.js or products.js (they have no direct script tags). Do NOT change supabase-client.js, product_image_urls.js, or js/itemCategories.js — none are modified by this plan.
  </action>
  <verify>
1. `grep -nE "staff-3dprint-color-(grid|wrapper)" index.html` → at least 2 matches (wrapper div + grid div).
2. `grep -n "staff-color-chip-wrapper" index.html` → 1 match (chip wrapper still present).
3. `grep -n "PRINT_COLORS" staff.js` → at least 2 matches (definition + window export).
4. `grep -n "toggle3DPrintColorUI" staff.js` → at least 3 matches (definition + window export + call from staffOnCategoryChange).
5. `grep -n "getSelected3DPrintColors" staff.js` → at least 2 matches (definition + call in save path).
6. `grep -n "setSelected3DPrintColors" staff.js` → at least 2 matches (definition + call in edit-load path).
7. `grep -n "category === '3D Prints'" staff.js` → at least 2 matches (one in toggle call surroundings, one in save-path ternary).
8. `grep -n "product-color-swatches" products.js` → 1 match (inside renderDynamicPrints3dProducts).
9. `grep -n "product-color-swatch" styles.css` → at least 2 matches (.product-color-swatches, .product-color-swatch).
10. `grep -n "ui.js?v=2026-05-21-13" index.html` → 1 match (cache-bust updated). `grep -n "ui.js?v=2026-05-21\"" index.html` → 0 matches (old query string gone).
11. Functional smoke test (open the site):
    - Staff portal → click Add Item → select category = "3D Prints" → Colors field shows an 11-checkbox grid (Black, White, Gray, Brown, Gold, Red, Orange, Yellow, Green, Blue, Violet), NO chip input visible.
    - Switch category to "Engraving" → chip input is visible, checkbox grid is hidden.
    - Switch back to "3D Prints" → grid reappears with no checks (fresh).
    - Check 3 colors (e.g., Black, White, Red), fill required fields, save.
    - Reopen the saved product → category = 3D Prints triggers via load path → grid shows those 3 boxes already checked.
    - In Supabase MCP `execute_sql`: `SELECT name, colors FROM products WHERE id = '<saved-id>'` → colors = `['Black','White','Red']` (text[]).
    - Edit a product that has 'Indigo' in colors (or temporarily UPDATE one row to test) → console shows `[staff] Ignoring unknown 3D Print color from DB: "Indigo"` warning, page does NOT crash, other known colors still pre-check.
    - Public 3D Prints page → cards with colors show small 16px circle swatches below the description, above the price.
    - Hover a swatch → tooltip with color name appears.
    - A White swatch is visible (has a thin gray border, not invisible).
    - A 3D Print product with empty/null `colors` array → no swatch row rendered (no empty `<div class="product-color-swatches">` in DOM — verify via DevTools).
    - Engraving, Party Decor, Party Rentals cards → no swatch row (only renderDynamicPrints3dProducts was modified).
    - Cache-bust: hard refresh → DevTools Network shows `ui.js?v=2026-05-21-13` requested 200, old `?v=2026-05-21` not in cache fallback.
    - Browser console: no JS errors throughout.
  </verify>
  <done>
- index.html, staff.js, products.js, styles.css all modified per the action steps.
- Staff portal toggles correctly between chip input (default) and 11-color checkbox grid (when category = 3D Prints).
- Saves write a JSON array of selected color names to products.colors.
- Edits pre-check the boxes from DB.colors and console.warn (no crash) on unknown values like 'Indigo'.
- Other categories' chip input is untouched in behavior.
- Public 3D Print cards render 16px circle swatches with hover tooltips and a visible-on-white border for the White swatch.
- Empty/null colors → no swatch row in DOM.
- ui.js cache-bust query string bumped so the new module graph is fetched on first reload.
  </done>
</task>

</tasks>

<verification>
End-to-end smoke test after both tasks:

1. Open site fresh (hard refresh; DevTools shows `ui.js?v=2026-05-21-13` fetched 200). Console clean throughout.
2. Staff portal — Add new 3D Print:
   - Category = 3D Prints → checkbox grid renders (11 colors), chip input hidden.
   - Select Black + Red + Gold → save → reopen the product → those 3 boxes checked.
   - Switch the same product's category to Engraving → grid hidden, chip input visible (with whatever chips were there before — likely empty unless DB has freeform chip values).
   - Switch back to 3D Prints → grid reappears with the 3 checks intact (the in-memory selection survives the toggle since we use checkbox state, not staffProductColors).
3. Staff portal — Edit existing product:
   - Open a 3D Print row that has `colors = ['Indigo','blue']` (or whatever the investigation found) → console shows ONE warn per unknown value, page renders, known values (if any) are pre-checked.
   - Save without changes → DB `colors` now contains only the known subset (e.g., if 'blue' lowercase is unknown, it's dropped; this is acceptable per spec "gracefully ignore unknown values").
4. Public 3D Prints page:
   - Cards with colors show colored swatches between description and price.
   - Hover → tooltip shows color name.
   - White swatch visible (gray border).
   - Cards with `colors = []` or `colors = null` → no swatch row in DOM.
5. Public Engraving / Party Decor / Party Rentals pages:
   - No swatch row on any card (untouched).
6. Cart logic unchanged — adding any product to cart still works.
7. Browser console clean (except for explicit `[staff]` warnings on unknown DB colors during edit).
</verification>

<success_criteria>
- All 2 tasks done states satisfied.
- All must_haves[truths] observable in the running app.
- DB schema unchanged (no migrations created in this plan).
- No console errors on any product page (warns from unknown colors during staff edit are intentional and expected).
- Cart, checkout, and non-3D-Print rendering paths untouched.
- ui.js cache-bust query string bumped so users see the new code on next load.
- Investigation findings from Task 1 documented in SUMMARY.
</success_criteria>

<output>
After completion, create `.planning/quick/13-add-multi-select-color-picker-for-3d-pri/13-SUMMARY.md` documenting:
- Files modified (with line ranges or section names).
- The PRINT_COLORS list (name → hex) added.
- Names of new functions added in staff.js (PRINT_COLORS, render3DPrintColorGrid, getSelected3DPrintColors, setSelected3DPrintColors, toggle3DPrintColorUI).
- The swatch-row insertion location in products.js (between description and price inside renderDynamicPrints3dProducts).
- The new CSS class set (.staff-3dprint-color-*, .product-color-swatches, .product-color-swatch, .product-color-swatch--white).
- Investigation findings from Task 1 (colors column type, distinct existing DB color values found, any unknown values that will be ignored on edit).
- New cache-bust value applied to ui.js.
- Confirmation: no DB migration, no cart change, no other-category color-logic change.
</output>
