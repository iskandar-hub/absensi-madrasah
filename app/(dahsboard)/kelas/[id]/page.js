"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  School,
  Users,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
  ChevronRight,
  ArrowLeft,
  Calendar,
  UserCheck,
  GraduationCap,
  NotebookPen,
  Clock,
  RefreshCw,
  ArrowUpCircle,
  Trophy,
  AlertTriangle,
  X,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ============================================================
   KOMPONEN UTAMA — KelasDetailPage
   ============================================================ */
export default function KelasDetailPage() {
  const router = useRouter();
  const params = useParams();
  const kelasId = params.id;

  // ── State ──────────────────────────────────────────────
  const [kelas, setKelas]                   = useState(null);
  const [stats, setStats]                   = useState(null);
  const [absensiHariIni, setAbsensiHariIni] = useState(null);
  const [absensiTerbaru, setAbsensiTerbaru] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [loadingAbsensi, setLoadingAbsensi] = useState(true);

  // ── State Naik Kelas ───────────────────────────────────
  const [showNaikKelas,    setShowNaikKelas]    = useState(false);
  const [kelasTujuanList,  setKelasTujuanList]  = useState([]);
  const [selectedTujuan,   setSelectedTujuan]   = useState("");
  const [loadingKelasLain, setLoadingKelasLain] = useState(false);
  const [prosesNaik,       setProsesNaik]       = useState(false);
  const [jumlahSiswaAktif, setJumlahSiswaAktif] = useState(0);

  // ── State Luluskan ─────────────────────────────────────
  const [showLuluskan,  setShowLuluskan]  = useState(false);
  const [prosesLulus,   setProsesLulus]   = useState(false);

  // ── State Sukses ───────────────────────────────────────
  const [showSukses,    setShowSukses]    = useState(false);
  const [pesanSukses,   setPesanSukses]   = useState("")

  // ── Toast ──────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  function addToast(message, type = "success") {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }

  /* ── Fetch Data Kelas ──────────────────────────────── */
  const fetchKelas = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { data: kelasData, error: kelasError } = await supabase
      .from("classes")
      .select("id, nama_kelas, tingkat, tahun_ajaran, wali_kelas, school_id")
      .eq("id", kelasId)
      .single();

    if (kelasError || !kelasData) { router.push("/kelas"); return; }
    setKelas(kelasData);

    const { count: jumlahSiswa } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", kelasId)
      .eq("status", "aktif");

    const { count: jumlahJurnal } = await supabase
      .from("journals")
      .select("id", { count: "exact", head: true })
      .eq("class_id", kelasId);

    const { count: jumlahNilai } = await supabase
      .from("grades")
      .select("id", { count: "exact", head: true })
      .eq("class_id", kelasId);

    setStats({
      jumlahSiswa:  jumlahSiswa  ?? 0,
      jumlahJurnal: jumlahJurnal ?? 0,
      jumlahNilai:  jumlahNilai  ?? 0,
    });
    setJumlahSiswaAktif(jumlahSiswa ?? 0);
    setLoading(false);
  }, [kelasId, router]);

  /* ── Fetch Absensi ─────────────────────────────────── */
  const fetchAbsensi = useCallback(async () => {
    setLoadingAbsensi(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    const { data: hariIniData } = await supabase
      .from("attendances")
      .select("status")
      .eq("class_id", kelasId)
      .eq("tanggal", today);

    if (hariIniData && hariIniData.length > 0) {
      const rekap = hariIniData.reduce(
        (acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; },
        { H: 0, S: 0, I: 0, A: 0 }
      );
      setAbsensiHariIni({ ...rekap, total: hariIniData.length, tanggal: today });
    } else {
      setAbsensiHariIni(null);
    }

    const { data: terbaruData } = await supabase
      .from("attendances")
      .select("tanggal, status")
      .eq("class_id", kelasId)
      .order("tanggal", { ascending: false })
      .limit(50);

    if (terbaruData && terbaruData.length > 0) {
      const perTanggal = terbaruData.reduce((acc, row) => {
        if (!acc[row.tanggal]) acc[row.tanggal] = { H: 0, S: 0, I: 0, A: 0, total: 0 };
        acc[row.tanggal][row.status]++;
        acc[row.tanggal].total++;
        return acc;
      }, {});

      const sorted = Object.entries(perTanggal)
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .slice(0, 5)
        .map(([tanggal, rekap]) => ({ tanggal, ...rekap }));

      setAbsensiTerbaru(sorted);
    }

    setLoadingAbsensi(false);
  }, [kelasId]);

  useEffect(() => {
    fetchKelas();
    fetchAbsensi();
  }, [fetchKelas, fetchAbsensi]);

  /* ── Buka Modal Naik Kelas ─────────────────────────── */
  async function bukaModalNaikKelas() {
    setLoadingKelasLain(true);
    setSelectedTujuan("");
    setShowNaikKelas(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Ambil semua kelas milik user KECUALI kelas ini sendiri
    // dan kelas yang sudah punya siswa aktif (opsional — biarkan user memilih)
    const { data, error } = await supabase
      .from("classes")
      .select("id, nama_kelas, tingkat, tahun_ajaran")
      .eq("user_id", user.id)
      .neq("id", kelasId)
      .order("tingkat")
      .order("nama_kelas");

    if (error) {
      addToast("Gagal memuat daftar kelas", "error");
      setLoadingKelasLain(false);
      return;
    }

    setKelasTujuanList(data || []);
    setLoadingKelasLain(false);
  }

  /* ── Proses Naik Kelas ─────────────────────────────── */
  async function handleNaikKelas() {
    if (!selectedTujuan) {
      addToast("Pilih kelas tujuan terlebih dahulu", "error");
      return;
    }
    setProsesNaik(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi habis");

      // 1. Ambil semua siswa AKTIF di kelas ini
      const { data: siswaAktif, error: errSiswa } = await supabase
        .from("students")
        .select("id, nomor_urut, nama, nisn, jenis_kelamin")
        .eq("class_id", kelasId)
        .eq("user_id", user.id)
        .eq("status", "aktif");

      if (errSiswa) throw errSiswa;
      if (!siswaAktif || siswaAktif.length === 0) {
        throw new Error("Tidak ada siswa aktif di kelas ini");
      }

      // 2. Salin siswa ke kelas tujuan
      const payload = siswaAktif.map(s => ({
        class_id:      selectedTujuan,
        user_id:       user.id,
        nomor_urut:    s.nomor_urut,
        nama:          s.nama,
        nisn:          s.nisn || null,
        jenis_kelamin: s.jenis_kelamin,
        status:        "aktif",
      }));

      const { error: errInsert } = await supabase
        .from("students")
        .insert(payload);

      if (errInsert) throw errInsert;

      // 3. Set siswa lama → status 'alumni'
      const idLama = siswaAktif.map(s => s.id);
      const { error: errUpdate } = await supabase
        .from("students")
        .update({ status: "alumni" })
        .in("id", idLama)
        .eq("user_id", user.id);

      if (errUpdate) throw errUpdate;

      // Sukses
      const kelasTujuan = kelasTujuanList.find(k => k.id === selectedTujuan);
      setShowNaikKelas(false);
      setPesanSukses(
        `${siswaAktif.length} siswa berhasil dipindahkan ke ${kelasTujuan?.nama_kelas || "kelas tujuan"}.`
      );
      setShowSukses(true);

      // Refresh data
      await fetchKelas();

    } catch (err) {
      console.error(err);
      addToast(err.message || "Gagal memproses naik kelas", "error");
    } finally {
      setProsesNaik(false);
    }
  }

  /* ── Proses Luluskan ───────────────────────────────── */
  async function handleLuluskan() {
    setProsesLulus(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi habis");

      // Update semua siswa aktif → status 'lulus'
      const { error } = await supabase
        .from("students")
        .update({ status: "lulus" })
        .eq("class_id", kelasId)
        .eq("user_id", user.id)
        .eq("status", "aktif");

      if (error) throw error;

      setShowLuluskan(false);
      setPesanSukses(
        `${jumlahSiswaAktif} siswa berhasil diluluskan. Data absensi dan nilai tetap tersimpan sebagai arsip.`
      );
      setShowSukses(true);

      await fetchKelas();

    } catch (err) {
      console.error(err);
      addToast(err.message || "Gagal memproses kelulusan", "error");
    } finally {
      setProsesLulus(false);
    }
  }

  /* ── Menu Navigasi ─────────────────────────────────── */
  const menuItems = [
    {
      label: "Data Siswa",
      desc:  "Kelola daftar siswa, nomor absen, NISN, jenis kelamin",
      icon:  Users,
      color: "blue",
      href:  `/siswa/${kelasId}`,
      stat:  stats ? `${stats.jumlahSiswa} siswa aktif` : null,
    },
    {
      label: "Absensi Harian",
      desc:  "Input dan rekap kehadiran siswa H/S/I/A per tanggal",
      icon:  ClipboardCheck,
      color: "green",
      href:  `/absensi/${kelasId}`,
      stat:      absensiHariIni ? "Sudah diisi hari ini" : "Belum diisi hari ini",
      statColor: absensiHariIni ? "var(--clr-primary-600)" : "var(--clr-gold-600)",
    },
    {
      label: "Penilaian",
      desc:  "Input nilai formatif, sumatif, P5, dan capaian kompetensi",
      icon:  GraduationCap,
      color: "amber",
      href:  `/penilaian/${kelasId}`,
      stat:  stats ? `${stats.jumlahNilai} entri nilai` : null,
    },
    {
      label: "Jurnal Guru",
      desc:  "Catat jurnal pembelajaran format Kemenag Kurikulum Merdeka",
      icon:  NotebookPen,
      color: "red",
      href:  `/jurnal?kelasId=${kelasId}`,
      stat:  stats ? `${stats.jumlahJurnal} jurnal` : null,
    },
  ];

  /* ── Helper Format Tanggal ─────────────────────────── */
  const formatTanggalPendek = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  /* ── Render ────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton"
              style={{ height: i === 0 ? 80 : 120, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!kelas) return null;

  return (
    <div className="page-container">

      {/* ── Page Header ───────────────────────────────── */}
      <div className="page-header">
        <div className="breadcrumb">
          <a href="/dashboard">Dashboard</a>
          <span className="sep">›</span>
          <a href="/kelas">Kelas</a>
          <span className="sep">›</span>
          <span className="current">{kelas.nama_kelas}</span>
        </div>

        <div className="page-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => router.push("/kelas")}
              title="Kembali ke daftar kelas"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {kelas.nama_kelas}
                <TingkatBadge tingkat={kelas.tingkat} />
              </h1>
              <p>
                {kelas.tahun_ajaran && `Tahun Ajaran ${kelas.tahun_ajaran}`}
                {kelas.wali_kelas && ` · Wali Kelas: ${kelas.wali_kelas}`}
              </p>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setLoading(true); fetchKelas(); fetchAbsensi(); }}
            title="Refresh data"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="stat-card">
          <div className="stat-card-icon blue"><Users size={22} /></div>
          <div>
            <div className="stat-card-value">{stats?.jumlahSiswa ?? "—"}</div>
            <div className="stat-card-label">Siswa Aktif</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon green"><UserCheck size={22} /></div>
          <div>
            <div className="stat-card-value">{absensiHariIni ? absensiHariIni.H : "—"}</div>
            <div className="stat-card-label">Hadir Hari Ini</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon amber"><TrendingUp size={22} /></div>
          <div>
            <div className="stat-card-value">{stats?.jumlahNilai ?? "—"}</div>
            <div className="stat-card-label">Entri Nilai</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon red"><BookOpen size={22} /></div>
          <div>
            <div className="stat-card-value">{stats?.jumlahJurnal ?? "—"}</div>
            <div className="stat-card-label">Jurnal Guru</div>
          </div>
        </div>
      </div>

      {/* ── Layout 2 Kolom ────────────────────────────── */}
      <div className="dashboard-grid">

        {/* KIRI — Menu Navigasi */}
        <div className="dashboard-left">
          <div className="card">

            {/* Header card dengan tombol aksi tahun ajaran */}
            <div className="card-header" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <School size={18} />
                Menu Kelas
              </h3>

              {/* Tombol Naik Kelas & Luluskan */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowLuluskan(true)}
                  disabled={jumlahSiswaAktif === 0}
                  title={jumlahSiswaAktif === 0 ? "Tidak ada siswa aktif" : "Luluskan semua siswa aktif"}
                  style={{
                    borderColor: "#d97706",
                    color: "#d97706",
                    opacity: jumlahSiswaAktif === 0 ? 0.45 : 1,
                  }}
                >
                  <Trophy size={13} />
                  Luluskan
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={bukaModalNaikKelas}
                  disabled={jumlahSiswaAktif === 0}
                  title={jumlahSiswaAktif === 0 ? "Tidak ada siswa aktif" : "Pindahkan siswa ke kelas lain"}
                >
                  <ArrowUpCircle size={13} />
                  Naik Kelas
                </button>
              </div>
            </div>

            {/* Info siswa alumni jika ada */}
            {stats !== null && (
              <AlumiInfo kelasId={kelasId} />
            )}

            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    style={{
                      display: "flex", alignItems: "center", gap: "1rem",
                      padding: "0.875rem 1rem",
                      background: "var(--clr-surface)",
                      border: "1.5px solid var(--clr-border)",
                      borderRadius: "var(--radius-lg)",
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "all var(--transition-base)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--clr-primary-400)";
                      e.currentTarget.style.background  = "var(--clr-primary-50)";
                      e.currentTarget.style.transform   = "translateX(3px)";
                      e.currentTarget.style.boxShadow   = "var(--shadow-md)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--clr-border)";
                      e.currentTarget.style.background  = "var(--clr-surface)";
                      e.currentTarget.style.transform   = "translateX(0)";
                      e.currentTarget.style.boxShadow   = "none";
                    }}
                  >
                    <div className={`stat-card-icon ${item.color}`} style={{ flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "var(--clr-text)", fontSize: "0.9375rem" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)", marginTop: "0.125rem" }}>
                        {item.desc}
                      </div>
                      {item.stat && (
                        <div style={{
                          fontSize: "0.75rem", fontWeight: 600, marginTop: "0.25rem",
                          color: item.statColor || "var(--clr-text-2)",
                        }}>
                          {item.stat}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} style={{ color: "var(--clr-text-muted)", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* KANAN — Info & Absensi */}
        <div className="dashboard-right">

          {/* Info Kelas */}
          <div className="card">
            <div className="card-header"><h3>Info Kelas</h3></div>
            <div className="card-body">
              <InfoRow label="Nama Kelas"   value={kelas.nama_kelas} />
              <InfoRow label="Tingkat"      value={`Tingkat ${kelas.tingkat || "-"}`} />
              <InfoRow label="Tahun Ajaran" value={kelas.tahun_ajaran || "-"} />
              <InfoRow label="Wali Kelas"   value={kelas.wali_kelas || "Belum diisi"} muted={!kelas.wali_kelas} />
            </div>
          </div>

          {/* Absensi Hari Ini */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar size={16} />
                Absensi Hari Ini
              </h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => router.push(`/absensi/${kelasId}`)}
              >
                {absensiHariIni ? "Lihat / Edit" : "Isi Sekarang"}
              </button>
            </div>

            <div className="card-body">
              {loadingAbsensi ? (
                <div className="skeleton" style={{ height: 60, borderRadius: "var(--radius-md)" }} />
              ) : absensiHariIni ? (
                <div className="dashboard-summary-grid">
                  {[
                    { key: "H", cls: "chip-hadir" },
                    { key: "S", cls: "chip-sakit" },
                    { key: "I", cls: "chip-izin" },
                    { key: "A", cls: "chip-alpha" },
                  ].map(({ key, cls }) => (
                    <div key={key} className={`chip ${cls}`}
                      style={{ justifyContent: "center", padding: "10px 12px", fontWeight: 700, borderRadius: "var(--radius-md)" }}>
                      {key} : {absensiHariIni[key]}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "0.5rem", padding: "1rem 0",
                  color: "var(--clr-text-muted)", textAlign: "center",
                }}>
                  <Clock size={28} style={{ opacity: 0.4 }} />
                  <p style={{ fontSize: "0.875rem" }}>Absensi hari ini belum diisi</p>
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Absensi */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ClipboardCheck size={16} />
                Riwayat Absensi
              </h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {loadingAbsensi ? (
                <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 42, borderRadius: "var(--radius-md)" }} />
                  ))}
                </div>
              ) : absensiTerbaru.length === 0 ? (
                <div className="empty-state" style={{ padding: "1.5rem" }}>
                  <div className="empty-state-icon" style={{ fontSize: "1.5rem" }}>📋</div>
                  <p style={{ fontSize: "0.8125rem" }}>Belum ada data absensi</p>
                </div>
              ) : (
                <table className="table" style={{ minWidth: "unset" }}>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th style={{ textAlign: "center" }}>H</th>
                      <th style={{ textAlign: "center" }}>S</th>
                      <th style={{ textAlign: "center" }}>I</th>
                      <th style={{ textAlign: "center" }}>A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absensiTerbaru.map(row => (
                      <tr key={row.tanggal}>
                        <td style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                          {formatTanggalPendek(row.tanggal)}
                        </td>
                        {["H", "S", "I", "A"].map(k => (
                          <td key={k} style={{ textAlign: "center" }}>
                            <span style={{
                              color: k === "H" ? "var(--clr-hadir)"
                                   : k === "S" ? "var(--clr-sakit)"
                                   : k === "I" ? "var(--clr-izin)"
                                   : "var(--clr-alpha)",
                              fontWeight: 700, fontSize: "0.875rem",
                            }}>
                              {row[k]}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {absensiTerbaru.length > 0 && (
              <div className="card-footer">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => router.push(`/absensi/${kelasId}`)}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Lihat Semua Absensi <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MODAL — NAIK KELAS
      ════════════════════════════════════════════════════ */}
      {showNaikKelas && (
        <div className="modal-backdrop" onClick={() => !prosesNaik && setShowNaikKelas(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ArrowUpCircle size={18} style={{ color: "var(--clr-primary-600)" }} />
                Naik Kelas
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNaikKelas(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">

              {/* Info kelas asal */}
              <div style={{
                background: "var(--clr-primary-50)",
                border: "1px solid var(--clr-primary-200)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
              }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--clr-primary-800)" }}>
                  <strong>{jumlahSiswaAktif} siswa aktif</strong> dari kelas{" "}
                  <strong>{kelas.nama_kelas}</strong> akan disalin ke kelas tujuan.
                  Data absensi & nilai di kelas ini tetap tersimpan sebagai arsip.
                </p>
              </div>

              {/* Pilih kelas tujuan */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Kelas Tujuan <span style={{ color: "#dc2626" }}>*</span>
                </label>

                {loadingKelasLain ? (
                  <div className="skeleton" style={{ height: 44, borderRadius: "var(--radius-md)" }} />
                ) : kelasTujuanList.length === 0 ? (
                  <div style={{
                    padding: "12px 14px",
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    color: "#9a3412",
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
                        {k.tingkat ? ` (Tingkat ${k.tingkat})` : ""}
                        {k.tahun_ajaran ? ` — TA ${k.tahun_ajaran}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Peringatan */}
              <div style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "#fff5f5", border: "1px solid #fecaca",
                borderRadius: "var(--radius-md)", padding: "12px 14px",
              }}>
                <AlertTriangle size={16} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, color: "#7f1d1d" }}>
                  Pastikan kelas tujuan sudah benar. Setelah proses ini, siswa di kelas{" "}
                  <strong>{kelas.nama_kelas}</strong> akan berstatus <em>alumni</em> dan kelas ini akan kosong.
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
                  : <><ArrowUpCircle size={14} /> Naikkan Kelas</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL — LULUSKAN
      ════════════════════════════════════════════════════ */}
      {showLuluskan && (
        <div className="modal-backdrop" onClick={() => !prosesLulus && setShowLuluskan(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 420 }}
            onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={18} style={{ color: "#d97706" }} />
                Luluskan Siswa
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowLuluskan(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", gap: "0.875rem", padding: "0.5rem 0",
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "#fef3c7",
                  display: "grid", placeItems: "center", color: "#d97706",
                }}>
                  <Trophy size={28} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: "var(--clr-text)", marginBottom: 6, fontSize: 15 }}>
                    Luluskan {jumlahSiswaAktif} siswa dari {kelas.nama_kelas}?
                  </p>
                  <p style={{ fontSize: 13, color: "var(--clr-text-2)", lineHeight: 1.6 }}>
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
                className="btn btn-sm"
                onClick={handleLuluskan}
                disabled={prosesLulus}
                style={{
                  background: "#d97706", color: "#fff",
                  border: "none", borderRadius: "var(--radius-md)",
                  padding: "0.375rem 0.875rem",
                  fontWeight: 600, fontSize: "0.875rem",
                  display: "flex", alignItems: "center", gap: 6,
                  cursor: prosesLulus ? "not-allowed" : "pointer",
                  opacity: prosesLulus ? 0.6 : 1,
                }}
              >
                {prosesLulus
                  ? <><span className="loading-spinner" style={{ width: 12, height: 12 }} /> Memproses...</>
                  : <><Trophy size={14} /> Ya, Luluskan</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL — SUKSES
      ════════════════════════════════════════════════════ */}
      {showSukses && (
        <div className="modal-backdrop" onClick={() => setShowSukses(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 400 }}
            onClick={e => e.stopPropagation()}>

            <div className="modal-body" style={{ padding: "2rem 1.5rem" }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", gap: "1rem",
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "var(--clr-primary-100)",
                  display: "grid", placeItems: "center",
                  color: "var(--clr-primary-600)",
                }}>
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 style={{ color: "var(--clr-text)", marginBottom: 8 }}>Berhasil! 🎉</h3>
                  <p style={{ fontSize: 13, color: "var(--clr-text-2)", lineHeight: 1.6 }}>
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

      {/* ── Toast ──────────────────────────────────────── */}
      <div className="toast-container">
        {toasts.map(t => (
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

/* ============================================================
   KOMPONEN — Info alumni (lazy load)
   Tampilkan banner jika ada siswa alumni di kelas ini
   ============================================================ */
function AlumiInfo({ kelasId }) {
  const [jumlah, setJumlah] = useState(0);

  useEffect(() => {
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", kelasId)
      .neq("status", "aktif")
      .then(({ count }) => setJumlah(count ?? 0));
  }, [kelasId]);

  if (jumlah === 0) return null;

  return (
    <div style={{
      margin: "0 1.25rem 0",
      padding: "8px 12px",
      background: "#f0fdf4",
      border: "1px solid var(--clr-primary-200)",
      borderRadius: "var(--radius-md)",
      fontSize: 12,
      color: "var(--clr-primary-700)",
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}>
      <GraduationCap size={14} />
      {jumlah} siswa tidak aktif (alumni/lulus) tersimpan sebagai arsip di kelas ini.
    </div>
  );
}

/* ============================================================
   SUB-KOMPONEN
   ============================================================ */

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
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "0.175rem 0.575rem",
      fontSize: "0.75rem", fontWeight: 700, borderRadius: "99px",
      background: style.bg, color: style.color,
      letterSpacing: "0.03em", verticalAlign: "middle",
    }}>
      Tingkat {tingkat || "-"}
    </span>
  );
}

function InfoRow({ label, value, muted = false, last = false }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", gap: "1rem",
      paddingBottom: last ? 0 : "0.625rem",
      marginBottom:  last ? 0 : "0.625rem",
      borderBottom:  last ? "none" : "1px solid var(--clr-border)",
    }}>
      <span style={{ fontSize: "0.8125rem", color: "var(--clr-text-muted)", fontWeight: 500, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: "0.875rem", fontWeight: 600, textAlign: "right",
        color:      muted ? "var(--clr-text-muted)" : "var(--clr-text)",
        fontStyle:  muted ? "italic" : "normal",
      }}>
        {value}
      </span>
    </div>
  );
}