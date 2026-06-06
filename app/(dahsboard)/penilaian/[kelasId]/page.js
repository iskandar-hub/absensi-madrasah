'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PenilaianKelasPage() {
  const params = useParams()
  const router = useRouter()

  const kelasId = params.kelasId

  const [user, setUser] = useState(null)
  const [kelas, setKelas] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [assessments, setAssessments] = useState([])

  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)

  const [form, setForm] = useState({
    mapel: '',
    semester: 'Semester 1',
    nama_penilaian: '',
    jenis: 'formatif',
    bab: '',
    materi: '',
    tanggal: new Date().toISOString().split('T')[0]
  })

  // =========================
  // AUTH
  // =========================
  useEffect(() => {
    async function cekAuth() {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/')
        return
      }

      setUser(session.user)
    }

    cekAuth()
  }, [router])

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {
    if (!user) return

    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)

    const { data: kelasData } = await supabase
      .from('classes')
      .select('*')
      .eq('id', kelasId)
      .single()

    const { data: mapelData } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('nama')

    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('*')
      .eq('class_id', kelasId)
      .order('created_at', { ascending: false })

    setKelas(kelasData)
    setSubjects(mapelData || [])
    setAssessments(assessmentData || [])

    setLoading(false)
  }

  // =========================
  // SIMPAN PENILAIAN
  // =========================
  async function simpanPenilaian(e) {
    e.preventDefault()

    if (!form.mapel) {
      alert('Pilih mata pelajaran')
      return
    }

    const { error } = await supabase
      .from('assessments')
      .insert({
        class_id: kelasId,
        user_id: user.id,

        mapel: form.mapel,
        semester: form.semester,

        tahun_ajaran: kelas.tahun_ajaran,

        nama_penilaian: form.nama_penilaian,
        jenis: form.jenis,

        bab: form.bab,
        materi: form.materi,
        tanggal: form.tanggal
      })

    if (error) {
      alert(error.message)
      return
    }

    setOpenModal(false)

    setForm({
      mapel: '',
      semester: 'Semester 1',
      nama_penilaian: '',
      jenis: 'formatif',
      bab: '',
      materi: '',
      tanggal: new Date().toISOString().split('T')[0]
    })

    loadData()
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: 60 }}>
          Memuat data...
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/dashboard">Dashboard</a>
        <span className="sep">›</span>

        <a href="/penilaian">Penilaian</a>
        <span className="sep">›</span>

        <span className="current">
          {kelas?.nama_kelas}
        </span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>
              📝 Penilaian {kelas?.nama_kelas}
            </h1>

            <p>
              Tahun Ajaran {kelas?.tahun_ajaran}
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setOpenModal(true)}
          >
            + Tambah Penilaian
          </button>
        </div>
      </div>

      {/* LIST PENILAIAN */}
      <div className="card">
        <div className="card-header">
          <strong>Daftar Penilaian</strong>
        </div>

        <div className="card-body">

          {assessments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                📝
              </div>

              <h3>Belum ada penilaian</h3>

              <p>
                Klik tombol Tambah Penilaian
                untuk membuat penilaian baru
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama Penilaian</th>
                    <th>Mapel</th>
                    <th>Semester</th>
                    <th>Jenis</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {assessments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nama_penilaian}</td>
                      <td>{item.mapel}</td>
                      <td>{item.semester}</td>
                      <td>{item.jenis}</td>
                      <td>{item.tanggal}</td>

                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() =>
                            router.push(
                              `/penilaian/${kelasId}/${item.id}`
                            )
                          }
                        >
                          Input Nilai
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH PENILAIAN */}
      {openModal && (
        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">
              <h3>Tambah Penilaian</h3>

              <button
                className="btn-close"
                onClick={() => setOpenModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={simpanPenilaian}>
              <div className="modal-body">

                <div className="form-group">
                  <label>Mapel</label>

                  <select
                    className="input"
                    value={form.mapel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        mapel: e.target.value
                      })
                    }
                    required
                  >
                    <option value="">
                      Pilih Mata Pelajaran
                    </option>

                    {subjects.map((s) => (
                      <option
                        key={s.id}
                        value={s.nama}
                      >
                        {s.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Semester</label>

                  <select
                    className="input"
                    value={form.semester}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        semester: e.target.value
                      })
                    }
                  >
                    <option>
                      Semester 1
                    </option>

                    <option>
                      Semester 2
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tahun Ajaran</label>

                  <input
                    className="input"
                    value={kelas?.tahun_ajaran || ''}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>Nama Penilaian</label>

                  <input
                    className="input"
                    value={form.nama_penilaian}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nama_penilaian:
                          e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Jenis Penilaian</label>

                  <select
                    className="input"
                    value={form.jenis}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        jenis: e.target.value
                      })
                    }
                  >
                    <option value="formatif">
                      Formatif
                    </option>

                    <option value="sumatif_tengah">
                      Sumatif Tengah Semester
                    </option>

                    <option value="sumatif_akhir">
                      Sumatif Akhir Semester
                    </option>

                    <option value="p5">
                      P5
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Bab</label>

                  <input
                    className="input"
                    value={form.bab}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bab: e.target.value
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Materi</label>

                  <textarea
                    className="input"
                    value={form.materi}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        materi: e.target.value
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Tanggal</label>

                  <input
                    type="date"
                    className="input"
                    value={form.tanggal}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tanggal: e.target.value
                      })
                    }
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpenModal(false)}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Simpan
                </button>
              </div>
            </form>

          </div>

        </div>
      )}
    </div>
  )
}