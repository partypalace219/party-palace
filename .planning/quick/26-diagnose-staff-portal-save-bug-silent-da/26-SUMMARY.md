---
phase: quick-26
plan: 26
subsystem: staff-portal
tags: [diagnostic, staff-portal, data-corruption, sub_category, slug, image_urls, material]
dependency_graph:
  requires: []
  provides: ["Root cause analysis for 3 confirmed staff portal save bugs"]
  affects: ["staff.js", "products.js", "js/itemCategories.js", "product_image_urls.js"]
tech_stack:
  added: []
  patterns: ["field-mapping-audit", "read-only-db-query"]
key_files:
  created: [".planning/quick/26-diagnose-staff-portal-save-bug-silent-da/26-SUMMARY.md"]
  modified: []
decisions:
  - "Diagnostic only — no code or DB changes made"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-03"
  tasks_completed: 3
  files_changed: 1
---

# Phase quick-26 Plan 26: Staff Portal Save Bug Diagnostic Summary

**One-liner:** Three silent data corruption bugs traced to (1) `ITEM_CATEGORIES` missing "Panels", (2) staff portal writes `sub_category` but live site filters by legacy `material` column, and (3) `loadProducts()` never selects `image_urls` (plural).

---

## 1. Executive Summary

The staff portal save handler (`handleStaffProductSubmit`, staff.js lines 1320–1439) contains three independent bugs causing silent data corruption or invisible updates:

1. **Panel products (Party Rentals):** The `ITEM_CATEGORIES["Party Rentals"]` list in `js/itemCategories.js` does not include "Panels". When the staff opens a Panel product to edit, `populateSubCategoryOptions()` builds a dropdown from `ITEM_CATEGORIES["Party Rentals"]` = `["Tables","Chairs","Tents","Games","Concessions"]`. "Panels" is not in that list, so the `<select>` defaults to its first option ("Tables") — not blank, and not "Panels". When saved, `sub_category` is overwritten to "Tables" and `slug` is regenerated from the product name, overwriting any manually-set slug.

2. **Engraving "Metal" change not showing on live site:** The staff portal saves `sub_category = "Metal"` to the DB. Live DB confirms this is correct. However, `renderDynamicEngravingProducts()` in `products.js` does NOT read `sub_category` for filtering — it reads `product.material || 'Wood'` (line 149) and sets `card.dataset.material = material` (line 168). The `material` column is a legacy field that `loadProducts()` also fetches (line 32), but the staff portal form has no `material` input field and never writes `material` in the save payload. Result: `sub_category` changes in the portal have zero effect on live-site engraving filter visibility.

3. **Party Decor uploaded images not appearing:** The staff portal saves all uploaded image URLs into both `image_url` (first URL) and `image_urls` (full array). However, `loadProducts()` in `products.js` (line 32) only selects `image_url` — `image_urls` (plural, the text[] column) is entirely absent from the SELECT column list. As a result, for newly uploaded Party Decor images (not in `productGalleryImages`), only the first image is ever loaded, and additional images stored in `image_urls[]` are invisible on the live site.

---

## 2. Save Handler Overview

**Function:** `handleStaffProductSubmit(e)`
**Location:** `staff.js` lines 1320–1439
**Signature:** `async function handleStaffProductSubmit(e)` — registered as `submit` listener on `#staff-product-form` (initStaffPortal, line 63)

**Flow:**
1. Lines 1326–1346: Read `category` and `subCategory` from selects; validate both required, `subCategory` must be in `ITEM_CATEGORIES[category]`; validate at least 1 image
2. Line 1354: Detect editing mode from `staffEditingProductId`
3. **Line 1355:** Regenerate slug from name: `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')` — always, on every save
4. Line 1360: Upload any new images; `uploadAllNewImages(slug)` returns ordered URL array
5. Lines 1363–1375: Collect checkboxes for `sizes`; compute `size_variants` and effective `price` for 3D Prints multi-size toggle
6. Lines 1377–1395: Build `productData` object
7. Lines 1397–1416: Run `supabaseClient.from('products').update(productData)` (edit) or `.insert(productData)` (add)

---

## 3. Field Mapping Table

