# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Sign in
3. Click "New Project"
4. Fill in:
   - **Name**: smartcow-web (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project to be created (takes ~2 minutes)

## Step 2: Get API Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 3: Setup Environment Variables

1. Create a `.env` file in the root directory
2. Add your credentials:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Create Database Tables

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New query"
3. Copy and paste the entire content from `supabase-schema.sql`
4. Click "Run" (or press Ctrl+Enter)
5. Wait for all tables to be created

## Step 5: Verify Tables

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - users
   - products
   - orders
   - forum_discussions
   - forum_comments
   - chat_messages
   - educational_articles
   - pending_articles
   - robot_status
   - robot_activities
   - robot_logs
   - user_settings
   - notifications

## Step 6: Test Connection

1. Run `npm run dev`
2. Check browser console for any Supabase connection errors
3. If you see "Supabase credentials not found" warning, make sure `.env` file is correct

## Step 7: Migrate Data (Optional)

If you have existing data in localStorage that you want to migrate:
1. Export data from localStorage (can be done via browser console)
2. Use Supabase dashboard or API to import data
3. Or use the migration script (coming soon)

## Security Notes

- **Never commit `.env` file** to Git (already in `.gitignore`)
- The `anon` key is safe to use in frontend (it's public)
- Row Level Security (RLS) is enabled for all tables
- For production, customize RLS policies based on your needs

## Troubleshooting

### "Supabase credentials not found"
- Make sure `.env` file exists in root directory
- Check that variable names start with `VITE_`
- Restart dev server after creating `.env`

### "Failed to fetch" errors
- Check your Supabase URL is correct
- Check your internet connection
- Verify RLS policies allow your operations

### Tables not created
- Check SQL Editor for error messages
- Make sure you ran the entire `supabase-schema.sql` file
- Check that UUID extension is enabled

## Next Steps

After setup is complete:
1. ✅ Database schema created
2. ⏳ Migrate authentication (in progress)
3. ⏳ Migrate marketplace/products
4. ⏳ Migrate forum
5. ⏳ Migrate chat
6. ⏳ Migrate educational content
7. ⏳ Migrate robot data
8. ⏳ Update all components

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com

