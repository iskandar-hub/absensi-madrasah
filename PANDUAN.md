# Panduan Lengkap: Aplikasi Absensi Madrasah
> Next.js + Supabase + Vercel | Dibuat untuk pengguna awam coding

---

## Gambaran Aplikasi

**Nama Project:** `absensi-madrasah`  
**Stack Teknologi:** Next.js (frontend+backend) · Supabase (database) · Vercel (hosting)  
**Login:** Google OAuth — setiap pengguna adalah admin untuk datanya sendiri  
**Fitur Utama:**
- Multi-sekolah dan multi-kelas per akun
- Absensi H/S/I/A dengan tombol "Hadir Semua"
- Penilaian Kurikulum Merdeka KBC Kemenag (Formatif & Sumatif)
- Jurnal Guru format Kemenag terbaru
- Rekap absensi & nilai — export PDF, Excel, dan cetak langsung

---

## Roadmap (7 Fase)

| Fase | Nama | Estimasi |
|------|------|----------|
| 1 | Setup Akun & Tools | ~1 hari |
| 2 | Setup Database Supabase | ~1–2 hari |
| 3 | Setup Project Next.js | ~1–2 hari |
| 4 | Halaman Login, Sekolah, Kelas, Siswa | ~3–4 hari |
| 5 | Absensi & Penilaian | ~3–4 hari |
| 6 | Jurnal Guru | ~2 hari |
| 7 | Rekap, Export PDF & Excel, Cetak | ~2–3 hari |

**Total estimasi: 2–3 minggu** (dikerjakan santai sambil belajar)

---

## FASE 1 — Setup Akun & Tools

### Langkah 1: Install Node.js
1. Buka https://nodejs.org
2. Klik tombol **LTS** (versi stabil)
3. Download dan install (next → next → finish)
4. Verifikasi: buka Command Prompt → ketik `node --version`
5. Harus muncul angka seperti `v20.x.x`

### Langkah 2: Install VS Code
1. Buka https://code.visualstudio.com
2. Klik **Download for Windows** → install
3. Buka VS Code, install extension berikut (ikon kotak di sidebar kiri):
   - `ES7+ React/Redux/React-Native snippets`
   - `Tailwind CSS IntelliSense`
   - `Prettier - Code formatter`

### Langkah 3: Buat Akun GitHub
1. Buka https://github.com → klik **Sign up**
2. Daftar dengan email → pilih plan **Free**
3. Verifikasi email

### Langkah 4: Buat Akun Supabase
1. Buka https://supabase.com → klik **Start your project**
2. Login dengan akun GitHub
3. Klik **New project**, isi:
   - Name: `absensi-madrasah`
   - Database Password: *(buat yang kuat — CATAT DI TEMPAT AMAN)*
   - Region: **Southeast Asia (Singapore)**
4. Klik **Create new project** — tunggu ~2 menit

### Langkah 5: Buat Akun Vercel
1. Buka https://vercel.com → klik **Sign Up**
2. Pilih **Continue with GitHub**
3. Ikuti proses verifikasi

### Langkah 6: Buat Project Next.js
Buka Command Prompt, jalankan satu per satu:
```bash
cd Desktop
npx create-next-app@latest absensi-madrasah
```

Jawab pertanyaan seperti ini:
```
TypeScript?          → No
ESLint?              → Yes
Tailwind CSS?        → Yes
src/ directory?      → No
App Router?          → Yes
Customize alias?     → No
```

Lalu buka di VS Code:
```bash
cd absensi-madrasah
code .
```

---

## FASE 2 — Setup Database Supabase

### Struktur Tabel

Semua tabel menggunakan `user_id` yang terhubung ke akun Google pengguna.  
Row Level Security (RLS) memastikan data tiap pengguna terisolasi otomatis.

#### Tabel `schools`
```sql
create table schools (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  nama text not null,
  npsn text,
  kepala_sekolah text,
  alamat text,
  created_at timestamp with time zone default now()
);
```

#### Tabel `classes`
```sql
create table classes (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references schools on delete cascade not null,
  user_id uuid references auth.users not null,
  nama_kelas text not null,
  tingkat text,
  tahun_ajaran text,
  wali_kelas text,
);
```

#### Tabel `students`
```sql
create table students (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes on delete cascade not null,
  user_id uuid references auth.users not null,
  nomor_urut integer,
  nama text not null,
  nisn text,
  jenis_kelamin text check (jenis_kelamin in ('L','P')),
);
```

