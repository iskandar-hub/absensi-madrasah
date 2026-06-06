'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Ikon SVG inline ────────────────────────────────────────────
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
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
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  )
}

// ── Toast ──────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────
function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTanggalIndo(dateStr) {
  const hari  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember']
  const d = new Date(dateStr + 'T00:00:00')
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
}

// ── Konfigurasi status ─────────────────────────────────────────
const STATUS_CONFIG = {
  H: { label: 'Hadir', chipClass: 'chip-hadir', color: 'var(--clr-hadir)', bg: 'var(--clr-hadir-bg)'  },
  S: { label: 'Sakit', chipClass: 'chip-sakit', color: 'var(--clr-sakit)', bg: 'var(--clr-sakit-bg)'  },
  I: { label: 'Izin',  chipClass: 'chip-izin',  color: 'var(--clr-izin)',  bg: 'var(--clr-izin-bg)'   },
  A: { label: 'Alpha', chipClass: 'chip-alpha', color: 'var(--clr-alpha)', bg: 'var(--clr-alpha-bg)'  },
}

// ── Dropdown status absensi ────────────────────────────────────
function StatusDropdown({ siswaId, status, saving, onChange }) {
  const cfg = status ? STATUS_CONFIG[status] : null

  return (
    <select
      value={status || ''}
      disabled={saving}
      onChange={e => onChange(siswaId, e.target.value || null)}
      style={{
      width: 'auto',
      minWidth: 0,
      padding: '5px 20px 5px 8px',
      borderRadius: 8,
      border: `1.5px solid ${cfg ? cfg.color : 'var(--clr-border)'}`,
      backgroundColor: cfg ? cfg.bg : 'var(--clr-surface-2)',  // ← pakai backgroundColor
      color: cfg ? cfg.color : 'var(--clr-text-muted)',
      fontWeight: 700,
      fontSize: 13,
      cursor: saving ? 'wait' : 'pointer',
      appearance: 'none',
      WebkitAppearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center',
      boxShadow: cfg
        ? `0 0 0 3px ${
            status === 'H' ? 'rgb(22 163 74 / 0.12)' :
            status === 'S' ? 'rgb(37 99 235 / 0.12)' :
            status === 'I' ? 'rgb(217 119 6 / 0.12)' :
                            'rgb(220 38 38 / 0.12)'
        }`
        : 'none',
      transition: 'all 0.15s ease',
    }}
    >
      <option value="">—</option>
      <option value="H">H</option>
      <option value="S">S</option>
      <option value="I">I</option>
      <option value="A">A</option>
    </select>
  )
}

