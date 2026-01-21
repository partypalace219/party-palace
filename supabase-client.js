// Supabase Client Configuration
// This file initializes the Supabase client for browser use

// For production: Replace these with your actual values or use a build tool to inject them
const SUPABASE_URL = 'https://nsedpvrqhxcikhlieize.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
