-- ============================================
-- Party Palace Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- First, clear any existing data
DELETE FROM products;

-- Insert all products
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES
('Spiral Arch', 'arches', 'Classic spiral balloon arch with alternating colors. Perfect for entrances and photo backdrops.', 200.0, 'starting at', false, '🌀'),
('Organic Arch', 'arches', 'Modern organic balloon arch with flowing, natural asymmetric design. Trendy and Instagram-worthy.', 250.0, 'starting at', true, '🎈'),
('L-Shaped Arch', 'arches', 'Elegant L-shaped arch perfect for corners, cake tables, and unique photo opportunities.', 225.0, 'starting at', false, '📐'),
('Specialty Arch', 'arches', 'Custom specialty arch with unique designs, premium materials, and personalized elements.', 300.0, 'starting at', true, '✨'),
('Circle Arch', 'arches', 'Stunning full-circle arch creating a dramatic focal point for ceremonies and photos.', 225.0, 'starting at', true, '⭕'),
('Chiara Arch', 'arches', 'Luxurious Chiara-style arch with elegant wavy design. Perfect for weddings and upscale events.', 250.0, 'starting at', true, '👑'),
('Balloon Centerpieces', 'centerpieces', 'Beautiful balloon centerpieces perfect for table decor. Available in any color scheme to match your event.', 7.0, 'starting at', true, '🎈'),
('Vases', 'centerpieces', 'Elegant decorative vases with floral or balloon arrangements. Stunning table accents for any occasion.', 7.0, 'starting at', false, '🏺'),
('Medal Frames', 'centerpieces', 'Custom medal and award display frames. Perfect for sports events, graduations, and achievements.', 7.0, 'starting at', false, '🏅'),
('Diaper Cakes', 'centerpieces', 'Adorable diaper cake centerpieces for baby showers. Custom themed designs with practical gifts inside.', 15.0, 'starting at', true, '🍼'),
('Spiral Columns', 'columns', 'Classic spiral balloon columns with alternating colors. Perfect for framing entrances and stages.', 60.0, 'starting at', true, '🌀'),
('Organic Columns', 'columns', 'Modern organic balloon columns with flowing, natural asymmetric design. Trendy statement pieces.', 90.0, 'starting at', false, '🎈'),
('Specialty Columns', 'columns', 'Custom specialty columns with unique designs, premium materials, and personalized elements.', 100.0, 'starting at', true, '✨'),
('Balloon Walls', 'walls', 'Custom balloon wall backdrops in any color scheme. Eye-catching statement pieces for photos and decor.', 300.0, 'starting at', true, '🎈'),
('Flower Walls', 'walls', 'Beautiful artificial flower wall backdrops. Romantic and luxurious for weddings and special events.', 275.0, 'starting at', true, '🌸'),
('Shimmer Walls', 'walls', 'Stunning shimmer wall backdrops with reflective panels. Perfect for photos and creating elegant ambiance.', 275.0, 'starting at', true, '✨'),
('Photo Stations', 'services', 'Complete photo station setup with backdrop and props.', 400.0, 'starting at', true, '📸'),
('Dessert Tables', 'services', 'Styled dessert table with balloon garland and signage.', 350.0, 'starting at', false, '🍰'),
('Custom Printwork', 'services', 'Personalized banners, signs, and printed decorations.', 150.0, 'starting at', false, '🖨️'),
('Full Event Decor', 'services', 'Complete event styling from consultation to installation.', 1500.0, 'starting at', true, '✨'),
('Drapery Backdrops', 'services', 'Elegant fabric backdrop with professional draping.', 450.0, 'starting at', false, '🎭'),
('Marquee Decor', 'services', 'Custom marquee letters and numbers with LED lighting.', 225.0, 'starting at', true, '💡');

-- Create product_images table to map products to their Supabase Storage images
CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read product images
CREATE POLICY "Anyone can view product images"
ON product_images FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: Anyone can read products
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
TO anon, authenticated
USING (true);

-- Now insert the product images
-- We'll map them to product IDs based on product names

