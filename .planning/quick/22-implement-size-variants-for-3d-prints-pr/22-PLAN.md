---
phase: quick-22
plan: 22
type: execute
wave: 1
depends_on: []
files_modified:
  - products.js
  - staff.js
  - cart.js
  - index.html
  - styles.css
autonomous: true

must_haves:
  truths:
    - "products.js loadProducts SELECT string includes size_variants and the transform passes product.size_variants through to the in-memory products array"
    - "staff.js loadStaffProducts SELECT string includes size_variants and the map output sets size_variants on each staffProduct"
    - "When category === '3D Prints' in the staff modal, a 'Multi-size pricing' checkbox is visible; toggling it on reveals a wrapper div with a list of {size label, price} row pairs and an Add Row button"
    - "Adding a row appends a new {label, price} input pair; removing a row deletes that pair; values persist in a JS array between toggle hide/show within the same modal session"
    - "Editing an existing 3D Print product with non-empty size_variants pre-populates the multi-size toggle ON and renders one row per variant; products with null/empty size_variants leave the toggle OFF and the wrapper hidden"
    - "On save: if the multi-size toggle is ON AND category === '3D Prints' AND at least one valid {label, price} row exists, productData.size_variants is set to the array of rows AND productData.price is set to the LOWEST variant price"
    - "On save: if the multi-size toggle is OFF or category !== '3D Prints', productData.size_variants is set to null and productData.price is the manually-entered price (existing behavior unchanged)"
    - "Public 3D Prints grid card shows 'Starting at $X' (where X = lowest variant price) when product.size_variants is a non-empty array; falls back to existing $price display when size_variants is null/empty"
    - "Public 3D Prints product detail page renders a <select> size dropdown above the Add to Cart button when product.size_variants is non-empty; first option is a disabled 'Select a size' prompt"
    - "Add to Cart button on a sized 3D Print detail page is disabled until a size is selected; once selected, clicking it calls addSizedPrintToCart(product, sizeLabel, variantPrice)"
    - "addSizedPrintToCart constructs an item with name = 'Product Name (Size Label)' and price = variantPrice, then calls existing addToCart(itemObj) — name-based dedup means adding the same product+size twice shows 'Item already in cart!', but the same product with a DIFFERENT size adds as a separate line"
    - "3D Prints products WITHOUT size_variants render unchanged (existing Add to Cart button, existing single-price card)"
    - "index.html ui.js cache-bust query string is bumped to a new value to force module-graph refetch"
  artifacts:
    - path: "products.js"
      provides: "loadProducts SELECT includes size_variants; transform passes size_variants through; renderDynamicPrints3dProducts shows 'Starting at $X' when size_variants non-empty; renderProductDetail injects size dropdown + gated Add to Cart for 3D Prints with size_variants"
      contains: "size_variants"
    - path: "staff.js"
      provides: "loadStaffProducts SELECT includes size_variants; size_variants passed through to staffProducts; toggle3DPrintSizeVariantUI + render/get/set helpers; openStaffProductModal pre-fills on edit; handleStaffProductSubmit branch sets size_variants + lowest price"
      contains: "toggle3DPrintSizeVariantUI"
    - path: "cart.js"
      provides: "addSizedPrintToCart helper exported + bound on window; constructs cart item with name 'Product Name (Size Label)' and variant price; calls existing addToCart object overload (no refactor to addToCart itself)"
      contains: "addSizedPrintToCart"
    - path: "index.html"
      provides: "Multi-size toggle + wrapper + rows-container inside the staff product modal Price section (only revealed for 3D Prints); bumped ui.js cache-bust query string"
      contains: "staff-3dprint-size-variant-wrapper"
    - path: "styles.css"
      provides: "Styles for .staff-3dprint-size-variant-wrapper, .staff-size-variant-row, .staff-size-variant-add-btn, .staff-size-variant-remove-btn"
      contains: ".staff-size-variant-row"
  key_links:
    - from: "products.js loadProducts SELECT string"
      to: "in-memory products[i].size_variants"
      via: "fetch cols string includes 'size_variants' + transform map line passes p.size_variants through"
      pattern: "size_variants"
    - from: "staff.js handleStaffProductSubmit save path"
      to: "products.size_variants column + products.price column"
      via: "if multiSizeToggle.checked && category === '3D Prints': productData.size_variants = collected rows; productData.price = Math.min(...rows.map(r => r.price))"
      pattern: "size_variants"
    - from: "staff.js openStaffProductModal (edit path)"
      to: "rendered size variant rows + toggle ON state"
      via: "if product.size_variants && product.size_variants.length > 0: check toggle, render rows"
      pattern: "setSizeVariantRows"
    - from: "products.js renderProductDetail 3D Prints CTA branch"
      to: "cart.js addSizedPrintToCart"
      via: "size <select> onchange enables the Add to Cart button; button onclick reads selected option's data-price + data-label and calls addSizedPrintToCart(product, label, price)"
      pattern: "addSizedPrintToCart"
    - from: "cart.js addSizedPrintToCart"
      to: "cart.js addToCart (object overload)"
      via: "constructs {id, name: `${product.name} (${sizeLabel})`, price: variantPrice, category: '3D Prints', image} and calls addToCart(itemObj)"
      pattern: "addToCart\\("
---

<objective>
Implement the full size variants feature for 3D Prints products end-to-end: DB read-through, cart helper, staff form CRUD UI, and public render (grid "Starting at" + detail-page size dropdown). The `size_variants` JSONB column already exists in the products table (DEFAULT NULL).

Purpose: 3D Prints often come in multiple sizes at different price points (e.g., 4x4 at $8, 6x6 at $12). Staff need a controlled UI to define variant pricing per product, and customers need to pick a size before adding to cart. Cart identity stays name-based — variant lines look like "Product Name (4x4)" so each size dedups independently.

