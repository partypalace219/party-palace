---
phase: quick-12
plan: 12
subsystem: 3D Prints filtering
tags: [bug-fix, database, products, filters]
key-files:
  modified:
    - products.js
    - index.html
decisions:
  - Keep "Miscellaneous" (not "Misc") — matches staff form dropdown in js/itemCategories.js and no DB rows existed with "Misc"
  - Leave 13 ambiguous products with sub_category=NULL rather than guessing; flagged for manual assignment via staff portal
completed: 2026-05-21
---

# Quick Task 12: Fix 3D Prints Sub-Category Filters

**One-liner:** Fixed `product.material` vs `product.sub_category` copy-paste bug in `renderDynamicPrints3dProducts`, then bulk-assigned sub_category to 70 of 83 DB rows (Toys/Signs/Decor), leaving 13 ambiguous products NULL for manual review.

## Root Cause Classification

**Both (code + data)**

- **Code bug (primary):** `renderDynamicPrints3dProducts` in `products.js` was reading `product.material` to populate `card.dataset.category`, but the 3D Prints filter buttons use sub-category labels (Toys/Signs/Decor/Miscellaneous), not materials. The Engraving renderer correctly uses `product.material` because Engraving filters ARE materials — this was a copy-paste symmetry bug when the two renderers were written in parallel.
- **Data gap (secondary):** All 83 3D Prints rows had `sub_category = NULL` before this task (except one: "Custom Letter with Name" already had `Decor`). Even after the code fix, filters would show 0 results until sub_category was populated.

## Exact Code Change

**File:** `products.js`, line 187, inside `renderDynamicPrints3dProducts`

```js
// BEFORE (buggy)
const subcategory = product.material || 'Other';

// AFTER (fixed)
const subcategory = product.sub_category || 'Other';
```

`card.dataset.category = subcategory;` on line 191 was already correct and left untouched. `filter3DProducts()` comparison logic was already correct and left untouched.

## Cache-Bust

**File:** `index.html`, line 2339

```html
<!-- BEFORE -->
<script type="module" src="ui.js"></script>

<!-- AFTER -->
<script type="module" src="ui.js?v=2026-05-21"></script>
```

`products.js` is loaded as an ES module imported by `ui.js` — there is no direct `<script src="products.js">` tag in index.html. Bumping the `ui.js` entry point tag forces the browser to re-fetch the full module graph including `products.js`.

## DB Updates Executed

All updates ran via Supabase REST PATCH with service role key. Each returned HTTP 204.

| sub_category | Rows updated | Products |
|---|---|---|
| Toys | 24 | Finger Fidget Spinner, Flexi Dinosaur, Flexi Fish, Infinity Cube, Octagon Fidget, Snail, Star Fidget, Twisty Lizard, dragon small/medium/large, dragon with egg mystery, mystery egg, mega dragon 5ft long, snake almost 5ft tall, 10 foot snake, Lightsaber large/medium, wand pocket size, rose flower bookmark, 3D Printed Extending Saber small/medium/large/mega |
| Signs | 18 | Bismillah, Bismillah with Arch, Morning Dua, Evening Dua, Palestine Map, La ilaha ila Allah, Mohammed, Muhammad with Background, Masjid Relief Sculpture, Kaaba Relief Sculpture, Ramadan Kareem, Ramadan Kareem 12x8, Ramadan Mubarak, Ramadan Mubarak arch, Eid Mubarak, Eid Mubarak Rectangle, Cut out letters, Ramadan Relief Sculpture |
| Decor | 28 | Custom Lithophane, Custom Letter with Name, Custom Letter with Name (Medium), Custom Name Letter (large), Custom Letters Decor, Heart decor, Heart decor Large, Heart decor Medium, love decor, Customizable Keychains, Alphabet letter keychain, Arabic alphabet letter keychain, 3 Piece Candle Holder, Heart Gift Box, Heart Shaped Coaster Set, Round Star Coaster Set, Square Coffee Bean Coaster, Hexagon Shaped Coaster, Camel Relief Sculpture, Kaaba Ornaments, Masjid Ornament, Palestine Map Ornament, Eid Mubarak Ornaments, Lantern Style 1/2/3 Ornament, Moon Ornament, Star Ornament |
| **Total** | **70** | |

**Sub_category distribution after updates:**
- Decor: 28
- Toys: 24
- Signs: 18
- NULL: 13 (intentional — see below)
- Total: 83

## Manual Assignment Needed (13 products)

These products have ambiguous names that could plausibly fit Signs, Decor, or Miscellaneous. Assign sub_category via the staff portal:

| Product name | Why ambiguous |
|---|---|
| Amazing | Generic word — could be a sign, decor piece, or inspirational quote item |
| Bloom | Could be a floral sign, decor item, or inspirational word |
| Be Kind | Inspirational — Signs or Decor |
| Best Life | Inspirational — Signs or Decor |
| Heart with Names | Could be Signs (personalized name sign) or Decor (heart shape decor) |
| Heart with a Date | Could be Signs (date commemoration sign) or Decor |
| You & Me Heart sign | Name says "sign" but could also be Decor |
| Love | Single word — Signs or Decor |
| Live Laugh Love | Classic phrase — Signs or Decor |
| Moon and Back | Inspirational phrase — Signs or Decor |
| Mr. & Mrs. | Wedding — Signs or Decor |
| Welcome | Entry sign or decor piece |
| Allah | Islamic word — could be Signs or Decor |

To assign: open Staff Portal, find each product in the 3D Prints list, click Edit, set Sub-category to Toys / Signs / Decor / Miscellaneous, save.

## Canonical Label Decision

Kept **"Miscellaneous"** (not "Misc"). Rationale: the staff form dropdown in `js/itemCategories.js` writes "Miscellaneous" — that is the source of truth for what enters the DB. No DB rows existed with "Misc". The existing filter button in index.html already reads "Miscellaneous". No changes needed to either file.

## Regressions Confirmed Not Introduced

- Engraving filter (Wood/Metal/Leather/Acrylic/Specialty Materials): uses `renderDynamicEngravingProducts` which correctly reads `product.material` — untouched.
- Party Decor filter (Arches/Columns/Walls/Centerpieces): uses `renderCatalog` with `p.sub_category` — untouched.
- Party Rentals: untouched.
- Staff portal: untouched (staff.js not modified).
- cart.js, checkout.js, supabase-client.js: untouched.
- Database schema: no ALTER TABLE.

## Commit

`659d525` — fix(quick-12): fix 3D Prints sub-category filter + assign sub_categories in DB
