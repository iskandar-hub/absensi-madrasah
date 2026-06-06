"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function JurnalPage() {
  const router = useRouter();

  const [loading, setLoading]       = useState(true);
  const [jurnalList, setJurnalList] = useState([]);
  const [kelasList, setKelasList]   = useState([]);

  const [filterKelas, setFilterKelas] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");

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

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const [jurnalRes, kelasRes] = await Promise.all([
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
    ]);

    if (jurnalRes.error) showToast("Gagal memuat jurnal", "error");
    else setJurnalList(jurnalRes.data || []);

    if (kelasRes.error) showToast("Gagal memuat kelas", "error");
    else setKelasList(kelasRes.data || []);

    setLoading(false);
  }, [router, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter
  const filtered = jurnalList.filter((j) => {
    const matchKelas = filterKelas ? j.classes?.id === filterKelas : true;
    const matchBulan = filterBulan
      ? (j.tanggal || "").slice(5, 7) === filterBulan
      : true;
    const matchTahun = filterTahun
      ? (j.tanggal || "").slice(0, 4) === filterTahun
      : true;
    return matchKelas && matchBulan && matchTahun;
  });

  // Tahun unik dari data jurnal
  const tahunList = [
    ...new Set(jurnalList.map((j) => (j.tanggal || "").slice(0, 4)).filter(Boolean)),
  ].sort((a, b) => b.localeCompare(a));

  // Hapus jurnal
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

  // Format tanggal
  function formatTanggal(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const BULAN = [
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

  return (
    <div className="page-container">

      {/* Header */}
      <div className="page-header">
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
          <button
            className="btn btn-primary"
            onClick={() => router.push("/jurnal/tulis")}
          >
            <Plus size={16} />
            Tulis Jurnal
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-body" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>

            <select
              className="form-input form-select"
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              style={{ minWidth: 160, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              style={{ minWidth: 140, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}
            >
              <option value="">Semua Bulan</option>
              {BULAN.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              style={{ minWidth: 120, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}
            >
              <option value="">Semua Tahun</option>
              {tahunList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {(filterKelas || filterBulan || filterTahun) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setFilterKelas(""); setFilterBulan(""); setFilterTahun(""); }}
              >
                <X size={14} /> Hapus filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Konten */}
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

                  {/* Ikon */}
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-md)",
                    background: "var(--clr-primary-50)",
                    border: "1px solid var(--clr-primary-100)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--clr-primary-600)",
                  }}>
                    <BookOpen size={20} />
                  </div>

                  {/* Konten */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--clr-text)" }}>
                          {item.subjects?.nama || item.mapel || "–"}
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <Calendar size={12} />
                            {formatTanggal(item.tanggal)}
                          </span>
                          {item.classes?.nama_kelas && (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Users size={12} />
                              {item.classes.nama_kelas}
                            </span>
                          )}
                          {item.jam_ke && (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Clock size={12} />
                              Jam ke-{item.jam_ke}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badge pertemuan */}
                      {item.pertemuan_ke && (
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "var(--clr-gold-100)",
                          color: "var(--clr-gold-700)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "99px",
                          whiteSpace: "nowrap",
                        }}>
                          Pertemuan {item.pertemuan_ke}
                        </span>
                      )}
                    </div>

                    {/* Materi */}
                    {item.materi_pokok && (
                      <div style={{
                        marginTop: "0.5rem",
                        fontSize: "0.8125rem",
                        color: "var(--clr-text-2)",
                        background: "var(--clr-surface-2)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.375rem 0.625rem",
                        borderLeft: "3px solid var(--clr-primary-300)",
                      }}>
                        📌 {item.materi_pokok}
                      </div>
                    )}

                    {/* Kehadiran ringkas */}
                    {(item.jumlah_hadir !== null || item.jumlah_sakit !== null) && (
                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                        {item.jumlah_hadir !== null && (
                          <span className="chip chip-hadir" style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>
                            H: {item.jumlah_hadir}
                          </span>
                        )}
                        {item.jumlah_sakit !== null && (
                          <span className="chip chip-sakit" style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>
                            S: {item.jumlah_sakit}
                          </span>
                        )}
                        {item.jumlah_izin !== null && (
                          <span className="chip chip-izin" style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>
                            I: {item.jumlah_izin}
                          </span>
                        )}
                        {item.jumlah_alpha !== null && (
                          <span className="chip chip-alpha" style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem" }}>
                            A: {item.jumlah_alpha}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol aksi */}
                <div style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "0.875rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--clr-border)",
                  justifyContent: "flex-end",
                }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setDetailData(item); setDetailModal(true); }}
                  >
                    <Eye size={14} /> Lihat Detail
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => router.push(`/jurnal/${item.id}/edit`)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => { setDeleteTarget(item); setDeleteModal(true); }}
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detail */}
      {detailModal && detailData && (
        <div className="modal-backdrop" onClick={() => setDetailModal(false)}>
          <div
            className="modal animate-slideUp"
            style={{ maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                📓 Detail Jurnal
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetailModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <DetailItem label="Tanggal" value={formatTanggal(detailData.tanggal)} />
              <DetailItem label="Kelas" value={detailData.classes?.nama_kelas} />
              <DetailItem label="Mata Pelajaran" value={detailData.subjects?.nama || detailData.mapel} />
              <DetailItem label="Pertemuan ke" value={detailData.pertemuan_ke} />
              <DetailItem label="Jam ke" value={detailData.jam_ke} />
              <div className="divider" />
              <DetailItem label="Tujuan Pembelajaran" value={detailData.tujuan_pembelajaran} multiline />
              <DetailItem label="Materi Pokok" value={detailData.materi_pokok} multiline />
              <DetailItem label="Model Pembelajaran" value={detailData.model_pembelajaran} />
              <DetailItem label="Metode Pembelajaran" value={detailData.metode_pembelajaran} />
              <DetailItem label="Media Pembelajaran" value={detailData.media_pembelajaran} />
              <div className="divider" />
              <DetailItem label="Kegiatan Pendahuluan" value={detailData.kegiatan_pendahuluan} multiline />
              <DetailItem label="Kegiatan Inti" value={detailData.kegiatan_inti} multiline />
              <DetailItem label="Kegiatan Penutup" value={detailData.kegiatan_penutup} multiline />
              <div className="divider" />
              <DetailItem label="Penilaian" value={detailData.penilaian} multiline />
              <DetailItem label="Refleksi" value={detailData.refleksi} multiline />
              <DetailItem label="Tindak Lanjut" value={detailData.tindak_lanjut} multiline />
              <div className="divider" />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span className="chip chip-hadir">H: {detailData.jumlah_hadir ?? 0}</span>
                <span className="chip chip-sakit">S: {detailData.jumlah_sakit ?? 0}</span>
                <span className="chip chip-izin">I: {detailData.jumlah_izin ?? 0}</span>
                <span className="chip chip-alpha">A: {detailData.jumlah_alpha ?? 0}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setDetailModal(false); router.push(`/jurnal/${detailData.id}/edit`); }}>
                <Pencil size={14} /> Edit Jurnal
              </button>
              <button className="btn btn-ghost" onClick={() => setDetailModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {deleteModal && deleteTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteModal(false)}>
          <div
            className="modal animate-slideUp"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: "#dc2626" }}>Hapus Jurnal</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => !deleting && setDeleteModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.875rem" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "grid", placeItems: "center", color: "#dc2626" }}>
                  <AlertTriangle size={26} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "var(--clr-text)", marginBottom: "0.375rem" }}>Yakin hapus jurnal ini?</p>
                  <p style={{ fontSize: "0.875rem" }}>
                    Jurnal <strong>{deleteTarget.subjects?.nama || deleteTarget.mapel}</strong> tanggal <strong>{formatTanggal(deleteTarget.tanggal)}</strong> akan dihapus permanen.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(false)} disabled={deleting}>Batal</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting
                  ? <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Menghapus...</>
                  : <><Trash2 size={15} /> Ya, Hapus</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === "success" && "✅"}
            {t.type === "error" && "❌"}
            {t.type === "warning" && "⚠️"}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

// Sub-komponen detail item
function DetailItem({ label, value, multiline }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--clr-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
        {label}
      </div>
      <div style={{
        fontSize: "0.9rem",
        color: "var(--clr-text)",
        whiteSpace: multiline ? "pre-wrap" : "normal",
        lineHeight: 1.6,
      }}>
        {value}
      </div>
    </div>
  );
}