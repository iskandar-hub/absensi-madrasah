"use client";

import { useEffect, useState } from "react";
import {
  School,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SekolahPage() {
  const [schools, setSchools] = useState([]);

  const [form, setForm] = useState({
    nama: "",
    npsn: "",
    nsm: "",
    kabupaten: "",
    kepala_sekolah: "",
    alamat: "",
  });

  const [editingId, setEditingId] =
    useState(null);

  const [openModal, setOpenModal] =
    useState(false);

  useEffect(() => {
    loadSchools();
  }, []);

  async function loadSchools() {
    const { data, error } =
      await supabase
        .from("schools")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (!error) {
      setSchools(data);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (editingId) {
      await supabase
        .from("schools")
        .update({
          nama: form.nama,
          npsn: form.npsn,
          nsm: form.nsm,
          kabupaten: form.kabupaten,
          kepala_sekolah:
            form.kepala_sekolah,
          alamat: form.alamat,
        })
        .eq("id", editingId);
    } else {
      await supabase
        .from("schools")
        .insert({
          user_id: user.id,
          nama: form.nama,
          npsn: form.npsn,
          nsm: form.nsm,
          kabupaten: form.kabupaten,
          kepala_sekolah:
            form.kepala_sekolah,
          alamat: form.alamat,
        });
    }

    setForm({
      nama: "",
      npsn: "",
      nsm: "",
      kabupaten: "",
      kepala_sekolah: "",
      alamat: "",
    });

    setEditingId(null);
    setOpenModal(false);

    loadSchools();
  }

  async function handleDelete(id) {
    if (
      !confirm(
        "Yakin ingin menghapus sekolah ini?"
      )
    )
      return;

    await supabase
      .from("schools")
      .delete()
      .eq("id", id);

    loadSchools();
  }

  function handleEdit(item) {
    setEditingId(item.id);

    setForm({
      nama: item.nama || "",
      npsn: item.npsn || "",
      nsm: item.nsm || "",
      kabupaten: item.kabupaten || "",
      kepala_sekolah:
        item.kepala_sekolah || "",
      alamat: item.alamat || "",
    });

    setOpenModal(true);
  }

  function handleTambah() {
    setEditingId(null);

    setForm({
      nama: "",
      npsn: "",
      nsm: "",
      kabupaten: "",
      kepala_sekolah: "",
      alamat: "",
    });

    setOpenModal(true);
  }

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Data Sekolah</h1>
            <p>
              Kelola informasi sekolah atau
              madrasah.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleTambah}
          >
            <Plus size={16} />
            Tambah Sekolah
          </button>
        </div>
      </div>

      {/* TABEL */}
      <div className="card">
        <div className="card-header">
          <h3>
            <School size={18} />
            Daftar Sekolah
          </h3>
        </div>

        <div className="card-body">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama Sekolah</th>
                  <th>NPSN</th>
                  <th>NSM</th>
                  <th>Kabupaten</th>
                  <th>Kepala Sekolah</th>
                  <th>Alamat</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {schools.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        textAlign: "center",
                      }}
                    >
                      Belum ada data sekolah
                    </td>
                  </tr>
                ) : (
                  schools.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nama}</td>

                      <td>{item.npsn}</td>

                      <td>{item.nsm}</td>

                      <td>{item.kabupaten}</td>

                      <td>
                        {item.kepala_sekolah}
                      </td>

                      <td className="col-alamat">
                        {item.alamat}
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() =>
                              handleEdit(item)
                            }
                            className="btn btn-sm"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(item.id)
                            }
                            className="btn btn-danger btn-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {openModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {editingId
                  ? "Edit Sekolah"
                  : "Tambah Sekolah"}
              </h3>

              <button
                className="btn-close"
                onClick={() =>
                  setOpenModal(false)
                }
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Sekolah</label>
                  <input
                    type="text"
                    className="input"
                    value={form.nama}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nama: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>NPSN</label>
                  <input
                    type="text"
                    className="input"
                    value={form.npsn}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        npsn: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>NSM</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Nomor Statistik Madrasah"
                    value={form.nsm}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nsm: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Kabupaten</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Contoh: Lombok Timur"
                    value={form.kabupaten}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        kabupaten: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Kepala Sekolah</label>
                  <input
                    type="text"
                    className="input"
                    value={form.kepala_sekolah}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        kepala_sekolah:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Alamat</label>
                  <textarea
                    rows="4"
                    className="input"
                    value={form.alamat}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        alamat: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setOpenModal(false)
                  }
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingId ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}