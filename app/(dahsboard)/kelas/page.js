"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  School,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Users,
  BookOpen,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ============================================================
   KONSTANTA
   ============================================================ */


const EMPTY_FORM = {
  nama_kelas: "",
  tingkat: "",
  tahun_ajaran: "",
  wali_kelas: "",
};

/* ============================================================
   KOMPONEN UTAMA — KelasPage
   ============================================================ */
export default function KelasPage() {
  const router = useRouter();

  // ── State Data ──────────────────────────────────────────
  const [kelasList, setKelasList] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── State Filter / Search ────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("");

  // ── State Modal ──────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // ── State Hapus ──────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── State Toast ──────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  /* ── Helpers ─────────────────────────────────────────── */
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  /* ── Fetch Sekolah ───────────────────────────────────── */
  const fetchSchools = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { data, error } = await supabase
      .from("schools")
      .select("id, nama")
      .order("nama");

    if (error) {
      showToast("Gagal memuat data sekolah", "error");
      return;
    }
    setSchools(data || []);
    if (data && data.length > 0) {
      setSelectedSchoolId(data[0].id);
    }
  }, [router, showToast]);

  /* ── Fetch Kelas ─────────────────────────────────────── */
  const fetchKelas = useCallback(async (schoolId) => {
    if (!schoolId) { setKelasList([]); setLoading(false); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Query 1 — data kelas (tanpa join students agar tidak error)
    const { data, error } = await supabase
      .from("classes")
      .select(`
        id,
        nama_kelas,
        tingkat,
        tahun_ajaran,
        wali_kelas
      `)
      .eq("school_id", schoolId)
      .order("tingkat")
      .order("nama_kelas");

    if (error) {
      console.log("ERROR DETAIL:", JSON.stringify(error, null, 2));
      showToast("Gagal memuat data kelas", "error");
      setLoading(false);
      return;
    }

    const kelasList = data || [];

    // Query 2 — hitung siswa per kelas (satu query, lebih efisien)
    const { data: siswaData } = await supabase
      .from("students")
      .select("class_id")
      .in("class_id", kelasList.map((k) => k.id))
      .eq("status", "aktif");

    // Hitung jumlah siswa per class_id
    const countMap = (siswaData || []).reduce((acc, row) => {
      acc[row.class_id] = (acc[row.class_id] || 0) + 1;
      return acc;
    }, {});

    // Gabungkan jumlah siswa ke data kelas
    const kelasWithCount = kelasList.map((k) => ({
      ...k,
      jumlah_siswa: countMap[k.id] || 0,
    }));

    setKelasList(kelasWithCount);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);
  useEffect(() => { if (selectedSchoolId) fetchKelas(selectedSchoolId); }, [selectedSchoolId, fetchKelas]);

  /* ── Filter & Search ─────────────────────────────────── */
  const filteredKelas = kelasList.filter((k) => {
    const matchSearch =
      k.nama_kelas.toLowerCase().includes(search.toLowerCase()) ||
      (k.wali_kelas || "").toLowerCase().includes(search.toLowerCase());
    const matchTingkat = filterTingkat ? (k.tingkat || "").toLowerCase().includes(filterTingkat.toLowerCase()) : true;
    return matchSearch && matchTingkat;
  });

  /* ── Validasi Form ───────────────────────────────────── */
  const validateForm = () => {
    const errors = {};
    if (!formData.nama_kelas.trim()) errors.nama_kelas = "Nama kelas wajib diisi";
    if (!formData.tingkat) errors.tingkat = "Tingkat wajib dipilih";
    if (!formData.tahun_ajaran.trim()) errors.tahun_ajaran = "Tahun ajaran wajib diisi";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Buka Modal ──────────────────────────────────────── */
  const openAddModal = () => {
    setModalMode("add");
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setEditId(null);
    setModalOpen(true);
  };

  const openEditModal = (kelas) => {
    setModalMode("edit");
    setFormData({
      nama_kelas: kelas.nama_kelas || "",
      tingkat: kelas.tingkat || "",
      tahun_ajaran: kelas.tahun_ajaran || "",
      wali_kelas: kelas.wali_kelas || "",
    });
    setFormErrors({});
    setEditId(kelas.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setEditId(null);
  };

  /* ── Submit Form ─────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (modalMode === "add") {
      const { error } = await supabase.from("classes").insert({
        school_id: selectedSchoolId,
        user_id: user.id,
        nama_kelas: formData.nama_kelas.trim(),
        tingkat: formData.tingkat,
        tahun_ajaran: formData.tahun_ajaran.trim(),
        wali_kelas: formData.wali_kelas.trim() || null,
      });

      if (error) {
        showToast("Gagal menambahkan kelas", "error");
      } else {
        showToast("Kelas berhasil ditambahkan 🎉");
        closeModal();
        fetchKelas(selectedSchoolId);
      }
    } else {
      const { error } = await supabase
        .from("classes")
        .update({
          nama_kelas: formData.nama_kelas.trim(),
          tingkat: formData.tingkat,
          tahun_ajaran: formData.tahun_ajaran.trim(),
          wali_kelas: formData.wali_kelas.trim() || null,
        })
        .eq("id", editId);

      if (error) {
        showToast("Gagal memperbarui kelas", "error");
      } else {
        showToast("Kelas berhasil diperbarui ✏️");
        closeModal();
        fetchKelas(selectedSchoolId);
      }
    }
    setSaving(false);
  };

  /* ── Hapus Kelas ─────────────────────────────────────── */
  const openDeleteModal = (kelas) => {
    setDeleteTarget(kelas);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      showToast("Gagal menghapus kelas", "error");
    } else {
      showToast("Kelas berhasil dihapus 🗑️", "warning");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchKelas(selectedSchoolId);
    }
    setDeleting(false);
  };

  /* ── Statistik ───────────────────────────────────────── */
  const totalSiswa = kelasList.reduce((acc, k) => {
    return acc + (k.jumlah_siswa || 0);
  }, 0);

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="page-container">

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="page-header">
        <div className="breadcrumb">
          <a href="/dashboard">Dashboard</a>
          <span className="sep">›</span>
          <span className="current">Kelas</span>
        </div>

        <div className="page-header-row">
          <div>
            <h1>Manajemen Kelas</h1>
            <p>Kelola data kelas, tingkat, wali kelas, dan tahun ajaran.</p>
          </div>

          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            Tambah Kelas
          </button>
        </div>
      </div>

      {/* ── Pilih Sekolah ───────────────────────────────── */}
      {schools.length > 1 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-body" style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <label
                className="form-label"
                style={{ margin: 0, whiteSpace: "nowrap" }}
                htmlFor="school-select"
              >
                Pilih Sekolah:
              </label>
              <div style={{ position: "relative", minWidth: "240px" }}>
                <select
                  id="school-select"
                  className="form-input form-select"
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <School size={22} />
          </div>
          <div>
            <div className="stat-card-value">{kelasList.length}</div>
            <div className="stat-card-label">Total Kelas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon blue">
            <Users size={22} />
          </div>
          <div>
            <div className="stat-card-value">{totalSiswa}</div>
            <div className="stat-card-label">Total Siswa</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon amber">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="stat-card-value">
              {new Set(kelasList.map((k) => k.tingkat).filter(Boolean)).size}
            </div>
            <div className="stat-card-label">Jumlah Tingkat</div>
          </div>
        </div>
      </div>

      {/* ── Tabel Kelas ─────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <School size={18} />
            Daftar Kelas
          </h3>

          {/* Search & Filter */}
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--clr-text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Cari kelas atau wali kelas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  paddingLeft: "2.25rem",
                  width: "220px",
                  paddingTop: "0.4375rem",
                  paddingBottom: "0.4375rem",
                  fontSize: "0.8125rem",
                }}
              />
            </div>

            {/* Filter Tingkat */}
            <div style={{ position: "relative" }}>
              <Filter
                size={14}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--clr-text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Filter tingkat..."
                value={filterTingkat}
                onChange={(e) => setFilterTingkat(e.target.value)}
                style={{
                  paddingLeft: "2.25rem",
                  paddingTop: "0.4375rem",
                  paddingBottom: "0.4375rem",
                  fontSize: "0.8125rem",
                  width: "150px",
                }}
              />
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <LoadingSkeleton />
          ) : schools.length === 0 ? (
            <EmptyStateSekolah onNavigate={() => router.push("/sekolah")} />
          ) : filteredKelas.length === 0 ? (
            <EmptyStateKelas
              hasFilter={!!search || !!filterTingkat}
              onAdd={openAddModal}
              onClearFilter={() => { setSearch(""); setFilterTingkat(""); }}
            />
          ) : (
            <div className="table-wrapper" style={{ borderRadius: 0, border: "none", boxShadow: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="col-no">No</th>
                    <th>Nama Kelas</th>
                    <th>Tingkat</th>
                    <th>Tahun Ajaran</th>
                    <th>Wali Kelas</th>
                    <th style={{ textAlign: "center" }}>Jumlah Siswa</th>
                    <th className="col-actions">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKelas.map((kelas, idx) => (
                    <tr key={kelas.id}>
                      <td className="col-no">{idx + 1}</td>

                      <td>
                        <span style={{ fontWeight: 600, color: "var(--clr-text)" }}>
                          {kelas.nama_kelas}
                        </span>
                      </td>

                      <td>
                        <TingkatBadge tingkat={kelas.tingkat} />
                      </td>

                      <td style={{ color: "var(--clr-text-2)", fontSize: "0.875rem" }}>
                        {kelas.tahun_ajaran || "-"}
                      </td>

                      <td style={{ color: "var(--clr-text-2)", fontSize: "0.875rem" }}>
                        {kelas.wali_kelas || (
                          <span style={{ color: "var(--clr-text-muted)", fontStyle: "italic" }}>
                            Belum diisi
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "var(--clr-primary-700)",
                          }}
                        >
                          <Users size={14} />
                          {kelas.jumlah_siswa ?? 0}
                        </span>
                      </td>

                      <td className="col-actions">
                        <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            title="Edit kelas"
                            onClick={() => openEditModal(kelas)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            title="Hapus kelas"
                            onClick={() => openDeleteModal(kelas)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer — info jumlah hasil */}
        {!loading && filteredKelas.length > 0 && (
          <div className="card-footer">
            <span style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)" }}>
              Menampilkan{" "}
              <strong style={{ color: "var(--clr-text)" }}>{filteredKelas.length}</strong>
              {" "}dari{" "}
              <strong style={{ color: "var(--clr-text)" }}>{kelasList.length}</strong>
              {" "}kelas
              {(search || filterTingkat) && (
                <button
                  onClick={() => { setSearch(""); setFilterTingkat(""); }}
                  style={{
                    marginLeft: "0.75rem",
                    fontSize: "0.75rem",
                    color: "var(--clr-primary-600)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Hapus filter ×
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL — Tambah / Edit Kelas
      ══════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal animate-slideUp"
            style={{ maxWidth: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "add" ? "Tambah Kelas Baru" : "Edit Data Kelas"}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">

              {/* Nama Kelas */}
              <div className="form-group">
                <label className="form-label" htmlFor="nama_kelas">
                  Nama Kelas <span className="required">*</span>
                </label>
                <input
                  id="nama_kelas"
                  type="text"
                  className={`form-input${formErrors.nama_kelas ? " error" : ""}`}
                  placeholder="Contoh: VII A, VIII A, IX A"
                  value={formData.nama_kelas}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nama_kelas: e.target.value }))
                  }
                />
                {formErrors.nama_kelas && (
                  <span className="form-error">{formErrors.nama_kelas}</span>
                )}
              </div>

              {/* Tingkat */}
              <div className="form-group">
                <label className="form-label" htmlFor="tingkat">
                  Tingkat <span className="required">*</span>
                </label>
                <input
                  id="tingkat"
                  type="text"
                  className={`form-input${formErrors.tingkat ? " error" : ""}`}
                  placeholder="Contoh: 7, 8, 9, 10, 11, 12, dst."
                  value={formData.tingkat}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tingkat: e.target.value }))
                  }
                />
                {formErrors.tingkat && (
                  <span className="form-error">{formErrors.tingkat}</span>
                )}
                <span className="form-hint">Isi bebas sesuai jenjang sekolah</span>
              </div>

              {/* Tahun Ajaran */}
              <div className="form-group">
                <label className="form-label" htmlFor="tahun_ajaran">
                  Tahun Ajaran <span className="required">*</span>
                </label>
                <input
                  id="tahun_ajaran"
                  type="text"
                  className={`form-input${formErrors.tahun_ajaran ? " error" : ""}`}
                  placeholder="Contoh: 2024/2025"
                  value={formData.tahun_ajaran}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tahun_ajaran: e.target.value }))
                  }
                />
                {formErrors.tahun_ajaran && (
                  <span className="form-error">{formErrors.tahun_ajaran}</span>
                )}
                <span className="form-hint">Format: 2024/2025</span>
              </div>

              {/* Wali Kelas */}
              <div className="form-group">
                <label className="form-label" htmlFor="wali_kelas">
                  Wali Kelas
                </label>
                <input
                  id="wali_kelas"
                  type="text"
                  className="form-input"
                  placeholder="Nama wali kelas (opsional)"
                  value={formData.wali_kelas}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, wali_kelas: e.target.value }))
                  }
                />
              </div>

            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="loading-spinner" style={{ width: 14, height: 14 }} />
                    Menyimpan...
                  </>
                ) : modalMode === "add" ? (
                  <>
                    <Plus size={15} />
                    Simpan Kelas
                  </>
                ) : (
                  <>
                    <Pencil size={15} />
                    Perbarui Kelas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL — Konfirmasi Hapus
      ══════════════════════════════════════════════════ */}
      {deleteModal && deleteTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteModal(false)}>
          <div
            className="modal animate-slideUp"
            style={{ maxWidth: "420px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: "#dc2626" }}>
                Hapus Kelas
              </h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => !deleting && setDeleteModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "0.875rem",
                  padding: "0.5rem 0",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#fee2e2",
                    display: "grid",
                    placeItems: "center",
                    color: "#dc2626",
                  }}
                >
                  <AlertTriangle size={26} />
                </div>

                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      color: "var(--clr-text)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Yakin hapus kelas ini?
                  </p>
                  <p style={{ fontSize: "0.875rem" }}>
                    Kelas{" "}
                    <strong style={{ color: "var(--clr-text)" }}>
                      {deleteTarget.nama_kelas}
                    </strong>{" "}
                    beserta seluruh data siswa, absensi, dan nilai yang terhubung
                    akan{" "}
                    <strong style={{ color: "#dc2626" }}>
                      dihapus permanen
                    </strong>{" "}
                    dan tidak bisa dikembalikan.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="loading-spinner" style={{ width: 14, height: 14 }} />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Ya, Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notifikasi ─────────────────────────────── */}
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

