-- Party Palace Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    price_label TEXT DEFAULT 'Starting at',
    featured BOOLEAN DEFAULT false,
    badge TEXT,
    emoji TEXT,
    gradient TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTACT FORM SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    event_date DATE,
    event_type TEXT,
    guest_count INTEGER,
    message TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WAIVERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS waivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    signature TEXT NOT NULL,
    date DATE NOT NULL,
    event_date DATE,
    accepted BOOLEAN DEFAULT true,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONTRACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    signature TEXT NOT NULL,
    date DATE NOT NULL,
    event_date DATE,
    accepted BOOLEAN DEFAULT true,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    event_date DATE NOT NULL,
    event_type TEXT,
    venue_address TEXT,
    guest_count INTEGER,
    services_requested TEXT[],
    special_requests TEXT,
    waiver_id UUID REFERENCES waivers(id),
    contract_id UUID REFERENCES contracts(id),
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price TEXT,
    features TEXT[],
    emoji TEXT,
    gradient TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at ON contact_submissions(submitted_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Products: Public read access, authenticated write
CREATE POLICY "Allow public read access to products"
    ON products FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to insert products"
    ON products FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update products"
    ON products FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Contact Submissions: Anyone can submit, only authenticated can read
CREATE POLICY "Allow anyone to submit contact forms"
    ON contact_submissions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read contact submissions"
    ON contact_submissions FOR SELECT
    USING (auth.role() = 'authenticated');

-- Waivers: Anyone can create, only authenticated can read
CREATE POLICY "Allow anyone to sign waivers"
    ON waivers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read waivers"
    ON waivers FOR SELECT
    USING (auth.role() = 'authenticated');

-- Contracts: Anyone can create, only authenticated can read
CREATE POLICY "Allow anyone to sign contracts"
    ON contracts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read contracts"
    ON contracts FOR SELECT
    USING (auth.role() = 'authenticated');

-- Bookings: Anyone can create, only authenticated can read
CREATE POLICY "Allow anyone to create bookings"
    ON bookings FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read bookings"
    ON bookings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update bookings"
    ON bookings FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Services: Public read access, authenticated write
CREATE POLICY "Allow public read access to services"
    ON services FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to insert services"
    ON services FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update services"
    ON services FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ============================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ============================================

-- Sample Products
INSERT INTO products (name, category, description, price, emoji, gradient, featured) VALUES
('Classic Balloon Arch', 'Arches', 'Elegant curved balloon arch perfect for any event entrance', 299.99, '🎈', 'linear-gradient(135deg, #667eea, #764ba2)', true),
('Grand Column Set', 'Columns', 'Pair of stunning balloon columns for grand entrances', 249.99, '🏛️', 'linear-gradient(135deg, #4facfe, #00f2fe)', true),
('Floral Centerpiece', 'Centerpieces', 'Beautiful balloon centerpiece with floral accents', 89.99, '💐', 'linear-gradient(135deg, #f093fb, #f5576c)', false);

-- Sample Services
INSERT INTO services (name, category, description, price, emoji, gradient, features) VALUES
('Wedding Package', 'Weddings', 'Complete decoration package for your special day', 'Starting at $1,499', '💒', 'linear-gradient(135deg, #f093fb, #f5576c)',
    ARRAY['Ceremony arch', 'Reception centerpieces', 'Photo backdrop', 'Free consultation']),
('Birthday Bash', 'Birthdays', 'Make their birthday unforgettable', 'Starting at $599', '🎂', 'linear-gradient(135deg, #667eea, #764ba2)',
    ARRAY['Balloon bouquets', 'Custom banner', 'Centerpieces', 'Party favors']),
('Corporate Event', 'Corporate', 'Professional event decorations', 'Custom Quote', '🏢', 'linear-gradient(135deg, #4facfe, #00f2fe)',
    ARRAY['Brand colors', 'Logo integration', 'Professional setup', 'Flexible packages']);
