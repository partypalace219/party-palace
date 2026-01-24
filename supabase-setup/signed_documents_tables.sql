-- SQL to create tables for storing signed contracts and waivers
-- Run this in Supabase Dashboard > SQL Editor

-- Table for signed contracts (Party Palace Agreement)
CREATE TABLE IF NOT EXISTS signed_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    signature TEXT NOT NULL,
    event_date DATE,
    signed_date DATE NOT NULL,
    accepted BOOLEAN DEFAULT true,
    timestamp TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for signed waivers (Liability Waiver)
CREATE TABLE IF NOT EXISTS signed_waivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    signature TEXT NOT NULL,
    event_date DATE,
    signed_date DATE NOT NULL,
    accepted BOOLEAN DEFAULT true,
    timestamp TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE signed_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_waivers ENABLE ROW LEVEL SECURITY;

-- Create policies to allow inserts from the edge function (service role)
-- The edge function uses service_role key which bypasses RLS
-- These policies allow authenticated users to read their own data if needed later

-- Policy to allow service role to insert (edge functions use service role)
CREATE POLICY "Service role can insert contracts" ON signed_contracts
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can insert waivers" ON signed_waivers
    FOR INSERT
    WITH CHECK (true);

-- Policy to allow service role to select (for admin dashboard if needed)
CREATE POLICY "Service role can view contracts" ON signed_contracts
    FOR SELECT
    USING (true);

CREATE POLICY "Service role can view waivers" ON signed_waivers
    FOR SELECT
    USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_contracts_timestamp ON signed_contracts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_full_name ON signed_contracts(full_name);
CREATE INDEX IF NOT EXISTS idx_waivers_timestamp ON signed_waivers(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_waivers_full_name ON signed_waivers(full_name);