Output: Staff portal exposes a multi-size toggle for 3D Prints; saving writes JSONB array + sets main price to lowest variant; public grid cards show "Starting at $X" for products with variants; product detail page renders a size dropdown that gates the Add to Cart button and routes through `addSizedPrintToCart`.
</objective>

<execution_context>
@C:/Users/sammy/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/sammy/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@products.js
@staff.js
@cart.js
@index.html
@styles.css

Key reference points (read during planning — line numbers confirmed):

DB / read path:
- products.js line 32: `const cols = 'id,name,slug,category,sub_category,price,sale,emoji,featured,price_label,description,size,material,image_url';` — must add `,size_variants` to the end.
- products.js lines 41-58: transform `products.push(...dbProducts.map(p => ({...})))` — must add `size_variants: p.size_variants || null,` to the mapped object.
- staff.js line 243: `.select('id,name,slug,category,sub_category,price,price_label,cost,sale,discount_percent,description,emoji,featured,image_url,image_urls,sizes,colors')` — must add `,size_variants` to the end.
- staff.js lines 253-273: staffProducts map — must add `size_variants: p.size_variants || null,` to the mapped object.

Cart path:
- cart.js line 242: `export function addToCart(productNameOrObj)` — supports BOTH string (name lookup in products[]) AND object overload. Object overload (lines 257-265) builds `{id, name, price, category, image}`. Line 271 dedups by `cart.find(item => item.name === itemToAdd.name)`. We DO NOT modify addToCart; addSizedPrintToCart will call it with an object whose `name = 'Product Name (Size Label)'`.
- cart.js line 1333+ shows window.* bindings for cart functions (e.g., `window.addRentalToCart = addRentalToCart;`). Add `window.addSizedPrintToCart = addSizedPrintToCart;` near these so HTML inline onclicks can reach it.

Staff modal (mirror toggle3DPrintColorUI exactly):
- staff.js line 1227: `function openStaffProductModal(product = null)` — the load/reset path. Line 1235-1239 already shows the pattern for resetting per-product UI (staffProductImages, staffProductColors, render3DPrintColorGrid). Line 1266-1269 shows existing `sizes` handling. Line 1287: `toggle3DPrintColorUI(currentCategoryForModal);` — add `toggle3DPrintSizeVariantUI(currentCategoryForModal, product);` on the next line. Line 1289: `setSelected3DPrintColors(product ? (product.colors || []) : []);` — mirror with `setSizeVariantRows(product ? (product.size_variants || []) : []);` inside the 3D Prints branch.
- staff.js line 1697: `function toggle3DPrintColorUI(category)` — exact pattern to mirror for `toggle3DPrintSizeVariantUI`. Same shape: get wrapper element by id, show when category === '3D Prints', hide otherwise. Difference: the size variant wrapper has its OWN toggle checkbox inside it; reveal the wrapper containing toggle+rows, not always-on rows.
- staff.js line 1586: `function staffOnCategoryChange(cat)` — currently calls `populateSubCategoryOptions(cat, '')` + `toggle3DPrintColorUI(cat)`. Add `toggle3DPrintSizeVariantUI(cat, null)` on the next line.
- staff.js line 1370-1382: productData object built in handleStaffProductSubmit. Currently `price: parseFloat(...) || 0`. Add a branch BEFORE this object is built: if 3D Prints + toggle ON + rows valid, override `price` to lowest variant. Add `size_variants` field to productData (null when not applicable).

Staff modal HTML (index.html):
- index.html lines 2080-2090: Price + Price Label form-row. The multi-size toggle + wrapper go DIRECTLY AFTER this row (before the Sizes block at line 2113), so the variant pricing UI sits near the regular price input.
- index.html lines 2122-2134: existing Colors block (chip wrapper + 3dprint color wrapper) — mirror this structure (wrapper hidden by default, toggled via JS by category).
- index.html line 2347: cache-bust line `<script type="module" src="ui.js?v=2026-05-25-20"></script>`. Bump to `?v=2026-05-25-22`.

Public render:
- products.js line 189-240: `renderDynamicPrints3dProducts` builds card HTML. Line 231: `<div class="product-price product-price-bottom">$${(product.price || 0).toFixed(2)}</div>` — branch on `product.size_variants` non-empty to render "Starting at $X" instead.
- products.js line 465-597: `renderProductDetail`. Line 579-589 is the DEFAULT CTA branch (the `} else {` covering 3D Prints among other categories). Currently uses `addToCart('${product.name}')`. For 3D Prints with `product.size_variants`, render a different CTA block: a `<select>` with one option per variant, a disabled Add to Cart button that becomes enabled onchange.

Constraints (from task spec):
- DO NOT refactor cart identity model. Keep name-based dedup. The variant becomes part of the name string.
- DO NOT modify addToCart. addSizedPrintToCart is a NEW helper that calls existing addToCart object overload.
- DO NOT change the Engraving, Party Decor, Party Rentals, or non-3D-Print render paths.
- DO NOT add size variant UI for categories other than 3D Prints.
- DB column `size_variants` already exists (JSONB, DEFAULT NULL) — no migration in this plan.
- Lowest-price rule: when staff toggle is ON, productData.price = lowest variant price (so existing legacy code that reads product.price continues to show a sensible "starting" number even before variants UI exists everywhere).
</context>

<tasks>

<task type="auto">
  <name>Task 1: DB query updates — propagate size_variants from Supabase into products and staffProducts arrays</name>
  <files>products.js, staff.js</files>
  <action>
Two surgical edits to extend the SELECT columns and pass `size_variants` through the in-memory transforms. No new functions.

EDIT 1a — products.js line 32. Append `,size_variants` to the end of the cols string:

Currently:
```js
const cols = 'id,name,slug,category,sub_category,price,sale,emoji,featured,price_label,description,size,material,image_url';
```

Change to:
```js
const cols = 'id,name,slug,category,sub_category,price,sale,emoji,featured,price_label,description,size,material,image_url,size_variants';
```