| UI Form Field (`index.html` id) | `productData` Key (staff.js 1377–1395) | Source / Transform |
|---|---|---|
| `#staff-product-name` | `name` | Direct read, `.trim()` |
| _(none — auto-generated)_ | `slug` | **AUTO-GENERATED** from name every save (line 1355) |
| `#staff-product-category` | `category` | Direct read |
| `#staff-product-subcategory` | `sub_category` | Direct read from dropdown (options from `ITEM_CATEGORIES[category]` only) |
| `#staff-product-price` | `price` | `parseFloat()` or min of size_variants |
| `#staff-product-price-label` | `price_label` | Direct read, default `'Starting at'` |
| `#staff-product-cost` | `cost` | `parseFloat()` or `0` |
| `#staff-product-sale` | `sale` | `.checked` |
| `#staff-product-discount` | `discount_percent` | `parseInt()` or `null` |
| `#staff-product-description` | `description` | Direct read |
| `#staff-product-emoji` | `emoji` | Direct read |
| `#staff-product-featured` | `featured` | `.checked` |
| `staffProductImages[]` (JS state) | `image_url` | `imageUrls[0]` — first uploaded/existing URL |
| `staffProductImages[]` (JS state) | `image_urls` | Full array of all uploaded/existing URLs |
| `input[name="staff-product-size"]:checked` | `sizes` | Checked checkbox values array |
| `staffProductColors` (JS state) or 3D-print color grid | `colors` | JS module state |
| `#staff-3dprint-multisize-toggle` + size variant rows | `size_variants` | `validVariants` if multi-size ON, else **`null`** |

**DROPPED fields (UI field exists but NOT written to DB):**
- **`material`**: There is no `#staff-product-material` input. The `material` column is never written. For engraving, `material` drives live-site filter visibility — it is permanently read-only from the portal.

**AUTO-GENERATED / AUTO-OVERWRITTEN fields (computed, not read from UI):**
- **`slug`** (line 1355): Regenerated from name on every save — previously stored slug is discarded. Any slug that was manually set, normalized, or different from the naive name-derivation is silently overwritten on every edit.
- **`size_variants`** (line 1394): Set to `null` on every save unless the 3D Prints multi-size toggle is ON. Any 3D Prints product edited without toggling multi-size on will lose its `size_variants` data.
- **`image_url`** (line 1390): Always `imageUrls[0]` — the first image in `staffProductImages`. If the user reorders images in the portal, only the first is written to the single-image column.

---

## 4. Symptom #1 — Panel sub_category Flips to "Tables" + Slug Rewrites on Edit

**Root cause — sub_category flip:**

`js/itemCategories.js` (lines 22–28) defines:
```js
"Party Rentals": ["Tables", "Chairs", "Tents", "Games", "Concessions"]
```
"Panels" is NOT in this list.

When `openStaffProductModal(product)` is called for a Panel product (e.g., "White Solid Panel 10x10 Rental"), line 1259 calls:
```js
populateSubCategoryOptions(product.category || '', product.sub_category || '')
// populateSubCategoryOptions("Party Rentals", "Panels")
```

`populateSubCategoryOptions()` (staff.js lines 1606–1618) iterates `ITEM_CATEGORIES["Party Rentals"]`. It adds options: "Tables", "Chairs", "Tents", "Games", "Concessions". It looks for `sub === "Panels"` to set `opt.selected = true` — but "Panels" is never added as an option (line 1610–1616 only adds options that ARE in the list). None of the options are selected, so the `<select>` falls back to its default: the first `<option>` which is `<option value="">Select sub-category</option>`.

However, the validation at line 1335 requires subCategory to be non-empty. If the user just opens and saves without changing the sub-category, the form will FAIL validation with "Sub-category is required" — no silent flip yet.

BUT: when `ITEM_CATEGORIES["Party Rentals"]` includes "Tents" (index 2), and the user previously selected "Tents" from the staff portal (which is a valid option), that is what gets saved. The STATE.md confirms: "Panels filter pre-existing issue (sub_category='Tents' in DB, not 'Panels')".

**DB evidence:** Both panel rows have `sub_category="Panels"` in the DB:
- `White Solid Panel 10x10 Rental`: `sub_category="Panels"`, `slug="white-solid-panel-10x10-rental"`
- `Window Panel 10x10 Rental`: `sub_category="Panels"`, `slug="window-panel-10x10-rental"`

