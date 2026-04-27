# Engraving Filter Investigation Findings

## Sample DB Rows (all columns)

### Row 1: Edge Glued Square Panel
```json
{
  "id": "1100814d-10c6-4742-bc9b-56534df1f478",
  "name": "Edge Glued Square Panel",
  "category": "Engraving",
  "description": "High-quality edge glued wood panel, perfect for custom engraving projects.",
  "price": 39.99,
  "price_label": null,
  "featured": false,
  "badge": null,
  "emoji": "🪵",
  "gradient": null,
  "image_url": "https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-square-panel/square1.jpeg",
  "created_at": "2026-02-04T23:45:18.143351+00:00",
  "cost": 5,
  "sale": false,
  "slug": "edge-glued-square-panel",
  "size": "10\" x 10\"",
  "material": "Wood",
  "tiered_pricing": { "1": 39.99, "2": 36.99, "6": 30.99, "11": "contact" },
  "discount_percent": null,
  "image_urls": ["..."],
  "sizes": [],
  "colors": [],
  "sub_category": null
}
```

### Row 4: Round Stainless Steel Keychain
```json
{
  "id": "379e...",
  "name": "Round Stainless Steel Keychain",
  "category": "Engraving",
  "sub_category": null,
  "material": "Metal",
  ...
}
```

## All 9 Engraving Rows: material + sub_category

| # | Name | material | sub_category |
|---|------|----------|--------------|
| 1 | Edge Glued Square Panel | Wood | null |
| 2 | Edge Glued Round Panel | Wood | null |
| 3 | Rectangle Wood Keychain | Wood | null |
| 4 | Round Stainless Steel Keychain | Metal | null |
| 5 | Black Acrylic Plexiglass Sheet | Acrylic | null |
| 6 | Unfinished Rustic Wood Rounds | Wood | null |
| 7 | Round Basswood Plywood Coaster | Wood | null |
| 8 | Custom Engraved Tumbler | null | null |
| 9 | Charcuterie Board (Engraved or Plain) | null | null |

## Current Filter Predicate (products.js)

```js
// renderDynamicEngravingProducts — card construction (line ~157-158)
const material = product.material || 'Wood';
card.dataset.material = material;

// filterEngravingProducts (line ~651-653)
document.querySelectorAll('#engravingGrid .engraving-product').forEach(product => {
    const productMaterials = product.dataset.material.split(',');
    if (material === 'all' || productMaterials.includes(material)) {
        product.style.display = 'flex';
    } else {
        product.style.display = 'none';
    }
});
```

Filter reads `dataset.material` which is set from `product.material || 'Wood'` at card render time.

## Diagnosis: PARTIAL MATCH

The filter correctly reads the `material` column. The filter mechanism itself works.

**However**, two issues exist:

1. **"Leather" button shows 0 items** — The DB has NO Leather rows. The Leather filter button in index.html (`data-material="Leather"`) is correct HTML but simply has no matching products. This is expected behavior (not a bug), but the UX shows a blank grid with no feedback when clicked.

2. **2 rows have material=null** (Custom Engraved Tumbler, Charcuterie Board) — These fall back to `'Wood'` in the rendering code (`product.material || 'Wood'`), so they appear under Wood filter. This may not be the intended categorization.

**The filter is NOT broken for All/Wood/Metal/Acrylic.** The apparent "filter shows nothing" issue was likely observed only for the Leather button (no matching DB rows).

## Two Options

### Option A — Add empty-state feedback to Engraving filters
Minimal change: when a filter produces 0 visible cards, render a "No items in this category yet" message (same pattern as 3D Prints Task 2). No DB changes needed.
- **Pros:** Non-invasive; works immediately; same UX pattern as 3D Prints.
- **Cons:** Leather filter button stays but has no products behind it.

### Option B — Remove Leather button + fix null-material rows
Update index.html to remove the Leather filter button (no products), and either update the 2 null-material rows in Supabase (Custom Engraved Tumbler, Charcuterie Board) to set `material = 'Wood'` or a new value, OR remove the `|| 'Wood'` fallback and handle null explicitly.
- **Pros:** Cleaner UI (no dead Leather button); null-material rows accurately categorized.
- **Cons:** Requires DB write for rows 8-9; removes Leather button which may be needed later.

**Recommendation:** Option A is the least invasive quick fix. If leather products are planned in the future, Option A is the right call. Option B is better if Leather is definitively not a category.

## No Code Changes Made

Per task spec, no Engraving code or DB changes were made in this investigation.
