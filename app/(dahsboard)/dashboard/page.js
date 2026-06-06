"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  School,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalKelas: 0,
    absensiHariIni: 0,
    jurnalGuru: 0,
  });
  const [absensiRingkasan, setAbsensiRingkasan] = useState({
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpha: 0,
  });
  const [aktivitasTerbaru, setAktivitasTerbaru] = useState([]);
  const [jadwalHariIni, setJadwalHariIni] = useState([]);
  const [persentaseKehadiran, setPersentaseKehadiran] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Pengguna";
    setUserName(displayName);

    const { data: schoolsData } = await supabase
      .from("schools")
      .select("id")
      .eq("user_id", user.id);

    const schoolIds = (schoolsData || []).map((s) => s.id);
    if (schoolIds.length === 0) { setLoading(false); return; }

    const today = new Date().toISOString().split("T")[0];
    const namaHariIni = new Date().toLocaleDateString("id-ID", { weekday: "long" });
    const hariFormatted = namaHariIni.charAt(0).toUpperCase() + namaHariIni.slice(1);

    const [
      kelasRes,
      siswaRes,
      absensiHariIniRes,
      absensiRingkasanRes,
      jurnalRes,
      aktivitasAbsensiRes,
      aktivitasNilaiRes,
      jadwalRes,
      kehadiranBulanRes,
    ] = await Promise.all([
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .in("school_id", schoolIds),

      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "aktif"),

      supabase
        .from("attendances")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("tanggal", today),

      supabase
        .from("attendances")
        .select("status")
        .eq("user_id", user.id)
        .eq("tanggal", today),

      supabase
        .from("journals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),

      // Aktivitas absensi terbaru
      supabase
        .from("attendances")
        .select("id, tanggal, status, created_at, class_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),

      // Aktivitas penilaian terbaru — dari tabel assessments
      supabase
        .from("assessments")
        .select("id, nama_penilaian, mapel, tanggal, created_at, class_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),

      supabase
        .from("schedules")
        .select(`
          id,
          jam_mulai,
          jam_selesai,
          jam_ke,
          subjects(nama),
          classes(nama_kelas)
        `)
        .eq("user_id", user.id)
        .eq("hari", hariFormatted)
        .order("jam_mulai"),

      supabase
        .from("attendances")
        .select("status")
        .eq("user_id", user.id)
        .gte(
          "tanggal",
          new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .split("T")[0]
        ),
    ]);

    // Stats
    setStats({
      totalSiswa: siswaRes.count || 0,
      totalKelas: kelasRes.count || 0,
      absensiHariIni: absensiHariIniRes.count || 0,
      jurnalGuru: jurnalRes.count || 0,
    });

    // Ringkasan absensi hari ini
    const ringkasan = { hadir: 0, sakit: 0, izin: 0, alpha: 0 };
    (absensiRingkasanRes.data || []).forEach((row) => {
      const s = (row.status || "").toUpperCase();
      if (s === "H") ringkasan.hadir++;
      else if (s === "S") ringkasan.sakit++;
      else if (s === "I") ringkasan.izin++;
      else if (s === "A") ringkasan.alpha++;
    });
    setAbsensiRingkasan(ringkasan);

    // Gabungkan aktivitas absensi + penilaian
    const absensiData = aktivitasAbsensiRes.data || [];
    const nilaiData = aktivitasNilaiRes.data || [];

    // Kumpulkan class_id unik dari kedua sumber
    const classIds = [
      ...new Set([
        ...absensiData.map((r) => r.class_id),
        ...nilaiData.map((r) => r.class_id),
      ].filter(Boolean)),
    ];

    let kelasMap = {};
    if (classIds.length > 0) {
      const { data: kelasData } = await supabase
        .from("classes")
        .select("id, nama_kelas")
        .in("id", classIds);
      (kelasData || []).forEach((k) => { kelasMap[k.id] = k.nama_kelas; });
    }

    const statusLabel = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpha" };

    const aktivitasAbsensi = absensiData.map((row) => ({
      id: `abs-${row.id}`,
      judul: `Absensi kelas ${kelasMap[row.class_id] || "–"} — ${statusLabel[row.status?.toUpperCase()] || row.status}`,
      waktu: formatWaktu(row.created_at),
      tipe: "absensi",
      _ts: new Date(row.created_at).getTime(),
    }));

    const aktivitasNilai = nilaiData.map((row) => ({
      id: `nil-${row.id}`,
      judul: `Penilaian ${row.nama_penilaian || row.mapel} — kelas ${kelasMap[row.class_id] || "–"}`,
      waktu: formatWaktu(row.created_at),
      tipe: "nilai",
      _ts: new Date(row.created_at).getTime(),
    }));

    // Gabung, urutkan terbaru, ambil 5 teratas
    const semua = [...aktivitasAbsensi, ...aktivitasNilai]
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 5);

    setAktivitasTerbaru(semua);

    // Jadwal hari ini
    setJadwalHariIni(jadwalRes.data || []);

    // Persentase kehadiran bulan ini
    const bulanData = kehadiranBulanRes.data || [];
    if (bulanData.length > 0) {
      const hadirCount = bulanData.filter(
        (r) => (r.status || "").toUpperCase() === "H"
      ).length;
      setPersentaseKehadiran(Math.round((hadirCount / bulanData.length) * 100));
    }

    setLoading(false);
  }, [router]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  function formatWaktu(isoString) {
    if (!isoString) return "-";
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
    return `${Math.floor(diff / 86400)} hari yang lalu`;
  }

  const statCards = [
    { title: "Total Siswa",      value: stats.totalSiswa,     icon: Users,          color: "green" },
    { title: "Total Kelas",      value: stats.totalKelas,     icon: School,         color: "blue"  },
    { title: "Absensi Hari Ini", value: stats.absensiHariIni, icon: ClipboardCheck, color: "amber" },
    { title: "Jurnal Guru",      value: stats.jurnalGuru,     icon: BookOpen,       color: "red"   },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="breadcrumb">
          <span className="current">Dashboard</span>
        </div>
        <div className="page-header-row">
          <div>
            <h1>Dashboard Absensi Madrasah</h1>
            <p>
              Selamat datang kembali{userName ? `, ${userName}` : ""}.
              Berikut ringkasan aktivitas madrasah hari ini.
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-cards mb-6">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="stat-card">
              <div className={`stat-card-icon ${item.color}`}>
                <Icon size={22} />
              </div>
              <div>
                <div className="stat-card-value">
                  {loading
                    ? <span className="skeleton" style={{ display: "inline-block", width: 40, height: 24, borderRadius: 6 }} />
                    : item.value}
                </div>
                <div className="stat-card-label">{item.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        {/* ── Kolom Kiri ── */}
        <div className="dashboard-left">

          {/* Ringkasan Absensi */}
          <div className="card">
            <div className="card-header"><h3>Ringkasan Absensi Hari Ini</h3></div>
            <div className="card-body">
              {loading ? (
                <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "0.5rem",
                }}>
                  {[
                    { label: "Hadir", value: absensiRingkasan.hadir, cls: "chip-hadir" },
                    { label: "Sakit", value: absensiRingkasan.sakit, cls: "chip-sakit" },
                    { label: "Izin",  value: absensiRingkasan.izin,  cls: "chip-izin"  },
                    { label: "Alpha", value: absensiRingkasan.alpha, cls: "chip-alpha" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`chip ${item.cls}`}
                      style={{
                        padding: "0.4rem 0.5rem",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        borderRadius: "var(--radius-md)",
                        justifyContent: "center",
                        textAlign: "center",
                        flexDirection: "column",
                        gap: "0.1rem",
                        lineHeight: 1.3,
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{item.label}</span>
                      <span style={{ fontSize: "1rem" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aktivitas Terbaru */}
          <div className="card">
            <div className="card-header"><h3>Aktivitas Terbaru</h3></div>
            <div className="card-body">
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                  ))}
                </div>
              ) : aktivitasTerbaru.length === 0 ? (
                <p style={{ color: "var(--clr-text-muted)", fontSize: "0.875rem" }}>
                  Belum ada aktivitas hari ini.
                </p>
              ) : (
                <div className="activity-list">
                  {aktivitasTerbaru.map((item, idx) => (
                    <div key={item.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.75rem" }}>
                          {item.tipe === "absensi" ? "📋" : "📝"}
                        </span>
                        <strong>{item.judul}</strong>
                      </div>
                      <p style={{ paddingLeft: "1.3rem" }}>{item.waktu}</p>
                      {idx < aktivitasTerbaru.length - 1 && <div className="divider" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Kolom Kanan ── */}
        <div className="dashboard-right">
          {/* Jadwal Hari Ini */}
          <div className="card">
            <div className="card-header"><h3>Jadwal Hari Ini</h3></div>
            <div className="card-body">
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                  ))}
                </div>
              ) : jadwalHariIni.length === 0 ? (
                <p style={{ color: "var(--clr-text-muted)", fontSize: "0.875rem" }}>
                  Tidak ada jadwal hari ini.
                </p>
              ) : (
                <div className="schedule-list">
                  {jadwalHariIni.map((item, idx) => (
                    <div key={item.id}>
                      <strong>{item.subjects?.nama || "–"}</strong>
                      <p>
                        {item.classes?.nama_kelas || "–"}
                        {" • "}
                        {item.jam_mulai ? item.jam_mulai.slice(0, 5) : "–"}
                        {item.jam_selesai ? ` – ${item.jam_selesai.slice(0, 5)}` : ""}
                      </p>
                      {idx < jadwalHariIni.length - 1 && <div className="divider" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Absensi Bulan Ini */}
          <div className="card">
            <div className="card-header"><h3>Absensi Bulan Ini</h3></div>
            <div className="card-body">
              <div className="performance-box">
                <TrendingUp size={36} color="#16a34a" />
                <div>
                  <div className="performance-value">
                    {loading
                      ? <span className="skeleton" style={{ display: "inline-block", width: 60, height: 28, borderRadius: 6 }} />
                      : `${persentaseKehadiran}%`}
                  </div>
                  <p>Kehadiran siswa bulan ini</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}