EDIT 1b — products.js inside the transform (lines 41-58). Add `size_variants` to the mapped object. The cleanest insertion is right after `material: p.material,` (line 56) and before `hasGallery: true`:

Currently (line 55-57):
```js
            size: p.size,
            material: p.material,
            hasGallery: true
```

Change to:
```js
            size: p.size,
            material: p.material,
            size_variants: p.size_variants || null,
            hasGallery: true
```

EDIT 2a — staff.js line 243. Append `,size_variants` to the .select() string:

Currently:
```js
.select('id,name,slug,category,sub_category,price,price_label,cost,sale,discount_percent,description,emoji,featured,image_url,image_urls,sizes,colors');
```

Change to:
```js
.select('id,name,slug,category,sub_category,price,price_label,cost,sale,discount_percent,description,emoji,featured,image_url,image_urls,sizes,colors,size_variants');
```

EDIT 2b — staff.js inside loadStaffProducts map (lines 253-273). Add `size_variants` to the returned object. Insert right after the existing `colors: p.colors || []` line (line 271) and inside the closing brace:

Currently (lines 270-272):
```js
                sizes: p.sizes || [],
                colors: p.colors || []
            };
```

Change to:
```js
                sizes: p.sizes || [],
                colors: p.colors || [],
                size_variants: p.size_variants || null
            };
```

That's it for this task. No HTML, no CSS, no UI changes — only the data pipeline so subsequent tasks can rely on `product.size_variants` (public) and `staffProduct.size_variants` (staff) being populated.
  </action>
  <verify>
1. `grep -n "size_variants" products.js` → at least 2 matches (1 in cols string, 1 in transform).
2. `grep -n "size_variants" staff.js` → at least 2 matches (1 in .select() string, 1 in loadStaffProducts map).
3. Load the public site in a browser, open DevTools console, type: `JSON.parse(localStorage.getItem('whatever') || 'null'); fetch('https://nsedpvrqhxcikhlieize.supabase.co/rest/v1/products?select=id,name,size_variants&limit=3', {headers:{apikey:document.querySelector('script[src*=\"supabase\"]')}}).then(r=>r.json()).then(console.log)` — easier: just hard-refresh the site (after cache-bust in Task 4), then in console run `import('./products.js').then(m => console.log(m.products.slice(0,3).map(p => ({name:p.name, sv:p.size_variants}))))` — verify the size_variants field is present (likely null for now since no data has been written yet). Until cache-bust in Task 4 is also applied, this verification should be deferred to the end-to-end run.
4. Lighter intermediate check: open products.js in the editor, confirm the new lines exist verbatim as specified.
5. `git diff products.js staff.js` → only the 4 surgical edits above; no other changes.

COMMIT (atomic group a): After verification passes, commit with:
```
node C:/Users/sammy/.claude/get-shit-done/bin/gsd-tools.js commit "feat(quick-22): propagate size_variants from Supabase into products and staffProducts" --files products.js staff.js
```
  </verify>
  <done>
- products.js cols string includes `size_variants`.
- products.js transform includes `size_variants: p.size_variants || null`.
- staff.js .select() string includes `size_variants`.
- staff.js loadStaffProducts map includes `size_variants: p.size_variants || null`.
- Commit (a) created with message `feat(quick-22): propagate size_variants ...`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Cart helper — addSizedPrintToCart in cart.js (name-based, calls existing addToCart object overload)</name>
  <files>cart.js</files>
  <action>
Add a new exported helper `addSizedPrintToCart(product, sizeLabel, price)` to cart.js. KEEP existing `addToCart` untouched — the helper constructs a cart item object and passes it through the existing object overload. Cart dedup remains name-based (line 271: `cart.find(item => item.name === itemToAdd.name)`), so each "Product Name (Size Label)" is its own cart line.

EDIT 1 — cart.js. Insert the new function immediately AFTER the existing `addToCart` function definition (which ends at line 280 with `}`). Place it BEFORE the `refreshPartyRentalsGrid` comment block at line 282-290:

```js
// Add a 3D Print product with a selected size variant to the cart.
// Cart identity stays name-based — variant becomes part of the name.
// e.g., addSizedPrintToCart({name:'Mini Vase',...}, '4x4', 8) → cart item name 'Mini Vase (4x4)' at $8.
// Calls existing addToCart() object overload (no refactor of cart identity model).
export function addSizedPrintToCart(product, sizeLabel, price) {
    if (!product || !sizeLabel || typeof price !== 'number') {
        console.warn('[cart] addSizedPrintToCart: missing/invalid args', { product, sizeLabel, price });
        return;
    }
    const itemObj = {
        id: product.id || null,
        name: `${product.name} (${sizeLabel})`,
        price: price,
        category: product.category || '3D Prints',
        image: (product.images && product.images[0]) || product.image_url || null
    };
    addToCart(itemObj);
}
```

EDIT 2 — cart.js. Add a window binding so HTML inline `onclick="addSizedPrintToCart(...)"` works. Find the cluster of `window.* = ...` bindings (near line 1333 — e.g., `window.addRentalToCart = addRentalToCart;`, `window.addEngravingToCartFromDetail = addEngravingToCartFromDetail;`). Add right after `window.addRentalToCart = addRentalToCart;`:

```js
window.addSizedPrintToCart = addSizedPrintToCart;
```

DO NOT modify the existing `addToCart` function. DO NOT change name-based dedup. DO NOT add a new dedup field or composite key.

Behavioral notes (for the implementer to internalize):
- Same product + same size added twice → notification "Item already in cart!" (existing addToCart behavior).
- Same product + DIFFERENT size → second add creates a NEW cart line because the name string differs.
- Different products with the same size label (e.g., "Vase A (4x4)" and "Vase B (4x4)") → two cart lines (names differ).
  </action>
  <verify>