#### Tabel `attendances`
```sql
create table attendances (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students on delete cascade not null,
  class_id uuid references classes not null,
  user_id uuid references auth.users not null,
  tanggal date not null,
  status text check (status in ('H','S','I','A')) not null,
  keterangan text,
  created_at timestamp with time zone default now()
);
```

#### Tabel `grades`
```sql
create table grades (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students on delete cascade not null,
  class_id uuid references classes not null,
  user_id uuid references auth.users not null,
  mapel text not null,
  semester text not null,
  tahun_ajaran text not null,
  -- Nilai Formatif
  nilai_formatif_1 numeric,
  nilai_formatif_2 numeric,
  nilai_formatif_3 numeric,
  nilai_formatif_4 numeric,
  rata_formatif numeric,
  -- Nilai Sumatif Tengah Semester
  sumatif_tengah numeric,
  -- Nilai Sumatif Akhir Semester
  sumatif_akhir numeric,
  -- Projek Penguatan Profil Pelajar Pancasila (P5)
  nilai_p5 numeric,
  -- Nilai Akhir (dihitung otomatis)
  nilai_akhir numeric,
  predikat text,
  capaian_kompetensi text,
  created_at timestamp with time zone default now()
);
```

#### Tabel `journals`
```sql
create table journals (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes not null,
  user_id uuid references auth.users not null,
  tanggal date not null,
  mapel text not null,
  pertemuan_ke integer,
  -- Format Jurnal Kemenag Kurikulum Merdeka
  tujuan_pembelajaran text,
  materi_pokok text,
  model_pembelajaran text,
  metode_pembelajaran text,
  media_pembelajaran text,
  kegiatan_pembukaan text,
  kegiatan_inti text,
  kegiatan_penutup text,
  penilaian text,
  refleksi text,
  tindak_lanjut text,
  jumlah_hadir integer,
  jumlah_sakit integer,
  jumlah_izin integer,
  jumlah_alpha integer,
  created_at timestamp with time zone default now()
);
```
### Tabel Mata Pelajaran
``` sql
create table subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  nama text not null,
  created_at timestamptz default now()
);
```

### Tabel Jadwal Mengajar
```SQL
create table schedules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  subject_id uuid references subjects on delete cascade not null,
  class_id uuid references classes on delete cascade not null,
  hari text check (hari in ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')) not null,
  jam_ke integer not null,
  jam_mulai time not null,
  jam_selesai time not null,
  tahun_ajaran text not null
);
```

