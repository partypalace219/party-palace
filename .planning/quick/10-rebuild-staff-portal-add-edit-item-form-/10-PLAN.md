# Quick Task 10 — PLAN
## Rebuild staff portal Add/Edit Item form: multi-image upload, sizes, colors, category/sub-category

### Phase 0 Findings
- ✅ `migrations/2026_add_item_variants.sql` declares `image_urls TEXT[]`, `sizes TEXT[]`, `colors TEXT[]`, `sub_category TEXT`
- ✅ `js/itemCategories.js` has exact keys: "Party Decor", "Party Rentals", "3D Prints", "Engraving"
- ⚠️ `js/itemCategories.js` NOT loaded in index.html — must add `<script src="js/itemCategories.js"></script>`
- ✅ Staff form lives in index.html lines 2046–2134 (embedded, no separate staff.html)
- ✅ `staff.js` is an ES module imported by `ui.js`; `initStaffPortal` called from ui.js line 466
- ⚠️ `loadStaffProducts` SELECT omits `image_urls,sizes,colors,sub_category,price_label` — must fix
- Image upload uses Edge Function `upload-product-image` accepting `{fileName, fileData, contentType}` → `{url}`
- Will use direct Supabase Storage client (`window.supabaseClient.storage`) for multi-image upload (cleaner, authenticated user has session)

### Form State Shape
```
staffProductImages = [
  { type: 'existing', url: 'https://...' }   // already in DB
  { type: 'new', file: File, previewUrl: 'data:...' }  // newly chosen
]
staffProductColors = ['White', 'Blue', ...]  // free-form strings
// Sizes driven by checkbox DOM — no separate state
// Sub-category options derived from window.ITEM_CATEGORIES[selectedCategory]
```

### DB Columns Written on Save
`name, slug, category, sub_category, price, price_label, cost, sale, discount_percent, description, emoji, featured, image_url (first url), image_urls (full array), sizes, colors`

---

## Tasks

### Task 1 — Pre-flight: add itemCategories.js script tag
**File:** `index.html` (~line 2305)
Add `<script src="js/itemCategories.js"></script>` before `product_image_urls.js`.
This makes `window.ITEM_CATEGORIES` available to staff.js which runs as an ES module.

### Task 2 — Rebuild form markup in index.html
**File:** `index.html` (lines 2046–2134)
Replace the entire `<form id="staff-product-form">` content with:
- Name (text, required)
- Category select (options from ITEM_CATEGORIES keys, populated by JS)
- Sub-Category select (options rebuilt on category change)
- Description textarea
- Price + Price Label row
- Multi-image uploader (drag-drop zone + file input, thumbnail grid with up/down/remove)
- Sizes checkboxes (Small, Medium, Large, Extra Large)
- Colors chip input (type + Enter to add, × to remove)
- Cost + Emoji row (keep existing)
- Featured checkbox, On Sale checkbox + discount field (keep existing)
- Inline error spans for category, sub-category, images

### Task 3 — Update staff.js
**File:** `staff.js`

New state:
- `staffProductImages = []`
- `staffProductColors = []`

New functions:
- `staffOnCategoryChange(cat)` — populates sub-category options, clears value
- `populateSubCategoryOptions(cat, selectedVal)` — rebuilds sub-category select
- `renderStaffImageThumbnails()` — renders thumbnail grid from staffProductImages
- `handleStaffMultiFileSelect(event)` — handles multi-file input, adds to staffProductImages, re-renders
- `removeStaffImage(idx)` — removes image entry by index, re-renders
- `moveStaffImage(idx, dir)` — swaps entries for reorder, re-renders
- `renderColorChips()` — renders staffProductColors as chips
- `addColorChip(color)` — pushes to staffProductColors, re-renders
- `removeColorChip(idx)` — removes from staffProductColors, re-renders
- `handleColorChipKeydown(event)` — Enter key handler for color input
- `uploadProductImageToStorage(file, productSlug)` — direct Supabase Storage upload, returns public URL
- `uploadAllNewImages(productSlug)` — loops staffProductImages, uploads new ones, mutates type→existing, returns ordered URL array
- `showFieldError(id, msg)` / `clearFieldErrors()` — inline validation UI

Updated functions:
- `loadStaffProducts()` — add `image_urls,sizes,colors,sub_category,price_label` to SELECT
- `openStaffProductModal(product)` — populate all new fields including thumbnails, sizes, colors, subcategory
- `handleStaffProductSubmit(e)` — validate + upload + save with new fields
- `initStaffPortal()` — build category options + wire category change event

Removed/dead (left in place, no longer wired by new form):
- `switchStaffImageTab`, `handleStaffFileSelect`, old `removeStaffImage` (replaced)

### Task 4 — Add CSS to styles.css
New rules for:
- `.staff-image-grid` — flex wrap thumbnail grid
- `.staff-thumb-item` — relative-positioned thumbnail with controls overlay
- `.staff-thumb-img` — thumbnail image
- `.staff-thumb-controls` — overlay with move/remove buttons
- `.staff-thumb-badge` — position badge (1, 2, 3…)
- `.staff-image-add-area` — dashed add-more zone
- `.staff-sizes-grid` — 2×2 grid of size checkboxes
- `.staff-size-check` — size checkbox label
- `.staff-color-chips` — flex wrap chip container
- `.staff-chip` — individual color chip
- `.staff-chip-input` — text input for color entry
- `.staff-field-error` — inline red error text

### Validation Rules (enforced in handleStaffProductSubmit)
1. Category required
2. Sub-category required AND must be in `window.ITEM_CATEGORIES[category]`
3. At least 1 image in staffProductImages
4. Show inline errors, do NOT submit if any fail