1. `grep -n "export function addSizedPrintToCart" cart.js` → 1 match.
2. `grep -n "window.addSizedPrintToCart" cart.js` → 1 match.
3. `grep -c "addToCart(itemObj)" cart.js` → at least 1 (the call inside addSizedPrintToCart).
4. `grep -n "export function addToCart" cart.js` → still 1 match (addToCart not duplicated, not removed).
5. Functional smoke (after Task 4 cache-bust): open browser console, run:
   ```
   window.addSizedPrintToCart({id:'test', name:'Test Print', category:'3D Prints'}, '4x4', 8);
   JSON.parse(localStorage.getItem('partyPalaceCart')).find(i => i.name === 'Test Print (4x4)');
   ```
   → cart item exists with price 8.
6. Repeat the call → notification says "Item already in cart!" (proves name-based dedup works for same product+size).
7. Run with different size: `window.addSizedPrintToCart({id:'test', name:'Test Print', category:'3D Prints'}, '6x6', 12);` → second cart line added (proves different sizes are separate lines).
8. Cleanup test items: `localStorage.removeItem('partyPalaceCart'); location.reload();`

COMMIT (atomic group b): After verification passes, commit with:
```
node C:/Users/sammy/.claude/get-shit-done/bin/gsd-tools.js commit "feat(quick-22): add addSizedPrintToCart helper for size-variant cart lines" --files cart.js
```
  </verify>
  <done>
- `addSizedPrintToCart` exported from cart.js and bound on window.
- Implementation builds an itemObj with name = "${product.name} (${sizeLabel})" and calls existing addToCart(itemObj).
- Existing addToCart is byte-for-byte unchanged.
- Smoke test confirms: same-size-twice dedups; different-size adds as separate line.
- Commit (b) created with message `feat(quick-22): add addSizedPrintToCart ...`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Staff form — toggle3DPrintSizeVariantUI + row CRUD + load/save integration (mirrors toggle3DPrintColorUI pattern)</name>
  <files>index.html, staff.js, styles.css</files>
  <action>
Add the multi-size pricing UI to the staff product modal. Mirror the `toggle3DPrintColorUI` pattern EXACTLY:
- A wrapper `<div>` hidden by default (`style="display:none;"`).
- A toggle function that shows the wrapper when category === '3D Prints', hides otherwise.
- Companion helpers for render / get / set.
- Integration into `staffOnCategoryChange`, `openStaffProductModal` (load+reset), and `handleStaffProductSubmit` (save).

EDIT 1 — index.html. Insert the multi-size pricing block DIRECTLY AFTER the existing Price + Price Label form-row (which ends at line 2090 with `</div>` closing the staff-form-row). Insert BEFORE the Sizes form-group at line 2113.

Add this block (use the exact ids — staff.js looks them up by id):

```html
                <!-- Multi-size pricing (3D Prints only) -->
                <div id="staff-3dprint-size-variant-wrapper" class="staff-form-group" style="display:none;">
                    <label class="staff-checkbox-label">
                        <input type="checkbox" id="staff-3dprint-multisize-toggle" onchange="onMultiSizeToggleChange(this.checked)">
                        Multi-size pricing (each size has its own price)
                    </label>
                    <div id="staff-3dprint-size-variant-body" style="display:none; margin-top: 0.75rem;">
                        <div id="staff-3dprint-size-variant-rows"></div>
                        <button type="button" class="staff-size-variant-add-btn" onclick="addSizeVariantRow()">+ Add Size</button>
                        <p style="font-size: 0.85rem; color: #6b7280; margin-top: 0.5rem;">When saved, the main Price field above will be set to the lowest variant price (used as the "Starting at" display).</p>
                    </div>
                </div>
```

EDIT 2 — staff.js. Add the size-variant section. Insert the entire block at the END of the file (or immediately after `window.toggle3DPrintColorUI = toggle3DPrintColorUI;` at line 1713 to keep it adjacent to its sibling pattern):

```js
// ============================================
// 3D PRINT SIZE VARIANTS (multi-size pricing)
// ============================================

// In-memory rows so toggling hide/show within a modal session preserves entries.
let staffSizeVariantRows = []; // [{label: string, price: number}]

function renderSizeVariantRows() {
    const container = document.getElementById('staff-3dprint-size-variant-rows');
    if (!container) return;
    container.innerHTML = staffSizeVariantRows.map((row, idx) => `
        <div class="staff-size-variant-row" data-idx="${idx}">
            <input type="text" class="staff-size-variant-label" placeholder="Size label (e.g., 4x4)" value="${(row.label || '').replace(/"/g, '&quot;')}" oninput="onSizeVariantInput(${idx}, 'label', this.value)">
            <input type="number" class="staff-size-variant-price" min="0" step="0.01" placeholder="Price" value="${row.price != null ? row.price : ''}" oninput="onSizeVariantInput(${idx}, 'price', this.value)">
            <button type="button" class="staff-size-variant-remove-btn" onclick="removeSizeVariantRow(${idx})" aria-label="Remove row">&times;</button>
        </div>
    `).join('');
}
window.renderSizeVariantRows = renderSizeVariantRows;

function addSizeVariantRow() {
    staffSizeVariantRows.push({ label: '', price: null });
    renderSizeVariantRows();
}
window.addSizeVariantRow = addSizeVariantRow;

function removeSizeVariantRow(idx) {
    staffSizeVariantRows.splice(idx, 1);
    renderSizeVariantRows();
}
window.removeSizeVariantRow = removeSizeVariantRow;

function onSizeVariantInput(idx, field, value) {
    if (!staffSizeVariantRows[idx]) return;
    if (field === 'label') {
        staffSizeVariantRows[idx].label = value;
    } else if (field === 'price') {
        const parsed = parseFloat(value);
        staffSizeVariantRows[idx].price = isNaN(parsed) ? null : parsed;
    }
    // No re-render — we don't want to lose input focus on every keystroke.
}
window.onSizeVariantInput = onSizeVariantInput;

function getSizeVariantRows() {
    // Return only valid rows: label non-empty AND price is a positive number.
    return staffSizeVariantRows
        .map(r => ({ label: (r.label || '').trim(), price: r.price }))
        .filter(r => r.label.length > 0 && typeof r.price === 'number' && r.price > 0);
}
window.getSizeVariantRows = getSizeVariantRows;

function setSizeVariantRows(variants) {
    staffSizeVariantRows = Array.isArray(variants) ? variants.map(v => ({
        label: String(v.label || ''),
        price: typeof v.price === 'number' ? v.price : (parseFloat(v.price) || null)
    })) : [];
    renderSizeVariantRows();
}
window.setSizeVariantRows = setSizeVariantRows;

function onMultiSizeToggleChange(checked) {
    const body = document.getElementById('staff-3dprint-size-variant-body');
    if (!body) return;
    body.style.display = checked ? '' : 'none';
    if (checked && staffSizeVariantRows.length === 0) {
        // Seed with one empty row so staff sees the input fields immediately.
        addSizeVariantRow();
    }
}
window.onMultiSizeToggleChange = onMultiSizeToggleChange;

function toggle3DPrintSizeVariantUI(category, product) {
    const wrapper = document.getElementById('staff-3dprint-size-variant-wrapper');
    const toggle = document.getElementById('staff-3dprint-multisize-toggle');
    const body = document.getElementById('staff-3dprint-size-variant-body');
    if (!wrapper || !toggle || !body) return;
    if (category === '3D Prints') {
        wrapper.style.display = '';
        // If editing a product with size_variants, turn toggle ON and pre-render rows.
        const variants = (product && Array.isArray(product.size_variants)) ? product.size_variants : [];
        if (variants.length > 0) {
            toggle.checked = true;
            body.style.display = '';
            setSizeVariantRows(variants);
        } else {
            toggle.checked = false;
            body.style.display = 'none';
            setSizeVariantRows([]);
        }
    } else {
        wrapper.style.display = 'none';
        toggle.checked = false;
        body.style.display = 'none';
        setSizeVariantRows([]);
    }
}
window.toggle3DPrintSizeVariantUI = toggle3DPrintSizeVariantUI;
```

