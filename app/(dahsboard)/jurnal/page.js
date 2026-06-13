"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Plus, Pencil, Trash2, Eye, X,
  AlertTriangle, Calendar, Clock, Users,
  Printer, FileDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Konstanta bulan ───────────────────────────────────────────
const BULAN = [
  { value: "01", label: "Januari"   },
  { value: "02", label: "Februari"  },
  { value: "03", label: "Maret"     },
  { value: "04", label: "April"     },
  { value: "05", label: "Mei"       },
  { value: "06", label: "Juni"      },
  { value: "07", label: "Juli"      },
  { value: "08", label: "Agustus"   },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober"   },
  { value: "11", label: "November"  },
  { value: "12", label: "Desember"  },
];

function getLabelBulan(val) {
  return BULAN.find((b) => b.value === val)?.label || val;
}

function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTanggalPendek(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── Komponen utama ────────────────────────────────────────────
export default function JurnalPage() {
  const router   = useRouter();
  const printRef = useRef(null);

  const [loading, setLoading]       = useState(true);
  const [jurnalList, setJurnalList] = useState([]);
  const [kelasList, setKelasList]   = useState([]);
  const [school, setSchool]         = useState(null);

  // Filter list tampilan
  const [filterKelas, setFilterKelas] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");

  // Filter export / cetak
  const [exportKelas,       setExportKelas]       = useState("");
  const [exportDariBulan,   setExportDariBulan]   = useState("");
  const [exportDariTahun,   setExportDariTahun]   = useState("");
  const [exportSampaiBulan, setExportSampaiBulan] = useState("");
  const [exportSampaiTahun, setExportSampaiTahun] = useState("");

  const [deleteModal, setDeleteModal]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [detailData, setDetailData]   = useState(null);

  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  // ── Fetch data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const [jurnalRes, kelasRes, schoolRes] = await Promise.all([
      supabase
        .from("journals")
        .select(`
          id, tanggal, mapel, pertemuan_ke, jam_ke,
          materi_pokok, tujuan_pembelajaran,
          jumlah_hadir, jumlah_sakit, jumlah_izin, jumlah_alpha,
          created_at,
          classes(id, nama_kelas, tingkat),
          subjects(id, nama)
        `)
        .eq("user_id", user.id)
        .order("tanggal", { ascending: false }),

      supabase
        .from("classes")
        .select("id, nama_kelas, tingkat")
        .eq("user_id", user.id)
        .order("nama_kelas"),

      supabase
        .from("schools")
        .select("nama, npsn, nsm, kabupaten, kepala_sekolah, alamat")
        .eq("user_id", user.id)
        .single(),
    ]);

    if (jurnalRes.error) showToast("Gagal memuat jurnal", "error");
    else setJurnalList(jurnalRes.data || []);

    if (kelasRes.error) showToast("Gagal memuat kelas", "error");
    else setKelasList(kelasRes.data || []);

    if (!schoolRes.error) setSchool(schoolRes.data);

    setLoading(false);
  }, [router, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter list tampilan ──────────────────────────────────────
  const filtered = jurnalList.filter((j) => {
    const matchKelas = filterKelas ? j.classes?.id === filterKelas : true;
    const matchBulan = filterBulan ? (j.tanggal || "").slice(5, 7) === filterBulan : true;
    const matchTahun = filterTahun ? (j.tanggal || "").slice(0, 4) === filterTahun : true;
    return matchKelas && matchBulan && matchTahun;
  });

  const tahunList = [
    ...new Set(jurnalList.map((j) => (j.tanggal || "").slice(0, 4)).filter(Boolean)),
  ].sort((a, b) => b.localeCompare(a));

  // ── Data untuk export (filter rentang bulan) ──────────────────
  const getDataExport = useCallback(() => {
    return jurnalList
      .filter((j) => {
        if (!j.tanggal) return false;
        const ym = j.tanggal.slice(0, 4) + j.tanggal.slice(5, 7); // "202501"
        const dariYM   = exportDariTahun   && exportDariBulan   ? exportDariTahun   + exportDariBulan   : null;
        const sampaiYM = exportSampaiTahun && exportSampaiBulan ? exportSampaiTahun + exportSampaiBulan : null;
        const matchKelas  = exportKelas ? j.classes?.id === exportKelas : true;
        const matchDari   = dariYM   ? ym >= dariYM   : true;
        const matchSampai = sampaiYM ? ym <= sampaiYM : true;
        return matchKelas && matchDari && matchSampai;
      })
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [jurnalList, exportKelas, exportDariBulan, exportDariTahun, exportSampaiBulan, exportSampaiTahun]);

  function judulPeriode() {
    const dari   = exportDariBulan   ? getLabelBulan(exportDariBulan)   + " " + exportDariTahun   : "";
    const sampai = exportSampaiBulan ? getLabelBulan(exportSampaiBulan) + " " + exportSampaiTahun : "";
    if (dari && sampai) return `Periode: ${dari} s.d. ${sampai}`;
    if (dari)           return `Mulai: ${dari}`;
    if (sampai)         return `Sampai: ${sampai}`;
    return "Semua Periode";
  }

  function namaKelasExport() {
    if (!exportKelas) return "Semua Kelas";
    return kelasList.find((k) => k.id === exportKelas)?.nama_kelas || "Semua Kelas";
  }

  // ── Download PDF ──────────────────────────────────────────────
  function downloadPDF() {
    const data = getDataExport();
    if (data.length === 0) {
      showToast("Tidak ada data jurnal untuk diekspor", "warning");
      return;
    }

    const doc   = new jsPDF({ orientation: "landscape", unit: "mm", format: [215, 330] });
    const pageW = doc.internal.pageSize.getWidth();
    const cx    = pageW / 2;

    const namaSekolah = school?.nama         || "Madrasah";
    const kabupaten   = school?.kabupaten    || "";
    const npsn        = school?.npsn         ? `NPSN: ${school.npsn}` : "";
    const nsm         = school?.nsm          ? `NSM: ${school.nsm}`   : "";
    const alamat      = school?.alamat       || "";
    const kepala      = school?.kepala_sekolah || "Kepala Madrasah";

    let y = 14;

    // Coba tambahkan logo (kalau gagal di-skip)
    try { doc.addImage("/logo-kemenag.png", "PNG", 14, y - 2, 22, 18); } catch {}
    try { doc.addImage("/logo-nw.png",      "PNG", pageW - 30, y - 2, 16, 16); } catch {}

    // Teks kop
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("Kementerian Agama Republik Indonesia", cx, y, { align: "center" }); y += 4.5;
    if (kabupaten) {
      doc.text(`Kantor Kementerian Agama Kabupaten ${kabupaten}`, cx, y, { align: "center" }); y += 4.5;
    }
    doc.setFontSize(12);
    doc.text(namaSekolah.toUpperCase(), cx, y, { align: "center" }); y += 5;
    if (npsn || nsm) {
      doc.setFontSize(9);
      doc.text([npsn, nsm].filter(Boolean).join("     "), cx, y, { align: "center" }); y += 4.5;
    }
    if (alamat) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(8);
      doc.text("Alamat : " + alamat, cx, y, { align: "center" }); y += 4;
    }

    // Garis kop
    doc.setLineWidth(0.3); doc.line(14, y, pageW - 14, y); y += 1;
    doc.setLineWidth(1.0); doc.line(14, y, pageW - 14, y); y += 1.5;
    doc.setLineWidth(0.3); doc.line(14, y, pageW - 14, y); y += 7;

    // Judul
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("REKAP JURNAL GURU", cx, y, { align: "center" }); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`${namaKelasExport()}  |  ${judulPeriode()}`, cx, y, { align: "center" }); y += 8;

    // Tabel
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["No", "Hari/Tanggal", "Kelas", "Mata Pelajaran", "Ke-", "Materi Pokok", "H", "S", "I", "A"]],
      body: data.map((j, i) => [
        i + 1,
        formatTanggal(j.tanggal),
        j.classes?.nama_kelas || "-",
        j.subjects?.nama || j.mapel || "-",
        j.pertemuan_ke ?? "-",
        j.materi_pokok || "-",
        j.jumlah_hadir ?? "-",
        j.jumlah_sakit ?? "-",
        j.jumlah_izin  ?? "-",
        j.jumlah_alpha ?? "-",
      ]),
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2, valign: "middle" },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold", halign: "center" },
      columnStyles: {
      0: { cellWidth: 8,      halign: "center" },
      1: { cellWidth: 52 },
      2: { cellWidth: 28 },
      3: { cellWidth: 35 },
      4: { cellWidth: 10,     halign: "center" },
      5: { cellWidth: "auto" },
      6: { cellWidth: 8,      halign: "center" },
      7: { cellWidth: 8,      halign: "center" },
      8: { cellWidth: 8,      halign: "center" },
      9: { cellWidth: 8,      halign: "center" },
    },
      alternateRowStyles: { fillColor: [240, 253, 244] },
    });

    // Tanda tangan
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Mengetahui,",          pageW - 64, finalY);
    doc.text(`Kepala ${namaSekolah}`, pageW - 64, finalY + 5);
    doc.line(pageW - 84, finalY + 23, pageW - 14, finalY + 23);
    doc.text(kepala, pageW - 49, finalY + 27, { align: "center" });

    const fileName = `Jurnal_Guru_${namaKelasExport().replace(/\s/g, "_")}.pdf`;
    doc.save(fileName);
    showToast("PDF berhasil diunduh ✅", "success");
  }

  // ── Cetak ─────────────────────────────────────────────────────
  function handleCetak() {
    const data = getDataExport();
    if (data.length === 0) {
      showToast("Tidak ada data jurnal untuk dicetak", "warning");
      return;
    }
    window.print();
  }

  // ── Hapus jurnal ──────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("journals")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      showToast("Gagal menghapus jurnal", "error");
    } else {
      showToast("Jurnal berhasil dihapus 🗑️", "warning");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    }
    setDeleting(false);
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="page-container">

      {/* CSS Print */}
      <style>{`
        @media print {
          @page { size: 330mm 215mm landscape; margin: 15mm; }
          .navbar, .sidebar, .mobile-nav,
          .no-print, .page-header, .breadcrumb,
          .filter-card, .jurnal-list,
          .modal-backdrop, .toast-container { display: none !important; }
          .main-content   { padding: 0 !important; }
          .page-container { padding: 0 !important; max-width: 100% !important; }
          .print-area     { display: block !important; }
        }
        .print-area { display: none; }
      `}</style>

      {/* ══ AREA CETAK ══ */}
      <div className="print-area" ref={printRef}>
        {/* Kop surat */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0, fontFamily: "Times New Roman, serif" }}>
          <tbody>
            <tr>
              <td style={{ width: 80, textAlign: "center", verticalAlign: "middle" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-kemenag.png" alt="Kemenag"
                  style={{ width: 65, height: 52, objectFit: "contain" }}
                  onError={(e) => { e.target.style.visibility = "hidden"; }} />
              </td>
              <td style={{ textAlign: "center", verticalAlign: "middle", lineHeight: 1.5 }}>
                <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase" }}>
                  Kementerian Agama Republik Indonesia
                </div>
                {school?.kabupaten && (
                  <div style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase" }}>
                    Kantor Kementerian Agama Kabupaten {school.kabupaten}
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: "bold", textTransform: "uppercase" }}>
                  {school?.nama}
                </div>
                {(school?.npsn || school?.nsm) && (
                  <div style={{ fontSize: 10, fontWeight: "bold" }}>
                    {school?.npsn && `NPSN: ${school.npsn}`}
                    {school?.npsn && school?.nsm && <span style={{ display: "inline-block", width: "2em" }} />}
                    {school?.nsm && `NSM: ${school.nsm}`}
                  </div>
                )}
                {school?.alamat && (
                  <div style={{ fontSize: 9, fontStyle: "italic", fontWeight: "bold" }}>
                    Alamat: {school.alamat}
                  </div>
                )}
              </td>
              <td style={{ width: 60, textAlign: "center", verticalAlign: "middle" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-nw.png" alt="NW"
                  style={{ width: 48, height: 48, objectFit: "contain" }}
                  onError={(e) => { e.target.style.visibility = "hidden"; }} />
              </td>
            </tr>
          </tbody>
        </table>
        <hr style={{ border: "none", borderTop: "0.75pt solid black", margin: 0 }} />
        <hr style={{ border: "none", borderTop: "2.5pt solid black",  margin: "1.5pt 0" }} />
        <hr style={{ border: "none", borderTop: "0.75pt solid black", margin: "0 0 8pt" }} />

        {/* Judul */}
        <div style={{ textAlign: "center", marginBottom: 8, fontFamily: "Times New Roman, serif" }}>
          <div style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase" }}>
            Rekap Jurnal Guru
          </div>
          <div style={{ fontSize: 10, marginTop: 2 }}>
            {namaKelasExport()} | {judulPeriode()}
          </div>
        </div>

        {/* Tabel */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9, fontFamily: "Times New Roman, serif" }}>
          <thead>
            <tr style={{ background: "#dcfce7", printColorAdjust: "exact" }}>
              {["No", "Hari/Tanggal", "Kelas", "Mata Pelajaran", "Ke-", "Materi Pokok", "H", "S", "I", "A"].map((h) => (
                <th key={h} style={{ border: "1px solid #333", padding: "4px 6px", textAlign: h === "No" || h === "Ke-" || ["H","S","I","A"].includes(h) ? "center" : "left" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getDataExport().map((j, i) => (
              <tr key={j.id} style={{ background: i % 2 === 0 ? "#fff" : "#f0fdf4" }}>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{i + 1}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{formatTanggal(j.tanggal)}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{j.classes?.nama_kelas || "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{j.subjects?.nama || j.mapel || "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{j.pertemuan_ke ?? "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px" }}>{j.materi_pokok || "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{j.jumlah_hadir ?? "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{j.jumlah_sakit ?? "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{j.jumlah_izin  ?? "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "center" }}>{j.jumlah_alpha ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda tangan */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, fontFamily: "Times New Roman, serif", fontSize: 10 }}>
          <div style={{ textAlign: "center", minWidth: 200 }}>
            <div>Mengetahui,</div>
            <div>Kepala {school?.nama}</div>
            <div style={{ marginTop: 48, borderTop: "1px solid #333", paddingTop: 4 }}>
              {school?.kepala_sekolah || "Kepala Madrasah"}
            </div>
          </div>
        </div>
      </div>

      {/* ══ HEADER ══ */}
      <div className="page-header no-print">
        <div className="breadcrumb">
          <a href="/dashboard">Dashboard</a>
          <span className="sep">›</span>
          <span className="current">Jurnal Guru</span>
        </div>
        <div className="page-header-row">
          <div>
            <h1>Jurnal Guru</h1>
            <p>Catatan harian kegiatan pembelajaran di kelas.</p>
          </div>
          <button className="btn btn-primary" onClick={() => router.push("/jurnal/tulis")}>
            <Plus size={16} /> Tulis Jurnal
          </button>
        </div>
      </div>

      {/* ══ FILTER TAMPILAN ══ */}
      <div className="card filter-card no-print" style={{ marginBottom: "1rem" }}>
        <div className="card-body" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--clr-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            Filter Tampilan
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <select className="form-input form-select" value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}
              style={{ minWidth: 160, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}>
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
            <select className="form-input form-select" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}
              style={{ minWidth: 140, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}>
              <option value="">Semua Bulan</option>
              {BULAN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <select className="form-input form-select" value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}
              style={{ minWidth: 120, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}>
              <option value="">Semua Tahun</option>
              {tahunList.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filterKelas || filterBulan || filterTahun) && (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setFilterKelas(""); setFilterBulan(""); setFilterTahun(""); }}>
                <X size={14} /> Hapus filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ FILTER EXPORT & CETAK ══ */}
      <div className="card filter-card no-print" style={{ marginBottom: "1rem", borderLeft: "3px solid var(--clr-primary-500)" }}>
        <div className="card-body" style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--clr-primary-600)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
            Export & Cetak Jurnal
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>

            {/* Pilih kelas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Kelas</label>
              <select className="form-input form-select" value={exportKelas} onChange={(e) => setExportKelas(e.target.value)}
                style={{ minWidth: 150, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}>
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
              </select>
            </div>

            {/* Dari bulan */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Dari Bulan</label>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <select className="form-input form-select" value={exportDariBulan} onChange={(e) => setExportDariBulan(e.target.value)}
                  style={{ minWidth: 130, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}>
                  <option value="">-- Bulan --</option>
                  {BULAN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
                <select className="form-input form-select" value={exportDariTahun} onChange={(e) => setExportDariTahun(e.target.value)}
                  style={{ minWidth: 100, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}>
                  <option value="">-- Tahun --</option>
                  {tahunList.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Sampai bulan */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Sampai Bulan</label>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <select className="form-input form-select" value={exportSampaiBulan} onChange={(e) => setExportSampaiBulan(e.target.value)}
                  style={{ minWidth: 130, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}>
                  <option value="">-- Bulan --</option>
                  {BULAN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
                <select className="form-input form-select" value={exportSampaiTahun} onChange={(e) => setExportSampaiTahun(e.target.value)}
                  style={{ minWidth: 100, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}>
                  <option value="">-- Tahun --</option>
                  {tahunList.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Tombol aksi */}
            <div style={{ display: "flex", gap: "0.5rem", paddingBottom: "1px" }}>
              <button className="btn btn-secondary" onClick={handleCetak}>
                <Printer size={15} /> Cetak
              </button>
              <button className="btn btn-primary" onClick={downloadPDF}>
                <FileDown size={15} /> Download PDF
              </button>
            </div>
          </div>

          {/* Info jumlah data export */}
          {(exportDariBulan || exportSampaiBulan || exportKelas) && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--clr-text-muted)" }}>
              {getDataExport().length} jurnal ditemukan untuk <strong>{namaKelasExport()}</strong> — {judulPeriode()}
            </div>
          )}
        </div>
      </div>

      {/* ══ LIST JURNAL ══ */}
      <div className="jurnal-list">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📓</div>
            <h3>{jurnalList.length === 0 ? "Belum Ada Jurnal" : "Jurnal Tidak Ditemukan"}</h3>
            <p>
              {jurnalList.length === 0
                ? "Mulai tulis jurnal pembelajaran harian kamu."
                : "Tidak ada jurnal yang cocok dengan filter."}
            </p>
            {jurnalList.length === 0 && (
              <button className="btn btn-primary" onClick={() => router.push("/jurnal/tulis")}>
                <Plus size={15} /> Tulis Jurnal Pertama
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filtered.map((item) => (
              <div key={item.id} className="card" style={{ overflow: "visible" }}>
                <div className="card-body" style={{ padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{
                      width: 44, height: 44,
                      borderRadius: "var(--radius-md)",
                      background: "var(--clr-primary-50)",
                      border: "1px solid var(--clr-primary-100)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, color: "var(--clr-primary-600)",
                    }}>
                      <BookOpen size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--clr-text)" }}>
                            {item.subjects?.nama || item.mapel || "–"}
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Calendar size={12} /> {formatTanggalPendek(item.tanggal)}
                            </span>
                            {item.classes?.nama_kelas && (
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <Users size={12} /> {item.classes.nama_kelas}
                              </span>
                            )}
                            {item.jam_ke && (
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <Clock size={12} /> Jam ke-{item.jam_ke}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.pertemuan_ke && (
                          <span style={{
                            fontSize: "0.75rem", fontWeight: 700,
                            background: "var(--clr-gold-100)", color: "var(--clr-gold-700)",
                            padding: "0.2rem 0.6rem", borderRadius: "99px", whiteSpace: "nowrap",
                          }}>
                            Pertemuan {item.pertemuan_ke}
                          </span>
                        )}
                      </div>
                      {item.materi_pokok && (
                        <div style={{
                          marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--clr-text-2)",
                          background: "var(--clr-surface-2)", borderRadius: "var(--radius-sm)",
                          padding: "0.375rem 0.625rem", borderLeft: "3px solid var(--clr-primary-300)",
                        }}>
                          📌 {item.materi_pokok}
                        </div>
                      )}
                      {(item.jumlah_hadir !== null || item.jumlah_sakit !== null) && (
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                          {item.jumlah_hadir !== null && <span className="chip chip-hadir" style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>H: {item.jumlah_hadir}</span>}
                          {item.jumlah_sakit !== null && <span className="chip chip-sakit" style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>S: {item.jumlah_sakit}</span>}
                          {item.jumlah_izin  !== null && <span className="chip chip-izin"  style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>I: {item.jumlah_izin}</span>}
                          {item.jumlah_alpha !== null && <span className="chip chip-alpha" style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>A: {item.jumlah_alpha}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    display: "flex", gap: "0.5rem",
                    marginTop: "0.875rem", paddingTop: "0.75rem",
                    borderTop: "1px solid var(--clr-border)", justifyContent: "flex-end",
                  }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setDetailData(item); setDetailModal(true); }}>
                      <Eye size={14} /> Lihat Detail
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/jurnal/${item.id}/edit`)}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => { setDeleteTarget(item); setDeleteModal(true); }}>
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ MODAL DETAIL ══ */}
      {detailModal && detailData && (
        <div className="modal-backdrop" onClick={() => setDetailModal(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📓 Detail Jurnal</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetailModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <DetailItem label="Tanggal"        value={formatTanggalPendek(detailData.tanggal)} />
              <DetailItem label="Kelas"          value={detailData.classes?.nama_kelas} />
              <DetailItem label="Mata Pelajaran" value={detailData.subjects?.nama || detailData.mapel} />
              <DetailItem label="Pertemuan ke"   value={detailData.pertemuan_ke} />
              <DetailItem label="Jam ke"         value={detailData.jam_ke} />
              <div className="divider" />
              <DetailItem label="Tujuan Pembelajaran"  value={detailData.tujuan_pembelajaran}  multiline />
              <DetailItem label="Materi Pokok"         value={detailData.materi_pokok}          multiline />
              <DetailItem label="Model Pembelajaran"   value={detailData.model_pembelajaran} />
              <DetailItem label="Metode Pembelajaran"  value={detailData.metode_pembelajaran} />
              <DetailItem label="Media Pembelajaran"   value={detailData.media_pembelajaran} />
              <div className="divider" />
              <DetailItem label="Kegiatan Pendahuluan" value={detailData.kegiatan_pendahuluan} multiline />
              <DetailItem label="Kegiatan Inti"        value={detailData.kegiatan_inti}        multiline />
              <DetailItem label="Kegiatan Penutup"     value={detailData.kegiatan_penutup}     multiline />
              <div className="divider" />
              <DetailItem label="Penilaian"    value={detailData.penilaian}    multiline />
              <DetailItem label="Refleksi"     value={detailData.refleksi}     multiline />
              <DetailItem label="Tindak Lanjut" value={detailData.tindak_lanjut} multiline />
              <div className="divider" />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span className="chip chip-hadir">H: {detailData.jumlah_hadir ?? 0}</span>
                <span className="chip chip-sakit">S: {detailData.jumlah_sakit ?? 0}</span>
                <span className="chip chip-izin">I: {detailData.jumlah_izin  ?? 0}</span>
                <span className="chip chip-alpha">A: {detailData.jumlah_alpha ?? 0}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary"
                onClick={() => { setDetailModal(false); router.push(`/jurnal/${detailData.id}/edit`); }}>
                <Pencil size={14} /> Edit Jurnal
              </button>
              <button className="btn btn-ghost" onClick={() => setDetailModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL HAPUS ══ */}
      {deleteModal && deleteTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteModal(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: "#dc2626" }}>Hapus Jurnal</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => !deleting && setDeleteModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.875rem" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "grid", placeItems: "center", color: "#dc2626" }}>
                  <AlertTriangle size={26} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "var(--clr-text)", marginBottom: "0.375rem" }}>Yakin hapus jurnal ini?</p>
                  <p style={{ fontSize: "0.875rem" }}>
                    Jurnal <strong>{deleteTarget.subjects?.nama || deleteTarget.mapel}</strong> tanggal{" "}
                    <strong>{formatTanggalPendek(deleteTarget.tanggal)}</strong> akan dihapus permanen.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(false)} disabled={deleting}>Batal</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting
                  ? <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Menghapus...</>
                  : <><Trash2 size={15} /> Ya, Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOAST ══ */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === "success" && "✅"}
            {t.type === "error"   && "❌"}
            {t.type === "warning" && "⚠️"}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

function DetailItem({ label, value, multiline }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--clr-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "0.9rem", color: "var(--clr-text)", whiteSpace: multiline ? "pre-wrap" : "normal", lineHeight: 1.6 }}>
        {value}
      </div>
    </div>
  );
}