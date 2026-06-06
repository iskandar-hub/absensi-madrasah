@AGENTS.md
# CLAUDE.md — Konteks Project Absensi Madrasah

> File ini dibaca otomatis oleh Claude Code setiap kali sesi baru dimulai.
> Letakkan file ini di root folder project: `absensi-madrasah/CLAUDE.md`

---

## Ringkasan Project

Aplikasi web absensi siswa madrasah berbasis **Next.js App Router + Supabase + Vercel**.  
Ditujukan untuk guru/wali kelas di lingkungan madrasah (Kemenag RI).  
Setiap pengguna login via Google dan menjadi admin penuh untuk data mereka sendiri (no central admin).

---

## Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Frontend & Backend | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Styling | Tailwind CSS |
| Hosting | Vercel |
| PDF Export | jspdf + jspdf-autotable |
| Excel Export | xlsx (SheetJS) |

---

## Struktur Folder

```
absensi-madrasah/
├── app/
│   ├── layout.js                  ← Root layout + Navbar
│   ├── page.js                    ← Landing / Login Google
│   ├── dashboard/page.js          ← Dashboard ringkasan
│   ├── sekolah/page.js            ← CRUD sekolah
│   ├── kelas/
│   │   ├── page.js                ← Daftar kelas
│   │   └── [id]/page.js           ← Detail kelas
│   ├── siswa/[kelasId]/page.js    ← CRUD siswa per kelas
│   ├── absensi/[kelasId]/page.js  ← Form absensi harian
│   ├── penilaian/[kelasId]/page.js← Input nilai KBC
│   ├── jurnal/page.js             ← Jurnal guru
│   └── rekap/page.js              ← Rekap + export
├── components/
│   ├── Navbar.js
│   ├── Sidebar.js
│   ├── StudentTable.js
│   ├── AbsensiForm.js
│   ├── NilaiForm.js
│   └── JurnalForm.js
├── lib/
│   └── supabase.js                ← Supabase client
├── .env.local                     ← JANGAN di-commit ke GitHub
├── CLAUDE.md                      ← File ini
└── PANDUAN_APLIKASI_ABSENSI_MADRASAH.md
```

---

## Skema Database Supabase

### Relasi Antar Tabel
```
auth.users (Supabase)
    └── schools         (user_id FK)
            └── classes (school_id FK, user_id FK)
                    ├── students      (class_id FK, user_id FK)
                    │       ├── attendances (student_id FK)
                    │       └── grades      (student_id FK)
                    └── journals      (class_id FK, user_id FK)
```

### Tabel Utama

**schools** — data sekolah  
`id · user_id · nama · npsn · kepala_sekolah · alamat · created_at`

**classes** — data kelas  
`id · school_id · user_id · nama_kelas · tingkat · tahun_ajaran · wali_kelas · created_at`

**students** — data siswa  
`id · class_id · user_id · nomor_absen · nama · nisn · jenis_kelamin(L/P) · created_at`

**attendances** — absensi harian  
`id · student_id · class_id · user_id · tanggal · status(H/S/I/A) · keterangan · created_at`

**grades** — nilai Kurikulum Merdeka KBC Kemenag  
`id · student_id · class_id · user_id · mata_pelajaran · semester · tahun_ajaran`  
`· formatif_1..4 · rata_formatif · sumatif_tengah · sumatif_akhir · nilai_p5`  
`· nilai_akhir · predikat · capaian_kompetensi · created_at`

**journals** — jurnal guru format Kemenag  
`id · class_id · user_id · tanggal · mata_pelajaran · pertemuan_ke`  
`· tujuan_pembelajaran · alur_tujuan_pembelajaran · materi_pokok`  
`· model_pembelajaran · metode_pembelajaran · media_pembelajaran`  
`· kegiatan_pendahuluan · kegiatan_inti · kegiatan_penutup`  
`· penilaian_proses · refleksi_guru · tindak_lanjut`  
`· jumlah_hadir · jumlah_sakit · jumlah_izin · jumlah_alpha · created_at`

---

## Aturan Row Level Security (RLS)

**Semua tabel menggunakan pola yang sama:**
```sql
alter table NAMA_TABEL enable row level security;

create policy "Users manage own data"
on NAMA_TABEL for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Tidak ada role admin global. Setiap user hanya bisa akses data miliknya sendiri.

---

## Konvensi Koding

### Bahasa & Istilah
- Semua UI label dalam **Bahasa Indonesia**
- Komentar kode boleh campuran Indonesia/Inggris
- Nama variabel/fungsi dalam **bahasa Inggris** (camelCase)
- Nama tabel database dalam **bahasa Inggris** (snake_case)

### Pola Fetch Data dari Supabase
```javascript
// Selalu gunakan async/await
// Selalu handle error
// RLS otomatis filter berdasarkan user yang login