EDIT 3 — staff.js, wire the toggle into `staffOnCategoryChange` (line 1586). Currently:
```js
function staffOnCategoryChange(cat) {
    populateSubCategoryOptions(cat, '');
    toggle3DPrintColorUI(cat);
}
```
Change to:
```js
function staffOnCategoryChange(cat) {
    populateSubCategoryOptions(cat, '');
    toggle3DPrintColorUI(cat);
    toggle3DPrintSizeVariantUI(cat, null);
}
```

EDIT 4 — staff.js, wire the toggle into `openStaffProductModal` (line 1287). Currently:
```js
    toggle3DPrintColorUI(currentCategoryForModal);
    if (currentCategoryForModal === '3D Prints') {
        setSelected3DPrintColors(product ? (product.colors || []) : []);
    } else {
        renderColorChips();
    }
```
Insert ONE line right after `toggle3DPrintColorUI(currentCategoryForModal);`:
```js
    toggle3DPrintColorUI(currentCategoryForModal);
    toggle3DPrintSizeVariantUI(currentCategoryForModal, product);
    if (currentCategoryForModal === '3D Prints') {
```
This handles both the new-product reset case (product=null → toggle OFF, rows empty) and the edit case (product with size_variants → toggle ON, rows pre-populated).

EDIT 5 — staff.js, wire size_variants + lowest-price into the save path (handleStaffProductSubmit, line 1365-1382 productData block). Currently:
```js
        const productData = {
            name,
            slug,
            category,
            sub_category: subCategory,
            price: parseFloat(document.getElementById('staff-product-price').value) || 0,
            price_label: document.getElementById('staff-product-price-label').value || 'Starting at',
            cost: parseFloat(document.getElementById('staff-product-cost').value) || 0,
            sale: document.getElementById('staff-product-sale').checked,
            discount_percent: discountValue ? parseInt(discountValue) : null,
            description: document.getElementById('staff-product-description').value,
            emoji: document.getElementById('staff-product-emoji').value,
            featured: document.getElementById('staff-product-featured').checked,
            image_url: imageUrls[0] || null,
            image_urls: imageUrls,
            sizes,
            colors: (category === '3D Prints') ? getSelected3DPrintColors() : [...staffProductColors]
        };
```

Change to compute the multi-size branch FIRST, then build productData. Replace the block above with:
```js
        // Compute size_variants + price override for 3D Prints with multi-size toggle ON
        const multiSizeToggle = document.getElementById('staff-3dprint-multisize-toggle');
        const isMultiSize = !!(multiSizeToggle && multiSizeToggle.checked && category === '3D Prints');
        const validVariants = isMultiSize ? getSizeVariantRows() : [];
        const useVariants = isMultiSize && validVariants.length > 0;
        const manualPrice = parseFloat(document.getElementById('staff-product-price').value) || 0;
        const effectivePrice = useVariants
            ? Math.min(...validVariants.map(v => v.price))
            : manualPrice;

        const productData = {
            name,
            slug,
            category,
            sub_category: subCategory,
            price: effectivePrice,
            price_label: document.getElementById('staff-product-price-label').value || 'Starting at',
            cost: parseFloat(document.getElementById('staff-product-cost').value) || 0,
            sale: document.getElementById('staff-product-sale').checked,
            discount_percent: discountValue ? parseInt(discountValue) : null,
            description: document.getElementById('staff-product-description').value,
            emoji: document.getElementById('staff-product-emoji').value,
            featured: document.getElementById('staff-product-featured').checked,
            image_url: imageUrls[0] || null,
            image_urls: imageUrls,
            sizes,
            colors: (category === '3D Prints') ? getSelected3DPrintColors() : [...staffProductColors],
            size_variants: useVariants ? validVariants : null
        };
```

