# 🚀 Quick Setup Supabase - Ikuti Langkah Ini

## ⚡ Langkah Cepat (5 Menit)

### 1. Buat Akun & Project Supabase

1. Buka: https://supabase.com
2. Klik **"Start your project"** atau **"Sign up"**
3. Login dengan GitHub/Google (paling mudah)
4. Setelah login, klik **"New Project"**
5. Isi form:
   - **Name**: `smartcow-web` (atau nama lain)
   - **Database Password**: Buat password kuat (simpan baik-baik!)
   - **Region**: Pilih yang terdekat (misal: Southeast Asia - Singapore)
6. Klik **"Create new project"**
7. Tunggu ~2 menit sampai project siap

### 2. Ambil API Credentials

1. Di Supabase Dashboard, klik **Settings** (icon gear) di sidebar kiri
2. Klik **API** di menu Settings
3. Copy 2 nilai ini:
   - **Project URL** (contoh: `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (panjang sekali, mulai dengan `eyJ...`)

### 3. Setup File .env

1. Di project folder Anda, buat file baru bernama `.env`
2. Copy template ini ke file `.env`:

```env
VITE_SUPABASE_URL=PASTE_PROJECT_URL_DISINI
VITE_SUPABASE_ANON_KEY=PASTE_ANON_KEY_DISINI
```

3. Ganti `PASTE_PROJECT_URL_DISINI` dengan Project URL yang Anda copy
4. Ganti `PASTE_ANON_KEY_DISINI` dengan anon key yang Anda copy
5. Simpan file

**Contoh hasil:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzQ1Njc4OSwiZXhwIjoxOTM5MDMxNzg5fQ.abcdefghijklmnopqrstuvwxyz1234567890
```

### 4. Buat Database Tables

1. Di Supabase Dashboard, klik **SQL Editor** di sidebar kiri
2. Klik **"New query"**
3. Buka file `supabase-schema.sql` di project Anda
4. Copy **SEMUA** isinya (Ctrl+A, Ctrl+C)
5. Paste ke SQL Editor di Supabase
6. Klik **"Run"** (atau tekan F5)
7. Tunggu sampai muncul pesan sukses

### 5. Verifikasi Setup

1. Di Supabase Dashboard, klik **Table Editor** di sidebar
2. Anda harus melihat banyak tables:
   - users
   - products
   - orders
   - forum_discussions
   - chat_messages
   - dll
3. Jika ada, berarti setup berhasil! ✅

### 6. Test di Aplikasi

1. Restart dev server:
   ```bash
   npm run dev
   ```
2. Buka aplikasi di browser
3. Coba register user baru
4. Cek di Supabase Dashboard → Table Editor → users
5. Jika data muncul, berarti berhasil! 🎉

## ❓ Troubleshooting

### Error: "Supabase credentials not found"
- Pastikan file `.env` ada di root folder (sama level dengan `package.json`)
- Pastikan nama variabel benar: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
- Restart dev server setelah membuat `.env`

### Error saat run SQL schema
- Pastikan copy semua isi file `supabase-schema.sql`
- Cek apakah ada error message di SQL Editor
- Pastikan project sudah fully created (tunggu 2-3 menit)

### Data tidak muncul di Supabase
- Cek browser console untuk error
- Pastikan `.env` file sudah benar
- Pastikan dev server sudah restart

## ✅ Checklist

- [ ] Akun Supabase dibuat
- [ ] Project Supabase dibuat
- [ ] API credentials di-copy
- [ ] File `.env` dibuat dengan credentials
- [ ] SQL schema di-run di Supabase
- [ ] Tables muncul di Table Editor
- [ ] Dev server restart
- [ ] Test register/login berhasil
- [ ] Data muncul di Supabase dashboard

## 🎯 Setelah Setup Selesai

Setelah semua langkah di atas selesai, aplikasi akan otomatis:
- ✅ Menggunakan Supabase untuk menyimpan data
- ✅ Data tersimpan di cloud (bukan localStorage)
- ✅ Bisa diakses dari mana saja
- ✅ Real-time updates tersedia

**Selamat! Setup selesai! 🎉**

