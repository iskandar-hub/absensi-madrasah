"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Save,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const EMPTY_FORM = {
  tanggal:               "",
  class_id:              "",
  subject_id:            "",
  mapel:                 "",
  schedule_id:           "",
  jam_ke:                "",
  pertemuan_ke:          "",
  tujuan_pembelajaran:   "",
  materi_pokok:          "",
  model_pembelajaran:    "",
  metode_pembelajaran:   "",
  media_pembelajaran:    "",
  kegiatan_pendahuluan:  "",
  kegiatan_inti:         "",
  kegiatan_penutup:      "",
  penilaian:             "",
  refleksi:              "",
  tindak_lanjut:         "",
  jumlah_hadir:          "",
  jumlah_sakit:          "",
  jumlah_izin:           "",
  jumlah_alpha:          "",
};

const SEKSI = [
  { id: 1, label: "Identitas",            icon: "📌" },
  { id: 2, label: "Rencana Pembelajaran", icon: "📖" },
  { id: 3, label: "Kegiatan Belajar",     icon: "🏫" },
  { id: 4, label: "Evaluasi & Kehadiran", icon: "📊" },
];

export default function EditJurnalPage() {
  const router   = useRouter();
  const params   = useParams();
  const jurnalId = params.id;
  console.log("jurnalId:", jurnalId);

  const [user, setUser]         = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [savedOk, setSavedOk]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [kelasList, setKelasList]     = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [jadwalList, setJadwalList]   = useState([]);

  const [openSeksi, setOpenSeksi] = useState(1);

  // ── Load data jurnal + dropdown ──────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUser(user);

      const [kelasRes, subjectRes, jadwalRes, jurnalRes] = await Promise.all([
        supabase
          .from("classes")
          .select("id, nama_kelas, tingkat")
          .order("nama_kelas"),

        supabase
          .from("subjects")
          .select("id, nama")
          .eq("user_id", user.id)
          .order("nama"),

        supabase
          .from("schedules")
          .select(`
            id, hari, jam_ke, jam_mulai, jam_selesai,
            subjects(id, nama),
            classes(id, nama_kelas)
          `)
          .eq("user_id", user.id)
          .order("hari"),

        supabase
          .from("journals")
          .select("*")
          .eq("id", jurnalId)
          .eq("user_id", user.id)
          .single(),
      ]);

      setKelasList(kelasRes.data   || []);
      setSubjectList(subjectRes.data || []);
      setJadwalList(jadwalRes.data  || []);

      if (jurnalRes.error || !jurnalRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Pre-fill form dengan data yang sudah ada
      const j = jurnalRes.data;
      setForm({
        tanggal:               j.tanggal               || "",
        class_id:              j.class_id              || "",
        subject_id:            j.subject_id            || "",
        mapel:                 j.mapel                 || "",
        schedule_id:           j.schedule_id           || "",
        jam_ke:                j.jam_ke        != null ? String(j.jam_ke)        : "",
        pertemuan_ke:          j.pertemuan_ke  != null ? String(j.pertemuan_ke)  : "",
        tujuan_pembelajaran:   j.tujuan_pembelajaran   || "",
        materi_pokok:          j.materi_pokok          || "",
        model_pembelajaran:    j.model_pembelajaran    || "",
        metode_pembelajaran:   j.metode_pembelajaran   || "",
        media_pembelajaran:    j.media_pembelajaran    || "",
        kegiatan_pendahuluan:  j.kegiatan_pendahuluan  || "",
        kegiatan_inti:         j.kegiatan_inti         || "",
        kegiatan_penutup:      j.kegiatan_penutup      || "",
        penilaian:             j.penilaian             || "",
        refleksi:              j.refleksi              || "",
        tindak_lanjut:         j.tindak_lanjut         || "",
        jumlah_hadir:  j.jumlah_hadir != null ? String(j.jumlah_hadir) : "",
        jumlah_sakit:  j.jumlah_sakit != null ? String(j.jumlah_sakit) : "",
        jumlah_izin:   j.jumlah_izin  != null ? String(j.jumlah_izin)  : "",
        jumlah_alpha:  j.jumlah_alpha != null ? String(j.jumlah_alpha) : "",
      });

      setLoading(false);
    }
    init();
  }, [router, jurnalId]);

  // ── Tarik kehadiran otomatis ──────────────────────────────
  const tarikKehadiran = useCallback(async (classId, tanggal) => {
    if (!classId || !tanggal) return;
    const { data } = await supabase
      .from("attendances")
      .select("status")
      .eq("class_id", classId)
      .eq("tanggal", tanggal);
    if (!data || data.length === 0) return;
    setForm((prev) => ({
      ...prev,
      jumlah_hadir: data.filter((r) => r.status === "H").length.toString(),
      jumlah_sakit: data.filter((r) => r.status === "S").length.toString(),
      jumlah_izin:  data.filter((r) => r.status === "I").length.toString(),
      jumlah_alpha: data.filter((r) => r.status === "A").length.toString(),
    }));
  }, []);

  // ── Handler perubahan field ───────────────────────────────
  function setField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "schedule_id") {
        const jadwal = jadwalList.find((j) => j.id === value);
        if (jadwal) {
          next.class_id   = jadwal.classes?.id    || prev.class_id;
          next.subject_id = jadwal.subjects?.id   || prev.subject_id;
          next.mapel      = jadwal.subjects?.nama  || prev.mapel;
          next.jam_ke     = jadwal.jam_ke?.toString() || prev.jam_ke;
        }
      }
      if (key === "subject_id") {
        const subj = subjectList.find((s) => s.id === value);
        if (subj) next.mapel = subj.nama;
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  // Tarik ulang kehadiran kalau kelas/tanggal berubah
  // (hanya setelah loading selesai, agar tidak overwrite data lama)
  const isFirstLoad = useState(true);
  useEffect(() => {
    if (loading) return;
    if (form.class_id && form.tanggal) {
      tarikKehadiran(form.class_id, form.tanggal);
    }
  }, [form.class_id, form.tanggal, tarikKehadiran, loading]);

  // ── Validasi ──────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.tanggal)  e.tanggal  = "Tanggal wajib diisi";
    if (!form.class_id) e.class_id = "Kelas wajib dipilih";
    if (!form.subject_id && !form.mapel)
      e.subject_id = "Mata pelajaran wajib dipilih";
    setErrors(e);
    if (e.tanggal || e.class_id || e.subject_id) setOpenSeksi(1);
    return Object.keys(e).length === 0;
  }

  // ── Simpan perubahan ──────────────────────────────────────
  async function handleSimpan() {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      tanggal:              form.tanggal,
      class_id:             form.class_id,
      subject_id:           form.subject_id  || null,
      schedule_id:          form.schedule_id || null,
      mapel:                form.mapel       || "",
      jam_ke:               form.jam_ke        ? parseInt(form.jam_ke)        : null,
      pertemuan_ke:         form.pertemuan_ke  ? parseInt(form.pertemuan_ke)  : null,
      tujuan_pembelajaran:  form.tujuan_pembelajaran  || null,
      materi_pokok:         form.materi_pokok          || null,
      model_pembelajaran:   form.model_pembelajaran    || null,
      metode_pembelajaran:  form.metode_pembelajaran   || null,
      media_pembelajaran:   form.media_pembelajaran    || null,
      kegiatan_pendahuluan: form.kegiatan_pendahuluan  || null,
      kegiatan_inti:        form.kegiatan_inti         || null,
      kegiatan_penutup:     form.kegiatan_penutup      || null,
      penilaian:            form.penilaian             || null,
      refleksi:             form.refleksi              || null,
      tindak_lanjut:        form.tindak_lanjut         || null,
      jumlah_hadir:  form.jumlah_hadir !== "" ? parseInt(form.jumlah_hadir) : null,
      jumlah_sakit:  form.jumlah_sakit !== "" ? parseInt(form.jumlah_sakit) : null,
      jumlah_izin:   form.jumlah_izin  !== "" ? parseInt(form.jumlah_izin)  : null,
      jumlah_alpha:  form.jumlah_alpha !== "" ? parseInt(form.jumlah_alpha) : null,
    };

    const { error } = await supabase
      .from("journals")
      .update(payload)
      .eq("id", jurnalId)
      .eq("user_id", user.id);  // double-check kepemilikan

    if (error) {
      alert("Gagal menyimpan: " + error.message);
    } else {
      setSavedOk(true);
      setTimeout(() => router.push("/jurnal"), 1200);
    }
    setSaving(false);
  }

  function seksiLengkap(id) {
    if (id === 1) return !!(form.tanggal && form.class_id && (form.subject_id || form.mapel));
    if (id === 2) return !!(form.tujuan_pembelajaran || form.materi_pokok);
    if (id === 3) return !!(form.kegiatan_pendahuluan || form.kegiatan_inti || form.kegiatan_penutup);
    if (id === 4) return !!(form.penilaian || form.refleksi);
    return false;
  }

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found state ───────────────────────────────────────
  if (notFound) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Jurnal Tidak Ditemukan</h3>
          <p>Jurnal tidak ada atau Anda tidak memiliki akses.</p>
          <button className="btn btn-primary" onClick={() => router.push("/jurnal")}>
            Kembali ke Jurnal
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="breadcrumb">
          <a href="/dashboard">Dashboard</a>
          <span className="sep">›</span>
          <a href="/jurnal">Jurnal Guru</a>
          <span className="sep">›</span>
          <span className="current">Edit Jurnal</span>
        </div>
        <div className="page-header-row">
          <div>
            <h1>✏️ Edit Jurnal</h1>
            <p>Perbarui catatan kegiatan pembelajaran.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-ghost"
              onClick={() => router.push("/jurnal")}
              disabled={saving}
            >
              <ArrowLeft size={15} /> Kembali
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSimpan}
              disabled={saving || savedOk}
            >
              {savedOk ? (
                <><CheckCircle size={15} /> Tersimpan!</>
              ) : saving ? (
                <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</>
              ) : (
                <><Save size={15} /> Simpan Perubahan</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Accordion seksi */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {SEKSI.map((seksi) => (
          <div key={seksi.id} className="card">

            {/* Header seksi */}
            <button
              onClick={() => setOpenSeksi(openSeksi === seksi.id ? null : seksi.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 1.25rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderBottom: openSeksi === seksi.id
                  ? "1px solid var(--clr-border)"
                  : "none",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{seksi.icon}</span>
              <span style={{
                fontWeight: 700,
                fontSize: "0.9375rem",
                color: "var(--clr-text)",
                flex: 1,
              }}>
                Seksi {seksi.id} — {seksi.label}
              </span>
              {seksiLengkap(seksi.id) && (
                <CheckCircle size={16} color="var(--clr-primary-600)" style={{ flexShrink: 0 }} />
              )}
              {openSeksi === seksi.id
                ? <ChevronUp   size={18} color="var(--clr-text-muted)" />
                : <ChevronDown size={18} color="var(--clr-text-muted)" />
              }
            </button>

            {/* Isi seksi */}
            {openSeksi === seksi.id && (
              <div style={{ padding: "1.25rem" }}>

                {/* ── SEKSI 1: Identitas ── */}
                {seksi.id === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                    {jadwalList.length > 0 && (
                      <div className="form-group">
                        <label className="form-label">
                          Pilih dari Jadwal
                          <span style={{ fontWeight: 400, color: "var(--clr-text-muted)", marginLeft: "0.5rem" }}>
                            (opsional)
                          </span>
                        </label>
                        <select
                          className="form-input form-select"
                          value={form.schedule_id}
                          onChange={(e) => setField("schedule_id", e.target.value)}
                        >
                          <option value="">-- Pilih Jadwal --</option>
                          {jadwalList.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.hari} · Jam {j.jam_ke} · {j.subjects?.nama} · {j.classes?.nama_kelas}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div className="form-group">
                        <label className="form-label">
                          Tanggal <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          type="date"
                          className={`form-input${errors.tanggal ? " error" : ""}`}
                          value={form.tanggal}
                          onChange={(e) => setField("tanggal", e.target.value)}
                        />
                        {errors.tanggal && <span className="form-error">{errors.tanggal}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Pertemuan ke-</label>
                        <input
                          type="number" min={1}
                          className="form-input"
                          placeholder="Contoh: 5"
                          value={form.pertemuan_ke}
                          onChange={(e) => setField("pertemuan_ke", e.target.value)}
                          style={{ appearance: "none", MozAppearance: "textfield", WebkitAppearance: "none" }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Kelas <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <select
                        className={`form-input form-select${errors.class_id ? " error" : ""}`}
                        value={form.class_id}
                        onChange={(e) => setField("class_id", e.target.value)}
                      >
                        <option value="">-- Pilih Kelas --</option>
                        {kelasList.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.nama_kelas}{k.tingkat ? ` (Tingkat ${k.tingkat})` : ""}
                          </option>
                        ))}
                      </select>
                      {errors.class_id && <span className="form-error">{errors.class_id}</span>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", alignItems: "start" }}>
                      <div className="form-group">
                        <label className="form-label">
                          Mata Pelajaran <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <select
                          className={`form-input form-select${errors.subject_id ? " error" : ""}`}
                          value={form.subject_id}
                          onChange={(e) => setField("subject_id", e.target.value)}
                        >
                          <option value="">-- Pilih Mapel --</option>
                          {subjectList.map((s) => (
                            <option key={s.id} value={s.id}>{s.nama}</option>
                          ))}
                        </select>
                        {errors.subject_id && <span className="form-error">{errors.subject_id}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Jam ke-</label>
                        <input
                          type="number" min={1} max={12}
                          className="form-input"
                          placeholder="1"
                          value={form.jam_ke}
                          onChange={(e) => setField("jam_ke", e.target.value)}
                          style={{ width: 80, appearance: "none", MozAppearance: "textfield", WebkitAppearance: "none" }}
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* ── SEKSI 2: Rencana Pembelajaran ── */}
                {seksi.id === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Textarea label="Tujuan Pembelajaran" value={form.tujuan_pembelajaran} onChange={(v) => setField("tujuan_pembelajaran", v)} placeholder="Contoh: Siswa mampu memahami konsep bilangan bulat..." rows={3} />
                    <Textarea label="Materi Pokok" value={form.materi_pokok} onChange={(v) => setField("materi_pokok", v)} placeholder="Contoh: Bilangan bulat positif dan negatif" rows={2} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <TextInput label="Model Pembelajaran" value={form.model_pembelajaran} onChange={(v) => setField("model_pembelajaran", v)} placeholder="Contoh: Problem Based Learning" />
                      <TextInput label="Metode Pembelajaran" value={form.metode_pembelajaran} onChange={(v) => setField("metode_pembelajaran", v)} placeholder="Contoh: Diskusi, Tanya Jawab" />
                    </div>
                    <TextInput label="Media Pembelajaran" value={form.media_pembelajaran} onChange={(v) => setField("media_pembelajaran", v)} placeholder="Contoh: Papan tulis, LKS, Proyektor" />
                  </div>
                )}

                {/* ── SEKSI 3: Kegiatan Belajar ── */}
                {seksi.id === 3 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Textarea label="Kegiatan Pendahuluan" value={form.kegiatan_pendahuluan} onChange={(v) => setField("kegiatan_pendahuluan", v)} placeholder="Contoh: Guru membuka pelajaran dengan salam..." rows={4} />
                    <Textarea label="Kegiatan Inti" value={form.kegiatan_inti} onChange={(v) => setField("kegiatan_inti", v)} placeholder="Contoh: Guru menjelaskan materi, siswa berdiskusi..." rows={5} />
                    <Textarea label="Kegiatan Penutup" value={form.kegiatan_penutup} onChange={(v) => setField("kegiatan_penutup", v)} placeholder="Contoh: Guru menyimpulkan materi..." rows={3} />
                  </div>
                )}

                {/* ── SEKSI 4: Evaluasi & Kehadiran ── */}
                {seksi.id === 4 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Textarea label="Penilaian Proses" value={form.penilaian} onChange={(v) => setField("penilaian", v)} placeholder="Contoh: Penilaian sikap melalui observasi..." rows={3} />
                    <Textarea label="Refleksi Guru" value={form.refleksi} onChange={(v) => setField("refleksi", v)} placeholder="Contoh: Pembelajaran berjalan lancar..." rows={3} />
                    <Textarea label="Tindak Lanjut" value={form.tindak_lanjut} onChange={(v) => setField("tindak_lanjut", v)} placeholder="Contoh: Memberikan remedial pada siswa..." rows={2} />

                    <div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--clr-text)", marginBottom: "0.5rem" }}>
                        Kehadiran Siswa
                        <span style={{ fontWeight: 400, color: "var(--clr-text-muted)", marginLeft: "0.5rem", fontSize: "0.75rem" }}>
                          (otomatis dari data absensi · bisa diubah manual)
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                        {[
                          { key: "jumlah_hadir", label: "Hadir", cls: "chip-hadir" },
                          { key: "jumlah_sakit", label: "Sakit", cls: "chip-sakit" },
                          { key: "jumlah_izin",  label: "Izin",  cls: "chip-izin"  },
                          { key: "jumlah_alpha", label: "Alpha", cls: "chip-alpha" },
                        ].map((item) => (
                          <div key={item.key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 700, textAlign: "center" }}>
                              <span className={`chip ${item.cls}`} style={{ fontSize: "0.75rem", padding: "0.1rem 0.5rem" }}>
                                {item.label}
                              </span>
                            </label>
                            <input
                              type="number" min={0}
                              className="form-input"
                              value={form[item.key]}
                              onChange={(e) => setField(item.key, e.target.value)}
                              style={{ textAlign: "center", fontWeight: 700, fontSize: "1rem", padding: "0.5rem", appearance: "none", MozAppearance: "textfield", WebkitAppearance: "none" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tombol simpan bawah */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem", paddingBottom: "1rem" }}>
        <button className="btn btn-ghost" onClick={() => router.push("/jurnal")} disabled={saving}>
          <ArrowLeft size={15} /> Batal
        </button>
        <button className="btn btn-primary btn-lg" onClick={handleSimpan} disabled={saving || savedOk}>
          {savedOk ? (
            <><CheckCircle size={16} /> Perubahan Tersimpan!</>
          ) : saving ? (
            <><span className="loading-spinner" style={{ width: 15, height: 15 }} /> Menyimpan...</>
          ) : (
            <><Save size={16} /> Simpan Perubahan</>
          )}
        </button>
      </div>

    </div>
  );
}

// ── Sub-komponen ──────────────────────────────────────────────
function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <textarea
        className="form-input form-textarea"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minHeight: "unset" }}
      />
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}