Behavior summary:
- 3D Prints + toggle ON + ≥1 valid row → size_variants = rows array, price = lowest variant.
- 3D Prints + toggle ON + 0 valid rows → size_variants = null, price = manually-entered (graceful fallback, no save error).
- 3D Prints + toggle OFF → size_variants = null, price = manually-entered.
- Other categories → size_variants = null (always), price = manually-entered.

EDIT 6 — styles.css. Append at end of file:

```css
/* 3D Prints size variants (staff portal) */
#staff-3dprint-size-variant-wrapper {
    border-top: 1px dashed #e5e7eb;
    padding-top: 0.75rem;
    margin-top: 0.5rem;
}
.staff-size-variant-row {
    display: grid;
    grid-template-columns: 1fr 120px 32px;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
    align-items: center;
}
.staff-size-variant-label,
.staff-size-variant-price {
    padding: 0.5rem 0.6rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
}
.staff-size-variant-add-btn {
    margin-top: 0.25rem;
    padding: 0.4rem 0.8rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    color: #374151;
}
.staff-size-variant-add-btn:hover {
    background: #e5e7eb;
}
.staff-size-variant-remove-btn {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
}
.staff-size-variant-remove-btn:hover {
    color: #ef4444;
}
```

Do NOT alter color-picker styles or any other CSS.
  </action>
  <verify>
1. `grep -n "staff-3dprint-size-variant-wrapper" index.html` → 1 match.
2. `grep -n "staff-3dprint-multisize-toggle" index.html` → 1 match.
3. `grep -n "addSizeVariantRow\|removeSizeVariantRow\|setSizeVariantRows\|getSizeVariantRows" staff.js` → at least 4 matches (one per function definition).
4. `grep -n "toggle3DPrintSizeVariantUI" staff.js` → at least 4 matches (definition + window export + staffOnCategoryChange call + openStaffProductModal call).
5. `grep -n "size_variants:" staff.js` → at least 1 match (in productData object).
6. `grep -n "Math.min" staff.js` → at least 1 match (in handleStaffProductSubmit lowest-price calc).
7. `grep -n "staff-size-variant-row" styles.css` → 1 match.
8. Functional smoke (after Task 4 cache-bust + hard refresh):
   a. Staff portal → Add Item → category = "3D Prints" → "Multi-size pricing" checkbox visible, body hidden.
   b. Check the toggle → first empty row appears.
   c. Click "+ Add Size" → second row appears.
   d. Enter row 1: label "4x4", price 8. Row 2: label "6x6", price 12. Remove button removes a row.
   e. Re-add the rows. Fill other required fields (name, sub_category, image, etc.), save.
   f. In Supabase MCP: `SELECT name, price, size_variants FROM products WHERE name = '<saved-name>';` → size_variants = `[{"label":"4x4","price":8},{"label":"6x6","price":12}]`, price = 8 (lowest).
   g. Reopen the saved product → toggle is ON, rows pre-populated with "4x4 @ $8" and "6x6 @ $12".
   h. Uncheck the toggle, save again → DB shows size_variants = null, price = manually-entered value (whatever was in the price input field at save time).
   i. Switch category to "Engraving" mid-edit → wrapper disappears, toggle clears.
   j. Switch back to "3D Prints" → wrapper reappears, toggle OFF (fresh state).

COMMIT (atomic group c): After verification passes, commit with:
```
node C:/Users/sammy/.claude/get-shit-done/bin/gsd-tools.js commit "feat(quick-22): staff portal multi-size variant pricing UI for 3D Prints" --files index.html staff.js styles.css
```
  </verify>
  <done>
- index.html has the multi-size toggle + wrapper + rows container + add button inside a hidden form-group.
- staff.js has the full helper set (toggle3DPrintSizeVariantUI, render/add/remove/set/get rows, onMultiSizeToggleChange, onSizeVariantInput) mirroring toggle3DPrintColorUI shape.
- staffOnCategoryChange + openStaffProductModal both call the new toggle.
- handleStaffProductSubmit writes size_variants to productData and overrides price to the lowest variant when applicable.
- styles.css has the new size-variant row/button styles.
- Saving with the toggle ON writes JSONB array + sets price = lowest. Toggle OFF or non-3D-Prints behaves unchanged.
- Editing a product with size_variants pre-populates the toggle ON and rows in.
- Commit (c) created with message `feat(quick-22): staff portal multi-size variant pricing UI ...`.
  </done>
</task>

<task type="auto">
  <name>Task 4: Public render — grid "Starting at $X" + detail-page size dropdown gating Add to Cart + cache-bust</name>
  <files>products.js, index.html</files>
  <action>
Two render changes plus the cache-bust query string bump. The grid card shows "Starting at $X" for products with size_variants; the detail page renders a size dropdown that gates the Add to Cart button.

EDIT 1 — products.js `renderDynamicPrints3dProducts` (line 189-240). Compute the displayed price string from size_variants when present. Insert a helper computation BEFORE the `card.innerHTML = ...` template literal (around line 218-221, right after `const swatchesHTML = ...` ends and BEFORE `const card = document.createElement('div');`):

```js
        // Price display: prefer "Starting at $X" using lowest variant when size_variants is non-empty
        const sv = Array.isArray(product.size_variants) ? product.size_variants : [];
        const validSv = sv.filter(v => v && typeof v.price === 'number' && v.price > 0);
        const priceDisplayHTML = validSv.length > 0
            ? `<div class="product-price product-price-bottom">Starting at $${Math.min(...validSv.map(v => v.price)).toFixed(2)}</div>`
            : `<div class="product-price product-price-bottom">$${(product.price || 0).toFixed(2)}</div>`;
```

Then in the card.innerHTML template literal, replace the existing price line. Currently (line 231):
```js
                <div class="product-price product-price-bottom">$${(product.price || 0).toFixed(2)}</div>
```
Change to:
```js
                ${priceDisplayHTML}
```

