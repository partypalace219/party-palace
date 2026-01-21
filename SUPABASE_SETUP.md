# Supabase Setup Guide for Party Palace

## ✅ Completed Steps

1. Created `.env` file with your Supabase credentials
2. Created `supabase-client.js` configuration file
3. Added Supabase CDN script to `index.html`
4. Created `.gitignore` to protect your credentials
5. Created `schema.sql` with complete database schema

## 📋 Next Steps - Run These in Your Supabase Dashboard

### Step 1: Create Database Tables

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the entire contents of `schema.sql` into the editor
5. Click **Run** to create all tables and policies

This will create:
- ✅ `products` table - for your catalog items
- ✅ `contact_submissions` table - for contact form data
- ✅ `waivers` table - for signed liability waivers
- ✅ `contracts` table - for signed party palace agreements
- ✅ `bookings` table - for customer bookings
- ✅ `services` table - for your service offerings
- ✅ Row Level Security (RLS) policies for data protection
- ✅ Sample data for testing

### Step 2: Verify Tables Were Created

1. In Supabase dashboard, click **Table Editor** (left sidebar)
2. You should see all 6 tables listed
3. Click on each table to verify the structure

### Step 3: Set Up Storage (Optional - for Images)

If you want to store product images in Supabase Storage:

1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Name it: `product-images`
4. Make it **Public** (so images can be displayed on your site)
5. Click **Create bucket**

### Step 4: Enable Realtime (Optional)

If you want real-time updates for bookings/submissions:

1. Go to **Database** > **Replication**
2. Enable replication for tables you want to monitor in real-time
3. Recommended: `bookings`, `contact_submissions`

## 🔧 Next Development Steps

Now that the database is set up, we need to update your JavaScript code to:

1. **Fetch products from Supabase** instead of hardcoded data
2. **Save contact form submissions** to the database
3. **Store waivers and contracts** in Supabase (instead of localStorage)
4. **Create bookings** with proper linking to waivers/contracts

Would you like me to:
- A) Update app.js to fetch products from Supabase
- B) Implement the contact form submission
- C) Update waiver/contract storage to use Supabase
- D) All of the above

Let me know and I'll proceed with the code updates!

## 🔐 Security Notes

- ✅ Your `.env` file is gitignored - never commit it!
- ✅ Row Level Security (RLS) is enabled on all tables
- ✅ Public can only INSERT into contact/waiver/contract tables
- ✅ Only authenticated users can READ sensitive data
- ✅ Anon key is safe to use in browser (limited permissions)

## 📊 Database Structure

### Products
- Store all your catalog items (arches, columns, etc.)
- Can be managed through Supabase dashboard

### Contact Submissions
- Stores all contact form submissions
- Includes name, email, phone, event details, message

### Waivers & Contracts
- Replaces localStorage with proper database storage
- Tracks IP address and submission time
- Can be linked to bookings

### Bookings
- Full booking records with customer info
- Links to signed waivers and contracts
- Status tracking (pending, confirmed, completed)

### Services
- Your service packages (Wedding, Birthday, Corporate)
- Similar to products but for service offerings

## 🎯 Testing Your Setup

After running the schema.sql:

1. Go to Table Editor > products
2. You should see 3 sample products
3. Go to Table Editor > services
4. You should see 3 sample services

These can be deleted or modified as needed!
