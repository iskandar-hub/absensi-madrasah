'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InputNilaiPage() {
  const router = useRouter()
  const params = useParams()

  const kelasId = params.kelasId
  const assessmentId = params.assessmentId

  const [user, setUser] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [students, setStudents] = useState([])
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

    // assessment
    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .single()

    // siswa
    const { data: siswaData } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', kelasId)
      .eq('status', 'aktif')
      .order('nomor_urut')

    // nilai yang sudah ada
    const { data: scoreData } = await supabase
      .from('assessment_scores')
      .select('*')
      .eq('assessment_id', assessmentId)

    const nilaiMap = {}

    scoreData?.forEach((item) => {
      nilaiMap[item.student_id] = item.nilai
    })

    setAssessment(assessmentData)
    setStudents(siswaData || [])
    setScores(nilaiMap)

    setLoading(false)
  }

  // =========================
  // HITUNG GRADE
  // =========================
  async function updateGrades(studentId) {
    const { data: assessments } = await supabase
      .from('assessments')
      .select(`
        *,
        assessment_scores (
          student_id,
          nilai
        )
      `)
      .eq('class_id', kelasId)
      .eq('mapel', assessment.mapel)
      .eq('semester', assessment.semester)
      .eq('tahun_ajaran', assessment.tahun_ajaran)

    const nilaiFormatif = []
    let sts = null
    let sas = null
    let p5 = null

    assessments?.forEach((a) => {
      const nilaiSiswa =
        a.assessment_scores?.find(
          (s) => s.student_id === studentId
        )?.nilai ?? null

      if (nilaiSiswa === null) return

      if (a.jenis === 'formatif') {
        nilaiFormatif.push(Number(nilaiSiswa))
      }

      if (a.jenis === 'sumatif_tengah') {
        sts = Number(nilaiSiswa)
      }

      if (a.jenis === 'sumatif_akhir') {
        sas = Number(nilaiSiswa)
      }

      if (a.jenis === 'p5') {
        p5 = Number(nilaiSiswa)
      }
    })

    const rataFormatif =
      nilaiFormatif.length > 0
        ? nilaiFormatif.reduce((a, b) => a + b, 0) /
          nilaiFormatif.length
        : 0

    const nilaiAkhir =
      (
        rataFormatif * 0.4 +
        (sts || 0) * 0.2 +
        (sas || 0) * 0.3 +
        (p5 || 0) * 0.1
      ).toFixed(2)

    let predikat = 'D'

    if (nilaiAkhir >= 90) predikat = 'A'
    else if (nilaiAkhir >= 80) predikat = 'B'
    else if (nilaiAkhir >= 60) predikat = 'C'

    await supabase
      .from('grades')
      .upsert(
        {
          student_id: studentId,
          class_id: kelasId,
          user_id: user.id,

          mapel: assessment.mapel,
          semester: assessment.semester,
          tahun_ajaran: assessment.tahun_ajaran,

          rata_formatif: rataFormatif,
          sumatif_tengah: sts,
          sumatif_akhir: sas,
          nilai_p5: p5,

          nilai_akhir: nilaiAkhir,
          predikat
        },
        {
          onConflict:
            'student_id,mapel,semester,tahun_ajaran'
        }
      )
  }

  // =========================
  // SIMPAN
  // =========================
  async function simpanNilai() {
    try {
      setSaving(true)

      for (const student of students) {
        const nilai = scores[student.id]

        if (
          nilai === '' ||
          nilai === null ||
          nilai === undefined
        )
          continue

        await supabase
          .from('assessment_scores')
          .upsert(
            {
              assessment_id: assessmentId,
              student_id: student.id,
              nilai: Number(nilai)
            },
            {
              onConflict:
                'assessment_id,student_id'
            }
          )

        await updateGrades(student.id)
      }

      alert('Nilai berhasil disimpan')
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan nilai')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <p>Memuat data...</p>
      </div>
    )
  }

  return (
    <div className="page-container">

      <div className="breadcrumb">
        <a href="/dashboard">Dashboard</a>
        <span className="sep">›</span>

        <a href="/penilaian">Penilaian</a>
        <span className="sep">›</span>

        <a href={`/penilaian/${kelasId}`}>
          {assessment?.mapel}
        </a>

        <span className="sep">›</span>

        <span className="current">
          {assessment?.nama_penilaian}
        </span>
      </div>

      <div className="page-header">
        <div className="page-header-row">

          <div>
            <h1>
              📝 {assessment?.nama_penilaian}
            </h1>

            <p>
              {assessment?.mapel} •{' '}
              {assessment?.semester}
            </p>
          </div>

          <button
            onClick={simpanNilai}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving
              ? 'Menyimpan...'
              : 'Simpan Semua Nilai'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">

          <div className="table-wrapper">

            <table className="table" style={{ minWidth: 'unset', width: '100%' }}>
              <colgroup>
                <col style={{ width: '40px' }} />     
                <col />                                 
                <col style={{ width: '80px' }} />    
              </colgroup>

              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>No</th>
                  <th>Nama Siswa</th>
                  <th>Nilai</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>{student.nama}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input"
                        style={{
                          width: '50px',
                          minHeight: '36px',
                          padding: '6px 10px',
                          fontSize: '14px',
                          MozAppearance: 'textfield'  
                        }}
                        value={scores[student.id] ?? ''}
                        onChange={(e) =>
                          setScores({
                            ...scores,
                            [student.id]: e.target.value
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>

          </div>

        </div>
      </div>

    </div>
  )
}