EDIT 2 — products.js `renderProductDetail` (line 465-597). The current default CTA branch (line 579-589) covers 3D Prints with this block:
```js
                ` : `
                <div class="product-detail-cta">
                    <button onclick="addToCart('${product.name}')" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <svg ...>...</svg>
                        Add to Cart
                    </button>
                    <button onclick="bookConsultation('${product.name}', ${product.price})" class="btn btn-outline" style="margin-top: 0.75rem;">
                        Book Free Consultation
                    </button>
                </div>
                `}
```

Replace this default branch with one that conditionally renders the size dropdown for 3D Prints with size_variants. Build the dropdown HTML before the template literal so the substitution stays clean.

Insert this BEFORE `container.innerHTML = \`...\`;` (around line 511, after `const features = getProductFeatures(product);`):

```js
    // Size variant CTA (3D Prints with size_variants non-empty)
    const detailSv = Array.isArray(product.size_variants) ? product.size_variants : [];
    const detailValidSv = detailSv.filter(v => v && typeof v.price === 'number' && v.price > 0 && v.label);
    const hasSizeVariants = detailValidSv.length > 0;
    const sizeVariantCtaHTML = hasSizeVariants ? `
                <div class="product-detail-cta">
                    <div style="margin-bottom: 1rem;">
                        <label for="detailSizeVariantSelect" style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Choose a size</label>
                        <select id="detailSizeVariantSelect" onchange="onSizeVariantDetailChange()" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; background-color: #fff;">
                            <option value="" disabled selected>-- Select a size --</option>
                            ${detailValidSv.map((v, i) => `<option value="${i}" data-label="${String(v.label).replace(/"/g, '&quot;')}" data-price="${v.price}">${String(v.label)} — $${v.price.toFixed(2)}</option>`).join('')}
                        </select>
                    </div>
                    <button id="detailSizeVariantAddBtn" disabled onclick="addSelectedSizedPrint('${product.slug || ''}')" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; opacity: 0.5; cursor: not-allowed;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        Add to Cart
                    </button>
                </div>
            ` : null;
```

Then in the existing template literal, change the default branch (currently at line 579-589) to choose between size-variant CTA and the original CTA. Replace the existing block:
```js
                ` : `
                <div class="product-detail-cta">
                    <button onclick="addToCart('${product.name}')" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <svg ...>...</svg>
                        Add to Cart
                    </button>
                    <button onclick="bookConsultation('${product.name}', ${product.price})" class="btn btn-outline" style="margin-top: 0.75rem;">
                        Book Free Consultation
                    </button>
                </div>
                `}
```

with:
```js
                ` : hasSizeVariants ? sizeVariantCtaHTML : `
                <div class="product-detail-cta">
                    <button onclick="addToCart('${product.name}')" class="btn btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        Add to Cart
                    </button>
                    <button onclick="bookConsultation('${product.name}', ${product.price})" class="btn btn-outline" style="margin-top: 0.75rem;">
                        Book Free Consultation
                    </button>
                </div>
                `}
```

(Note: preserve the existing SVG attributes verbatim — copy them from the file rather than re-typing if line wrapping differs.)

EDIT 3 — products.js. Add two helper functions to handle the dropdown's onchange and the Add to Cart click. Insert them just AFTER `renderProductDetail` ends (around line 597, right before `// Change main product image`):

```js
// Size variant detail page: enable/disable Add to Cart based on selection
export function onSizeVariantDetailChange() {
    const sel = document.getElementById('detailSizeVariantSelect');
    const btn = document.getElementById('detailSizeVariantAddBtn');
    if (!sel || !btn) return;
    const hasSelection = sel.value !== '';
    btn.disabled = !hasSelection;
    btn.style.opacity = hasSelection ? '1' : '0.5';
    btn.style.cursor = hasSelection ? 'pointer' : 'not-allowed';
}
window.onSizeVariantDetailChange = onSizeVariantDetailChange;

// Size variant detail page: read selected option and call addSizedPrintToCart
export function addSelectedSizedPrint(slug) {
    const sel = document.getElementById('detailSizeVariantSelect');
    if (!sel || sel.value === '') return;
    const opt = sel.options[sel.selectedIndex];
    const label = opt.getAttribute('data-label');
    const price = parseFloat(opt.getAttribute('data-price'));
    const product = products.find(p => (p.slug || '') === slug || p.name === slug);
    if (!product || !label || isNaN(price)) {
        console.warn('[products] addSelectedSizedPrint: missing data', { slug, label, price, product });
        return;
    }
    if (typeof window.addSizedPrintToCart === 'function') {
        window.addSizedPrintToCart(product, label, price);
    } else {
        console.warn('[products] addSizedPrintToCart not on window');
    }
}
window.addSelectedSizedPrint = addSelectedSizedPrint;
```

EDIT 4 — index.html cache-bust. Line 2347 currently:
```html
<script type="module" src="ui.js?v=2026-05-25-20"></script>
```
Change to:
```html
<script type="module" src="ui.js?v=2026-05-25-22"></script>
```
(Bumping ui.js cascades to all ES module imports including products.js, staff.js, cart.js — the entire module graph refetches.)
  </action>
  <verify>