### Setup Row Level Security (RLS)
Di Supabase SQL Editor, jalankan untuk setiap tabel:
```sql
-- Contoh untuk tabel schools (ulangi pola ini untuk semua tabel)
alter table schools enable row level security;

create policy "Users can manage their own schools"
on schools for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### Aktifkan Google OAuth di Supabase
1. Buka project Supabase → **Authentication** → **Providers**
2. Klik **Google** → toggle **Enable**
3. Salin **Callback URL** yang ditampilkan
4. Buka https://console.cloud.google.com → buat project baru
5. Aktifkan **Google+ API** → buat **OAuth 2.0 Credentials**
6. Masukkan Callback URL dari Supabase ke bagian "Authorized redirect URIs"
7. Salin **Client ID** dan **Client Secret** → paste ke Supabase

---

## FASE 3 — Setup Project Next.js

### Install Dependencies
Buka Terminal di VS Code (`Ctrl + \``), jalankan:
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
npm install jspdf jspdf-autotable xlsx
npm install lucide-react
```

### File `.env.local`
Buat file `.env.local` di root project, isi:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
*(nilai ini ada di Supabase → Settings → API)*

### Struktur Folder Target
```
absensi-madrasah/
├── app/
│   ├── layout.js
│   ├── page.js                    ← Landing/Login page
│   ├── dashboard/
│   │   └── page.js                ← Dashboard utama
│   ├── sekolah/
│   │   └── page.js                ← Manajemen sekolah
│   ├── kelas/
│   │   ├── page.js                ← Daftar kelas
│   │   └── [id]/
│   │       └── page.js            ← Detail kelas
│   ├── siswa/
│   │   └── [kelasId]/
│   │       └── page.js            ← Daftar siswa per kelas
│   ├── absensi/
│   │   └── [kelasId]/
│   │       └── page.js            ← Form absensi harian
│   ├── penilaian/
│   │   └── [kelasId]/
│   │       └── page.js            ← Input nilai
│   ├── jurnal/
│   │   └── page.js                ← Jurnal guru
│   └── rekap/
│       └── page.js                ← Rekap & export
├── components/
│   ├── Navbar.js
│   ├── Sidebar.js
│   └── ...
├── lib/
│   └── supabase.js                ← Koneksi Supabase
├── .env.local
└── ...
```

### File `lib/supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Push ke GitHub & Deploy ke Vercel
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAMU_GITHUB/absensi-madrasah.git
git push -u origin main
```

Di Vercel:
1. Klik **Add New Project** → import dari GitHub
2. Pilih repo `absensi-madrasah`
3. Tambahkan **Environment Variables** (isi sama seperti `.env.local`)
4. Klik **Deploy**

---

## FASE 4 — Halaman Login, Sekolah, Kelas, Siswa

*(Panduan detail akan dibuat bersama saat coding)*

Halaman yang dibuat:
- `/` → Login dengan Google
- `/dashboard` → Ringkasan data (jumlah sekolah, kelas, siswa, absensi hari ini)
- `/sekolah` → Tambah/edit/hapus sekolah
- `/kelas` → Tambah/edit/hapus kelas per sekolah
- `/siswa/[kelasId]` → Input data siswa (nomor, nama, L/P)

---

## FASE 5 — Absensi & Penilaian

*(Panduan detail akan dibuat bersama saat coding)*

Fitur absensi:
- Pilih kelas dan tanggal
- Daftar siswa tampil otomatis
- Klik tombol H/S/I/A per siswa
- Tombol **"Hadir Semua"** untuk isi cepat
- Auto-save saat klik

Fitur penilaian KBC Kemenag:
- Pilih kelas, mapel, semester
- Input nilai: Formatif 1–4, Sumatif Tengah, Sumatif Akhir, P5
- Hitung otomatis rata-rata dan predikat (A/B/C/D)
- Input Capaian Kompetensi (deskripsi narasi)

---

## FASE 6 — Jurnal Guru

*(Panduan detail akan dibuat bersama saat coding)*

Komponen jurnal (format Kemenag Kurikulum Merdeka):
- Tanggal dan pertemuan ke-
- Mata pelajaran
- Tujuan Pembelajaran (TP)
- Alur Tujuan Pembelajaran (ATP)
- Materi Pokok
- Model & Metode Pembelajaran
- Media Pembelajaran
- Kegiatan: Pendahuluan, Inti, Penutup
- Penilaian Proses
- Refleksi Guru
- Tindak Lanjut
- Rekap kehadiran siswa di hari tersebut

---

## FASE 7 — Rekap, Export, Cetak

*(Panduan detail akan dibuat bersama saat coding)*

Fitur rekap:
- Rekap absensi harian/bulanan/semester per kelas
- Rekap nilai per mapel per semester
- Grafik ringkasan (opsional)

Export:
- **PDF** menggunakan library `jspdf` + `jspdf-autotable`
- **Excel** menggunakan library `xlsx`
- **Cetak langsung** menggunakan `window.print()` + CSS print

---

## Catatan Penting

### Simpan Informasi Ini di Tempat Aman
| Item | Nilai |
|------|-------|
| Supabase Project URL | `https://xxxxxx.supabase.co` |
| Supabase Anon Key | `eyJxxxxxx...` |
| Supabase DB Password | *(yang dibuat saat setup)* |
| GitHub username | |
| Vercel domain | `absensi-madrasah.vercel.app` |

### Perintah Terminal yang Sering Dipakai
```bash
npm run dev          # Jalankan aplikasi di laptop (localhost:3000)
npm run build        # Build untuk production
git add .            # Tandai semua perubahan
git commit -m "..."  # Simpan perubahan dengan pesan
git push             # Upload ke GitHub (auto-deploy ke Vercel)
```

### Kalau Ada Error
1. Baca pesan error dengan teliti — biasanya ada petunjuk di baris terakhir
2. Salin pesan error → tanya ke Claude atau Google
3. Cek file `.env.local` — pastikan URL dan Key Supabase sudah benar
4. Pastikan `npm run dev` dijalankan dari folder yang benar

---

*Panduan ini dibuat bersama Claude (claude.ai) — perbarui setiap kali ada kemajuan baru.*