'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

// ── Ikon (SVG manual, konsisten dengan file asli) ─────────────
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}
function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
// ── Ikon baru untuk fitur naik kelas ─────────────────────────
function IconArrowUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="16 12 12 8 8 12"/>
      <line x1="12" y1="16" x2="12" y2="8"/>
    </svg>
  )
}
function IconTrophy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  )
}
function IconCheckCircle() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <IconCheck />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── Badge L/P ─────────────────────────────────────────────────
function BadgeGender({ jk }) {
  const isL = jk === 'L'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: isL ? '#dbeafe' : '#fce7f3',
      color: isL ? '#1d4ed8' : '#be185d',
      flexShrink: 0,
    }}>
      {jk || '?'}
    </span>
  )
}

// ── Inline styles untuk responsif ────────────────────────────
const styles = {
  cardHeader: {
    padding: '12px 14px',
    borderBottom: '1px solid var(--clr-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardHeaderTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgeTotal: {
    background: 'var(--clr-primary-100)',
    color: 'var(--clr-primary-700)',
    padding: '4px 12px',
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  chipL: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: '#dbeafe', color: '#1d4ed8',
    padding: '3px 10px', borderRadius: 99,
    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  },
  chipP: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: '#fce7f3', color: '#be185d',
    padding: '3px 10px', borderRadius: 99,
    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  },
  searchWrap: {
    position: 'relative',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute', left: 10, top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--clr-text-muted)', pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: 32, paddingTop: 7, paddingBottom: 7,
    fontSize: 13, width: '100%',
  },
}

