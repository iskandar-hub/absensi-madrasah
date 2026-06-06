'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AbsensiIndexPage() {
  const router = useRouter()
  const [user,      setUser]      = useState(null)
  const [kelasList, setKelasList] = useState([])
  const [loading,   setLoading]   = useState(true)

  // ── Auth check ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
    })
  }, [router])

  // ── Load semua kelas milik user ────────────────────────────
  useEffect(() => {
    if (!user) return
    async function fetchKelas() {
      setLoading(true)
      const { data, error } = await supabase
        .from('classes')
        .select('id, nama_kelas, tingkat, tahun_ajaran, schools(nama)')
        .eq('user_id', user.id)
        .order('nama_kelas', { ascending: true })

      if (error) { console.error(error.message); setLoading(false); return }
      setKelasList(data || [])
      setLoading(false)
    }
    fetchKelas()
  }, [user])

  // ── Format tanggal hari ini ────────────────────────────────
  function hariIni() {
    const hari  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
    const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
    const d = new Date()
    return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="page-container">

      {/* ── Breadcrumb ────────────────────────────────────── */}
      <div className="breadcrumb">
        <a href="/dashboard">Dashboard</a>
        <span className="sep">›</span>
        <span className="current">Absensi</span>
      </div>

      {/* ── Page Header ───────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>📋 Absensi Harian</h1>
            <p>Pilih kelas untuk mulai mengisi absensi — {hariIni()}</p>
          </div>
        </div>
      </div>

      {/* ── Konten ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <span className="loading-spinner" style={{ width: 28, height: 28 }} />
          <p style={{ marginTop: 12, color: 'var(--clr-text-muted)', fontSize: 13 }}>
            Memuat daftar kelas...
          </p>
        </div>

      ) : kelasList.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏫</div>
            <h3>Belum ada kelas</h3>
            <p>Buat kelas terlebih dahulu sebelum mengisi absensi</p>
            <a href="/kelas" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
              Buat Kelas
            </a>
          </div>
        </div>

      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14
        }}>
          {kelasList.map(kelas => (
            <button
              key={kelas.id}
              onClick={() => router.push(`/absensi/${kelas.id}`)}
              style={{
                textAlign: 'left',
                background: 'var(--clr-surface)',
                border: '1.5px solid var(--clr-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--clr-primary-400)'
                e.currentTarget.style.boxShadow   = 'var(--shadow-primary)'
                e.currentTarget.style.transform   = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--clr-border)'
                e.currentTarget.style.boxShadow   = 'var(--shadow-sm)'
                e.currentTarget.style.transform   = 'translateY(0)'
              }}
            >
              {/* Ikon + Nama Kelas */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                  background: 'var(--clr-primary-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20
                }}>
                  📚
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--clr-text)' }}>
                    {kelas.nama_kelas}
                  </div>
                  {kelas.tingkat && (
                    <div style={{ fontSize: 12, color: 'var(--clr-text-muted)', marginTop: 1 }}>
                      Tingkat {kelas.tingkat}
                    </div>
                  )}
                </div>
              </div>

              {/* Info bawah */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>
                  {kelas.schools?.nama || '—'}
                </span>
                {kelas.tahun_ajaran && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--clr-primary-700)',
                    background: 'var(--clr-primary-50)',
                    padding: '2px 8px', borderRadius: 99,
                    border: '1px solid var(--clr-primary-200)'
                  }}>
                    TA {kelas.tahun_ajaran}
                  </span>
                )}
              </div>

              {/* Tombol Mulai Absensi */}
              <div style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid var(--clr-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--clr-primary-600)',
              }}>
                <span>Mulai Absensi</span>
                <span style={{ fontSize: 16 }}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  )
}