const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('class_id', kelasId)
  .order('nomor_absen', { ascending: true })

if (error) {
  console.error('Error:', error.message)
  return
}
```

### Pola Insert / Update
```javascript
// Insert
const { error } = await supabase
  .from('attendances')
  .insert({
    student_id: siswaId,
    class_id: kelasId,
    user_id: user.id,        // ← selalu sertakan user_id
    tanggal: tanggalHariIni,
    status: 'H'
  })

// Upsert (insert atau update kalau sudah ada)
const { error } = await supabase
  .from('attendances')
  .upsert({ ...data }, { onConflict: 'student_id,tanggal' })
```

### Komponen React
```javascript
'use client'   // ← tambahkan di komponen yang pakai useState/useEffect
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function NamaKomponen() {
  const [loading, setLoading] = useState(true)
  // ...
}
```

---

## Fitur Per Halaman

### `/absensi/[kelasId]`
- Tampilkan semua siswa di kelas tersebut
- Default status = belum diisi
- Tombol H / S / I / A per baris siswa
- Tombol **"Hadir Semua"** → set semua siswa ke H
- Auto-save ke database setiap klik (upsert)
- Filter tanggal (default: hari ini)

### `/penilaian/[kelasId]`
Komponen nilai sesuai Kurikulum Merdeka KBC Kemenag:
- **Formatif**: penilaian proses/harian (bisa 1–4 kali per semester)
- **Sumatif Tengah Semester (STS)**: ujian tengah semester
- **Sumatif Akhir Semester (SAS)**: ujian akhir semester
- **P5**: Projek Penguatan Profil Pelajar Pancasila
- **Nilai Akhir** = dihitung otomatis (rumus sesuai juknis Kemenag)
- **Predikat**: A (≥91), B (81–90), C (71–80), D (≤70)
- **Capaian Kompetensi**: deskripsi narasi (input teks bebas)

### `/jurnal`
Form jurnal harian guru, komponen (format Kemenag):
1. Identitas: tanggal, kelas, mapel, pertemuan ke-
2. Tujuan Pembelajaran (TP)
3. Alur Tujuan Pembelajaran (ATP)
4. Materi Pokok
5. Model & Metode & Media Pembelajaran
6. Langkah Kegiatan: Pendahuluan · Inti · Penutup
7. Penilaian Proses
8. Refleksi Guru & Tindak Lanjut
9. Kehadiran: H/S/I/A (tarik otomatis dari data absensi hari itu)

### `/rekap`
- Filter: kelas + bulan/semester + tahun ajaran
- Tabel rekap absensi: total H/S/I/A per siswa
- Tabel rekap nilai: semua mapel per siswa
- Tombol: **Download PDF** · **Download Excel** · **Cetak**

---

## Environment Variables

```env
# .env.local — JANGAN commit ke GitHub
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxx...
```

Nilai ini ada di: Supabase Dashboard → Settings → API

---

## Perintah yang Sering Dipakai

```bash
npm run dev          # Jalankan di localhost:3000
npm run build        # Build production
npm run lint         # Cek error kode

git add .
git commit -m "feat: tambah fitur absensi"
git push             # Auto-deploy ke Vercel
```

---

## Status Progress

- [ ] Fase 1: Setup akun & tools
- [ ] Fase 2: Setup database Supabase
- [ ] Fase 3: Setup project Next.js + deploy awal
- [ ] Fase 4: Halaman Login, Sekolah, Kelas, Siswa
- [ ] Fase 5: Absensi & Penilaian
- [ ] Fase 6: Jurnal Guru
- [ ] Fase 7: Rekap, Export PDF/Excel, Cetak

---

## Catatan Developer

- Owner/pembuat: Lalu (madrasah, NTB)
- Dibimbing oleh: Claude (claude.ai)
- Target pengguna: guru/wali kelas madrasah, multi-sekolah
- Kurikulum: Merdeka Belajar KBC Kemenag RI
- Absensi: H (Hadir) · S (Sakit) · I (Izin) · A (Alpha/Tanpa Keterangan)

---

*Update file ini setiap kali ada perubahan arsitektur atau keputusan teknis penting.*