1. `grep -n "Starting at" products.js` → at least 1 match in renderDynamicPrints3dProducts.
2. `grep -n "size_variants" products.js` → at least 4 matches (cols string, transform, grid render, detail render).
3. `grep -n "detailSizeVariantSelect" products.js` → at least 2 matches (in dropdown HTML + helper functions).
4. `grep -n "export function addSelectedSizedPrint" products.js` → 1 match.
5. `grep -n "export function onSizeVariantDetailChange" products.js` → 1 match.
6. `grep -n "ui.js?v=2026-05-25-22" index.html` → 1 match.
7. `grep -n "ui.js?v=2026-05-25-20" index.html` → 0 matches (old query string gone).
8. Functional smoke (hard refresh — new cache-bust forces module-graph refetch):
   a. Open public site → 3D Prints page. Find a product with size_variants set from Task 3's smoke test (e.g., 4x4/$8 + 6x6/$12). Card shows "Starting at $8.00".
   b. Click into product detail → CTA block shows a "Choose a size" select with "-- Select a size --" disabled + "4x4 — $8.00" + "6x6 — $12.00" options. Add to Cart is disabled, grayed out.
   c. Select "4x4 — $8.00" → Add to Cart becomes enabled (full opacity, pointer cursor).
   d. Click Add to Cart → notification "Mini Vase (4x4) added to cart!" → cart icon updates.
   e. Open cart → line item "Mini Vase (4x4)" at $8.
   f. Back to detail page → select "6x6 — $12.00" → Add to Cart → cart shows two lines: "Mini Vase (4x4)" $8 AND "Mini Vase (6x6)" $12.
   g. Try "4x4" again → notification "Item already in cart!" (name-based dedup).
   h. Find a 3D Print product WITHOUT size_variants → grid shows the regular `$X.XX` price (no "Starting at"), detail page shows the original Add to Cart button (no size dropdown), clicking it adds to cart with the plain product name.
   i. Non-3D-Print categories (Engraving, Party Decor, Party Rentals) render unchanged.
   j. Browser console clean — no JS errors, no missing-function warnings.

COMMIT (atomic group d): After verification passes, commit with:
```
node C:/Users/sammy/.claude/get-shit-done/bin/gsd-tools.js commit "feat(quick-22): public 3D Prints size dropdown + 'Starting at' grid price + cache-bust v=2026-05-25-22" --files products.js index.html
```
  </verify>
  <done>
- products.js renderDynamicPrints3dProducts shows "Starting at $X" when size_variants non-empty; original price string otherwise.
- products.js renderProductDetail injects a size <select> + disabled Add to Cart for 3D Prints with size_variants; original CTA preserved for products without variants and other categories.
- onSizeVariantDetailChange + addSelectedSizedPrint helpers added and bound on window.
- index.html cache-bust bumped to ?v=2026-05-25-22.
- Smoke test passes end-to-end: select size → enables button → adds to cart with "(SizeLabel)" suffixed name → different size adds as new line → same size dedups.
- Commit (d) created with message `feat(quick-22): public 3D Prints size dropdown ...`.
  </done>
</task>

</tasks>

<verification>
End-to-end smoke test after all 4 tasks (and all 4 atomic commits):

1. Hard refresh public site (DevTools Network shows `ui.js?v=2026-05-25-22` fetched 200, no stale 20). Console clean.
2. Staff portal end-to-end:
   - Add new 3D Print product, fill required fields, leave Multi-size pricing OFF, save → DB row: size_variants = NULL, price = manually-entered value. Public grid card shows `$X.XX`. Detail page shows original Add to Cart (no dropdown).
   - Edit same product, toggle Multi-size ON, add rows "Small/$5", "Medium/$8", "Large/$12", save → DB row: size_variants = `[{label:"Small",price:5},{label:"Medium",price:8},{label:"Large",price:12}]`, price = 5. Public grid card now shows "Starting at $5.00".
   - Detail page now shows the size dropdown. Add to Cart disabled until selection.
   - Select Medium → enabled. Click → cart line "Product Name (Medium)" at $8.
   - Add Small → cart line "Product Name (Small)" at $5 (separate line).
   - Try Medium again → "Item already in cart!" (name dedup).
   - Edit the product again, uncheck Multi-size, save → DB row: size_variants = NULL, price = whatever was in the price input field. Public grid + detail revert to original single-price UI.
3. Other categories (Engraving, Party Decor, Party Rentals):
   - Staff modal does NOT show the Multi-size pricing wrapper.
   - Public grid + detail render exactly as before (no "Starting at", no size dropdown).
4. Cart end-to-end:
   - Multiple sized 3D Print lines coexist with rentals, engraving, decor in cart.
   - Checkout flow (proceed to checkout, order placement) works with the new cart line shape — no parser anywhere breaks on a name containing ` (4x4)`.
5. Git log: four atomic commits in order, each tagged `feat(quick-22): ...`.
</verification>

<success_criteria>
- All 4 tasks done states satisfied.
- All must_haves[truths] observable in the running app.
- DB column `size_variants` populated (JSONB array) when staff toggle is ON, NULL when OFF.
- products.price always reflects the lowest variant price when the toggle is ON (used for any legacy "starting at" display elsewhere).
- Cart identity model unchanged — addToCart is byte-for-byte untouched, name-based dedup intact.
- No console errors on staff portal, public grid, public detail, or cart.
- Engraving, Party Decor, Party Rentals untouched (visual + behavioral).
- ui.js cache-bust query string bumped (?v=2026-05-25-22) so all module-graph code refetches on next load.
- 4 atomic commits in git log, one per task.
</success_criteria>

<output>
After completion, create `.planning/quick/22-implement-size-variants-for-3d-prints-pr/22-SUMMARY.md` documenting:
- Files modified per task (with line ranges or section names).
- New functions added in cart.js (addSizedPrintToCart), staff.js (toggle3DPrintSizeVariantUI, addSizeVariantRow, removeSizeVariantRow, setSizeVariantRows, getSizeVariantRows, onSizeVariantInput, onMultiSizeToggleChange, renderSizeVariantRows), and products.js (onSizeVariantDetailChange, addSelectedSizedPrint).
- The CSS class set added (.staff-size-variant-row, .staff-size-variant-label, .staff-size-variant-price, .staff-size-variant-add-btn, .staff-size-variant-remove-btn).
- The lowest-price rule: how productData.price is computed when toggle is ON.
- Cart identity model decision: name-based dedup preserved; variant becomes a name suffix `Product (Label)`.
- Cache-bust value applied to ui.js (`?v=2026-05-25-22`).
- Confirmation: no DB migration, addToCart untouched, no changes to non-3D-Print render paths.
- Four atomic commits referenced by hash.
</output>
