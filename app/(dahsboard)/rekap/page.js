"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KopSurat from "@/components/KopSurat";

// ============================================================
// KONSTANTA
// ============================================================
const BULAN_LIST = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const SEMESTER_LIST = [
  { value: "Semester 1", label: "Semester 1 (Juli–Desember)" },
  { value: "Semester 2", label: "Semester 2 (Januari–Juni)" },
];

const BULAN_SEMESTER = {
  "Semester 1": ["07", "08", "09", "10", "11", "12"],
  "Semester 2": ["01", "02", "03", "04", "05", "06"],
};

const DEFAULT_PERSEN = {
  formatif: 40,
  sts:      20,
  sas:      30,
  p5:       10,
};

// Nama tempat untuk tanda tangan — sesuaikan jika perlu
const NAMA_TEMPAT = "Pasir Lamba";

// ============================================================
// HELPER: format tanggal cetak resmi
// ============================================================
function tanggalCetak() {
  return new Date().toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function RekapPage() {
  const router = useRouter();

  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState("absensi");

  // Data master
  const [kelasList, setKelasList]   = useState([]);
  const [mapelList, setMapelList]   = useState([]);
  const [schoolData, setSchoolData] = useState(null);
  const [tahunList, setTahunList]   = useState([]);

  // ── Filter Absensi ──
  const [filterAbsenKelas,    setFilterAbsenKelas]    = useState("");
  const [filterAbsenMode,     setFilterAbsenMode]     = useState("bulanan");
  const [filterAbsenBulan,    setFilterAbsenBulan]    = useState("");
  const [filterAbsenSemester, setFilterAbsenSemester] = useState("");
  const [filterAbsenTahun,    setFilterAbsenTahun]    = useState("");

  // ── Filter Nilai ──
  const [filterNilaiKelas,    setFilterNilaiKelas]    = useState("");
  const [filterNilaiMapel,    setFilterNilaiMapel]    = useState("");
  const [filterNilaiSemester, setFilterNilaiSemester] = useState("");
  const [filterNilaiTahun,    setFilterNilaiTahun]    = useState("");

  // ── Data hasil query ──
  const [rekapAbsen, setRekapAbsen] = useState([]);
  const [rekapNilai, setRekapNilai] = useState([]);

  // ── Persentase nilai ──
  const [persen, setPersen]       = useState(DEFAULT_PERSEN);
  const [persenError, setPersenError] = useState("");

  const totalPersen = persen.formatif + persen.sts + persen.sas + persen.p5;

  // ── Nama guru ──
  const [namaGuru, setNamaGuru] = useState("");

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUser(user);

      const nama =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] || "";
      setNamaGuru(nama);

      const [kelasRes, mapelRes, schoolRes] = await Promise.all([
        supabase
          .from("classes")
          .select("id, nama_kelas, tingkat, tahun_ajaran")
          .eq("user_id", user.id)
          .order("nama_kelas"),

        supabase
          .from("subjects")
          .select("id, nama")
          .eq("user_id", user.id)
          .order("nama"),

        supabase
          .from("schools")
          .select("nama, npsn, nsm, kabupaten, kepala_sekolah, alamat")
          .eq("user_id", user.id)
          .limit(1)
          .single(),
      ]);

      const kelas = kelasRes.data || [];
      setKelasList(kelas);
      setMapelList(mapelRes.data || []);
      setSchoolData(schoolRes.data || null);

      const tahunUnik = [
        ...new Set(kelas.map((k) => k.tahun_ajaran).filter(Boolean)),
      ].sort((a, b) => b.localeCompare(a));
      setTahunList(tahunUnik);
    }
    init();
  }, [router]);

  // ============================================================
  // FETCH REKAP ABSENSI
  // ============================================================
  const fetchRekapAbsen = useCallback(async () => {
    if (!filterAbsenKelas) return;
    if (filterAbsenMode === "bulanan"  && !filterAbsenBulan)    return;
    if (filterAbsenMode === "semester" && !filterAbsenSemester) return;
    if (!filterAbsenTahun) return;

    setLoading(true);

    const { data: siswaData } = await supabase
      .from("students")
      .select("id, nama, nomor_urut")
      .eq("class_id", filterAbsenKelas)
      .eq("status", "aktif")
      .order("nomor_urut");

    if (!siswaData || siswaData.length === 0) {
      setRekapAbsen([]);
      setLoading(false);
      return;
    }

    const [tahunAwal, tahunAkhir] = filterAbsenTahun.split("/");

    let tanggalMulai, tanggalSelesai;

    if (filterAbsenMode === "bulanan") {
      // Tentukan tahun yang tepat berdasarkan bulan
      // Semester 1: Juli(07)–Des(12) = tahun awal | Semester 2: Jan(01)–Jun(06) = tahun akhir
      const tahunBulan = parseInt(filterAbsenBulan) >= 7 ? tahunAwal : tahunAkhir;
      const lastDay = new Date(parseInt(tahunBulan), parseInt(filterAbsenBulan), 0).getDate();
      tanggalMulai   = `${tahunBulan}-${filterAbsenBulan}-01`;
      tanggalSelesai = `${tahunBulan}-${filterAbsenBulan}-${lastDay}`;
    } else {
      const bulanSemester = BULAN_SEMESTER[filterAbsenSemester];
      // Semester 1 pakai tahunAwal, Semester 2 pakai tahunAkhir
      const tahunSmt = filterAbsenSemester === "Semester 1" ? tahunAwal : tahunAkhir;
      tanggalMulai  = `${tahunSmt}-${bulanSemester[0]}-01`;
      const bulanAkhir = bulanSemester[bulanSemester.length - 1];
      const lastDay = new Date(parseInt(tahunSmt), parseInt(bulanAkhir), 0).getDate();
      tanggalSelesai = `${tahunSmt}-${bulanAkhir}-${lastDay}`;
    }

    const siswaIds = siswaData.map((s) => s.id);
    const { data: absenData } = await supabase
      .from("attendances")
      .select("student_id, status")
      .in("student_id", siswaIds)
      .gte("tanggal", tanggalMulai)
      .lte("tanggal", tanggalSelesai);

    const rekap = siswaData.map((siswa, idx) => {
      const absenSiswa = (absenData || []).filter((a) => a.student_id === siswa.id);
      const H = absenSiswa.filter((a) => a.status === "H").length;
      const S = absenSiswa.filter((a) => a.status === "S").length;
      const I = absenSiswa.filter((a) => a.status === "I").length;
      const A = absenSiswa.filter((a) => a.status === "A").length;
      const total = H + S + I + A;
      const pctHadir = total > 0 ? Math.round((H / total) * 100) : 0;
      return { no: idx + 1, id: siswa.id, nama: siswa.nama, H, S, I, A, total, pctHadir };
    });

    setRekapAbsen(rekap);
    setLoading(false);
  }, [filterAbsenKelas, filterAbsenMode, filterAbsenBulan, filterAbsenSemester, filterAbsenTahun]);

  useEffect(() => { fetchRekapAbsen(); }, [fetchRekapAbsen]);

  // ============================================================
  // FETCH REKAP NILAI
  // ============================================================
  const fetchRekapNilai = useCallback(async () => {
    if (!filterNilaiKelas || !filterNilaiMapel ||
        !filterNilaiSemester || !filterNilaiTahun) return;

    setLoading(true);

    const { data: siswaData } = await supabase
      .from("students")
      .select("id, nama, nomor_urut")
      .eq("class_id", filterNilaiKelas)
      .eq("status", "aktif")
      .order("nomor_urut");

    const { data: gradesData } = await supabase
      .from("grades")
      .select(`
        student_id,
        rata_formatif,
        sumatif_tengah,
        sumatif_akhir,
        nilai_p5,
        nilai_akhir,
        predikat,
        capaian_kompetensi
      `)
      .eq("class_id", filterNilaiKelas)
      .eq("mapel", filterNilaiMapel)
      .eq("semester", filterNilaiSemester)
      .eq("tahun_ajaran", filterNilaiTahun);

    const gradesMap = {};
    (gradesData || []).forEach((g) => { gradesMap[g.student_id] = g; });

    const rekap = (siswaData || []).map((siswa, idx) => {
      const g = gradesMap[siswa.id] || {};
      return {
        no:            idx + 1,
        id:            siswa.id,
        nama:          siswa.nama,
        rata_formatif: g.rata_formatif  ?? null,
        sts:           g.sumatif_tengah ?? null,
        sas:           g.sumatif_akhir  ?? null,
        p5:            g.nilai_p5       ?? null,
        predikat:      g.predikat       ?? "-",
        capaian:       g.capaian_kompetensi ?? "",
      };
    });

    setRekapNilai(rekap);
    setLoading(false);
  }, [filterNilaiKelas, filterNilaiMapel, filterNilaiSemester, filterNilaiTahun]);

  useEffect(() => { fetchRekapNilai(); }, [fetchRekapNilai]);

  // ============================================================
  // HITUNG NILAI AKHIR
  // ============================================================
  function hitungNilaiAkhir(row) {
    const f  = row.rata_formatif ?? 0;
    const st = row.sts           ?? 0;
    const sa = row.sas           ?? 0;
    const p  = row.p5            ?? 0;
    const nilai =
      (f  * persen.formatif / 100) +
      (st * persen.sts      / 100) +
      (sa * persen.sas      / 100) +
      (p  * persen.p5       / 100);
    return Math.round(nilai * 10) / 10;
  }

  function hitungPredikat(nilai) {
    if (nilai >= 91) return "A";
    if (nilai >= 81) return "B";
    if (nilai >= 71) return "C";
    return "D";
  }

  // ============================================================
  // HELPER
  // ============================================================
  function namaKelas(id) {
    return kelasList.find((k) => k.id === id)?.nama_kelas || "-";
  }

  function labelPeriodeAbsen() {
    if (filterAbsenMode === "bulanan") {
      const b = BULAN_LIST.find((b) => b.value === filterAbsenBulan)?.label || "";
      return `${b} ${filterAbsenTahun}`;
    }
    const s = SEMESTER_LIST.find((s) => s.value === filterAbsenSemester)?.label || "";
    return `${s} ${filterAbsenTahun}`;
  }

  // ============================================================
  // KOMPONEN TANDA TANGAN — dipakai di area cetak HTML
  // ============================================================
  function TandaTanganPrint({ kiri, kanan }) {
    const tgl = `${NAMA_TEMPAT}, ${tanggalCetak()}`;
    return (
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 32,
        fontFamily: "Times New Roman, serif",
        fontSize: 11,
      }}>
        {/* Kiri — Kepala Sekolah */}
        {kiri && (
          <div style={{ textAlign: "center", minWidth: 200 }}>
            <div>Mengetahui,</div>
            <div style={{ fontWeight: "bold" }}>Kepala {schoolData?.nama || "Sekolah"}</div>
            <div style={{ margin: "48px 0 4px", borderTop: "1px solid #333", paddingTop: 4 }}>
              {kiri}
            </div>
          </div>
        )}

        {/* Kanan — Guru */}
        <div style={{ textAlign: "center", minWidth: 200 }}>
          <div>{tgl}</div>
          <div style={{ fontWeight: "bold" }}>Guru Mata Pelajaran,</div>
          <div style={{ margin: "48px 0 4px", borderTop: "1px solid #333", paddingTop: 4 }}>
            {kanan}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="page-container">

      {/* ══ CSS PRINT ══ */}
      <style>{`
        @media print {
          @page { size: 330.2mm 215.9mm landscape; margin: 15mm; }
          .navbar, .sidebar, .mobile-nav,
          .no-print, .page-header, .breadcrumb,
          .tab-bar, .filter-card, .rekap-card-ui,
          .modal-backdrop, .toast-container { display: none !important; }
          .main-content   { padding: 0 !important; }
          .page-container { padding: 0 !important; max-width: 100% !important; }
          .print-area     { display: block !important; }
        }
        .print-area { display: none; }
      `}</style>

      {/* ══ AREA CETAK — ABSENSI ══ */}
      {rekapAbsen.length > 0 && (
        <div className="print-area">
          <PrintKopSurat school={schoolData} />

          <div style={{ textAlign: "center", margin: "10px 0 6px", fontFamily: "Times New Roman, serif" }}>
            <div style={{ fontSize: 14, fontWeight: "bold", textTransform: "uppercase" }}>
              Rekap Absensi Siswa
            </div>
            <div style={{ fontSize: 11, marginTop: 2 }}>
              Kelas: {namaKelas(filterAbsenKelas)} &nbsp;|&nbsp; Periode: {labelPeriodeAbsen()}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "Times New Roman, serif" }}>
            <thead>
              <tr style={{ background: "#dcfce7", printColorAdjust: "exact" }}>
                {["No", "Nama Siswa", "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpha (A)", "Total", "% Hadir"].map((h) => (
                  <th key={h} style={{
                    border: "1px solid #333", padding: "4px 6px",
                    textAlign: ["No","Hadir (H)","Sakit (S)","Izin (I)","Alpha (A)","Total","% Hadir"].includes(h) ? "center" : "left",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rekapAbsen.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#f0fdf4" }}>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{row.no}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", fontWeight: 600 }}>{row.nama}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", color: "#15803d", fontWeight: 700 }}>{row.H}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", color: "#1d4ed8", fontWeight: 700 }}>{row.S}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", color: "#b45309", fontWeight: 700 }}>{row.I}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", color: "#b91c1c", fontWeight: 700 }}>{row.A}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{row.total}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", fontWeight: 700, color: row.pctHadir >= 75 ? "#15803d" : "#b91c1c" }}>{row.pctHadir}%</td>
                </tr>
              ))}
              {/* Baris total */}
              <tr style={{ background: "#dcfce7", fontWeight: 700, printColorAdjust: "exact" }}>
                <td colSpan={2} style={{ border: "1px solid #333", padding: "4px 6px" }}>Total Keseluruhan</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", color: "#15803d" }}>{rekapAbsen.reduce((s,r)=>s+r.H,0)}</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", color: "#1d4ed8" }}>{rekapAbsen.reduce((s,r)=>s+r.S,0)}</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", color: "#b45309" }}>{rekapAbsen.reduce((s,r)=>s+r.I,0)}</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", color: "#b91c1c" }}>{rekapAbsen.reduce((s,r)=>s+r.A,0)}</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>{rekapAbsen.reduce((s,r)=>s+r.total,0)}</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px" }}></td>
              </tr>
            </tbody>
          </table>

          <TandaTanganPrint
            kiri={schoolData?.kepala_sekolah}
            kanan={namaGuru}
          />
        </div>
      )}

      {/* ══ AREA CETAK — NILAI ══ */}
      {rekapNilai.length > 0 && totalPersen === 100 && (
        <div className="print-area">
          <PrintKopSurat school={schoolData} />

          <div style={{ textAlign: "center", margin: "10px 0 6px", fontFamily: "Times New Roman, serif" }}>
            <div style={{ fontSize: 14, fontWeight: "bold", textTransform: "uppercase" }}>
              Rekap Nilai Siswa
            </div>
            <div style={{ fontSize: 11, marginTop: 2 }}>
              Kelas: {namaKelas(filterNilaiKelas)} &nbsp;|&nbsp;
              Mapel: {filterNilaiMapel} &nbsp;|&nbsp;
              Semester: {filterNilaiSemester} &nbsp;|&nbsp;
              TA: {filterNilaiTahun}
            </div>
            <div style={{ fontSize: 9, marginTop: 2, color: "#555" }}>
              Rumus: Formatif {persen.formatif}% + STS {persen.sts}% + SAS {persen.sas}% + P5 {persen.p5}%
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "Times New Roman, serif" }}>
            <thead>
              <tr style={{ background: "#dcfce7", printColorAdjust: "exact" }}>
                {[
                  "No", "Nama Siswa",
                  `Formatif\n(${persen.formatif}%)`,
                  `STS\n(${persen.sts}%)`,
                  `SAS\n(${persen.sas}%)`,
                  `P5\n(${persen.p5}%)`,
                  "Nilai Akhir", "Predikat",
                ].map((h) => (
                  <th key={h} style={{
                    border: "1px solid #333", padding: "4px 6px",
                    textAlign: h === "No" || h.includes("Formatif") || h.includes("STS") || h.includes("SAS") || h.includes("P5") || h === "Nilai Akhir" || h === "Predikat" ? "center" : "left",
                    whiteSpace: "pre-line", fontSize: 9,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rekapNilai.map((row, i) => {
                const nilai    = hitungNilaiAkhir(row);
                const predikat = hitungPredikat(nilai);
                return (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#f0fdf4" }}>
                    <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{row.no}</td>
                    <td style={{ border: "1px solid #ccc", padding: "3px 6px", fontWeight: 600 }}>{row.nama}</td>
                    <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{row.rata_formatif ?? "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{row.sts ?? "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{row.sas ?? "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{row.p5 ?? "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", fontWeight: 700 }}>{nilai}</td>
                    <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center", fontWeight: 700 }}>{predikat}</td>
                  </tr>
                );
              })}
              {/* Baris rata-rata */}
              <tr style={{ background: "#dcfce7", fontWeight: 700, printColorAdjust: "exact" }}>
                <td colSpan={2} style={{ border: "1px solid #333", padding: "4px 6px" }}>Rata-rata Kelas</td>
                {["rata_formatif", "sts", "sas", "p5"].map((key) => {
                  const vals = rekapNilai.map((r) => r[key]).filter((v) => v !== null);
                  const avg  = vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : "-";
                  return <td key={key} style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>{avg}</td>;
                })}
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>
                  {(() => {
                    const vals = rekapNilai.map((r) => hitungNilaiAkhir(r));
                    return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10;
                  })()}
                </td>
                <td style={{ border: "1px solid #333", padding: "4px 6px" }}></td>
              </tr>
            </tbody>
          </table>

          <TandaTanganPrint
            kiri={schoolData?.kepala_sekolah}
            kanan={namaGuru}
          />
        </div>
      )}

      {/* ══ HEADER UI ══ */}
      <div className="page-header no-print">
        <div className="breadcrumb">
          <a href="/dashboard">Dashboard</a>
          <span className="sep">›</span>
          <span className="current">Rekap</span>
        </div>
        <div className="page-header-row">
          <div>
            <h1>Rekap & Export</h1>
            <p>Rekap absensi dan nilai siswa. Export ke PDF atau Excel.</p>
          </div>
        </div>
      </div>

      {/* Tab */}
      <div className="tab-bar no-print" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {[
          { id: "absensi", label: "📋 Rekap Absensi" },
          { id: "nilai",   label: "📝 Rekap Nilai"   },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB REKAP ABSENSI
      ══════════════════════════════════════════════════════ */}
      {activeTab === "absensi" && (
        <>
          <div className="card filter-card no-print" style={{ marginBottom: "1rem" }}>
            <div className="card-header">
              <h3>Filter Rekap Absensi</h3>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Kelas</label>
                    <select className="form-input form-select" value={filterAbsenKelas} onChange={(e) => setFilterAbsenKelas(e.target.value)}>
                      <option value="">-- Pilih Kelas --</option>
                      {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tahun Ajaran</label>
                    <select className="form-input form-select" value={filterAbsenTahun} onChange={(e) => setFilterAbsenTahun(e.target.value)}>
                      <option value="">-- Pilih Tahun --</option>
                      {tahunList.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Mode Periode</label>
                    <select className="form-input form-select" value={filterAbsenMode}
                      onChange={(e) => { setFilterAbsenMode(e.target.value); setFilterAbsenBulan(""); setFilterAbsenSemester(""); }}>
                      <option value="bulanan">Per Bulan</option>
                      <option value="semester">Per Semester</option>
                    </select>
                  </div>
                  {filterAbsenMode === "bulanan" ? (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Bulan</label>
                      <select className="form-input form-select" value={filterAbsenBulan} onChange={(e) => setFilterAbsenBulan(e.target.value)}>
                        <option value="">-- Pilih Bulan --</option>
                        {BULAN_LIST.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Semester</label>
                      <select className="form-input form-select" value={filterAbsenSemester} onChange={(e) => setFilterAbsenSemester(e.target.value)}>
                        <option value="">-- Pilih Semester --</option>
                        {SEMESTER_LIST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!filterAbsenKelas ? (
            <div className="empty-state no-print">
              <div className="empty-state-icon">📋</div>
              <h3>Pilih Filter Terlebih Dahulu</h3>
              <p>Pilih kelas, tahun ajaran, dan periode untuk melihat rekap absensi.</p>
            </div>
          ) : loading ? (
            <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: "var(--radius-md)" }} />
              ))}
            </div>
          ) : rekapAbsen.length === 0 ? (
            <div className="empty-state no-print">
              <div className="empty-state-icon">🔍</div>
              <h3>Data Tidak Ditemukan</h3>
              <p>Belum ada data absensi untuk filter yang dipilih.</p>
            </div>
          ) : (
            <div className="card rekap-card-ui no-print">
              <div className="card-header">
                <div>
                  <h3>Rekap Absensi — {namaKelas(filterAbsenKelas)}</h3>
                  <p style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)", marginTop: "0.2rem" }}>
                    Periode: {labelPeriodeAbsen()}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => exportPdfAbsen({ rekapAbsen, namaKelas: namaKelas(filterAbsenKelas), periode: labelPeriodeAbsen(), schoolData, namaGuru })}>
                    <FileText size={14} /> PDF
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => exportExcelAbsen({ rekapAbsen, namaKelas: namaKelas(filterAbsenKelas), periode: labelPeriodeAbsen(), schoolData, namaGuru })}>
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                    <Printer size={14} /> Cetak
                  </button>
                </div>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrapper" style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
                  <table className="table">
                    <colgroup>
                      <col style={{ width: "44px" }} />
                      <col />
                      <col style={{ width: "56px" }} />
                      <col style={{ width: "56px" }} />
                      <col style={{ width: "56px" }} />
                      <col style={{ width: "56px" }} />
                      <col style={{ width: "64px" }} />
                      <col style={{ width: "80px" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center" }}>No</th>
                        <th>Nama Siswa</th>
                        <th style={{ textAlign: "center" }}>H</th>
                        <th style={{ textAlign: "center" }}>S</th>
                        <th style={{ textAlign: "center" }}>I</th>
                        <th style={{ textAlign: "center" }}>A</th>
                        <th style={{ textAlign: "center" }}>Total</th>
                        <th style={{ textAlign: "center" }}>% Hadir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekapAbsen.map((row) => (
                        <tr key={row.id}>
                          <td style={{ textAlign: "center", color: "var(--clr-text-muted)" }}>{row.no}</td>
                          <td style={{ fontWeight: 600 }}>{row.nama}</td>
                          <td style={{ textAlign: "center", color: "var(--clr-hadir)", fontWeight: 700 }}>{row.H}</td>
                          <td style={{ textAlign: "center", color: "var(--clr-sakit)", fontWeight: 700 }}>{row.S}</td>
                          <td style={{ textAlign: "center", color: "var(--clr-izin)",  fontWeight: 700 }}>{row.I}</td>
                          <td style={{ textAlign: "center", color: "var(--clr-alpha)", fontWeight: 700 }}>{row.A}</td>
                          <td style={{ textAlign: "center" }}>{row.total}</td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ fontWeight: 700, color: row.pctHadir >= 75 ? "var(--clr-primary-700)" : "#dc2626" }}>
                              {row.pctHadir}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "var(--clr-slate-50)", fontWeight: 700 }}>
                        <td colSpan={2} style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>Total Keseluruhan</td>
                        <td style={{ textAlign: "center", color: "var(--clr-hadir)" }}>{rekapAbsen.reduce((s,r)=>s+r.H,0)}</td>
                        <td style={{ textAlign: "center", color: "var(--clr-sakit)" }}>{rekapAbsen.reduce((s,r)=>s+r.S,0)}</td>
                        <td style={{ textAlign: "center", color: "var(--clr-izin)"  }}>{rekapAbsen.reduce((s,r)=>s+r.I,0)}</td>
                        <td style={{ textAlign: "center", color: "var(--clr-alpha)" }}>{rekapAbsen.reduce((s,r)=>s+r.A,0)}</td>
                        <td style={{ textAlign: "center" }}>{rekapAbsen.reduce((s,r)=>s+r.total,0)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB REKAP NILAI
      ══════════════════════════════════════════════════════ */}
      {activeTab === "nilai" && (
        <>
          {/* Konfigurasi Persentase */}
          <div className="card no-print" style={{ marginBottom: "1rem" }}>
            <div className="card-header">
              <h3>⚙️ Rumus Nilai Akhir</h3>
              <span style={{ fontSize: "0.8125rem", color: totalPersen === 100 ? "var(--clr-primary-700)" : "#dc2626", fontWeight: 700 }}>
                Total: {totalPersen}% {totalPersen === 100 ? "✅" : "⚠️ harus 100%"}
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {[
                  { key: "formatif", label: "Formatif", color: "var(--clr-primary-700)" },
                  { key: "sts",      label: "STS",      color: "#1d4ed8"               },
                  { key: "sas",      label: "SAS",      color: "#7c3aed"               },
                  { key: "p5",       label: "P5",       color: "var(--clr-gold-700)"   },
                ].map((item) => (
                  <div key={item.key} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
                    background: "var(--clr-surface-2)", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem",
                    borderLeft: `3px solid ${item.color}`,
                  }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: item.color }}>{item.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <input
                        type="number" min={0} max={100} className="form-input" value={persen[item.key]}
                        onChange={(e) => { setPersen((prev) => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 })); setPersenError(""); }}
                        style={{
                          width: 56, textAlign: "center", fontWeight: 700, fontSize: "0.9375rem",
                          padding: "0.25rem 0.375rem", minHeight: "unset",
                          appearance: "none", MozAppearance: "textfield", WebkitAppearance: "none",
                          borderColor: totalPersen !== 100 ? "#fca5a5" : "var(--clr-border)",
                        }}
                      />
                      <span style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)", fontWeight: 600 }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "0.875rem", height: 8, borderRadius: 99, overflow: "hidden", background: "var(--clr-border)", display: "flex" }}>
                {[
                  { key: "formatif", color: "var(--clr-primary-600)" },
                  { key: "sts",      color: "#2563eb" },
                  { key: "sas",      color: "#7c3aed" },
                  { key: "p5",       color: "var(--clr-gold-500)" },
                ].map((item) => (
                  persen[item.key] > 0 && (
                    <div key={item.key} style={{ width: `${persen[item.key]}%`, background: item.color, transition: "width 0.3s ease" }} />
                  )
                ))}
              </div>
              {totalPersen !== 100 && (
                <div style={{ marginTop: "0.75rem", padding: "0.625rem 0.875rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", color: "#b91c1c", fontWeight: 500 }}>
                  ⚠️ Total persentase harus 100%. Saat ini: <strong>{totalPersen}%</strong>.
                </div>
              )}
            </div>
          </div>

          {/* Filter Rekap Nilai */}
          <div className="card filter-card no-print" style={{ marginBottom: "1rem" }}>
            <div className="card-header"><h3>Filter Rekap Nilai</h3></div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Kelas</label>
                    <select className="form-input form-select" value={filterNilaiKelas} onChange={(e) => setFilterNilaiKelas(e.target.value)}>
                      <option value="">-- Pilih Kelas --</option>
                      {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Mata Pelajaran</label>
                    <select className="form-input form-select" value={filterNilaiMapel} onChange={(e) => setFilterNilaiMapel(e.target.value)}>
                      <option value="">-- Pilih Mapel --</option>
                      {mapelList.map((m) => <option key={m.id} value={m.nama}>{m.nama}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Semester</label>
                    <select className="form-input form-select" value={filterNilaiSemester} onChange={(e) => setFilterNilaiSemester(e.target.value)}>
                      <option value="">-- Pilih Semester --</option>
                      {SEMESTER_LIST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tahun Ajaran</label>
                    <select className="form-input form-select" value={filterNilaiTahun} onChange={(e) => setFilterNilaiTahun(e.target.value)}>
                      <option value="">-- Pilih Tahun --</option>
                      {tahunList.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Rekap Nilai */}
          {!filterNilaiKelas || !filterNilaiMapel ? (
            <div className="empty-state no-print">
              <div className="empty-state-icon">📝</div>
              <h3>Pilih Filter Terlebih Dahulu</h3>
              <p>Pilih kelas, mata pelajaran, semester, dan tahun ajaran.</p>
            </div>
          ) : loading ? (
            <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: "var(--radius-md)" }} />
              ))}
            </div>
          ) : rekapNilai.length === 0 ? (
            <div className="empty-state no-print">
              <div className="empty-state-icon">🔍</div>
              <h3>Data Tidak Ditemukan</h3>
              <p>Belum ada data nilai untuk filter yang dipilih.</p>
            </div>
          ) : (
            <div className="card rekap-card-ui no-print">
              <div className="card-header">
                <div>
                  <h3>Rekap Nilai — {namaKelas(filterNilaiKelas)}</h3>
                  <p style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)", marginTop: "0.2rem" }}>
                    {filterNilaiMapel} · Semester {filterNilaiSemester} · {filterNilaiTahun}
                  </p>
                </div>
                {totalPersen === 100 && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => exportPdfNilai({ rekapNilai, persen, hitungNilaiAkhir, hitungPredikat, namaKelas: namaKelas(filterNilaiKelas), mapel: filterNilaiMapel, semester: filterNilaiSemester, tahun: filterNilaiTahun, schoolData, namaGuru })}>
                      <FileText size={14} /> PDF
                    </button>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => exportExcelNilai({ rekapNilai, persen, hitungNilaiAkhir, hitungPredikat, namaKelas: namaKelas(filterNilaiKelas), mapel: filterNilaiMapel, semester: filterNilaiSemester, tahun: filterNilaiTahun, schoolData, namaGuru })}>
                      <FileSpreadsheet size={14} /> Excel
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                      <Printer size={14} /> Cetak
                    </button>
                  </div>
                )}
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrapper" style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
                  <table className="table" style={{ minWidth: 600 }}>
                    <colgroup>
                      <col style={{ width: "44px" }} />
                      <col />
                      <col style={{ width: "80px" }} />
                      <col style={{ width: "70px" }} />
                      <col style={{ width: "70px" }} />
                      <col style={{ width: "70px" }} />
                      <col style={{ width: "80px" }} />
                      <col style={{ width: "80px" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center" }}>No</th>
                        <th>Nama Siswa</th>
                        <th style={{ textAlign: "center" }}>
                          <div>Formatif</div>
                          <div style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--clr-text-muted)" }}>{persen.formatif}%</div>
                        </th>
                        <th style={{ textAlign: "center" }}>
                          <div>STS</div>
                          <div style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--clr-text-muted)" }}>{persen.sts}%</div>
                        </th>
                        <th style={{ textAlign: "center" }}>
                          <div>SAS</div>
                          <div style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--clr-text-muted)" }}>{persen.sas}%</div>
                        </th>
                        <th style={{ textAlign: "center" }}>
                          <div>P5</div>
                          <div style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--clr-text-muted)" }}>{persen.p5}%</div>
                        </th>
                        <th style={{ textAlign: "center" }}>Nilai</th>
                        <th style={{ textAlign: "center" }}>Predikat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekapNilai.map((row) => {
                        const nilai    = totalPersen === 100 ? hitungNilaiAkhir(row) : null;
                        const predikat = nilai !== null ? hitungPredikat(nilai) : "-";
                        return (
                          <tr key={row.id}>
                            <td style={{ textAlign: "center", color: "var(--clr-text-muted)" }}>{row.no}</td>
                            <td style={{ fontWeight: 600 }}>{row.nama}</td>
                            <td style={{ textAlign: "center" }}>{row.rata_formatif ?? "-"}</td>
                            <td style={{ textAlign: "center" }}>{row.sts ?? "-"}</td>
                            <td style={{ textAlign: "center" }}>{row.sas ?? "-"}</td>
                            <td style={{ textAlign: "center" }}>{row.p5 ?? "-"}</td>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>
                              {nilai !== null ? nilai : <span style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem" }}>—</span>}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className={`chip chip-${predikat.toLowerCase()}`} style={{ justifyContent: "center" }}>{predikat}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "var(--clr-slate-50)", fontWeight: 700 }}>
                        <td colSpan={2} style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>Rata-rata Kelas</td>
                        {["rata_formatif", "sts", "sas", "p5"].map((key) => {
                          const vals = rekapNilai.map((r) => r[key]).filter((v) => v !== null);
                          const avg  = vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : "-";
                          return <td key={key} style={{ textAlign: "center" }}>{avg}</td>;
                        })}
                        <td style={{ textAlign: "center" }}>
                          {totalPersen === 100 ? (() => {
                            const vals = rekapNilai.map((r) => hitungNilaiAkhir(r));
                            return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10;
                          })() : "—"}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// KOMPONEN KOP SURAT untuk CETAK (window.print)
// ============================================================
function PrintKopSurat({ school }) {
  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0, fontFamily: "Times New Roman, serif" }}>
        <tbody>
          <tr>
            <td style={{ width: 70, textAlign: "center", verticalAlign: "middle" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-kemenag.png" alt="Kemenag"
                style={{ width: 60, height: 48, objectFit: "contain" }}
                onError={(e) => { e.target.style.visibility = "hidden"; }} />
            </td>
            <td style={{ textAlign: "center", verticalAlign: "middle", lineHeight: 1.6 }}>
              <div style={{ fontSize: 10, fontWeight: "bold", textTransform: "uppercase" }}>
                Kementerian Agama Republik Indonesia
              </div>
              {school?.kabupaten && (
                <div style={{ fontSize: 10, fontWeight: "bold", textTransform: "uppercase" }}>
                  Kantor Kementerian Agama Kabupaten {school.kabupaten}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase" }}>
                {school?.nama}
              </div>
              {(school?.npsn || school?.nsm) && (
                <div style={{ fontSize: 9, fontWeight: "bold" }}>
                  {school?.npsn && `NPSN: ${school.npsn}`}
                  {school?.npsn && school?.nsm && <span style={{ display: "inline-block", width: "2em" }} />}
                  {school?.nsm && `NSM: ${school.nsm}`}
                </div>
              )}
              {school?.alamat && (
                <div style={{ fontSize: 8, fontStyle: "italic", fontWeight: "bold" }}>
                  Alamat: {school.alamat}
                </div>
              )}
            </td>
            <td style={{ width: 55, textAlign: "center", verticalAlign: "middle" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-nw.png" alt="NW"
                style={{ width: 44, height: 44, objectFit: "contain" }}
                onError={(e) => { e.target.style.visibility = "hidden"; }} />
            </td>
          </tr>
        </tbody>
      </table>
      <hr style={{ border: "none", borderTop: "0.75pt solid black", margin: 0 }} />
      <hr style={{ border: "none", borderTop: "2.5pt solid black",  margin: "1.5pt 0" }} />
      <hr style={{ border: "none", borderTop: "0.75pt solid black", margin: "0 0 6pt" }} />
    </>
  );
}

// ============================================================
// HELPER: LOAD GAMBAR → BASE64
// ============================================================
async function loadImageAsBase64(url) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ============================================================
// HELPER: TULIS KOP SURAT KE PDF
// ============================================================
async function tulisKopPdf(doc, schoolData, pageW, margin) {
  const yStart = 12;
  const logoKemenagW = 19, logoKemenagH = 17;
  const logoNwSize   = 16;

  const [imgKemenag, imgNW] = await Promise.all([
    loadImageAsBase64("/logo-kemenag.png"),
    loadImageAsBase64("/logo-nw.png"),
  ]);

  let y = yStart;

  doc.setFontSize(11); doc.setFont("times", "bold");
  doc.text("KEMENTERIAN AGAMA REPUBLIK INDONESIA", pageW / 2, y, { align: "center" }); y += 5.5;

  if (schoolData?.kabupaten) {
    doc.setFontSize(11); doc.setFont("times", "bold");
    doc.text(`KANTOR KEMENTERIAN AGAMA KABUPATEN ${schoolData.kabupaten.toUpperCase()}`, pageW / 2, y, { align: "center" }); y += 5.5;
  }

  doc.setFontSize(13); doc.setFont("times", "bold");
  doc.text((schoolData?.nama || "NAMA SEKOLAH").toUpperCase(), pageW / 2, y, { align: "center" }); y += 6;

  const identitas = [
    schoolData?.npsn ? `NPSN : ${schoolData.npsn}` : null,
    schoolData?.nsm  ? `NSM : ${schoolData.nsm}`   : null,
  ].filter(Boolean).join("          ");
  if (identitas) {
    doc.setFontSize(10); doc.setFont("times", "bold");
    doc.text(identitas, pageW / 2, y, { align: "center" }); y += 5;
  }

  const teksH    = y - yStart;
  const kemenagY = yStart + (teksH - logoKemenagH) / 2;
  const nwY      = yStart + (teksH - logoNwSize) / 2;
  if (imgKemenag) doc.addImage(imgKemenag, "PNG", margin, kemenagY, logoKemenagW, logoKemenagH);
  if (imgNW)      doc.addImage(imgNW, "PNG", pageW - margin - logoNwSize, nwY, logoNwSize, logoNwSize);

  if (schoolData?.alamat) {
    y += 1;
    doc.setFontSize(9); doc.setFont("times", "bolditalic");
    doc.text(`Alamat : ${schoolData.alamat}`, pageW / 2, y, { align: "center" });
    y += 1;
  }

  y += 1;
  doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y); y += 1.2;
  doc.setLineWidth(0.8); doc.line(margin, y, pageW - margin, y); y += 1.2;
  doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y); y += 6;

  doc.setFont("times", "normal");
  return y;
}

// ============================================================
// HELPER: TANDA TANGAN PDF — format resmi
// "Pasir Lamba, [tanggal]" di atas "Guru Mata Pelajaran,"
// ============================================================
function tulisKopTandaTanganPdf(doc, schoolData, namaGuru, pageW, margin, finalY) {
  const tgl     = `${NAMA_TEMPAT}, ${tanggalCetak()}`;
  const ttW     = 65; // lebar blok tanda tangan kanan
  const kiriX   = margin;
  const kiriCx  = kiriX + ttW / 2;
  const kananX  = pageW - margin - ttW;
  const kananCx = kananX + ttW / 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // ── Kiri: Kepala Sekolah ──
  if (schoolData?.kepala_sekolah) {
    doc.text("Mengetahui,",                  kiriCx, finalY,      { align: "center" });
    doc.text(`Kepala ${schoolData.nama || "Sekolah"}`, kiriCx, finalY + 5, { align: "center" });
    doc.line(kiriX, finalY + 25, kiriX + ttW, finalY + 25);
    doc.setFont("helvetica", "bold");
    doc.text(schoolData.kepala_sekolah, kiriCx, finalY + 30, { align: "center" });
    doc.setFont("helvetica", "normal");
  }

  // ── Kanan: Guru Mata Pelajaran ──
  // Baris 1: tempat & tanggal
  doc.text(tgl,                   kananCx, finalY,      { align: "center" });
  // Baris 2: jabatan
  doc.text("Guru Mata Pelajaran,", kananCx, finalY + 5, { align: "center" });
  // Garis tanda tangan (jarak sama dengan kiri)
  doc.line(kananX, finalY + 25, kananX + ttW, finalY + 25);
  // Nama guru
  doc.setFont("helvetica", "bold");
  doc.text(namaGuru, kananCx, finalY + 30, { align: "center" });
  doc.setFont("helvetica", "normal");
}

// ============================================================
// EXPORT PDF — REKAP ABSENSI
// ============================================================
async function exportPdfAbsen({ rekapAbsen, namaKelas, periode, schoolData, namaGuru }) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: [215.9, 330.2] });
  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 20;

  let y = await tulisKopPdf(doc, schoolData, pageW, margin);

  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("REKAP ABSENSI SISWA", pageW / 2, y, { align: "center" }); y += 6;

  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Kelas: ${namaKelas}     Periode: ${periode}`, pageW / 2, y, { align: "center" }); y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["No", "Nama Siswa", "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpha (A)", "Total", "% Hadir"]],
    body: rekapAbsen.map((row) => [row.no, row.nama, row.H, row.S, row.I, row.A, row.total, `${row.pctHadir}%`]),
    foot: [[
      { content: "",                  styles: { halign: "center" } },
      { content: "Total Keseluruhan", styles: { fontStyle: "bold" } },
      { content: rekapAbsen.reduce((s,r)=>s+r.H,0).toString(), styles: { halign: "center", textColor: [21,128,61]  } },
      { content: rekapAbsen.reduce((s,r)=>s+r.S,0).toString(), styles: { halign: "center", textColor: [37,99,235]  } },
      { content: rekapAbsen.reduce((s,r)=>s+r.I,0).toString(), styles: { halign: "center", textColor: [180,83,9]   } },
      { content: rekapAbsen.reduce((s,r)=>s+r.A,0).toString(), styles: { halign: "center", textColor: [185,28,28]  } },
      { content: rekapAbsen.reduce((s,r)=>s+r.total,0).toString(), styles: { halign: "center" } },
      { content: "",                  styles: { halign: "center" } },
    ]],
    headStyles: { fillColor: [22,101,52], textColor: 255, fontStyle: "bold", fontSize: 10, halign: "center", cellPadding: 3 },
    footStyles: { fillColor: [220,252,231], textColor: [20,83,45], fontStyle: "bold", fontSize: 10, cellPadding: 3 },
    bodyStyles: { fontSize: 10, cellPadding: 3, lineColor: [180,180,180], lineWidth: 0.25 },
    alternateRowStyles: { fillColor: [245,250,246] },
    tableLineColor: [150,150,150], tableLineWidth: 0.3,
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "center", cellWidth: 20, textColor: [21,128,61]  },
      3: { halign: "center", cellWidth: 20, textColor: [37,99,235]  },
      4: { halign: "center", cellWidth: 20, textColor: [180,83,9]   },
      5: { halign: "center", cellWidth: 20, textColor: [185,28,28]  },
      6: { halign: "center", cellWidth: 18 },
      7: { halign: "center", cellWidth: 22 },
    },
    showFoot: "lastPage",
  });

  tulisKopTandaTanganPdf(doc, schoolData, namaGuru, pageW, margin, doc.lastAutoTable.finalY + 14);
  doc.save(`Rekap_Absensi_${namaKelas}_${periode}.pdf`);
}

// ============================================================
// EXPORT PDF — REKAP NILAI
// ============================================================
async function exportPdfNilai({ rekapNilai, persen, hitungNilaiAkhir, hitungPredikat, namaKelas, mapel, semester, tahun, schoolData, namaGuru }) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc    = new jsPDF({ orientation: "landscape", unit: "mm", format: [215.9, 330.2] });
  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 20;

  let y = await tulisKopPdf(doc, schoolData, pageW, margin);

  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("REKAP NILAI SISWA", pageW / 2, y, { align: "center" }); y += 6;

  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Kelas: ${namaKelas}     Mata Pelajaran: ${mapel}     Semester: ${semester}     Tahun Ajaran: ${tahun}`, pageW / 2, y, { align: "center" }); y += 5;

  doc.setFontSize(8); doc.setTextColor(100);
  doc.text(`Rumus: Formatif ${persen.formatif}% + STS ${persen.sts}% + SAS ${persen.sas}% + P5 ${persen.p5}%`, pageW / 2, y, { align: "center" });
  doc.setTextColor(0); y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[
      "No", "Nama Siswa",
      `Formatif\n(${persen.formatif}%)`, `STS\n(${persen.sts}%)`,
      `SAS\n(${persen.sas}%)`,           `P5\n(${persen.p5}%)`,
      "Nilai Akhir", "Predikat",
    ]],
    body: rekapNilai.map((row) => {
      const nilai    = hitungNilaiAkhir(row);
      const predikat = hitungPredikat(nilai);
      return [row.no, row.nama, row.rata_formatif ?? "-", row.sts ?? "-", row.sas ?? "-", row.p5 ?? "-", nilai, predikat];
    }),
    foot: (() => {
      const avg = (key) => { const v = rekapNilai.map(r=>r[key]).filter(x=>x!==null); return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10 : "-"; };
      const avgNilai = (() => { const v=rekapNilai.map(r=>hitungNilaiAkhir(r)); return Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10; })();
      return [[
        { content: "",                  styles: { halign: "center" } },
        { content: "Rata-rata Kelas",   styles: { fontStyle: "bold" } },
        { content: String(avg("rata_formatif")), styles: { halign: "center" } },
        { content: String(avg("sts")),          styles: { halign: "center" } },
        { content: String(avg("sas")),          styles: { halign: "center" } },
        { content: String(avg("p5")),           styles: { halign: "center" } },
        { content: String(avgNilai),            styles: { halign: "center", fontStyle: "bold" } },
        { content: "",                          styles: { halign: "center" } },
      ]];
    })(),
    headStyles: { fillColor: [22,101,52], textColor: 255, fontStyle: "bold", fontSize: 10, halign: "center", cellPadding: 3 },
    footStyles: { fillColor: [220,252,231], textColor: [20,83,45], fontStyle: "bold", fontSize: 10, cellPadding: 3 },
    bodyStyles: { fontSize: 10, cellPadding: 3, lineColor: [180,180,180], lineWidth: 0.25 },
    alternateRowStyles: { fillColor: [245,250,246] },
    tableLineColor: [150,150,150], tableLineWidth: 0.3,
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "center", cellWidth: 26 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 22 },
      5: { halign: "center", cellWidth: 22 },
      6: { halign: "center", cellWidth: 26, fontStyle: "bold" },
      7: { halign: "center", cellWidth: 22 },
    },
    showFoot: "lastPage",
  });

  tulisKopTandaTanganPdf(doc, schoolData, namaGuru, pageW, margin, doc.lastAutoTable.finalY + 14);
  doc.save(`Rekap_Nilai_${namaKelas}_${mapel}_Smt${semester}_${tahun}.pdf`);
}