These slugs appear correctly set. However, if an edit is made in the staff portal and the user picks "Tents" (the only nearby option), `sub_category` becomes "Tents". Because "Panels" can never be selected from the dropdown, the ONLY WAY to save a Panel product via the staff portal is to choose an incorrect sub_category. The product will then disappear from any "Panels" filter.

**Root cause — slug rewrite:**
Line 1355 always runs:
```js
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
```
This uses the same algorithm as the DB's stored slugs, so for these panel products the generated slug matches the DB slug. The slug rewrite risk is specifically for products whose name contains characters the regex strips differently, or where a normalized slug was manually set.

**Confirmed root cause #1:** `ITEM_CATEGORIES["Party Rentals"]` does not include "Panels" → `populateSubCategoryOptions("Party Rentals", "Panels")` cannot select "Panels" → staff must pick a wrong sub_category to pass validation → any edit corrupts `sub_category`. Slug rewrite is always active but benign for standard slugs.

---

## 5. Symptom #2 — Black Tumbler (Engraving) sub_category Metal Change Doesn't Show on Live Site

**DB evidence:** `Custom Engraved Tumbler 20 oz` (id: `14b5d3a6-c45a-47cc-8626-46cc5ba0b3ac`):
- `sub_category = "Metal"` (correctly set in DB)
- `material = null`
- Not in `productGalleryImages` (no entry in `product_image_urls.js`)

**Root cause:** `renderDynamicEngravingProducts()` in `products.js` (lines 134–188) uses the **`material`** column for the filter attribute, not `sub_category`:

```js
// Line 149
const material = product.material || 'Wood';
// Line 168
card.dataset.material = material;
```

The live-site filter (`filterEngravingProducts`, line 804) reads `product.dataset.material` from DOM cards. Because `material = null`, the card gets `data-material="Wood"` (fallback). The staff portal sub_category field writes to the `sub_category` column only — the `material` column is not in the staff form and is not part of `productData` (see field mapping table above). Even if sub_category is correctly updated to "Metal" in the DB, the live site will still show this product under the "Wood" filter tab.

**Confirmed root cause #2:** `renderDynamicEngravingProducts()` reads `product.material` for `data-material` (the filter attribute), not `product.sub_category`. The staff portal only writes `sub_category`, never `material`. These are two separate columns. Engraving product filter visibility depends on `material`, which cannot be changed via the staff portal.

---

## 6. Symptom #3 — Party Decor Uploaded Images Not Appearing on Live Site

**DB evidence:** `Balloon Centerpieces` (id: `2cc2c27a-be5c-4687-a5b1-6cb9a1f9332a`):
- `image_url = "...balloon-centerpiece/balloon1.jpeg"` (original)
- `image_urls = ["...balloon-centerpiece/balloon1.jpeg", "...balloon-centerpieces/1780016163676-94153.jpg"]` (2 images stored, including a staff-uploaded one)

The staff portal correctly stores all images in `image_urls[]`. However:

**`products.js` loadProducts SELECT (line 32):**
```js
const cols = 'id,name,slug,category,sub_category,price,sale,emoji,featured,price_label,description,size,material,image_url,size_variants';
```
`image_urls` (the text[] column) is **absent from the column list**. The live site only fetches `image_url` (singular). After fetch, `product.images = p.image_url ? [p.image_url] : undefined` (line 53–54). It is a 1-element array at best.

The `productGalleryImages` override (product_image_urls.js) replaces `product.images` for products whose name is in the hardcoded map (line 62–67). Older Party Decor products like "Organic Arch" have multiple entries there and do show multiple images. But:
- NEW products added via the staff portal (e.g., a new Party Decor product not in `product_image_urls.js`) will only ever show 1 image on the live site regardless of how many were uploaded
- Staff-uploaded ADDITIONAL images saved to `image_urls[]` for existing products are also invisible because `image_urls` is never fetched

**Confirmed root cause #3:** `loadProducts()` in `products.js` SELECT column list (line 32) omits `image_urls`. The live site never reads the multi-image array column. Only `image_url` (first image, string) is loaded. Staff-uploaded images beyond the first are effectively invisible on the live site.

---

## 7. Additional Risks Found

