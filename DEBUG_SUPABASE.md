# 🐛 Debug: Data Tidak Masuk ke Database

## 🔍 Checklist Debugging

### 1. Cek Environment Variables

**Di Local (Development):**
```bash
# Cek file .env
Get-Content .env
```

Harus ada:
```
VITE_SUPABASE_URL=https://endpykeaditbalyjrxdw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Di Vercel (Production):**
1. Buka Vercel Dashboard → Project → Settings → Environment Variables
2. Pastikan ada:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### 2. Cek SQL Schema Sudah Di-Run

1. Buka Supabase Dashboard: https://app.supabase.com/project/endpykeaditbalyjrxdw
2. Klik **Table Editor**
3. Pastikan ada table **users**
4. Jika tidak ada → Run SQL schema dari `supabase-schema.sql`

### 3. Cek Browser Console

1. Buka aplikasi di browser
2. Tekan **F12** → buka **Console** tab
3. Coba register user baru
4. Cek apakah ada error:
   - ❌ "Failed to fetch" → Koneksi masalah
   - ❌ "relation does not exist" → SQL schema belum di-run
   - ❌ "new row violates row-level security" → RLS policy masalah
   - ⚠️ "Supabase credentials not found" → .env tidak terbaca

### 4. Cek Network Tab

1. Buka **Network** tab di Developer Console
2. Filter: **Fetch/XHR**
3. Coba register user baru
4. Cek apakah ada request ke Supabase:
   - Harus ada request ke: `endpykeaditbalyjrxdw.supabase.co`
   - Status harus: **200 OK** atau **201 Created**
   - Jika **401/403** → RLS policy masalah
   - Jika **404** → Table tidak ada

### 5. Cek Supabase Logs

1. Buka Supabase Dashboard → **Logs** → **API Logs**
2. Coba register user baru
3. Cek apakah ada error di logs

### 6. Test Koneksi Supabase

Buka browser console dan run:
```javascript
// Test koneksi
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://endpykeaditbalyjrxdw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZHB5a2VhZGl0YmFseWpyeGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDEwMzQsImV4cCI6MjA4MDA3NzAzNH0.dENeFjOxHwiubkAtJ6rmKP7dCfu6pa_vQ1UHjR6NdVk'
);

// Test query
supabase.from('users').select('*').limit(1).then(console.log);
```

## 🛠️ Solusi Umum

### Masalah 1: SQL Schema Belum Di-Run

**Gejala:**
- Error: "relation 'users' does not exist"
- Table tidak muncul di Table Editor

**Solusi:**
1. Buka Supabase → SQL Editor
2. Copy semua isi `supabase-schema.sql`
3. Paste dan Run

### Masalah 2: RLS Policy Terlalu Ketat

**Gejala:**
- Error: "new row violates row-level security"
- Status 403 di Network tab

**Solusi:**
1. Buka Supabase → Authentication → Policies
2. Atau run SQL ini:
```sql
-- Allow all for now (untuk testing)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON users;
CREATE POLICY "Allow all operations for authenticated users" ON users FOR ALL USING (true);
```

### Masalah 3: Environment Variables Tidak Terbaca

**Gejala:**
- Console: "Supabase credentials not found"
- Data tidak masuk

**Solusi:**
- **Local**: Restart dev server setelah membuat/update .env
- **Vercel**: Tambahkan di Environment Variables dan redeploy

### Masalah 4: Dev Server Belum Restart

**Gejala:**
- .env sudah dibuat tapi tidak terbaca

**Solusi:**
```bash
# Stop server (Ctrl+C)
# Restart
npm run dev
```

## 📋 Quick Test

1. ✅ Cek .env file ada dan benar
2. ✅ Cek table users ada di Supabase
3. ✅ Restart dev server
4. ✅ Buka browser console (F12)
5. ✅ Test register user baru
6. ✅ Cek Network tab untuk request ke Supabase
7. ✅ Cek Supabase Table Editor untuk data baru

## 🆘 Jika Masih Tidak Bisa

Kirimkan:
1. Screenshot browser console (error message)
2. Screenshot Network tab (request ke Supabase)
3. Screenshot Supabase Table Editor
4. Screenshot Supabase API Logs

