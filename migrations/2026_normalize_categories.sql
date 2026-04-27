-- Migration: 2026_normalize_categories
-- Normalizes top-level categories, splits Party Decor sub-categories,
-- moves services rows to the services table, and adds CHECK constraints.
-- Wrapped in a transaction so it all succeeds or all rolls back.

BEGIN;

-- Step 1: Copy services rows into the services table
INSERT INTO services (id, name, category, description, price, emoji, gradient, image_url, created_at, updated_at)
SELECT
  id,
  name,
  'Decor Services' AS category,
  description,
  CASE
    WHEN price IS NULL THEN 'Custom Quote'
    ELSE COALESCE(price_label, 'Starting at') || ' $' || price::text
  END AS price,
  emoji,
  gradient,
  image_url,
  COALESCE(created_at, NOW()),
  NOW()
FROM products
WHERE category = 'services';

-- Step 2: Delete the moved rows from products
DELETE FROM products WHERE category = 'services';

-- Step 3: Normalize the four real top-level categories
UPDATE products SET category = '3D Prints'      WHERE category = 'prints3d';
UPDATE products SET category = 'Engraving'      WHERE category = 'engraving';
UPDATE products SET category = 'Party Rentals'  WHERE category = 'rentals';

-- Step 4: Split the Party Decor rows: move the value into sub_category, set category = 'Party Decor'
UPDATE products SET category = 'Party Decor', sub_category = 'Arches'       WHERE category = 'arches';
UPDATE products SET category = 'Party Decor', sub_category = 'Columns'      WHERE category = 'columns';
UPDATE products SET category = 'Party Decor', sub_category = 'Walls'        WHERE category = 'walls';
UPDATE products SET category = 'Party Decor', sub_category = 'Centerpieces' WHERE category = 'centerpieces';

-- Step 5: Lock the category field to the four canonical names
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('Party Decor', 'Party Rentals', '3D Prints', 'Engraving'));

-- Step 6: Enforce that sub_category is valid for its category
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sub_category_check;
ALTER TABLE products ADD CONSTRAINT products_sub_category_check
  CHECK (
    sub_category IS NULL OR
    (category = 'Party Decor'   AND sub_category IN ('Arches', 'Columns', 'Walls', 'Centerpieces')) OR
    (category = 'Party Rentals' AND sub_category IN ('Tables', 'Chairs', 'Tents', 'Games', 'Concessions')) OR
    (category = '3D Prints'     AND sub_category IN ('Toys', 'Signs', 'Decor', 'Miscellaneous')) OR
    (category = 'Engraving'     AND sub_category IN ('Wood', 'Metal', 'Leather', 'Acrylic', 'Specialty Materials'))
  );

COMMIT;

-- Run these AFTER applying the migration to confirm success:
-- SELECT category, count(*) FROM products GROUP BY category ORDER BY category;
--   Expected: only 4 rows (3D Prints, Engraving, Party Decor, Party Rentals)
-- SELECT sub_category, count(*) FROM products WHERE category = 'Party Decor' GROUP BY sub_category;
--   Expected: Arches 6, Columns 3, Walls 3, Centerpieces 4
-- SELECT count(*) FROM services WHERE category = 'Decor Services';
--   Expected: 6
-- SELECT count(*) FROM products WHERE category = 'services';
--   Expected: 0