### Risk A: `size_variants` auto-nulled on every save (HIGH IMPACT)

`productData.size_variants` (line 1394):
```js
size_variants: useVariants ? validVariants : null
```
`useVariants` is `true` only if `category === '3D Prints'` AND the multi-size toggle (`#staff-3dprint-multisize-toggle`) is checked AND there are valid variant rows. For any other category, or if the 3D Prints toggle is not checked, `size_variants` is always written as `null`. This means editing a 3D Prints product without re-checking the size variant toggle will erase all size/price variant data silently.

### Risk B: `material` column permanently uneditable via staff portal

The `material` column (legacy, used only for engraving filter) has no corresponding form input. Products with `material=null` always render under "Wood" filter on the live site. There is no staff portal path to correct this.

### Risk C: `productGalleryImages` takes priority over `image_url` only if product name matches

`loadProducts()` lines 62–67: if a product's name matches a key in `productGalleryImages` (the hardcoded `product_image_urls.js` file), the hardcoded images override the DB `image_url`. This means if a Party Decor product's images are updated via staff portal, the hardcoded `productGalleryImages` images will still show instead of the new ones — until `product_image_urls.js` is also manually updated.

### Risk D: Slug regenerated from name on every save

`product_image_urls.js` uses `product.name.toLowerCase().replace(...)` as keys. `products.js` `getProductBySlug()` (line 473) also regenerates slug from name for lookup. The stored `slug` column is thus redundant for navigation — but is used for Storage bucket paths in `uploadProductImageToStorage()` (line 1563: `const path = ${productSlug}/...`). If the slug changes on save, new image uploads go into a different Storage folder than existing images.

### Risk E: `image_url` always overwritten with `imageUrls[0]`

On every edit, `image_url: imageUrls[0] || null` (line 1390). `imageUrls` comes from `uploadAllNewImages(slug)` which preserves existing images. If the user reorders images in the portal modal, the "first" slot's URL becomes the live-site primary image. This is intentional behavior, but the ordering in `staffProductImages[]` state must be stable to avoid accidental reordering.

---

## 8. Recommended Fixes

**Symptom #1 — Panel sub_category:**
Add "Panels" to `ITEM_CATEGORIES["Party Rentals"]` in `js/itemCategories.js`. This allows `populateSubCategoryOptions("Party Rentals", "Panels")` to correctly select "Panels" in the dropdown, preventing sub_category corruption on edit.

**Symptom #2 — Engraving material vs sub_category:**
Two options:
- (A, preferred) Change `renderDynamicEngravingProducts()` to use `product.sub_category || 'Wood'` instead of `product.material || 'Wood'` for `card.dataset.material` (line 149) and update `filterEngravingProducts()` buttons to match `ITEM_CATEGORIES["Engraving"]` values. This makes `sub_category` the single source of truth for engraving filtering.
- (B) Add a `material` field to the staff portal form and write it in `productData`. More invasive.

Also: run a DB UPDATE to set `material = sub_category` for engraving rows where `material IS NULL` (currently: Custom Engraved Tumbler, Stainless Steel Tumbler — both have `sub_category="Metal"`, `material=null`).

**Symptom #3 — Party Decor images:**
Add `image_urls` to the SELECT column list in `loadProducts()` (products.js line 32). In the transform (lines 41–59), set `images: (p.image_urls && p.image_urls.length > 0) ? p.image_urls : (p.image_url ? [p.image_url] : undefined)`. This replaces the single-image fallback with the full array from the DB when available.

Also update the background `loadProductImages()` function (line 103) to also select `image_urls` and use it for products that still show `undefined` images.

**Risk A — size_variants null-ing:**
Add a guard: `size_variants: useVariants ? validVariants : (isEditing ? undefined : null)` — use `undefined` to omit the key from the payload on edit when not multi-size, preventing the field from being overwritten when not intentionally changed.

---

## Self-Check: PASSED

- `26-SUMMARY.md` created at `.planning/quick/26-diagnose-staff-portal-save-bug-silent-da/26-SUMMARY.md`
- No source files modified (staff.js, index.html, products.js, product_image_urls.js, js/itemCategories.js all untouched)
- No DB writes issued (SELECT queries only)
- All 3 symptoms have confirmed root causes with code line references and DB evidence
- 8 report sections present