// ============================================================
// EXPORT EXCEL — REKAP ABSENSI
// ============================================================
async function exportExcelAbsen({ rekapAbsen, namaKelas, periode, schoolData, namaGuru }) {
  const XLSX = await import("xlsx");
  const wb   = XLSX.utils.book_new();

  const tgl = `${NAMA_TEMPAT}, ${tanggalCetak()}`;

  const identitasKop = [
    schoolData?.npsn ? `NPSN: ${schoolData.npsn}` : null,
    schoolData?.nsm  ? `NSM: ${schoolData.nsm}`   : null,
  ].filter(Boolean).join("   ");

  const rows = [
    [schoolData?.nama || "NAMA SEKOLAH"],
    [schoolData?.alamat || ""],
    ...(identitasKop ? [[identitasKop]] : []),
    ...(schoolData?.kabupaten ? [[`Kabupaten ${schoolData.kabupaten}`]] : []),
    [],
    ["REKAP ABSENSI SISWA"],
    [`Kelas: ${namaKelas}`, "", `Periode: ${periode}`],
    [],
    ["No", "Nama Siswa", "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpha (A)", "Total", "% Hadir"],
    ...rekapAbsen.map((row) => [row.no, row.nama, row.H, row.S, row.I, row.A, row.total, `${row.pctHadir}%`]),
    [
      "", "Total Keseluruhan",
      rekapAbsen.reduce((s,r)=>s+r.H,0),
      rekapAbsen.reduce((s,r)=>s+r.S,0),
      rekapAbsen.reduce((s,r)=>s+r.I,0),
      rekapAbsen.reduce((s,r)=>s+r.A,0),
      rekapAbsen.reduce((s,r)=>s+r.total,0),
      "",
    ],
    [],
    // Tanda tangan: kiri = Kepala Sekolah, kanan = Guru
    ...(schoolData?.kepala_sekolah
      ? [
          ["Mengetahui,", "", "", "", "", "", tgl],
          [`Kepala ${schoolData.nama || "Sekolah"},`, "", "", "", "", "", "Guru Mata Pelajaran,"],
          [], [], [],
          [schoolData.kepala_sekolah, "", "", "", "", "", namaGuru],
        ]
      : [
          ["", "", "", "", "", "", tgl],
          ["", "", "", "", "", "", "Guru Mata Pelajaran,"],
          [], [], [],
          ["", "", "", "", "", "", namaGuru],
        ]
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];

  XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
  XLSX.writeFile(wb, `Rekap_Absensi_${namaKelas}_${periode}.xlsx`);
}

// ============================================================
// EXPORT EXCEL — REKAP NILAI
// ============================================================
async function exportExcelNilai({ rekapNilai, persen, hitungNilaiAkhir, hitungPredikat, namaKelas, mapel, semester, tahun, schoolData, namaGuru }) {
  const XLSX = await import("xlsx");
  const wb   = XLSX.utils.book_new();

  const tgl = `${NAMA_TEMPAT}, ${tanggalCetak()}`;

  const identitasKop = [
    schoolData?.npsn ? `NPSN: ${schoolData.npsn}` : null,
    schoolData?.nsm  ? `NSM: ${schoolData.nsm}`   : null,
  ].filter(Boolean).join("   ");

  const rows = [
    [schoolData?.nama || "NAMA SEKOLAH"],
    [schoolData?.alamat || ""],
    ...(identitasKop ? [[identitasKop]] : []),
    ...(schoolData?.kabupaten ? [[`Kabupaten ${schoolData.kabupaten}`]] : []),
    [],
    ["REKAP NILAI SISWA"],
    [`Kelas: ${namaKelas}`, `Mapel: ${mapel}`, `Semester: ${semester}`, `Tahun: ${tahun}`],
    [`Rumus: Formatif ${persen.formatif}% + STS ${persen.sts}% + SAS ${persen.sas}% + P5 ${persen.p5}%`],
    [],
    ["No", "Nama Siswa", `Formatif (${persen.formatif}%)`, `STS (${persen.sts}%)`, `SAS (${persen.sas}%)`, `P5 (${persen.p5}%)`, "Nilai Akhir", "Predikat"],
    ...rekapNilai.map((row) => {
      const nilai    = hitungNilaiAkhir(row);
      const predikat = hitungPredikat(nilai);
      return [row.no, row.nama, row.rata_formatif ?? "-", row.sts ?? "-", row.sas ?? "-", row.p5 ?? "-", nilai, predikat];
    }),
    [
      "", "Rata-rata Kelas",
      ...["rata_formatif","sts","sas","p5"].map((key) => {
        const vals = rekapNilai.map((r) => r[key]).filter((v) => v !== null);
        return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : "-";
      }),
      (() => {
        const vals = rekapNilai.map((r) => hitungNilaiAkhir(r));
        return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10;
      })(),
      "",
    ],
    [],
    // Tanda tangan
    ...(schoolData?.kepala_sekolah
      ? [
          ["Mengetahui,", "", "", "", "", "", tgl],
          [`Kepala ${schoolData.nama || "Sekolah"},`, "", "", "", "", "", "Guru Mata Pelajaran,"],
          [], [], [],
          [schoolData.kepala_sekolah, "", "", "", "", "", namaGuru],
        ]
      : [
          ["", "", "", "", "", "", tgl],
          ["", "", "", "", "", "", "Guru Mata Pelajaran,"],
          [], [], [],
          ["", "", "", "", "", "", namaGuru],
        ]
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];

  XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
  XLSX.writeFile(wb, `Rekap_Nilai_${namaKelas}_${mapel}_Smt${semester}_${tahun}.xlsx`);
}