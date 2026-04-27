-- Migration: 2026_add_item_variants
-- Additive only. Safe for live DB. Re-runnable.
-- Adds: image_urls[], sizes[], colors[], sub_category + index
-- Backfills image_urls from image_url. Does NOT drop image_url.

-- Step 1: Add new columns (idempotent via IF NOT EXISTS)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Step 2: Backfill image_urls from existing image_url for rows that have an image but empty array
UPDATE products
   SET image_urls = ARRAY[image_url]
 WHERE image_url IS NOT NULL
   AND image_url <> ''
   AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Step 3: Create sub_category index (idempotent)
CREATE INDEX IF NOT EXISTS idx_products_sub_category ON products(sub_category);