// ══════════════════════════════════════════════════════════════
// KOMPONEN UTAMA
// ══════════════════════════════════════════════════════════════
export default function SiswaPage() {
  const { kelasId } = useParams()
  const router      = useRouter()

  // ── State utama ────────────────────────────────────────────
  const [user,        setUser]        = useState(null)
  const [kelasDetail, setKelasDetail] = useState(null)
  const [siswaList,   setSiswaList]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [toasts,      setToasts]      = useState([])

  // ── State modal tambah/edit ────────────────────────────────
  const [showModal,   setShowModal]   = useState(false)
  const [editData,    setEditData]    = useState(null)
  const [formData,    setFormData]    = useState({ nomor_urut: '', nama: '', nisn: '', jenis_kelamin: '' })
  const [formError,   setFormError]   = useState({})
  const [saving,      setSaving]      = useState(false)

  // ── State modal hapus ──────────────────────────────────────
  const [showHapus,   setShowHapus]   = useState(false)
  const [hapusTarget, setHapusTarget] = useState(null)
  const [deleting,    setDeleting]    = useState(false)

  // ── State import Excel ─────────────────────────────────────
  const [showImport,    setShowImport]    = useState(false)
  const [importRows,    setImportRows]    = useState([])
  const [importErrors,  setImportErrors]  = useState([])
  const [importing,     setImporting]     = useState(false)
  const fileInputRef = useRef(null)

  // ── State Naik Kelas ───────────────────────────────────────
  const [showNaikKelas,    setShowNaikKelas]    = useState(false)
  const [kelasTujuanList,  setKelasTujuanList]  = useState([])
  const [selectedTujuan,   setSelectedTujuan]   = useState('')
  const [loadingKelasLain, setLoadingKelasLain] = useState(false)
  const [prosesNaik,       setProsesNaik]       = useState(false)

  // ── State Luluskan ─────────────────────────────────────────
  const [showLuluskan, setShowLuluskan] = useState(false)
  const [prosesLulus,  setProsesLulus]  = useState(false)

  // ── State Sukses ───────────────────────────────────────────
  const [showSukses,  setShowSukses]  = useState(false)
  const [pesanSukses, setPesanSukses] = useState('')

  // ── Toast helper ───────────────────────────────────────────
  function addToast(message, type = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  // ── Auth ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
    })
  }, [router])

  // ── Load kelas + siswa ─────────────────────────────────────
  useEffect(() => {
    if (!user || !kelasId) return
    fetchAll()
  }, [user, kelasId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    setLoading(true)
    try {
      const { data: kelas, error: errKelas } = await supabase
        .from('classes')
        .select('id, nama_kelas, tingkat, tahun_ajaran, schools(nama)')
        .eq('id', kelasId)
        .eq('user_id', user.id)
        .single()
      if (errKelas) throw errKelas
      setKelasDetail(kelas)
      await fetchSiswa()
    } catch (err) {
      console.error(err.message)
      addToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Hanya ambil siswa AKTIF untuk ditampilkan dan dioperasikan
  async function fetchSiswa() {
    const { data, error } = await supabase
      .from('students')
      .select('id, nomor_urut, nama, nisn, jenis_kelamin, status')
      .eq('class_id', kelasId)
      .eq('user_id', user.id)
      .eq('status', 'aktif')
      .order('nomor_urut', { ascending: true })
    if (error) { console.error(error.message); return }
    setSiswaList(data || [])
  }

  // ── Filter pencarian ───────────────────────────────────────
  const siswaFiltered = siswaList.filter(s =>
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    (s.nisn || '').includes(search)
  )

  const jumlahL = siswaList.filter(s => s.jenis_kelamin === 'L').length
  const jumlahP = siswaList.filter(s => s.jenis_kelamin === 'P').length

  // ── Buka modal tambah ──────────────────────────────────────
  function bukaTambah() {
    const maxNo = siswaList.reduce((m, s) => Math.max(m, s.nomor_urut || 0), 0)
    setFormData({ nomor_urut: maxNo + 1, nama: '', nisn: '', jenis_kelamin: '' })
    setFormError({})
    setEditData(null)
    setShowModal(true)
  }

  // ── Buka modal edit ────────────────────────────────────────
  function bukaEdit(siswa) {
    setFormData({
      nomor_urut:    siswa.nomor_urut || '',
      nama:          siswa.nama,
      nisn:          siswa.nisn || '',
      jenis_kelamin: siswa.jenis_kelamin || '',
    })
    setFormError({})
    setEditData(siswa)
    setShowModal(true)
  }

  // ── Validasi form ──────────────────────────────────────────
  function validasi() {
    const err = {}
    if (!formData.nama.trim())                            err.nama = 'Nama wajib diisi'
    if (!formData.jenis_kelamin)                          err.jenis_kelamin = 'Pilih jenis kelamin'
    if (!formData.nomor_urut || formData.nomor_urut < 1)  err.nomor_urut = 'Nomor urut tidak valid'
    setFormError(err)
    return Object.keys(err).length === 0
  }

  // ── Simpan tambah/edit ─────────────────────────────────────
  async function handleSimpan() {
    if (!validasi()) return
    setSaving(true)
    try {
      const payload = {
        class_id:      kelasId,
        user_id:       user.id,
        nomor_urut:    Number(formData.nomor_urut),
        nama:          formData.nama.trim(),
        nisn:          formData.nisn.trim() || null,
        jenis_kelamin: formData.jenis_kelamin,
        status:        'aktif',
      }
      if (editData) {
        const { error } = await supabase.from('students').update(payload).eq('id', editData.id).eq('user_id', user.id)
        if (error) throw error
        addToast('Data siswa berhasil diperbarui')
      } else {
        const { error } = await supabase.from('students').insert(payload)
        if (error) throw error
        addToast('Siswa berhasil ditambahkan')
      }
      setShowModal(false)
      await fetchSiswa()
    } catch (err) {
      console.error(err.message)
      addToast(err.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Konfirmasi hapus ───────────────────────────────────────
  function bukaHapus(siswa) { setHapusTarget(siswa); setShowHapus(true) }

  async function handleHapus() {
    if (!hapusTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('students').delete().eq('id', hapusTarget.id).eq('user_id', user.id)
      if (error) throw error
      addToast(`${hapusTarget.nama} berhasil dihapus`)
      setShowHapus(false)
      setHapusTarget(null)
      await fetchSiswa()
    } catch (err) {
      addToast('Gagal menghapus siswa', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Download template Excel ────────────────────────────────
  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nomor_urut', 'nama', 'nisn', 'jenis_kelamin'],
      [1, 'Contoh Nama Siswa', '1234567890', 'L'],
      [2, 'Contoh Nama Siswi', '0987654321', 'P'],
    ])
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa')
    XLSX.writeFile(wb, 'template-import-siswa.xlsx')
  }

  // ── Parse file Excel ───────────────────────────────────────
  function handleFileExcel(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'binary' })
        const ws   = wb.Sheets[wb.SheetNames[0]]

        // Ambil semua data sebagai array of arrays
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (rows.length < 2) {
          addToast('File Excel kosong atau tidak memiliki data', 'error')
          return
        }

        // ── Cari baris header (baris pertama yang tidak kosong) ──
        // Cari sampai baris ke-5 saja, antisipasi ada judul di atas
        let headerRowIdx = -1
        let colMap = { nomor: -1, nama: -1, nisn: -1, jk: -1 }

        for (let ri = 0; ri < Math.min(rows.length, 5); ri++) {
          const row = rows[ri]
          const tempMap = { nomor: -1, nama: -1, nisn: -1, jk: -1 }

          for (let ci = 0; ci < row.length; ci++) {
            const cell = (row[ci] || '').toString().toLowerCase().trim()
              .replace(/[.\s]+/g, ' ') // normalisasi spasi & titik

            // Deteksi kolom Nomor Urut
            if (tempMap.nomor === -1 && (
              cell === 'no' ||
              cell === 'no ' ||
              cell === 'nomor' ||
              cell === 'nomor urut' ||
              cell === 'no urut' ||
              cell === 'nomer' ||
              cell === 'nomer urut' ||
              cell === 'urut' ||
              cell === 'nomor absen' ||
              cell === 'no absen'
            )) {
              tempMap.nomor = ci
            }

            // Deteksi kolom Nama
            if (tempMap.nama === -1 && (
              cell === 'nama' ||
              cell === 'nama siswa' ||
              cell === 'nama lengkap' ||
              cell === 'nama peserta didik' ||
              cell === 'nama murid'
            )) {
              tempMap.nama = ci
            }

            // Deteksi kolom NISN
            if (tempMap.nisn === -1 && (
              cell === 'nisn' ||
              cell === 'nis' ||
              cell === 'no induk' ||
              cell === 'nomor induk'
            )) {
              tempMap.nisn = ci
            }

            // Deteksi kolom Jenis Kelamin
            if (tempMap.jk === -1 && (
              cell === 'jk' ||
              cell === 'j k' ||
              cell === 'jenis kelamin' ||
              cell === 'kelamin' ||
              cell === 'gender' ||
              cell === 'l/p' ||
              cell === 'p/l' ||
              cell === 'sex'
            )) {
              tempMap.jk = ci
            }
          }

          // Baris ini dianggap header jika minimal kolom "nama" ditemukan
          if (tempMap.nama !== -1) {
            headerRowIdx = ri
            colMap = tempMap
            break
          }
        }

        // Kolom nama wajib ditemukan
        if (colMap.nama === -1) {
          addToast(
            'Kolom "Nama Siswa" tidak ditemukan. Pastikan header kolom mengandung kata: Nama / Nama Siswa / Nama Lengkap',
            'error'
          )
          return
        }

        // ── Info kolom yang berhasil dideteksi (untuk debugging) ──
        const kolomDitemukan = []
        if (colMap.nomor !== -1) kolomDitemukan.push(`Nomor Urut (kolom ${colMap.nomor + 1})`)
        kolomDitemukan.push(`Nama (kolom ${colMap.nama + 1})`)
        if (colMap.nisn  !== -1) kolomDitemukan.push(`NISN (kolom ${colMap.nisn + 1})`)
        if (colMap.jk    !== -1) kolomDitemukan.push(`Jenis Kelamin (kolom ${colMap.jk + 1})`)
        console.info('[Import] Kolom terdeteksi:', kolomDitemukan.join(', '))

        // ── Baca data mulai baris setelah header ──────────────────
        const errors  = []
        const parsed  = []

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i]

          const nama   = (colMap.nama  !== -1 ? row[colMap.nama]  : '').toString().trim()
          const noUrut = (colMap.nomor !== -1 ? row[colMap.nomor] : '').toString().trim()
          const nisn   = (colMap.nisn  !== -1 ? row[colMap.nisn]  : '').toString().trim()
          const jkRaw  = (colMap.jk    !== -1 ? row[colMap.jk]    : '').toString().trim()

          // Skip baris kosong
          if (!nama) continue

          // Normalisasi jenis kelamin
          let jk = ''
          const jkLower = jkRaw.toLowerCase()
          if (
            jkLower === 'l' ||
            jkLower === 'laki-laki' ||
            jkLower === 'laki laki' ||
            jkLower === 'pria'
          ) {
            jk = 'L'
          } else if (
            jkLower === 'p' ||
            jkLower === 'perempuan' ||
            jkLower === 'wanita'
          ) {
            jk = 'P'
          } else if (jkRaw !== '') {
            errors.push(
              `Baris ${i + 1}: Jenis kelamin "${jkRaw}" tidak dikenali (gunakan L / P / Laki-laki / Perempuan)`
            )
          }

          parsed.push({
            nomor_urut:    Number(noUrut) || (parsed.length + 1),
            nama,
            nisn,
            jenis_kelamin: jk,
          })
        }

        if (parsed.length === 0) {
          addToast('Tidak ada data siswa yang bisa dibaca dari file ini', 'error')
          return
        }

        // Tambahkan info kolom yang tidak terdeteksi ke warnings
        const warnings = [...errors]
        if (colMap.nomor === -1) warnings.unshift('⚠️ Kolom Nomor Urut tidak ditemukan — akan diisi otomatis urut 1, 2, 3...')
        if (colMap.nisn  === -1) warnings.unshift('⚠️ Kolom NISN tidak ditemukan — NISN akan dikosongkan')
        if (colMap.jk    === -1) warnings.unshift('⚠️ Kolom Jenis Kelamin tidak ditemukan — akan dikosongkan')

        setImportRows(parsed)
        setImportErrors(warnings)
        setShowImport(true)

      } catch (err) {
        addToast('Gagal membaca file Excel: ' + err.message, 'error')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // ── Proses import ke Supabase ──────────────────────────────
  async function handleImport() {
    if (!importRows.length) return
    setImporting(true)
    try {
      const payloads = importRows.map(r => ({
        class_id: kelasId, user_id: user.id,
        nomor_urut: r.nomor_urut, nama: r.nama,
        nisn: r.nisn || null, jenis_kelamin: r.jenis_kelamin || null,
        status: 'aktif',
      }))
      const { error } = await supabase.from('students').insert(payloads)
      if (error) throw error
      addToast(`${payloads.length} siswa berhasil diimport`)
      setShowImport(false)
      setImportRows([])
      setImportErrors([])
      await fetchSiswa()
    } catch (err) {
      addToast('Gagal import: ' + err.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  // ── Buka modal naik kelas ──────────────────────────────────
  async function bukaModalNaikKelas() {
    setLoadingKelasLain(true)
    setSelectedTujuan('')
    setShowNaikKelas(true)

    const { data, error } = await supabase
      .from('classes')
      .select('id, nama_kelas, tingkat, tahun_ajaran')
      .eq('user_id', user.id)
      .neq('id', kelasId)
      .order('tingkat')
      .order('nama_kelas')

    if (error) {
      addToast('Gagal memuat daftar kelas', 'error')
      setLoadingKelasLain(false)
      return
    }
    setKelasTujuanList(data || [])
    setLoadingKelasLain(false)
  }

  // ── Proses naik kelas ──────────────────────────────────────
  async function handleNaikKelas() {
    if (!selectedTujuan) {
      addToast('Pilih kelas tujuan terlebih dahulu', 'error')
      return
    }
    setProsesNaik(true)
    try {
      // 1. Ambil semua siswa aktif
      const { data: siswaAktif, error: errSiswa } = await supabase
        .from('students')
        .select('id, nomor_urut, nama, nisn, jenis_kelamin')
        .eq('class_id', kelasId)
        .eq('user_id', user.id)
        .eq('status', 'aktif')

      if (errSiswa) throw errSiswa
      if (!siswaAktif || siswaAktif.length === 0)
        throw new Error('Tidak ada siswa aktif di kelas ini')

      // 2. Salin ke kelas tujuan
      const payload = siswaAktif.map(s => ({
        class_id:      selectedTujuan,
        user_id:       user.id,
        nomor_urut:    s.nomor_urut,
        nama:          s.nama,
        nisn:          s.nisn || null,
        jenis_kelamin: s.jenis_kelamin,
        status:        'aktif',
      }))
      const { error: errInsert } = await supabase.from('students').insert(payload)
      if (errInsert) throw errInsert

      // 3. Set siswa lama → alumni
      const idLama = siswaAktif.map(s => s.id)
      const { error: errUpdate } = await supabase
        .from('students')
        .update({ status: 'pindah' })
        .in('id', idLama)
        .eq('user_id', user.id)
      if (errUpdate) throw errUpdate

      const kelasTujuan = kelasTujuanList.find(k => k.id === selectedTujuan)
      setShowNaikKelas(false)
      setPesanSukses(
        `${siswaAktif.length} siswa berhasil dipindahkan ke ${kelasTujuan?.nama_kelas || 'kelas tujuan'}. ` +
        `Kelas ini sekarang kosong dan siap diisi siswa baru.`
      )
      setShowSukses(true)
      await fetchSiswa()

    } catch (err) {
      console.error(err)
      addToast(err.message || 'Gagal memproses naik kelas', 'error')
    } finally {
      setProsesNaik(false)
    }
  }

  // ── Proses luluskan ────────────────────────────────────────
  async function handleLuluskan() {
    setProsesLulus(true)
    try {
      const jumlah = siswaList.length
      const { error } = await supabase
        .from('students')
        .update({ status: 'lulus' })
        .eq('class_id', kelasId)
        .eq('user_id', user.id)
        .eq('status', 'aktif')
      if (error) throw error

      setShowLuluskan(false)
      setPesanSukses(
        `${jumlah} siswa berhasil diluluskan. ` +
        `Kelas ini sekarang kosong dan siap diisi siswa baru. ` +
        `Data absensi & nilai tetap tersimpan sebagai arsip.`
      )
      setShowSukses(true)
      await fetchSiswa()

    } catch (err) {
      console.error(err)
      addToast(err.message || 'Gagal memproses kelulusan', 'error')
    } finally {
      setProsesLulus(false)
    }
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <span className="loading-spinner" style={{ width: 28, height: 28 }} />
        <p style={{ marginTop: 12, color: 'var(--clr-text-muted)', fontSize: 13 }}>Memuat data...</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .siswa-table-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 0;
          border: none;
          box-shadow: none;
        }
        .siswa-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          background: var(--clr-surface);
        }
        .siswa-table .col-nama {
          min-width: 120px;
          max-width: 180px;
        }
        .siswa-table .col-nama span {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 170px;
        }
        .siswa-table .col-nisn { min-width: 100px; }
        .siswa-table thead {
          background: var(--clr-slate-50);
          border-bottom: 2px solid var(--clr-border);
        }
        .siswa-table thead th {
          padding: 10px 10px;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--clr-gold-600);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .siswa-table tbody tr {
          border-bottom: 1px solid var(--clr-border);
          transition: background 0.15s;
        }
        .siswa-table tbody tr:last-child { border-bottom: none; }
        .siswa-table tbody tr:hover { background: var(--clr-primary-50); }
        .siswa-table tbody td {
          padding: 10px 10px;
          color: var(--clr-text);
          vertical-align: middle;
        }
        .card-header-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        @media (max-width: 480px) {
          .header-actions {
            width: 100%;
          }
          .header-actions .btn {
            flex: 1;
            justify-content: center;
            font-size: 12px;
            padding: 6px 8px;
          }
          .siswa-table .col-no {
            width: 36px;
            padding: 10px 6px;
            text-align: center;
          }
          .siswa-table .col-actions {
            width: 72px;
            padding: 10px 6px;
          }
        }
      `}</style>

      <div className="page-container">

        {/* ── Breadcrumb ───────────────────────────────────── */}
        <div className="breadcrumb">
          <a href="/dashboard">Dashboard</a>
          <span className="sep">›</span>
          <a href="/kelas">Kelas</a>
          <span className="sep">›</span>
          <span className="current">{kelasDetail?.nama_kelas || 'Siswa'}</span>
        </div>

        {/* ── Page Header ──────────────────────────────────── */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1>👥 Daftar Siswa</h1>
              <p style={{ fontSize: 13, marginTop: 2 }}>
                {kelasDetail?.nama_kelas}
                {kelasDetail?.tingkat ? ` · Tingkat ${kelasDetail.tingkat}` : ''}
                {kelasDetail?.schools?.nama ? ` — ${kelasDetail.schools.nama}` : ''}
              </p>
            </div>

            <div className="header-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={downloadTemplate}
                title="Download template Excel"
              >
                <IconDownload /> Template
              </button>
              <label
                className="btn btn-secondary btn-sm"
                style={{ cursor: 'pointer' }}
                title="Import dari Excel"
              >
                <IconUpload /> Import
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={handleFileExcel}
                />
              </label>
              <button className="btn btn-primary btn-sm" onClick={bukaTambah}>
                <IconPlus /> Tambah
              </button>
            </div>
          </div>
        </div>

        {/* ── Card tabel ───────────────────────────────────── */}
        <div className="card">

          {/* ── Card Header ──────────────────────────────── */}
          <div style={styles.cardHeader}>

            {/* Baris 1: Badge jumlah + chip L/P + tombol naik kelas */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>

              {/* Kiri: info siswa */}
              <div className="card-header-info">
                <span style={styles.badgeTotal}>
                  {siswaList.length} Siswa Aktif
                </span>
                {siswaList.length > 0 && (
                  <>
                    <span style={styles.chipL}>👦 L: {jumlahL}</span>
                    <span style={styles.chipP}>👧 P: {jumlahP}</span>
                  </>
                )}
              </div>

              {/* Kanan: tombol Luluskan + Naik Kelas */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowLuluskan(true)}
                  disabled={siswaList.length === 0}
                  title={siswaList.length === 0 ? 'Tidak ada siswa aktif' : 'Luluskan semua siswa aktif'}
                  style={{
                    background: 'transparent',
                    border: '1.5px solid #d97706',
                    color: '#d97706',
                    borderRadius: 'var(--radius-md)',
                    padding: '5px 10px',
                    fontWeight: 600,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: siswaList.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: siswaList.length === 0 ? 0.45 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <IconTrophy /> Luluskan
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={bukaModalNaikKelas}
                  disabled={siswaList.length === 0}
                  title={siswaList.length === 0 ? 'Tidak ada siswa aktif' : 'Pindahkan siswa ke kelas lain'}
                  style={{ fontSize: 12, padding: '5px 10px' }}
                >
                  <IconArrowUp /> Naik Kelas
                </button>
              </div>
            </div>

            {/* Baris 2: Search */}
            <div style={styles.searchWrap}>
              <span style={styles.searchIcon}><IconSearch /></span>
              <input
                type="text"
                className="form-input"
                placeholder="Cari nama atau NISN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

          </div>

          {/* ── Tabel / Empty State ───────────────────────── */}
          {siswaFiltered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {search ? '🔍' : '👥'}
              </div>
              <h3>{search ? 'Siswa tidak ditemukan' : 'Belum ada siswa aktif'}</h3>
              <p>
                {search
                  ? `Tidak ada siswa dengan kata kunci "${search}"`
                  : 'Tambahkan siswa satu per satu atau import dari Excel'}
              </p>
              {!search && (
                <button className="btn btn-primary btn-sm" onClick={bukaTambah}
                  style={{ marginTop: 8 }}>
                  <IconPlus /> Tambah Siswa Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="siswa-table-wrap">
              <table className="siswa-table">
                <thead>
                  <tr>
                    <th className="col-no" style={{ width: 40, textAlign: 'center' }}>No</th>
                    <th className="col-nama">Nama Siswa</th>
                    <th className="col-nisn">NISN</th>
                    <th style={{ width: 48, textAlign: 'center' }}>L/P</th>
                    <th className="col-actions" style={{ width: 80, textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaFiltered.map((siswa, idx) => (
                    <tr key={siswa.id}>
                      <td className="col-no" style={{ fontWeight: 600, textAlign: 'center', color: 'var(--clr-text-muted)', fontSize: 13 }}>
                        {siswa.nomor_urut || idx + 1}
                      </td>
                      <td className="col-nama">
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--clr-text)' }} title={siswa.nama}>
                          {siswa.nama}
                        </span>
                      </td>
                      <td className="col-nisn">
                        <span style={{
                          fontSize: 12,
                          color: siswa.nisn ? 'var(--clr-text-2)' : 'var(--clr-text-muted)',
                          fontStyle: siswa.nisn ? 'normal' : 'italic',
                        }}>
                          {siswa.nisn || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <BadgeGender jk={siswa.jenis_kelamin} />
                      </td>
                      <td className="col-actions" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => bukaEdit(siswa)}
                            title="Edit"
                            style={{ color: 'var(--clr-primary-600)' }}
                          >
                            <IconEdit />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => bukaHapus(siswa)}
                            title="Hapus"
                            style={{ color: '#dc2626' }}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {siswaList.length > 0 && (
            <div className="card-footer">
              <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                Menampilkan {siswaFiltered.length} dari {siswaList.length} siswa aktif
              </span>
            </div>
          )}
        </div>

        {/* ── Link ke absensi ───────────────────────────────── */}
        {siswaList.length > 0 && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <a href={`/absensi/${kelasId}`} className="btn btn-primary btn-sm">
              📋 Mulai Absensi →
            </a>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════
          MODAL TAMBAH / EDIT SISWA
      ════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>

            <div className="modal-header">
              <h3 className="modal-title">
                {editData ? '✏️ Edit Siswa' : '➕ Tambah Siswa'}
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm"
                onClick={() => !saving && setShowModal(false)}>
                <IconX />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Nomor Urut <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  className={`form-input ${formError.nomor_urut ? 'error' : ''}`}
                  placeholder="contoh: 1"
                  min="1"
                  value={formData.nomor_urut}
                  onChange={e => setFormData(p => ({ ...p, nomor_urut: e.target.value }))}
                />
                {formError.nomor_urut && <span className="form-error">{formError.nomor_urut}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Nama Lengkap <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${formError.nama ? 'error' : ''}`}
                  placeholder="Nama lengkap siswa"
                  value={formData.nama}
                  onChange={e => setFormData(p => ({ ...p, nama: e.target.value }))}
                  autoFocus
                />
                {formError.nama && <span className="form-error">{formError.nama}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NISN</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nomor Induk Siswa Nasional (opsional)"
                  value={formData.nisn}
                  onChange={e => setFormData(p => ({ ...p, nisn: e.target.value }))}
                  maxLength={20}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Jenis Kelamin <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { val: 'L', label: '👦 Laki-laki', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
                    { val: 'P', label: '👧 Perempuan', bg: '#fce7f3', color: '#be185d', border: '#f9a8d4' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, jenis_kelamin: opt.val }))}
                      style={{
                        flex: 1, padding: '10px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${formData.jenis_kelamin === opt.val ? opt.border : 'var(--clr-border)'}`,
                        background: formData.jenis_kelamin === opt.val ? opt.bg : 'var(--clr-surface-2)',
                        color: formData.jenis_kelamin === opt.val ? opt.color : 'var(--clr-text-muted)',
                        fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: formData.jenis_kelamin === opt.val ? `0 0 0 3px ${opt.bg}` : 'none',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {formError.jenis_kelamin && <span className="form-error">{formError.jenis_kelamin}</span>}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm"
                onClick={() => setShowModal(false)} disabled={saving}>
                Batal
              </button>
              <button className="btn btn-primary btn-sm"
                onClick={handleSimpan} disabled={saving}>
                {saving
                  ? <><span className="loading-spinner" style={{ width: 12, height: 12 }} /> Menyimpan...</>
                  : <><IconCheck /> {editData ? 'Simpan Perubahan' : 'Tambah Siswa'}</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL KONFIRMASI HAPUS
      ════════════════════════════════════════════════════ */}
      {showHapus && hapusTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setShowHapus(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>

            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#dc2626' }}>🗑️ Hapus Siswa</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowHapus(false)}>
                <IconX />
              </button>
            </div>

            <div className="modal-body">
              <div style={{
                background: '#fff5f5', border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }}>
                  <IconAlert />
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d', fontWeight: 600 }}>
                    Tindakan ini tidak bisa dibatalkan
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#991b1b' }}>
                    Data absensi dan nilai <strong>{hapusTarget.nama}</strong> akan ikut terhapus permanen.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm"
                onClick={() => setShowHapus(false)} disabled={deleting}>
                Batal
              </button>
              <button className="btn btn-danger btn-sm"
                onClick={handleHapus} disabled={deleting}>
                {deleting
                  ? <><span className="loading-spinner" style={{ width: 12, height: 12 }} /> Menghapus...</>
                  : <><IconTrash /> Hapus Permanen</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL PREVIEW IMPORT EXCEL
      ════════════════════════════════════════════════════ */}
      {showImport && (
        <div className="modal-backdrop" onClick={() => !importing && setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3 className="modal-title">📥 Preview Import Excel</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowImport(false)}>
                <IconX />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {importErrors.length > 0 && (
                <div style={{
                  background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14,
                }}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                    ⚠️ {importErrors.length} peringatan ditemukan
                  </p>
                  {importErrors.map((e, i) => (
                    <p key={i} style={{ margin: '2px 0', fontSize: 12, color: '#b45309' }}>{e}</p>
                  ))}
                </div>
              )}

              <div style={{
                background: 'var(--clr-primary-50)', border: '1px solid var(--clr-primary-200)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <span style={{ color: 'var(--clr-primary-600)', flexShrink: 0 }}><IconInfo /></span>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--clr-primary-700)' }}>
                  <strong>{importRows.length} siswa</strong> siap diimport ke kelas <strong>{kelasDetail?.nama_kelas}</strong>.
                  Pastikan data sudah benar sebelum lanjut.
                </p>
              </div>

              <div className="siswa-table-wrap" style={{ maxHeight: 320 }}>
                <table className="siswa-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>No</th>
                      <th>Nama</th>
                      <th style={{ width: 120 }}>NISN</th>
                      <th style={{ width: 50, textAlign: 'center' }}>L/P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.nomor_urut}</td>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>
                          {r.nama || <em style={{ color: 'var(--clr-alpha)' }}>kosong</em>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>{r.nisn || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {r.jenis_kelamin
                            ? <BadgeGender jk={r.jenis_kelamin} />
                            : <span style={{ fontSize: 11, color: 'var(--clr-alpha)' }}>?</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setShowImport(false)} disabled={importing}>
                Batal
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleImport}
                disabled={importing || importRows.length === 0}
              >
                {importing
                  ? <><span className="loading-spinner" style={{ width: 12, height: 12 }} /> Mengimport...</>
                  : <><IconCheck /> Import {importRows.length} Siswa</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL NAIK KELAS
      ════════════════════════════════════════════════════ */}
      {showNaikKelas && (
        <div className="modal-backdrop" onClick={() => !prosesNaik && setShowNaikKelas(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>

            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--clr-primary-600)' }}><IconArrowUp /></span>
                Naik Kelas
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm"
                onClick={() => !prosesNaik && setShowNaikKelas(false)}>
                <IconX />
              </button>
            </div>

            <div className="modal-body">

              {/* Info kelas asal */}
              <div style={{
                background: 'var(--clr-primary-50)',
                border: '1px solid var(--clr-primary-200)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--clr-primary-800)', lineHeight: 1.6 }}>
                  <strong>{siswaList.length} siswa aktif</strong> dari kelas{' '}
                  <strong>{kelasDetail?.nama_kelas}</strong> akan disalin ke kelas tujuan.
                  Data absensi & nilai di kelas ini tetap tersimpan sebagai arsip.
                </p>
              </div>

              {/* Pilih kelas tujuan */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Kelas Tujuan <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {loadingKelasLain ? (
                  <div className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-md)' }} />
                ) : kelasTujuanList.length === 0 ? (
                  <div style={{
                    padding: '12px 14px',
                    background: '#fff7ed', border: '1px solid #fed7aa',
                    borderRadius: 'var(--radius-md)', fontSize: 13, color: '#9a3412',
                  }}>
                    ⚠️ Tidak ada kelas lain yang tersedia. Buat kelas tujuan terlebih dahulu di menu Kelas.
                  </div>
                ) : (
                  <select
                    className="form-input form-select"
                    value={selectedTujuan}
                    onChange={e => setSelectedTujuan(e.target.value)}
                  >
                    <option value="">— Pilih kelas tujuan —</option>
                    {kelasTujuanList.map(k => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kelas}
                        {k.tingkat ? ` (Tingkat ${k.tingkat})` : ''}
                        {k.tahun_ajaran ? ` — TA ${k.tahun_ajaran}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Peringatan */}
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: '#fff5f5', border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
              }}>
                <span style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }}><IconAlert /></span>
                <p style={{ margin: 0, fontSize: 12, color: '#7f1d1d', lineHeight: 1.6 }}>
                  Pastikan kelas tujuan sudah benar. Setelah proses ini, siswa di kelas{' '}
                  <strong>{kelasDetail?.nama_kelas}</strong> akan berstatus <em>alumni</em> dan
                  kelas ini akan kosong.
                </p>
              </div>

            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm"
                onClick={() => setShowNaikKelas(false)} disabled={prosesNaik}>
                Batal
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleNaikKelas}
                disabled={prosesNaik || !selectedTujuan || kelasTujuanList.length === 0}
              >
                {prosesNaik
                  ? <><span className="loading-spinner" style={{ width: 12, height: 12 }} /> Memproses...</>
                  : <><IconArrowUp /> Naikkan Kelas</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL LULUSKAN
      ════════════════════════════════════════════════════ */}
      {showLuluskan && (
        <div className="modal-backdrop" onClick={() => !prosesLulus && setShowLuluskan(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>

            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#d97706' }}><IconTrophy /></span>
                Luluskan Siswa
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm"
                onClick={() => !prosesLulus && setShowLuluskan(false)}>
                <IconX />
              </button>
            </div>

            <div className="modal-body">
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center',
                gap: '0.875rem', padding: '0.5rem 0',
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: '#fef3c7',
                  display: 'grid', placeItems: 'center', color: '#d97706',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/>
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--clr-text)', marginBottom: 6, fontSize: 15 }}>
                    Luluskan {siswaList.length} siswa dari {kelasDetail?.nama_kelas}?
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--clr-text-2)', lineHeight: 1.6 }}>
                    Semua siswa aktif akan ditandai sebagai <strong>lulus</strong>.
                    Kelas ini akan menjadi kosong dan siap diisi siswa baru.
                    Data absensi & nilai tetap tersimpan sebagai arsip.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm"
                onClick={() => setShowLuluskan(false)} disabled={prosesLulus}>
                Batal
              </button>
              <button
                onClick={handleLuluskan}
                disabled={prosesLulus}
                style={{
                  background: '#d97706', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  padding: '0.375rem 0.875rem',
                  fontWeight: 600, fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: prosesLulus ? 'not-allowed' : 'pointer',
                  opacity: prosesLulus ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {prosesLulus
                  ? <><span className="loading-spinner" style={{ width: 12, height: 12 }} /> Memproses...</>
                  : <><IconTrophy /> Ya, Luluskan</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL SUKSES
      ════════════════════════════════════════════════════ */}
      {showSukses && (
        <div className="modal-backdrop" onClick={() => setShowSukses(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>

            <div className="modal-body" style={{ padding: '2rem 1.5rem' }}>
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', gap: '1rem',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--clr-primary-100)',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--clr-primary-600)',
                }}>
                  <IconCheckCircle />
                </div>
                <div>
                  <h3 style={{ color: 'var(--clr-text)', marginBottom: 8 }}>Berhasil! 🎉</h3>
                  <p style={{ fontSize: 13, color: 'var(--clr-text-2)', lineHeight: 1.6 }}>
                    {pesanSukses}
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowSukses(false)}
                  style={{ minWidth: 120 }}
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </>
  )
}