// ══════════════════════════════════════════════════════════════
// KOMPONEN UTAMA
// ══════════════════════════════════════════════════════════════
export default function AbsensiPage() {
  const params = useParams()
  const router = useRouter()

  const [user,          setUser]          = useState(null)
  const [kelasList,     setKelasList]     = useState([])
  const [selectedKelas, setSelectedKelas] = useState(params.kelasId || '')
  const [kelasDetail,   setKelasDetail]   = useState(null)
  const [siswaDaftar,   setSiswaDaftar]   = useState([])
  const [absensiMap,    setAbsensiMap]    = useState({})
  const [savingMap,     setSavingMap]     = useState({})
  const [tanggal,       setTanggal]       = useState(toDateString(new Date()))
  const [loading,       setLoading]       = useState(false)
  const [loadingHadir,  setLoadingHadir]  = useState(false)
  const [toasts,        setToasts]        = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // ── Auth ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
    })
  }, [router])

  // ── Load kelas ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    async function fetchKelas() {
      const { data, error } = await supabase
        .from('classes')
        .select('id, nama_kelas, tingkat, tahun_ajaran, school_id, schools(nama)')
        .eq('user_id', user.id)
        .order('nama_kelas', { ascending: true })

      if (error) { console.error('Error fetch kelas:', error.message); return }
      setKelasList(data || [])

      if (params.kelasId && !selectedKelas) setSelectedKelas(params.kelasId)
      if (!params.kelasId && data?.length > 0 && !selectedKelas) setSelectedKelas(data[0].id)
    }
    fetchKelas()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Detail kelas ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedKelas || !kelasList.length) return
    const kelas = kelasList.find(k => k.id === selectedKelas)
    setKelasDetail(kelas || null)
  }, [selectedKelas, kelasList])

  // ── Load siswa + absensi ───────────────────────────────────
  useEffect(() => {
    if (!selectedKelas || !user) return
    fetchSiswaAndAbsensi()
  }, [selectedKelas, tanggal, user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSiswaAndAbsensi() {
    setLoading(true)
    try {
      const { data: siswa, error: errSiswa } = await supabase
        .from('students')
        .select('id, nomor_urut, nama, jenis_kelamin, nisn')
        .eq('class_id', selectedKelas)
        .eq('user_id', user.id)
        .eq('status', 'aktif')
        .order('nomor_urut', { ascending: true })

      if (errSiswa) throw errSiswa
      setSiswaDaftar(siswa || [])

      const { data: absensi, error: errAbsensi } = await supabase
        .from('attendances')
        .select('id, student_id, status, keterangan')
        .eq('class_id', selectedKelas)
        .eq('user_id', user.id)
        .eq('tanggal', tanggal)

      if (errAbsensi) throw errAbsensi

      const map = {}
      ;(absensi || []).forEach(a => {
        map[a.student_id] = { id: a.id, status: a.status, keterangan: a.keterangan || '' }
      })
      setAbsensiMap(map)

    } catch (err) {
      console.error('Error fetch siswa/absensi:', err.message)
      addToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Ganti status via dropdown ──────────────────────────────
  async function handleStatusChange(siswaId, status) {
    const current = absensiMap[siswaId]
    if (current?.status === status) return

    // Optimistic update
    setAbsensiMap(prev => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        status,
        keterangan: status === 'H' ? '' : (prev[siswaId]?.keterangan || ''),
      }
    }))
    setSavingMap(prev => ({ ...prev, [siswaId]: true }))

    try {
      const payload = {
        student_id: siswaId,
        class_id:   selectedKelas,
        user_id:    user.id,
        tanggal,
        status,
        keterangan: status === 'H' ? '' : (absensiMap[siswaId]?.keterangan || ''),
      }

      const { data, error } = await supabase
        .from('attendances')
        .upsert(payload, { onConflict: 'student_id,tanggal' })
        .select('id')
        .single()

      if (error) throw error

      if (data?.id) {
        setAbsensiMap(prev => ({
          ...prev,
          [siswaId]: { ...prev[siswaId], id: data.id }
        }))
      }
    } catch (err) {
      console.error('Error simpan absensi:', err.message)
      setAbsensiMap(prev => ({ ...prev, [siswaId]: current || null }))
      addToast('Gagal menyimpan', 'error')
    } finally {
      setSavingMap(prev => ({ ...prev, [siswaId]: false }))
    }
  }

  // ── Simpan keterangan ──────────────────────────────────────
  async function handleKeteranganBlur(siswaId, keterangan) {
    const current = absensiMap[siswaId]
    if (!current?.status || current.status === 'H') return
    if (keterangan === current.keterangan) return

    setAbsensiMap(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], keterangan } }))
    setSavingMap(prev => ({ ...prev, [siswaId]: true }))

    try {
      const { error } = await supabase
        .from('attendances')
        .upsert({
          student_id: siswaId,
          class_id:   selectedKelas,
          user_id:    user.id,
          tanggal,
          status:     current.status,
          keterangan,
        }, { onConflict: 'student_id,tanggal' })

      if (error) throw error
    } catch (err) {
      console.error('Error simpan keterangan:', err.message)
      addToast('Gagal menyimpan keterangan', 'error')
    } finally {
      setSavingMap(prev => ({ ...prev, [siswaId]: false }))
    }
  }

  // ── Hadir Semua ────────────────────────────────────────────
  async function handleHadirSemua() {
    if (!siswaDaftar.length) return
    setLoadingHadir(true)
    try {
      const payloads = siswaDaftar.map(s => ({
        student_id: s.id,
        class_id:   selectedKelas,
        user_id:    user.id,
        tanggal,
        status:     'H',
        keterangan: '',
      }))

      const { error } = await supabase
        .from('attendances')
        .upsert(payloads, { onConflict: 'student_id,tanggal' })

      if (error) throw error

      await fetchSiswaAndAbsensi()
      addToast(`${siswaDaftar.length} siswa ditandai Hadir`, 'success')
    } catch (err) {
      console.error('Error hadir semua:', err.message)
      addToast('Gagal mengisi hadir semua', 'error')
    } finally {
      setLoadingHadir(false)
    }
  }

  // ── Navigasi tanggal ───────────────────────────────────────
  function geserHari(arah) {
    const d = new Date(tanggal + 'T00:00:00')
    d.setDate(d.getDate() + arah)
    setTanggal(toDateString(d))
  }

  // ── Ringkasan ──────────────────────────────────────────────
  const ringkasan = siswaDaftar.reduce((acc, s) => {
    const st = absensiMap[s.id]?.status
    if (st) acc[st] = (acc[st] || 0) + 1
    else acc.belum = (acc.belum || 0) + 1
    return acc
  }, { H: 0, S: 0, I: 0, A: 0, belum: 0 })

  const sudahDiisi = siswaDaftar.filter(s => absensiMap[s.id]?.status).length
  const persen = siswaDaftar.length
    ? Math.round((sudahDiisi / siswaDaftar.length) * 100)
    : 0

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <>
      <div className="page-container">

        {/* Breadcrumb */}
        <div className="breadcrumb">
          <a href="/dashboard">Dashboard</a>
          <span className="sep">›</span>
          <span className="current">Absensi Harian</span>
        </div>

        {/* Header */}
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1>📋 Absensi Harian</h1>
              <p>Pilih status dari dropdown — langsung tersimpan otomatis</p>
            </div>
          </div>
        </div>

        {/* Filter: Kelas + Tanggal */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Pilih Kelas */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Pilih Kelas</label>
                <select
                  className="form-input form-select"
                  value={selectedKelas}
                  onChange={e => setSelectedKelas(e.target.value)}
                >
                  <option value="">-- Pilih kelas --</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kelas}
                      {k.tingkat ? ` · ${k.tingkat}` : ''}
                      {k.schools?.nama ? ` — ${k.schools.nama}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilih Tanggal */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tanggal</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => geserHari(-1)}
                    title="Hari sebelumnya"
                  >
                    <IconChevronLeft />
                  </button>
                  <input
                    type="date"
                    className="form-input"
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => geserHari(1)}
                    title="Hari berikutnya"
                    disabled={tanggal >= toDateString(new Date())}
                  >
                    <IconChevronRight />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Konten */}
        {!selectedKelas ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>Pilih kelas terlebih dahulu</h3>
              <p>Pilih kelas dari dropdown di atas untuk mulai mengisi absensi</p>
            </div>
          </div>
        ) : (
          <>
            {/* Info kelas + ringkasan */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body" style={{ padding: '14px 16px' }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        background: 'var(--clr-primary-100)',
                        color: 'var(--clr-primary-700)',
                        padding: '2px 10px', borderRadius: 99,
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {kelasDetail?.nama_kelas || '—'}
                      </span>
                      {kelasDetail?.tahun_ajaran && (
                        <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                          TA {kelasDetail.tahun_ajaran}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, margin: 0, fontWeight: 600, color: 'var(--clr-text)' }}>
                      {formatTanggalIndo(tanggal)}
                    </p>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleHadirSemua}
                    disabled={loadingHadir || loading || !siswaDaftar.length}
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {loadingHadir
                      ? <span className="loading-spinner" style={{ width: 12, height: 12 }} />
                      : <IconCheck />
                    }
                    Hadir Semua
                  </button>
                </div>

                {/* Badge ringkasan */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {['H','S','I','A'].map(st => (
                    <div key={st}
                      className={`chip chip-${st === 'H' ? 'hadir' : st === 'S' ? 'sakit' : st === 'I' ? 'izin' : 'alpha'}`}
                      style={{ minWidth: 48, justifyContent: 'center' }}>
                      {st} {ringkasan[st] || 0}
                    </div>
                  ))}
                  {ringkasan.belum > 0 && (
                    <div className="chip"
                      style={{ background: 'var(--clr-surface-2)', color: 'var(--clr-text-muted)', minWidth: 48, justifyContent: 'center' }}>
                      — {ringkasan.belum}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: 'var(--clr-text-muted)' }}>
                    <span>{sudahDiisi} dari {siswaDaftar.length} siswa sudah diisi</span>
                    <span style={{ fontWeight: 700, color: persen === 100 ? 'var(--clr-primary-600)' : 'var(--clr-text-2)' }}>
                      {persen}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--clr-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${persen}%`,
                      background: persen === 100
                        ? 'var(--clr-primary-500)'
                        : 'linear-gradient(90deg, var(--clr-primary-400), var(--clr-gold-400))',
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

              </div>
            </div>

            {/* Tabel absensi */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Daftar Siswa</h3>
                <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                  {siswaDaftar.length} siswa
                </span>
              </div>

              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <span className="loading-spinner" style={{ width: 28, height: 28 }} />
                  <p style={{ marginTop: 12, fontSize: 13, color: 'var(--clr-text-muted)' }}>
                    Memuat data siswa...
                  </p>
                </div>
              ) : siswaDaftar.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <h3>Belum ada siswa</h3>
                  <p>Tambahkan siswa di halaman Siswa terlebih dahulu</p>
                  <a href={`/siswa/${selectedKelas}`} className="btn btn-primary btn-sm">
                    Tambah Siswa
                  </a>
                </div>
              ) : (
                <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
                  <table className="table" style={{ minWidth: 480 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 30, textAlign: 'center' }}>No</th>
                            <th style={{ width: 250 }}>Nama Siswa</th>
                            <th style={{ width: 30, textAlign: 'center' }}>JK</th>
                            <th style={{ width: 80, textAlign: 'center' }}>Status</th>
                            <th>Keterangan</th>
                            <th style={{ width: 28, textAlign: 'center' }}>💾</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaDaftar.map((siswa, idx) => {
                        const absensi = absensiMap[siswa.id]
                        const status  = absensi?.status || null
                        const saving  = savingMap[siswa.id] || false

                        return (
                          <tr key={siswa.id}>

                            {/* No */}
                            <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                              {siswa.nomor_urut || idx + 1}
                            </td>

                            {/* Nama */}
                            <td style={{ width: 250, maxWidth: 250, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--clr-text)', wordBreak: 'break-word' }}>
                                    {siswa.nama}
                                </div>
                                {siswa.nisn && (
                                    <div style={{ fontSize: 11, color: 'var(--clr-text-muted)', marginTop: 1, whiteSpace: 'nowrap' }}>
                                        NISN: {siswa.nisn}
                                    </div>
                                )}
                            </td>

                            {/* Jenis Kelamin */}
                            <td style={{ textAlign: 'center', padding: '6px 4px', width: 80 }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                fontSize: 12,
                                fontWeight: 700,
                                background: siswa.jenis_kelamin === 'L'
                                ? 'var(--clr-sakit-bg)'
                                : 'var(--clr-izin-bg)',
                                color: siswa.jenis_kelamin === 'L'
                                ? 'var(--clr-sakit)'
                                : 'var(--clr-izin)',
                            }}>
                                {siswa.jenis_kelamin || '—'}
                            </span>
                            </td>

                            {/* Dropdown status */}
                            <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            <StatusDropdown
                                siswaId={siswa.id}
                                status={status}
                                saving={saving}
                                onChange={handleStatusChange}
                            />
                            </td>

                            {/* Keterangan — hanya S/I/A */}
                            <td style={{ padding: '6px 8px' }}>
                              {status && status !== 'H' ? (
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ fontSize: 13, padding: '6px 10px', minWidth: 0 }}
                                  placeholder={
                                    status === 'S' ? 'Nama penyakit...' :
                                    status === 'I' ? 'Alasan izin...' :
                                    'Keterangan...'
                                  }
                                  defaultValue={absensi?.keterangan || ''}
                                  key={`${siswa.id}-${status}`}
                                  onBlur={e => handleKeteranganBlur(siswa.id, e.target.value)}
                                />
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontStyle: 'italic' }}>
                                  {status === 'H' ? '—' : 'Pilih status dulu'}
                                </span>
                              )}
                            </td>

                            {/* Indikator saving */}
                            <td style={{ textAlign: 'center' }}>
                              {saving ? (
                                <span className="loading-spinner"
                                  style={{ width: 14, height: 14, color: 'var(--clr-primary-500)' }} />
                              ) : status ? (
                                <span style={{ color: 'var(--clr-primary-500)' }}>
                                  <IconSave />
                                </span>
                              ) : null}
                            </td>

                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              {siswaDaftar.length > 0 && (
                <div className="card-footer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                    Total: {siswaDaftar.length} siswa
                    &nbsp;·&nbsp;Hadir: <strong style={{ color: 'var(--clr-hadir)' }}>{ringkasan.H}</strong>
                    &nbsp;·&nbsp;Sakit: <strong style={{ color: 'var(--clr-sakit)' }}>{ringkasan.S}</strong>
                    &nbsp;·&nbsp;Izin: <strong style={{ color: 'var(--clr-izin)' }}>{ringkasan.I}</strong>
                    &nbsp;·&nbsp;Alpha: <strong style={{ color: 'var(--clr-alpha)' }}>{ringkasan.A}</strong>
                    {ringkasan.belum > 0 && (
                      <>&nbsp;·&nbsp;Belum: <strong style={{ color: 'var(--clr-text-muted)' }}>{ringkasan.belum}</strong></>
                    )}
                  </div>
                  {persen === 100 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 700,
                      color: 'var(--clr-primary-600)',
                      background: 'var(--clr-primary-50)',
                      padding: '4px 12px', borderRadius: 99,
                      border: '1px solid var(--clr-primary-200)',
                    }}>
                      <IconCheck /> Absensi lengkap
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Toast toasts={toasts} />
    </>
  )
}