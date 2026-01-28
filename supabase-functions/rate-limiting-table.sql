-- Rate limiting table for form submissions
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    form_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by IP and time
CREATE INDEX IF NOT EXISTS idx_form_submissions_ip_time
ON form_submissions (ip_address, created_at DESC);

-- Enable Row Level Security
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Policy to allow Edge Functions (service role) to insert
CREATE POLICY "Allow service role inserts" ON form_submissions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy to allow Edge Functions (service role) to select for rate limit checks
CREATE POLICY "Allow service role selects" ON form_submissions
    FOR SELECT
    TO service_role
    USING (true);

-- Optional: Auto-delete old entries (older than 24 hours) to keep table small
-- You can set this up as a scheduled function or cron job in Supabase
-- DELETE FROM form_submissions WHERE created_at < NOW() - INTERVAL '24 hours';
