"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { LogOut, UserCog, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Navbar({ onMenuClick }) {
  const [userName, setUserName]   = useState("");
  const [modalProfil, setModalProfil] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [savedOk, setSavedOk]     = useState(false);

  const [profil, setProfil] = useState({
    full_name: "",
    nip:       "",
    jabatan:   "",
    no_hp:     "",
  });

  // ── Load user ──
  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const meta = user.user_metadata || {};
    const name =
      meta.full_name ||
      meta.name ||
      user.email?.split("@")[0] ||
      "Guru";

    setUserName(name);
    setProfil({
      full_name: meta.full_name || meta.name || "",
      nip:       meta.nip      || "",
      jabatan:   meta.jabatan  || "",
      no_hp:     meta.no_hp    || "",
    });
  }

  // ── Simpan profil ──
  async function handleSimpanProfil() {
    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profil.full_name.trim(),
        nip:       profil.nip.trim(),
        jabatan:   profil.jabatan.trim(),
        no_hp:     profil.no_hp.trim(),
      },
    });

    if (error) {
      alert("Gagal menyimpan profil: " + error.message);
    } else {
      setUserName(profil.full_name || "Guru");
      setSavedOk(true);
      setTimeout(() => {
        setSavedOk(false);
        setModalProfil(false);
      }, 1200);
    }

    setSaving(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-brand">
          <div style={{ width: 42, height: 42, position: "relative" }}>
            <Image
              src="/logo-nw.png"
              alt="Logo NW"
              fill
              priority
              sizes="42px"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "15px" }}>
              Absensi Madrasah
            </div>
            <div style={{ fontSize: "12px", color: "var(--clr-text-muted)" }}>
              Ponpes Tarbiyatunnasyi'in NW
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Avatar + Nama — klik untuk buka edit profil */}
        {userName && (
          <button
            onClick={() => setModalProfil(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginRight: "0.75rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: "var(--radius-md)",
              transition: "background var(--transition-fast)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--clr-surface-2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            title="Edit Profil"
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--clr-primary-100), var(--clr-primary-200))",
              border: "2px solid var(--clr-primary-300)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--clr-primary-700)",
              flexShrink: 0,
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--clr-text)",
              maxWidth: "140px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "var(--navbar-name-display, block)",
            }}>
              {userName}
            </span>
          </button>
        )}

        <button onClick={handleLogout} className="btn btn-danger btn-sm">
          <LogOut size={14} />
          <span style={{ display: "var(--navbar-logout-text, inline)" }}>
            Keluar
          </span>
        </button>
      </header>

      {/* ── Modal Edit Profil ── */}
      {modalProfil && (
        <div
          className="modal-backdrop"
          onClick={() => !saving && setModalProfil(false)}
        >
          <div
            className="modal animate-slideUp"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <UserCog size={18} color="var(--clr-primary-600)" />
                Edit Profil
              </h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => !saving && setModalProfil(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">

              {/* Avatar besar */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--clr-primary-100), var(--clr-primary-200))",
                  border: "3px solid var(--clr-primary-300)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "var(--clr-primary-700)",
                }}>
                  {(profil.full_name || userName).charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Nama Lengkap */}
              <div className="form-group">
                <label className="form-label">
                  Nama Lengkap <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Ahmad Fauzi, S.Pd"
                  value={profil.full_name}
                  onChange={(e) => setProfil((p) => ({ ...p, full_name: e.target.value }))}
                />
                <span className="form-hint">
                  Nama ini akan muncul di tanda tangan export PDF & Excel.
                </span>
              </div>

              {/* NIP */}
              <div className="form-group">
                <label className="form-label">NIP</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: 198501012010011001"
                  value={profil.nip}
                  onChange={(e) => setProfil((p) => ({ ...p, nip: e.target.value }))}
                />
                <span className="form-hint">
                  Nomor Induk Pegawai. Akan muncul di bawah nama pada tanda tangan.
                </span>
              </div>

              {/* Jabatan */}
              <div className="form-group">
                <label className="form-label">Jabatan</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Guru Mata Pelajaran / Wali Kelas VII"
                  value={profil.jabatan}
                  onChange={(e) => setProfil((p) => ({ ...p, jabatan: e.target.value }))}
                />
              </div>

              {/* No HP */}
              <div className="form-group">
                <label className="form-label">No. HP / WhatsApp</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: 0812xxxxxxxx"
                  value={profil.no_hp}
                  onChange={(e) => setProfil((p) => ({ ...p, no_hp: e.target.value }))}
                />
              </div>

            </div>

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setModalProfil(false)}
                disabled={saving}
              >
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSimpanProfil}
                disabled={saving || savedOk}
              >
                {savedOk ? (
                  "✅ Tersimpan!"
                ) : saving ? (
                  <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</>
                ) : (
                  <><Save size={14} /> Simpan Profil</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}