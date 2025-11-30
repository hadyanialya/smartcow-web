# 🔧 Setup Environment Variables di Vercel

## ❌ Masalah

- ✅ Localhost bisa → `.env` file sudah benar
- ❌ Vercel tidak bisa → Environment variables belum di-set di Vercel

## ✅ Solusi: Tambahkan Environment Variables di Vercel

### Langkah 1: Buka Vercel Dashboard

1. Buka: https://vercel.com
2. Login ke akun Anda
3. Pilih project: **smartcow-web** (atau nama project Anda)

### Langkah 2: Buka Settings → Environment Variables

1. Klik **Settings** (di menu atas)
2. Klik **Environment Variables** (di sidebar kiri)

### Langkah 3: Tambahkan 2 Variables

Klik **Add New** dan tambahkan:

#### Variable 1:
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://endpykeaditbalyjrxdw.supabase.co`
- **Environment**: Pilih semua (Production, Preview, Development)
- Klik **Save**

#### Variable 2:
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZHB5a2VhZGl0YmFseWpyeGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDEwMzQsImV4cCI6MjA4MDA3NzAzNH0.dENeFjOxHwiubkAtJ6rmKP7dCfu6pa_vQ1UHjR6NdVk`
- **Environment**: Pilih semua (Production, Preview, Development)
- Klik **Save**

### Langkah 4: Redeploy

Setelah menambahkan environment variables, **WAJIB redeploy**:

1. Klik **Deployments** (di menu atas)
2. Klik **3 dots** (⋯) di deployment terbaru
3. Klik **Redeploy**
4. Atau: Push commit baru ke GitHub (Vercel akan auto-deploy)

### Langkah 5: Verifikasi

1. Tunggu deployment selesai (status: **Ready**)
2. Buka aplikasi di URL Vercel
3. Test register user baru
4. Cek Supabase Dashboard → Table Editor → users
5. Data harus muncul! ✅

## 📋 Checklist

- [ ] Buka Vercel Dashboard
- [ ] Settings → Environment Variables
- [ ] Tambahkan `VITE_SUPABASE_URL`
- [ ] Tambahkan `VITE_SUPABASE_ANON_KEY`
- [ ] Pilih semua environments (Production, Preview, Development)
- [ ] Redeploy project
- [ ] Test register user baru
- [ ] Cek data muncul di Supabase

## ⚠️ Catatan Penting

1. **Environment variables di Vercel berbeda dengan `.env` file**
   - `.env` hanya untuk localhost
   - Vercel perlu di-set manual

2. **Setelah menambahkan environment variables, HARUS redeploy**
   - Environment variables hanya terbaca saat build
   - Redeploy diperlukan agar variables ter-load

3. **Pilih semua environments**
   - Production → untuk production URL
   - Preview → untuk preview deployments
   - Development → untuk development

## 🎯 Setelah Setup

Setelah environment variables di-set dan redeploy:
- ✅ Aplikasi di Vercel akan menggunakan Supabase
- ✅ Data akan tersimpan di Supabase database
- ✅ Sama seperti di localhost

## 🆘 Troubleshooting

### Masih tidak bisa setelah redeploy?

1. **Cek environment variables sudah benar**
   - Pastikan nama: `VITE_SUPABASE_URL` (bukan `SUPABASE_URL`)
   - Pastikan value tidak ada spasi di awal/akhir

2. **Cek deployment logs**
   - Vercel Dashboard → Deployments → Klik deployment terbaru
   - Cek Build Logs untuk error

3. **Cek browser console**
   - Buka aplikasi di Vercel
   - F12 → Console
   - Cek apakah ada error "Supabase credentials not found"

4. **Force redeploy**
   - Settings → General → Scroll ke bawah
   - Klik "Redeploy" atau push commit baru

