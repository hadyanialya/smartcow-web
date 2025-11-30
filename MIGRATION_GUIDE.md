# Migration Guide: localStorage → Supabase

## Status: Setup Phase ✅

Setup dasar sudah selesai! Sekarang Anda perlu:

1. ✅ **Install Supabase client** - DONE
2. ✅ **Create database schema** - DONE (file `supabase-schema.sql`)
3. ✅ **Setup configuration** - DONE (file `src/lib/supabase.ts`)
4. ⏳ **Setup Supabase project** - TODO (follow `SUPABASE_SETUP.md`)
5. ⏳ **Switch to Supabase** - TODO (after setup)

## Current State

- **Aplikasi masih menggunakan localStorage** (backward compatible)
- **Supabase code sudah siap** tapi belum aktif
- **Semua fungsi auth masih sync** (tidak breaking changes)

## Next Steps

### Step 1: Setup Supabase Project

Follow instructions in `SUPABASE_SETUP.md`:
1. Create Supabase account & project
2. Get API credentials
3. Create `.env` file with credentials
4. Run SQL schema in Supabase SQL Editor

### Step 2: Enable Supabase (After Setup)

Once Supabase is configured, the app will automatically:
- Use Supabase for authentication
- Use Supabase for all data storage
- Fallback to localStorage if Supabase not configured

### Step 3: Test Migration

1. Test login/register with Supabase
2. Test all features
3. Verify data is stored in Supabase dashboard

### Step 4: Migrate Existing Data (Optional)

If you have existing localStorage data:
1. Export data from localStorage
2. Use migration script (coming soon) or manual import
3. Verify data in Supabase

## Files Changed

### New Files:
- `src/lib/supabase.ts` - Supabase client configuration
- `src/services/supabaseAuth.ts` - Supabase authentication service
- `supabase-schema.sql` - Database schema
- `SUPABASE_SETUP.md` - Setup instructions
- `MIGRATION_GUIDE.md` - This file

### Modified Files:
- `src/utils/auth.ts` - Added Supabase support (with fallback)
- `.gitignore` - Added `.env` to ignore list
- `package.json` - Added `@supabase/supabase-js` dependency

## How It Works

### Before Supabase Setup:
- All functions use localStorage (current behavior)
- No breaking changes
- App works exactly as before

### After Supabase Setup:
- Functions automatically switch to Supabase
- Data stored in Supabase database
- Real-time updates available
- Better security with RLS

## Testing Checklist

After Supabase setup:
- [ ] Login works
- [ ] Registration works
- [ ] User management works
- [ ] Marketplace products work
- [ ] Forum discussions work
- [ ] Chat messages work
- [ ] Educational articles work
- [ ] Robot data works
- [ ] All dashboards work

## Rollback

If you need to rollback:
1. Remove `.env` file
2. App will automatically use localStorage again
3. No code changes needed

## Support

- Supabase Docs: https://supabase.com/docs
- Issues: Check console for errors
- Debug: Check browser console and Supabase dashboard logs

