# 🧪 Test Supabase Connection

## ✅ Yang Sudah Diperbaiki

1. ✅ `registerUser` sekarang menggunakan Supabase (jika configured)
2. ✅ `loginUser` sekarang menggunakan Supabase (jika configured)
3. ✅ LoginPage sudah di-update untuk handle async functions

## 🔍 Cara Test

### 1. Pastikan File .env Ada
```bash
# Cek apakah file .env ada
Get-Content .env
```

Harus muncul:
```
VITE_SUPABASE_URL=https://endpykeaditbalyjrxdw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Pastikan SQL Schema Sudah Di-Run

1. Buka Supabase Dashboard
2. Klik **Table Editor**
3. Pastikan ada table **users**

Jika belum ada, run SQL schema:
1. Klik **SQL Editor** → **New Query**
2. Copy semua isi dari `supabase-schema.sql`
3. Paste dan klik **Run**

### 3. Restart Dev Server

```bash
# Stop server (Ctrl+C)
# Lalu restart
npm run dev
```

**PENTING**: Restart diperlukan agar `.env` file dibaca!

### 4. Test di Browser

1. Buka aplikasi di browser
2. Buka **Developer Console** (F12)
3. Cek apakah ada pesan:
   - ✅ "Supabase authentication enabled" → Berhasil!
   - ⚠️ "Supabase not configured" → Cek file .env
   - ❌ Error → Cek console untuk detail

### 5. Test Register

1. Klik **Register** tab
2. Isi form:
   - Name: Test User
   - Email: test@example.com
   - Password: test123
   - Role: Farmer
3. Klik **Register**
4. Cek Supabase Dashboard → **Table Editor** → **users**
5. Data harus muncul! ✅

### 6. Test Login

1. Login dengan user yang baru dibuat
2. Harus bisa login dan masuk dashboard ✅

## 🐛 Troubleshooting

### Data Tidak Muncul di Supabase

**Cek 1: File .env**
- Pastikan file `.env` ada di root folder
- Pastikan tidak ada typo di variable names
- Restart dev server setelah membuat/update .env

**Cek 2: Browser Console**
- Buka Developer Console (F12)
- Cek apakah ada error
- Cek apakah ada pesan "Supabase authentication enabled"

**Cek 3: Supabase Dashboard**
- Pastikan table `users` sudah dibuat
- Cek apakah ada error di Supabase Logs

**Cek 4: Network Tab**
- Buka Network tab di Developer Console
- Register user baru
- Cek apakah ada request ke Supabase (harus ada request ke `endpykeaditbalyjrxdw.supabase.co`)

### Error: "Failed to fetch"

**Kemungkinan:**
1. SQL schema belum di-run → Run SQL schema dulu
2. RLS policies terlalu ketat → Cek RLS policies di Supabase
3. Network issue → Cek koneksi internet

### Error: "Supabase credentials not found"

**Solusi:**
1. Pastikan file `.env` ada
2. Pastikan variable names benar: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
3. Restart dev server

## ✅ Checklist

- [ ] File `.env` ada dan benar
- [ ] SQL schema sudah di-run di Supabase
- [ ] Table `users` muncul di Supabase Table Editor
- [ ] Dev server sudah restart
- [ ] Browser console tidak ada error
- [ ] Test register → data muncul di Supabase
- [ ] Test login → berhasil masuk dashboard

## 🎉 Setelah Berhasil

Jika semua test berhasil, berarti:
- ✅ Supabase sudah terhubung
- ✅ Data tersimpan di cloud
- ✅ Bisa diakses dari mana saja
- ✅ Siap untuk production!

