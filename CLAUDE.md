@AGENTS.md
# 📚 Panduan Lengkap Aplikasi Absensi Madrasah
> Stack: **Next.js + Supabase + Vercel** | Dibuat: 2026

---

## 🗺️ Gambaran Besar

Aplikasi absensi berbasis web publik untuk madrasah dengan fitur:
- Login via akun Google (tanpa admin terpusat — setiap pengguna adalah admin untuk datanya sendiri)
- Multi-sekolah & multi-kelas per pengguna
- Absensi H/S/I/A + tombol Hadir Semua
- Penilaian Kurikulum Merdeka KBC Kemenag (Formatif & Sumatif)
- Jurnal guru format Kemenag
- Rekap + export PDF & Excel

---

## ✅ FASE 1 — Setup Akun & Tools

### 1.1 Install Node.js
1. Buka https://nodejs.org
2. Klik tombol **LTS** → download & install
3. Buka Command Prompt (`Win + R` → ketik `cmd` → Enter)
4. Verifikasi:
   ```
   node --version
   ```
   Harus muncul `v20.x.x` atau lebih tinggi

### 1.2 Install VS Code
1. Buka https://code.visualstudio.com → Download for Windows → install
2. Buka VS Code, install extension berikut (ikon kotak-kotak di sidebar kiri):
   - `ES7+ React/Redux/React-Native snippets`
   - `Tailwind CSS IntelliSense`
   - `Prettier - Code formatter`

### 1.3 Buat Akun GitHub
1. Buka https://github.com → Sign up
2. Daftar dengan email → pilih plan **Free** → verifikasi email

### 1.4 Buat Akun Supabase
1. Buka https://supabase.com → Start your project
2. Login dengan akun GitHub
3. Klik **New project**, isi:
   - Name: `absensi-madrasah`
   - Database Password: *(buat kuat, catat di tempat aman!)*
   - Region: **Southeast Asia (Singapore)**
4. Klik **Create new project** → tunggu ~2 menit

### 1.5 Buat Akun Vercel
1. Buka https://vercel.com → Sign Up
2. Pilih **Continue with GitHub**

### 1.6 Buat Project Next.js
Buka Command Prompt, jalankan:
```bash
cd Desktop
npx create-next-app@latest absensi-madrasah
```
Jawab pertanyaan:
```
TypeScript?          → No
ESLint?              → Yes
Tailwind CSS?        → Yes
src/ directory?      → No
App Router?          → Yes
Customize import?    → No
```
Lalu buka project di VS Code:
```bash
cd absensi-madrasah
code .
```

---

## ✅ FASE 2 — Setup Database Supabase

### 2.1 Buat Tabel di Supabase

Masuk ke **Supabase Dashboard** → pilih project → klik **SQL Editor** → jalankan SQL berikut:

```sql
-- Tabel sekolah (milik tiap pengguna)
CREATE TABLE schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  npsn TEXT,
  alamat TEXT,
  kepala_sekolah TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel kelas
CREATE TABLE classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_kelas TEXT NOT NULL,
  tingkat TEXT,
  tahun_ajaran TEXT,
  wali_kelas TEXT
);

-- Tabel siswa
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nomor_urut INT,
  nama TEXT NOT NULL,
  nisn TEXT,
  jenis_kelamin TEXT CHECK (jenis_kelamin IN ('L', 'P'))
);

-- Tabel absensi
CREATE TABLE attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  status TEXT CHECK (status IN ('H', 'S', 'I', 'A')) DEFAULT 'H',
  keterangan TEXT
);

-- Tabel penilaian (Kurikulum Merdeka KBC Kemenag)
CREATE TABLE grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mapel TEXT NOT NULL,
  semester INT CHECK (semester IN (1, 2)),
  tahun_ajaran TEXT,
  -- Formatif
  nilai_formatif_1 NUMERIC(5,2),
  nilai_formatif_2 NUMERIC(5,2),
  nilai_formatif_3 NUMERIC(5,2),
  rata_formatif NUMERIC(5,2),
  -- Sumatif Tengah Semester
  nilai_sts NUMERIC(5,2),
  -- Sumatif Akhir Semester
  nilai_sas NUMERIC(5,2),
  -- Nilai Akhir (otomatis dihitung)
  nilai_akhir NUMERIC(5,2),
  predikat TEXT,
  deskripsi TEXT
);

-- Tabel jurnal guru
CREATE TABLE journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  mapel TEXT,
  pertemuan_ke INT,
  tujuan_pembelajaran TEXT,
  materi_pokok TEXT,
  kegiatan_pembukaan TEXT,
  kegiatan_inti TEXT,
  kegiatan_penutup TEXT,
  media_pembelajaran TEXT,
  penilaian TEXT,
  refleksi TEXT,
  tindak_lanjut TEXT
);
```

