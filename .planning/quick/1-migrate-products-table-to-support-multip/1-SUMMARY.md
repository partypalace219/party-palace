---
phase: quick-1
plan: 1
subsystem: database/schema
tags: [migration, schema, categories, products]
dependency_graph:
  requires: []
  provides: [product-variant-columns, item-categories-module]
  affects: [products-table, schema-sql, item-categories]
tech_stack:
  added: [js/itemCategories.js]
  patterns: [additive-migration, idempotent-sql, window-global-export]
key_files:
  created:
    - migrations/2026_add_item_variants.sql
    - js/itemCategories.js
  modified:
    - schema.sql
decisions:
  - ITEM_CATEGORIES uses 4 top-level categories (Party Decor, Party Rentals, 3D Prints, Engraving) per orchestrator constraints — overrides plan body which specified 7 DB-key-style categories
  - image_url preserved intact; image_urls is additive backfill only
  - No BEGIN/COMMIT wrapper in migration (Supabase SQL editor runs each statement independently)
metrics:
  duration: 93s
  completed: 2026-04-27
  tasks_completed: 3
  files_changed: 3
---

# Phase quick-1 Plan 1: Migrate Products Table for Variant Support Summary

**One-liner:** Idempotent SQL migration adding image_urls[], sizes[], colors[], sub_category to products with backfill, plus window.ITEM_CATEGORIES module.

## What Was Built

Three files were created/modified to add multi-image, size, color, and sub-category support to the products table at the DB layer — purely additive, no breaking changes.

## Files Created/Modified

### migrations/2026_add_item_variants.sql (created)
Idempotent migration safe to run on the live Supabase DB any number of times.

**Columns added via `ADD COLUMN IF NOT EXISTS`:**
- `image_urls TEXT[] DEFAULT '{}'`
- `sizes TEXT[] DEFAULT '{}'`
- `colors TEXT[] DEFAULT '{}'`
- `sub_category TEXT`

**Backfill:** `UPDATE products SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND image_url <> '' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL)` — guard ensures safe re-run.

**Index:** `CREATE INDEX IF NOT EXISTS idx_products_sub_category ON products(sub_category)`

**Safety:** No DROP, DELETE FROM, TRUNCATE, RENAME, or RLS changes present.

### js/itemCategories.js (created)
Vanilla JS module (no bundler) exposing `window.ITEM_CATEGORIES` for browser consumption.

**Categories exported (4 top-level):**

| Category | Sub-categories |
|---|---|
| Party Decor | Arches, Columns, Walls, Centerpieces |
| Party Rentals | Tables, Chairs, Tents, Games, Concessions |
| 3D Prints | Toys, Signs, Decor, Miscellaneous |
| Engraving | Wood, Metal, Leather, Acrylic, Specialty Materials |

Assigned via `if (typeof window !== 'undefined') { window.ITEM_CATEGORIES = ITEM_CATEGORIES; }` for safe non-browser environments.

### schema.sql (modified)
Four new column declarations added to `CREATE TABLE IF NOT EXISTS products` block, after `image_url TEXT,`, before `created_at`:

```sql
image_urls TEXT[] DEFAULT '{}',
sizes TEXT[] DEFAULT '{}',
colors TEXT[] DEFAULT '{}',
sub_category TEXT,
```

Index added to the indexes section:
```sql
CREATE INDEX IF NOT EXISTS idx_products_sub_category ON products(sub_category);
```

## Preservation Guarantees

- **`image_url` preserved:** The original `image_url TEXT` column is untouched in both schema.sql and the migration. No data loss.
- **RLS policies untouched:** No ALTER TABLE ENABLE/DISABLE RLS or CREATE/DROP POLICY statements.
- **HTML untouched:** `index.html` not modified.
- **Render JS untouched:** `products.js`, `ui.js`, `cart.js`, `checkout.js`, `staff.js` not modified.
- **CSS untouched:** `styles.css` not modified.

## Commits

| Task | Commit | Description |
|---|---|---|
| 1 | 1201c28 | feat(quick-1): add idempotent migration for product variant columns |
| 2 | f2f8884 | feat(quick-1): add js/itemCategories.js with ITEM_CATEGORIES global |
| 3 | 856a21f | feat(quick-1): update schema.sql with product variant columns + index |

## Action Required

**User must run `migrations/2026_add_item_variants.sql` in the Supabase SQL editor** to apply the schema changes to the live DB. The file alone does not execute against the database — it must be copy-pasted and run manually.

Steps:
1. Open Supabase dashboard → SQL Editor
2. Paste the contents of `migrations/2026_add_item_variants.sql`
3. Run — safe to run multiple times

## Deviations from Plan

### ITEM_CATEGORIES structure

**Found during:** Task 2

**Issue:** Plan body specified 7 DB-key-style categories (`arches`, `centerpieces`, `columns`, `walls`, `services`, `engraving`, `prints3d`) each with `label`, `subCategories`, `commonSizes`, `commonColors` properties. The orchestrator constraints specified a different, simpler structure: 4 top-level human-readable keys each mapping directly to an array of sub-category strings.

**Resolution:** Applied orchestrator constraints (they override plan body). The constraint note explicitly stated "The ITEM_CATEGORIES in js/itemCategories.js should match EXACTLY" with the 4-category structure.

**Files modified:** `js/itemCategories.js`

**Impact:** No functional impact — the file is new and no other code depends on it yet.