-- Balloon Walls images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall1.jpeg', 1 FROM products WHERE name = 'Balloon Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall2.jpeg', 2 FROM products WHERE name = 'Balloon Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall3.jpeg', 3 FROM products WHERE name = 'Balloon Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall4.jpeg', 4 FROM products WHERE name = 'Balloon Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall5.jpeg', 5 FROM products WHERE name = 'Balloon Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall6.jpeg', 6 FROM products WHERE name = 'Balloon Walls';

-- Spiral Arch images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/spiral-arch/spiral1.jpeg', 1 FROM products WHERE name = 'Spiral Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/spiral-arch/spiral2.jpeg', 2 FROM products WHERE name = 'Spiral Arch';

-- Circle Arch images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle1.jpeg', 1 FROM products WHERE name = 'Circle Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle2.jpeg', 2 FROM products WHERE name = 'Circle Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle3.jpeg', 3 FROM products WHERE name = 'Circle Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle4.jpeg', 4 FROM products WHERE name = 'Circle Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle5.jpeg', 5 FROM products WHERE name = 'Circle Arch';

-- L-Shaped Arch images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped1.jpeg', 1 FROM products WHERE name = 'L-Shaped Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped2.jpeg', 2 FROM products WHERE name = 'L-Shaped Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped3.jpeg', 3 FROM products WHERE name = 'L-Shaped Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped4.jpeg', 4 FROM products WHERE name = 'L-Shaped Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped5.jpeg', 5 FROM products WHERE name = 'L-Shaped Arch';

-- Vases images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase1.jpeg', 1 FROM products WHERE name = 'Vases'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase2.jpeg', 2 FROM products WHERE name = 'Vases'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase3.jpeg', 3 FROM products WHERE name = 'Vases'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase4.jpeg', 4 FROM products WHERE name = 'Vases'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase5.jpeg', 5 FROM products WHERE name = 'Vases'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase6.jpeg', 6 FROM products WHERE name = 'Vases'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase7.jpeg', 7 FROM products WHERE name = 'Vases'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase8.jpeg', 8 FROM products WHERE name = 'Vases';

-- Diaper Cakes images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/diaper-cake/diaper1.jpeg', 1 FROM products WHERE name = 'Diaper Cakes'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/diaper-cake/diaper2.jpeg', 2 FROM products WHERE name = 'Diaper Cakes';

-- Medal Frames images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/medal-centerpieces/metal1.jpeg', 1 FROM products WHERE name = 'Medal Frames';

-- Shimmer Walls images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/shimmer-wall/shimmer1.jpeg', 1 FROM products WHERE name = 'Shimmer Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/shimmer-wall/shimmer2.jpeg', 2 FROM products WHERE name = 'Shimmer Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/shimmer-wall/shimmer3.jpeg', 3 FROM products WHERE name = 'Shimmer Walls';

-- Flower Walls images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flower-wall/flower1.jpeg', 1 FROM products WHERE name = 'Flower Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flower-wall/flower2.jpeg', 2 FROM products WHERE name = 'Flower Walls'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flower-wall/flower3.jpeg', 3 FROM products WHERE name = 'Flower Walls';

-- Organic Arch images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic1.jpeg', 1 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic2.jpeg', 2 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic3.jpeg', 3 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic4.jpeg', 4 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic5.jpeg', 5 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic6.jpeg', 6 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic7.jpeg', 7 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic8.jpeg', 8 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic9.jpeg', 9 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic10.jpeg', 10 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic11.jpeg', 11 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic12.jpeg', 12 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic13.jpeg', 13 FROM products WHERE name = 'Organic Arch'
UNION ALL
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic14.jpeg', 14 FROM products WHERE name = 'Organic Arch';

-- Specialty Columns images
INSERT INTO product_images (product_id, image_url, display_order)
SELECT id, 'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/speciality-columns/speciality1.jpeg', 1 FROM products WHERE name = 'Specialty Columns';

-- Done!
SELECT 'Database setup complete! Products and images have been loaded.' AS status;