### 2.2 Aktifkan Row Level Security (RLS)

Jalankan di SQL Editor Supabase:

```sql
-- Aktifkan RLS semua tabel
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

-- Policy: user hanya bisa akses data miliknya sendiri
CREATE POLICY "user owns schools" ON schools FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user owns classes" ON classes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user owns students" ON students FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user owns attendances" ON attendances FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user owns grades" ON grades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user owns journals" ON journals FOR ALL USING (auth.uid() = user_id);
```

### 2.3 Aktifkan Google OAuth di Supabase

1. Di Supabase Dashboard → **Authentication** → **Providers**
2. Klik **Google** → aktifkan toggle
3. Catat **Callback URL** (format: `https://xxx.supabase.co/auth/v1/callback`)(https://pbdnqevzmwanxpmrrbue.supabase.co/auth/v1/callback)(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)
4. Buka https://console.cloud.google.com → buat project baru
5. Masuk ke **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
6. Pilih **Web application**, isi Authorized redirect URIs dengan Callback URL dari Supabase
7. Salin **Client ID** dan **Client Secret** → paste ke Supabase Google Provider
8. Klik **Save**

---

## ✅ FASE 3 — Setup Project Next.js

### 3.1 Install Dependencies

Buka Terminal di VS Code (`Ctrl + `` ` ``), jalankan:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react
npm install jspdf jspdf-autotable
npm install xlsx
npm install react-to-print
```

### 3.2 Ambil Kredensial Supabase

Di Supabase Dashboard → **Project Settings** → **API**:
- Catat **Project URL** (https://pbdnqevzmwanxpmrrbue.supabase.co/rest/v1/)
- Catat **anon public** key (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiZG5xZXZ6bXdhbnhwbXJyYnVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTkzNzAsImV4cCI6MjA5NTg5NTM3MH0.lL7YMVcn22vWE7Er3Sy3m3jPO06-c7ebgFFwwEaRYH4)

### 3.3 Buat File .env.local

Di root project, buat file `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### 3.4 Buat Konfigurasi Supabase

Buat file `lib/supabase.js`:
```javascript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

### 3.5 Push ke GitHub

```bash
git init
git add .
git commit -m "Initial setup"
git branch -M main
git remote add origin https://github.com/USERNAME/absensi-madrasah.git
git push -u origin main
```

### 3.6 Deploy ke Vercel

1. Buka https://vercel.com → **New Project**
2. Import repository `absensi-madrasah` dari GitHub
3. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klik **Deploy**

---

## ✅ FASE 4 — Halaman Login, Sekolah, Kelas, Siswa

### Struktur Folder
```
app/
├── page.js                  ← Landing page / login
├── dashboard/
│   └── page.js              ← Dashboard utama
├── sekolah/
│   └── page.js              ← Manajemen sekolah
├── kelas/
│   ├── page.js              ← Daftar kelas
│   └── [id]/
│       └── page.js          ← Detail kelas
├── siswa/
│   └── [kelasId]/
│       └── page.js          ← Daftar siswa per kelas
└── auth/
    └── callback/
        └── route.js         ← Handler OAuth Google
```

### Fitur yang dibangun di Fase ini:
- [ ] Halaman login dengan tombol "Masuk dengan Google"
- [ ] Redirect otomatis ke dashboard setelah login
- [ ] CRUD Sekolah (tambah, edit, hapus, bisa lebih dari satu)
- [ ] CRUD Kelas (per sekolah, bisa lebih dari satu)
- [ ] CRUD Siswa (per kelas, dengan kolom No, Nama, Jenis Kelamin)
- [ ] Import siswa dari Excel (opsional)

---

## ✅ FASE 5 — Absensi & Penilaian

### Fitur Absensi:
- [ ] Tampilan daftar siswa per kelas dengan 4 tombol: H / S / I / A
- [ ] Tombol **"Hadir Semua"** — set semua siswa ke H sekaligus
- [ ] Pilih tanggal (default: hari ini)
- [ ] Auto-save saat klik status
- [ ] Rekap per hari di bagian bawah: jumlah H/S/I/A

### Fitur Penilaian KBC Kemenag (Kurikulum Merdeka):

**Komponen Penilaian:**
| Komponen | Bobot | Keterangan |
|---|---|---|
| Formatif (rata-rata) | 40% | Minimal 3 kali penilaian |
| Sumatif Tengah Semester (STS) | 30% | 1 kali per semester |
| Sumatif Akhir Semester (SAS) | 30% | 1 kali per semester |

**Predikat Nilai:**
| Nilai Akhir | Predikat |
|---|---|
| 90 – 100 | A (Sangat Baik) |
| 75 – 89 | B (Baik) |
| 60 – 74 | C (Cukup) |
| < 60 | D (Perlu Bimbingan) |

- [ ] Input nilai per siswa per mapel
- [ ] Kalkulasi otomatis nilai akhir & predikat
- [ ] Generate deskripsi otomatis per mapel

---

## ✅ FASE 6 — Jurnal Guru (Format Kemenag)

### Kolom Jurnal:
- Tanggal
- Mata Pelajaran
- Pertemuan ke-
- Tujuan Pembelajaran (TP)
- Materi Pokok
- Kegiatan Pembukaan
- Kegiatan Inti
- Kegiatan Penutup
- Media/Alat Pembelajaran
- Penilaian yang dilakukan
- Refleksi
- Tindak Lanjut

- [ ] Form input jurnal per pertemuan
- [ ] Daftar jurnal per bulan
- [ ] Export jurnal ke PDF format resmi Kemenag

---

## ✅ FASE 7 — Rekap, Export PDF & Excel

### Rekap Absensi:
- [ ] Rekap bulanan per kelas (tabel: siswa vs tanggal)
- [ ] Rekap per siswa (total H/S/I/A per bulan/semester)
- [ ] Persentase kehadiran otomatis

### Rekap Nilai:
- [ ] Legger nilai per kelas (semua mapel)
- [ ] Nilai per siswa lengkap

### Export:
- [ ] Download PDF rekap absensi
- [ ] Download Excel rekap absensi
- [ ] Download PDF rekap nilai / rapor ringkas
- [ ] Cetak langsung dari browser (`window.print()`)

---

## 🔑 Catatan Penting

### Kredensial yang Harus Dicatat (simpan dengan aman!):
- [ ] Email & password GitHub
- [ ] Email & password Supabase
- [ ] Database password Supabase
- [ ] Email & password Vercel
- [ ] Google Cloud Client ID & Client Secret
- [ ] Supabase Project URL & Anon Key

### Alur Update Kode:
1. Edit kode di VS Code
2. Simpan file (`Ctrl + S`)
3. Jalankan di lokal: `npm run dev` → buka http://localhost:3000
4. Jika sudah oke, push ke GitHub:
   ```bash
   git add .
   git commit -m "Deskripsi perubahan"
   git push
   ```
5. Vercel otomatis deploy ulang dalam ~1 menit

---

## 🆘 Troubleshooting Umum

| Masalah | Solusi |
|---|---|
| `command not found: node` | Node.js belum terinstall, ulangi langkah 1.1 |
| Error saat `npx create-next-app` | Coba: `npx create-next-app@latest --use-npm` |
| Supabase tidak bisa connect | Cek `.env.local` — URL dan Key harus benar |
| Login Google gagal | Cek Callback URL di Google Console dan Supabase |
| Deploy Vercel gagal | Cek environment variables sudah diisi |
| `npm install` error | Coba hapus `node_modules` lalu `npm install` ulang |

---

*Panduan ini dibuat untuk proyek Aplikasi Absensi Madrasah berbasis Next.js + Supabase + Vercel*
*Minta panduan detail setiap fase ke Claude saat siap melanjutkan.*