/* ============================================================
   SUB-KOMPONEN
   ============================================================ */

/* Badge Tingkat */
function TingkatBadge({ tingkat }) {
  const PALETTE = [
    { bg: "#dbeafe", color: "#1d4ed8" },
    { bg: "#dcfce7", color: "#15803d" },
    { bg: "#fef3c7", color: "#b45309" },
    { bg: "#fce7f3", color: "#9d174d" },
    { bg: "#ede9fe", color: "#6d28d9" },
    { bg: "#ffedd5", color: "#c2410c" },
    { bg: "#cffafe", color: "#0e7490" },
    { bg: "#f1f5f9", color: "#475569" },
  ];

  const getStyle = (str) => {
    if (!str) return { bg: "var(--clr-surface-2)", color: "var(--clr-text-2)" };
    const hash = str.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return PALETTE[hash % PALETTE.length];
  };

  const style = getStyle(tingkat);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.625rem",
        fontSize: "0.75rem",
        fontWeight: 700,
        borderRadius: "99px",
        background: style.bg,
        color: style.color,
        letterSpacing: "0.03em",
      }}
    >
      Tingkat {tingkat || "-"}
    </span>
  );
}

/* Skeleton Loading */
function LoadingSkeleton() {
  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: "46px", width: "100%", borderRadius: "var(--radius-md)" }}
        />
      ))}
    </div>
  );
}

/* Empty State — belum ada sekolah */
function EmptyStateSekolah({ onNavigate }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🏫</div>
      <h3>Belum Ada Data Sekolah</h3>
      <p>Tambahkan data sekolah terlebih dahulu sebelum mengelola kelas.</p>
      <button className="btn btn-primary" onClick={onNavigate}>
        <Plus size={15} />
        Tambah Sekolah
      </button>
    </div>
  );
}

/* Empty State — kelas kosong / tidak ditemukan */
function EmptyStateKelas({ hasFilter, onAdd, onClearFilter }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{hasFilter ? "🔍" : "📚"}</div>
      <h3>{hasFilter ? "Kelas Tidak Ditemukan" : "Belum Ada Kelas"}</h3>
      <p>
        {hasFilter
          ? "Tidak ada kelas yang cocok dengan pencarian atau filter Anda."
          : "Mulai dengan menambahkan kelas pertama untuk sekolah ini."}
      </p>
      {hasFilter ? (
        <button className="btn btn-secondary" onClick={onClearFilter}>
          <X size={15} />
          Hapus Filter
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus size={15} />
          Tambah Kelas
        </button>
      )}
    </div>
  );
}