-- Migrate all 22 products from app.js to Supabase
-- This preserves all pricing, descriptions, emojis, and product details
-- Note: Product gallery images (Chiara Arch, Specialty Columns) are maintained in app.js for now

-- Delete existing sample products first
DELETE FROM products;

-- ARCHES (5 products)
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Spiral Arch', 'arches', 'Classic spiral balloon arch with alternating colors. Perfect for entrances and photo backdrops.', 200, 'starting at', false, '🌀');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Organic Arch', 'arches', 'Modern organic balloon arch with flowing, natural asymmetric design. Trendy and Instagram-worthy.', 250, 'starting at', true, '🎈');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('L-Shaped Arch', 'arches', 'Elegant L-shaped arch perfect for corners, cake tables, and unique photo opportunities.', 225, 'starting at', false, '📐');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Specialty Arch', 'arches', 'Custom specialty arch with unique designs, premium materials, and personalized elements.', 300, 'starting at', true, '✨');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Circle Arch', 'arches', 'Stunning full-circle arch creating a dramatic focal point for ceremonies and photos.', 225, 'starting at', true, '⭕');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Chiara Arch', 'arches', 'Luxurious Chiara-style arch with elegant wavy design. Perfect for weddings and upscale events.', 250, 'starting at', true, '👑');

-- CENTERPIECES (4 products)
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Balloon Centerpieces', 'centerpieces', 'Beautiful balloon centerpieces perfect for table decor. Available in any color scheme to match your event.', 7, 'starting at', true, '🎈');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Vases', 'centerpieces', 'Elegant decorative vases with floral or balloon arrangements. Stunning table accents for any occasion.', 7, 'starting at', false, '🏺');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Medal Frames', 'centerpieces', 'Custom medal and award display frames. Perfect for sports events, graduations, and achievements.', 7, 'starting at', false, '🏅');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Diaper Cakes', 'centerpieces', 'Adorable diaper cake centerpieces for baby showers. Custom themed designs with practical gifts inside.', 15, 'starting at', true, '🍼');

-- COLUMNS (3 products)
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Spiral Columns', 'columns', 'Classic spiral balloon columns with alternating colors. Perfect for framing entrances and stages.', 60, 'starting at', true, '🌀');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Organic Columns', 'columns', 'Modern organic balloon columns with flowing, natural asymmetric design. Trendy statement pieces.', 90, 'starting at', false, '🎈');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Specialty Columns', 'columns', 'Custom specialty columns with unique designs, premium materials, and personalized elements.', 100, 'starting at', true, '✨');

-- WALLS (3 products)
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Balloon Walls', 'walls', 'Custom balloon wall backdrops in any color scheme. Eye-catching statement pieces for photos and decor.', 300, 'starting at', true, '🎈');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Flower Walls', 'walls', 'Beautiful artificial flower wall backdrops. Romantic and luxurious for weddings and special events.', 275, 'starting at', true, '🌸');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Shimmer Walls', 'walls', 'Stunning shimmer wall backdrops with reflective panels. Perfect for photos and creating elegant ambiance.', 275, 'starting at', true, '✨');

-- SERVICES (7 products)
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Photo Stations', 'services', 'Complete photo station setup with backdrop and props.', 400, 'starting at', true, '📸');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Dessert Tables', 'services', 'Styled dessert table with balloon garland and signage.', 350, 'starting at', false, '🍰');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Custom Printwork', 'services', 'Personalized banners, signs, and printed decorations.', 150, 'starting at', false, '🖨️');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Full Event Decor', 'services', 'Complete event styling from consultation to installation.', 1500, 'starting at', true, '✨');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Drapery Backdrops', 'services', 'Elegant fabric backdrop with professional draping.', 450, 'starting at', false, '🎭');
INSERT INTO products (name, category, description, price, price_label, featured, emoji) VALUES ('Marquee Decor', 'services', 'Custom marquee letters and numbers with LED lighting.', 225, 'starting at', true, '💡');
