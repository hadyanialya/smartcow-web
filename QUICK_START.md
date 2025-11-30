# ⚡ Quick Start - Setup Supabase dalam 5 Menit

## 🎯 Tujuan
Migrasi dari localStorage ke Supabase database.

## 📋 Checklist Setup

### Step 1: Buat Supabase Project (2 menit)
1. Buka https://supabase.com → Sign up/Login
2. Klik "New Project"
3. Isi:
   - Name: `smartcow-web`
   - Password: (buat password kuat, simpan!)
   - Region: Pilih terdekat
4. Klik "Create" → Tunggu 2 menit

### Step 2: Ambil API Keys (1 menit)
1. Dashboard → Settings → API
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### Step 3: Buat File .env (30 detik)
Buat file `.env` di root project:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Run Database Schema (1 menit)
1. Supabase Dashboard → SQL Editor → New Query
2. Buka file `supabase-schema.sql`
3. Copy semua → Paste di SQL Editor
4. Klik "Run"

### Step 5: Test (30 detik)
1. Restart: `npm run dev`
2. Test register user baru
3. Cek Supabase → Table Editor → users
4. Jika data muncul → ✅ BERHASIL!

## 🎉 Selesai!

Aplikasi sekarang menggunakan Supabase database!

## 📚 Detail Lebih Lanjut
Lihat `setup-supabase.md` untuk panduan lengkap.

