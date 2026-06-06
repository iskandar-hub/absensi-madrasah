"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  BookOpen,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ============================================================
   KONSTANTA
   ============================================================ */
const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const EMPTY_JADWAL = {
  subject_id: "",
  class_id: "",
  hari: "",
  jam_ke: "",
  jam_mulai: "",
  jam_selesai: "",
  tahun_ajaran: "",
};

const EMPTY_MAPEL = { nama: "" };

/* ============================================================
   KOMPONEN UTAMA
   ============================================================ */
export default function JadwalPage() {
  const router = useRouter();

  const [jadwalList, setJadwalList] = useState([]);
  const [mapelList, setMapelList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [tahunAjaranList, setTahunAjaranList] = useState([]); // ← daftar tahun ajaran dari tabel classes
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("jadwal");

  const [filterHari, setFilterHari] = useState("");
  const [filterTahun, setFilterTahun] = useState("");

  const [modalJadwal, setModalJadwal] = useState(false);
  const [modalJadwalMode, setModalJadwalMode] = useState("add");
  const [formJadwal, setFormJadwal] = useState(EMPTY_JADWAL);
  const [editJadwalId, setEditJadwalId] = useState(null);
  const [errorsJadwal, setErrorsJadwal] = useState({});

  const [modalMapel, setModalMapel] = useState(false);
  const [modalMapelMode, setModalMapelMode] = useState("add");
  const [formMapel, setFormMapel] = useState(EMPTY_MAPEL);
  const [editMapelId, setEditMapelId] = useState(null);
  const [errorsMapel, setErrorsMapel] = useState({});

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const [jadwalRes, mapelRes, kelasRes] = await Promise.all([
      supabase
        .from("schedules")
        .select(`
          id, hari, jam_ke, jam_mulai, jam_selesai, tahun_ajaran,
          subjects(id, nama),
          classes(id, nama_kelas, tingkat)
        `)
        .eq("user_id", user.id)
        .order("hari")
        .order("jam_ke"),

      supabase
        .from("subjects")
        .select("id, nama")
        .eq("user_id", user.id)
        .order("nama"),

      // Fetch kelas beserta tahun_ajaran
      supabase
        .from("classes")
        .select("id, nama_kelas, tingkat, tahun_ajaran")
        .eq("user_id", user.id)
        .order("tingkat")
        .order("nama_kelas"),
    ]);

    if (jadwalRes.error) showToast("Gagal memuat jadwal", "error");
    else setJadwalList(jadwalRes.data || []);

    if (mapelRes.error) showToast("Gagal memuat mata pelajaran", "error");
    else setMapelList(mapelRes.data || []);

    if (kelasRes.error) showToast("Gagal memuat kelas", "error");
    else {
      const kelas = kelasRes.data || [];
      setKelasList(kelas);

      // Ambil tahun ajaran unik dari semua kelas, urutkan terbaru dulu
      const tahunUnik = [
        ...new Set(
          kelas
            .map((k) => k.tahun_ajaran)
            .filter(Boolean)
        ),
      ].sort((a, b) => b.localeCompare(a));

      setTahunAjaranList(tahunUnik);

      // Jika hanya ada 1 tahun ajaran, set otomatis ke form
      if (tahunUnik.length === 1) {
        setFormJadwal((prev) => ({ ...prev, tahun_ajaran: tahunUnik[0] }));
      }
    }

    setLoading(false);
  }, [router, showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredJadwal = jadwalList.filter((j) => {
    const matchHari = filterHari ? j.hari === filterHari : true;
    const matchTahun = filterTahun ? (j.tahun_ajaran || "").includes(filterTahun) : true;
    return matchHari && matchTahun;
  });

  const jadwalPerHari = HARI_LIST.reduce((acc, hari) => {
    const items = filteredJadwal.filter((j) => j.hari === hari);
    if (items.length > 0) acc[hari] = items;
    return acc;
  }, {});

  const validateJadwal = () => {
    const e = {};
    if (!formJadwal.subject_id) e.subject_id = "Mata pelajaran wajib dipilih";
    if (!formJadwal.class_id) e.class_id = "Kelas wajib dipilih";
    if (!formJadwal.hari) e.hari = "Hari wajib dipilih";
    if (!formJadwal.jam_ke) e.jam_ke = "Jam ke wajib diisi";
    if (!formJadwal.jam_mulai) e.jam_mulai = "Jam mulai wajib diisi";
    if (!formJadwal.jam_selesai) e.jam_selesai = "Jam selesai wajib diisi";
    if (!formJadwal.tahun_ajaran) e.tahun_ajaran = "Tahun ajaran wajib dipilih";
    setErrorsJadwal(e);
    return Object.keys(e).length === 0;
  };

  const openAddJadwal = () => {
    setModalJadwalMode("add");
    // Otomatis isi tahun ajaran jika hanya ada 1
    const defaultTahun = tahunAjaranList.length === 1 ? tahunAjaranList[0] : "";
    setFormJadwal({ ...EMPTY_JADWAL, tahun_ajaran: defaultTahun });
    setErrorsJadwal({});
    setEditJadwalId(null);
    setModalJadwal(true);
  };

  const openEditJadwal = (item) => {
    setModalJadwalMode("edit");
    setFormJadwal({
      subject_id:   item.subjects?.id || "",
      class_id:     item.classes?.id || "",
      hari:         item.hari || "",
      jam_ke:       item.jam_ke?.toString() || "",
      jam_mulai:    item.jam_mulai || "",
      jam_selesai:  item.jam_selesai || "",
      tahun_ajaran: item.tahun_ajaran || "",
    });
    setErrorsJadwal({});
    setEditJadwalId(item.id);
    setModalJadwal(true);
  };

  const handleSubmitJadwal = async () => {
    if (!validateJadwal()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id:      user.id,
      subject_id:   formJadwal.subject_id,
      class_id:     formJadwal.class_id,
      hari:         formJadwal.hari,
      jam_ke:       parseInt(formJadwal.jam_ke),
      jam_mulai:    formJadwal.jam_mulai,
      jam_selesai:  formJadwal.jam_selesai,
      tahun_ajaran: formJadwal.tahun_ajaran,
    };

    if (modalJadwalMode === "add") {
      const { error } = await supabase.from("schedules").insert(payload);
      if (error) showToast("Gagal menambahkan jadwal", "error");
      else { showToast("Jadwal berhasil ditambahkan 🎉"); setModalJadwal(false); fetchAll(); }
    } else {
      const { error } = await supabase.from("schedules").update(payload).eq("id", editJadwalId);
      if (error) showToast("Gagal memperbarui jadwal", "error");
      else { showToast("Jadwal berhasil diperbarui ✏️"); setModalJadwal(false); fetchAll(); }
    }
    setSaving(false);
  };

  const validateMapel = () => {
    const e = {};
    if (!formMapel.nama.trim()) e.nama = "Nama mata pelajaran wajib diisi";
    setErrorsMapel(e);
    return Object.keys(e).length === 0;
  };

  const openAddMapel = () => {
    setModalMapelMode("add");
    setFormMapel(EMPTY_MAPEL);
    setErrorsMapel({});
    setEditMapelId(null);
    setModalMapel(true);
  };

  const openEditMapel = (item) => {
    setModalMapelMode("edit");
    setFormMapel({ nama: item.nama || "" });
    setErrorsMapel({});
    setEditMapelId(item.id);
    setModalMapel(true);
  };

  const handleSubmitMapel = async () => {
    if (!validateMapel()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (modalMapelMode === "add") {
      const { error } = await supabase.from("subjects").insert({
        user_id: user.id,
        nama: formMapel.nama.trim(),
      });
      if (error) showToast("Gagal menambahkan mata pelajaran", "error");
      else { showToast("Mata pelajaran berhasil ditambahkan 🎉"); setModalMapel(false); fetchAll(); }
    } else {
      const { error } = await supabase.from("subjects").update({
        nama: formMapel.nama.trim(),
      }).eq("id", editMapelId);
      if (error) showToast("Gagal memperbarui mata pelajaran", "error");
      else { showToast("Mata pelajaran berhasil diperbarui ✏️"); setModalMapel(false); fetchAll(); }
    }
    setSaving(false);
  };

  const openDeleteModal = (id, nama, type) => {
    setDeleteTarget({ id, nama, type });
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const table = deleteTarget.type === "jadwal" ? "schedules" : "subjects";
    const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);

    if (error) {
      showToast(`Gagal menghapus ${deleteTarget.type}`, "error");
    } else {
      showToast(
        `${deleteTarget.type === "jadwal" ? "Jadwal" : "Mata pelajaran"} berhasil dihapus 🗑️`,
        "warning"
      );
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchAll();
    }
    setDeleting(false);
  };

  return (
    <div className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="breadcrumb">
          <a href="/dashboard">Dashboard</a>
          <span className="sep">›</span>
          <span className="current">Jadwal</span>
        </div>
        <div className="page-header-row">
          <div>
            <h1>Jadwal Mengajar</h1>
            <p>Kelola jadwal mengajar dan mata pelajaran. Input sekali, berlaku sepanjang semester.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={activeTab === "jadwal" ? openAddJadwal : openAddMapel}
          >
            <Plus size={16} />
            {activeTab === "jadwal" ? "Tambah Jadwal" : "Tambah Mapel"}
          </button>
        </div>
      </div>

      {/* Tab */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <button
          className={`btn ${activeTab === "jadwal" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("jadwal")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <CalendarDays size={15} />
          Jadwal Mengajar
        </button>
        <button
          className={`btn ${activeTab === "mapel" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("mapel")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <BookOpen size={15} />
          Mata Pelajaran
          {mapelList.length > 0 && (
            <span style={{
              background: "var(--clr-primary-100)",
              color: "var(--clr-primary-700)",
              borderRadius: "99px",
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0 0.4rem",
            }}>
              {mapelList.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Jadwal */}
      {activeTab === "jadwal" && (
        <>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-body" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  className="form-input form-select"
                  value={filterHari}
                  onChange={(e) => setFilterHari(e.target.value)}
                  style={{ minWidth: 150, fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem" }}
                >
                  <option value="">Semua Hari</option>
                  {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter tahun ajaran..."
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                  style={{ fontSize: "0.8125rem", paddingTop: "0.4375rem", paddingBottom: "0.4375rem", width: 180 }}
                />
                {(filterHari || filterTahun) && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setFilterHari(""); setFilterTahun(""); }}
                  >
                    <X size={14} /> Hapus filter
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : jadwalList.length === 0 ? (
            <EmptyState
              icon="📅"
              title="Belum Ada Jadwal"
              desc="Mulai tambahkan jadwal mengajar kamu untuk semester ini."
              actionLabel="Tambah Jadwal"
              onAction={openAddJadwal}
            />
          ) : Object.keys(jadwalPerHari).length === 0 ? (
            <EmptyState
              icon="🔍"
              title="Jadwal Tidak Ditemukan"
              desc="Tidak ada jadwal yang cocok dengan filter."
              actionLabel="Hapus Filter"
              onAction={() => { setFilterHari(""); setFilterTahun(""); }}
              secondary
            />
          ) : (
            HARI_LIST.filter((h) => jadwalPerHari[h]).map((hari) => (
              <div key={hari} className="card" style={{ marginBottom: "1rem" }}>
                <div className="card-header">
                  <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <HariBadge hari={hari} />
                    {hari}
                    <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--clr-text-muted)" }}>
                      ({jadwalPerHari[hari].length} sesi)
                    </span>
                  </h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-wrapper" style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>Jam ke</th>
                          <th>Waktu</th>
                          <th>Mata Pelajaran</th>
                          <th>Kelas</th>
                          <th>Tahun Ajaran</th>
                          <th className="col-actions">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jadwalPerHari[hari].map((item) => (
                          <tr key={item.id}>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{item.jam_ke}</td>
                            <td>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.875rem", color: "var(--clr-text-2)" }}>
                                <Clock size={13} />
                                {item.jam_mulai?.slice(0, 5)} – {item.jam_selesai?.slice(0, 5)}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{item.subjects?.nama || "-"}</td>
                            <td style={{ fontSize: "0.875rem", color: "var(--clr-text-2)" }}>
                              {item.classes?.nama_kelas || "-"}
                              {item.classes?.tingkat && (
                                <span style={{ marginLeft: "0.3rem", fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                                  (Tingkat {item.classes.tingkat})
                                </span>
                              )}
                            </td>
                            <td style={{ fontSize: "0.875rem", color: "var(--clr-text-2)" }}>
                              {item.tahun_ajaran || "-"}
                            </td>
                            <td className="col-actions">
                              <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                                <button
                                  className="btn btn-secondary btn-sm btn-icon"
                                  title="Edit jadwal"
                                  onClick={() => openEditJadwal(item)}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="btn btn-danger btn-sm btn-icon"
                                  title="Hapus jadwal"
                                  onClick={() => openDeleteModal(item.id, `${item.subjects?.nama} - ${item.classes?.nama_kelas}`, "jadwal")}
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
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Tab Mata Pelajaran */}
      {activeTab === "mapel" && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BookOpen size={18} />
              Daftar Mata Pelajaran
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <LoadingSkeleton />
            ) : mapelList.length === 0 ? (
              <EmptyState
                icon="📚"
                title="Belum Ada Mata Pelajaran"
                desc="Tambahkan mata pelajaran yang kamu ampu terlebih dahulu sebelum membuat jadwal."
                actionLabel="Tambah Mata Pelajaran"
                onAction={openAddMapel}
              />
            ) : (
              <div className="table-wrapper" style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
                <table className="table" style={{ minWidth: 'unset', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '40px' }} />
                    <col />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '80px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="col-no">No</th>
                      <th>Nama Mata Pelajaran</th>
                      <th style={{ textAlign: "center" }}>Dipakai di Jadwal</th>
                      <th className="col-actions">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapelList.map((item, idx) => {
                      const jadwalCount = jadwalList.filter((j) => j.subjects?.id === item.id).length;
                      return (
                        <tr key={item.id}>
                          <td className="col-no">{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{item.nama}</td>
                          <td style={{ textAlign: 'center' }}>
                            {jadwalCount > 0 ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                fontSize: '0.8rem', fontWeight: 700,
                                color: 'var(--clr-primary-700)',
                                background: 'var(--clr-primary-50)',
                                padding: '0.15rem 0.6rem', borderRadius: '99px',
                              }}>
                                {jadwalCount} jadwal
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', fontStyle: 'italic' }}>
                                -
                              </span>
                            )}
                          </td>
                          <td className="col-actions">
                            <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm btn-icon"
                                title="Edit mata pelajaran"
                                onClick={() => openEditMapel(item)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="btn btn-danger btn-sm btn-icon"
                                title="Hapus mata pelajaran"
                                onClick={() => openDeleteModal(item.id, item.nama, 'mapel')}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {mapelList.length > 0 && (
            <div className="card-footer">
              <span style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)" }}>
                Total <strong style={{ color: "var(--clr-text)" }}>{mapelList.length}</strong> mata pelajaran
              </span>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL — Tambah / Edit Jadwal
      ════════════════════════════════════════════════════ */}
      {modalJadwal && (
        <div className="modal-backdrop" onClick={() => setModalJadwal(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalJadwalMode === "add" ? "Tambah Jadwal Baru" : "Edit Jadwal"}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalJadwal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {mapelList.length === 0 && (
                <div style={{
                  background: "#fefce8", border: "1px solid #fde047",
                  borderRadius: "var(--radius-md)", padding: "0.75rem 1rem",
                  fontSize: "0.875rem", color: "#854d0e", marginBottom: "1rem",
                }}>
                  ⚠️ Belum ada mata pelajaran. Tambahkan di tab <strong>Mata Pelajaran</strong> terlebih dahulu.
                </div>
              )}

              {/* Mata Pelajaran */}
              <div className="form-group">
                <label className="form-label" htmlFor="subject_id">
                  Mata Pelajaran <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  id="subject_id"
                  className={`form-input form-select${errorsJadwal.subject_id ? " error" : ""}`}
                  value={formJadwal.subject_id}
                  onChange={(e) => setFormJadwal((p) => ({ ...p, subject_id: e.target.value }))}
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
                {errorsJadwal.subject_id && <span className="form-error">{errorsJadwal.subject_id}</span>}
              </div>

              {/* Kelas */}
              <div className="form-group">
                <label className="form-label" htmlFor="class_id">
                  Kelas <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  id="class_id"
                  className={`form-input form-select${errorsJadwal.class_id ? " error" : ""}`}
                  value={formJadwal.class_id}
                  onChange={(e) => {
                    const selectedKelas = kelasList.find((k) => k.id === e.target.value);
                    setFormJadwal((p) => ({
                      ...p,
                      class_id: e.target.value,
                      // Otomatis isi tahun ajaran sesuai kelas yang dipilih
                      tahun_ajaran: selectedKelas?.tahun_ajaran || p.tahun_ajaran,
                    }));
                  }}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kelas} {k.tingkat ? `(Tingkat ${k.tingkat})` : ""} — {k.tahun_ajaran || "?"}
                    </option>
                  ))}
                </select>
                {errorsJadwal.class_id && <span className="form-error">{errorsJadwal.class_id}</span>}
              </div>

              {/* Hari */}
              <div className="form-group">
                <label className="form-label" htmlFor="hari">
                  Hari <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  id="hari"
                  className={`form-input form-select${errorsJadwal.hari ? " error" : ""}`}
                  value={formJadwal.hari}
                  onChange={(e) => setFormJadwal((p) => ({ ...p, hari: e.target.value }))}
                >
                  <option value="">-- Pilih Hari --</option>
                  {HARI_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                {errorsJadwal.hari && <span className="form-error">{errorsJadwal.hari}</span>}
              </div>

              {/* Jam ke — baris sendiri */}
              <div className="form-group">
                <label className="form-label" htmlFor="jam_ke">
                  Jam ke <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  id="jam_ke"
                  type="number"
                  min={1}
                  max={12}
                  className={`form-input${errorsJadwal.jam_ke ? " error" : ""}`}
                  placeholder="Contoh: 1"
                  value={formJadwal.jam_ke}
                  onChange={(e) => setFormJadwal((p) => ({ ...p, jam_ke: e.target.value }))}
                  style={{ color: "var(--clr-text)", background: "var(--clr-surface)", maxWidth: 160 }}
                />
                {errorsJadwal.jam_ke && <span className="form-error">{errorsJadwal.jam_ke}</span>}
              </div>

              {/* Jam mulai & Jam selesai — berdampingan */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="jam_mulai">
                    Jam mulai <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    id="jam_mulai"
                    type="time"
                    className={`form-input${errorsJadwal.jam_mulai ? " error" : ""}`}
                    value={formJadwal.jam_mulai}
                    onChange={(e) => setFormJadwal((p) => ({ ...p, jam_mulai: e.target.value }))}
                    style={{ color: "var(--clr-text)", background: "var(--clr-surface)" }}
                  />
                  {errorsJadwal.jam_mulai && <span className="form-error">{errorsJadwal.jam_mulai}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="jam_selesai">
                    Jam selesai <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    id="jam_selesai"
                    type="time"
                    className={`form-input${errorsJadwal.jam_selesai ? " error" : ""}`}
                    value={formJadwal.jam_selesai}
                    onChange={(e) => setFormJadwal((p) => ({ ...p, jam_selesai: e.target.value }))}
                    style={{ color: "var(--clr-text)", background: "var(--clr-surface)" }}
                  />
                  {errorsJadwal.jam_selesai && <span className="form-error">{errorsJadwal.jam_selesai}</span>}
                </div>
              </div>

              {/* Tahun Ajaran — dropdown otomatis dari data kelas */}
              <div className="form-group">
                <label className="form-label" htmlFor="tahun_ajaran">
                  Tahun Ajaran <span style={{ color: "#dc2626" }}>*</span>
                </label>

                {tahunAjaranList.length === 0 ? (
                  // Belum ada kelas — fallback input teks
                  <>
                    <input
                      id="tahun_ajaran"
                      type="text"
                      className={`form-input${errorsJadwal.tahun_ajaran ? " error" : ""}`}
                      placeholder="Contoh: 2024/2025"
                      value={formJadwal.tahun_ajaran}
                      onChange={(e) => setFormJadwal((p) => ({ ...p, tahun_ajaran: e.target.value }))}
                      style={{ color: "var(--clr-text)", background: "var(--clr-surface)" }}
                    />
                    <span className="form-hint">
                      ⚠️ Belum ada kelas. Tambahkan kelas terlebih dahulu agar tahun ajaran otomatis muncul.
                    </span>
                  </>
                ) : tahunAjaranList.length === 1 ? (
                  // Hanya 1 tahun ajaran — tampilkan sebagai teks, tidak perlu pilih
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5625rem 0.875rem",
                    background: "var(--clr-primary-50)",
                    border: "1.5px solid var(--clr-primary-200)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    color: "var(--clr-primary-700)",
                  }}>
                    ✅ {tahunAjaranList[0]}
                    <span style={{ fontWeight: 400, fontSize: "0.8125rem", color: "var(--clr-primary-600)" }}>
                      (otomatis dari data kelas)
                    </span>
                  </div>
                ) : (
                  // Lebih dari 1 tahun ajaran — dropdown pilihan
                  <>
                    <select
                      id="tahun_ajaran"
                      className={`form-input form-select${errorsJadwal.tahun_ajaran ? " error" : ""}`}
                      value={formJadwal.tahun_ajaran}
                      onChange={(e) => setFormJadwal((p) => ({ ...p, tahun_ajaran: e.target.value }))}
                    >
                      <option value="">-- Pilih Tahun Ajaran --</option>
                      {tahunAjaranList.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <span className="form-hint">Diambil otomatis dari data kelas yang sudah diinput.</span>
                  </>
                )}

                {errorsJadwal.tahun_ajaran && (
                  <span className="form-error">{errorsJadwal.tahun_ajaran}</span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalJadwal(false)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmitJadwal} disabled={saving}>
                {saving ? (
                  <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</>
                ) : modalJadwalMode === "add" ? (
                  <><Plus size={15} /> Simpan Jadwal</>
                ) : (
                  <><Pencil size={15} /> Perbarui Jadwal</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Mata Pelajaran */}
      {modalMapel && (
        <div className="modal-backdrop" onClick={() => setModalMapel(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMapelMode === "add" ? "Tambah Mata Pelajaran" : "Edit Mata Pelajaran"}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalMapel(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="nama_mapel">
                  Nama Mata Pelajaran <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  id="nama_mapel"
                  type="text"
                  className={`form-input${errorsMapel.nama ? " error" : ""}`}
                  placeholder="Contoh: Bahasa Arab, Matematika, Tahfidz"
                  value={formMapel.nama}
                  onChange={(e) => setFormMapel({ nama: e.target.value })}
                />
                {errorsMapel.nama && <span className="form-error">{errorsMapel.nama}</span>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalMapel(false)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmitMapel} disabled={saving}>
                {saving ? (
                  <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</>
                ) : modalMapelMode === "add" ? (
                  <><Plus size={15} /> Simpan</>
                ) : (
                  <><Pencil size={15} /> Perbarui</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteModal && deleteTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteModal(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: "#dc2626" }}>
                Hapus {deleteTarget.type === "jadwal" ? "Jadwal" : "Mata Pelajaran"}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => !deleting && setDeleteModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.875rem", padding: "0.5rem 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "grid", placeItems: "center", color: "#dc2626" }}>
                  <AlertTriangle size={26} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "var(--clr-text)", marginBottom: "0.375rem" }}>Yakin hapus ini?</p>
                  <p style={{ fontSize: "0.875rem" }}>
                    <strong style={{ color: "var(--clr-text)" }}>{deleteTarget.nama}</strong>
                    {deleteTarget.type === "mapel" && <> akan dihapus. Jadwal yang menggunakan mata pelajaran ini akan ikut terpengaruh.</>}
                    {deleteTarget.type === "jadwal" && <> akan dihapus permanen.</>}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteModal(false)} disabled={deleting}>Batal</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? (
                  <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Menghapus...</>
                ) : (
                  <><Trash2 size={15} /> Ya, Hapus</>
                )}
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

/* Sub-komponen */
function HariBadge({ hari }) {
  const PALETTE = {
    Senin:  { bg: "#dbeafe", color: "#1d4ed8" },
    Selasa: { bg: "#dcfce7", color: "#15803d" },
    Rabu:   { bg: "#fef3c7", color: "#b45309" },
    Kamis:  { bg: "#ede9fe", color: "#6d28d9" },
    Jumat:  { bg: "#fce7f3", color: "#9d174d" },
    Sabtu:  { bg: "#ffedd5", color: "#c2410c" },
  };
  const s = PALETTE[hari] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "0.15rem 0.5rem", fontSize: "0.7rem", fontWeight: 700,
      borderRadius: "99px", background: s.bg, color: s.color,
    }}>
      {hari}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 46, borderRadius: "var(--radius-md)" }} />
      ))}
    </div>
  );
}

function EmptyState({ icon, title, desc, actionLabel, onAction, secondary }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <button className={`btn ${secondary ? "btn-secondary" : "btn-primary"}`} onClick={onAction}>
        {!secondary && <Plus size={15} />}
        {actionLabel}
      </button>
    </div>
  );
}