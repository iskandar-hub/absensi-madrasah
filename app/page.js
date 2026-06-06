"use client";

import Image from "next/image";
import { FcGoogle } from "react-icons/fc";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-primary-soft">
      <div className="w-full max-w-md login-entrance">
        <div className="card overflow-hidden">

          <div className="card-accent-top"></div>

          <div className="login-ornament px-8 py-10 text-center text-white">
            <div className="relative z-10">

              <div
                style={{
                  width: 100,
                  height: 100,
                  position: "relative",
                  margin: "0 auto 16px",
                }}
              >
                <Image
                  src="/logo-nw.png"
                  alt="Logo NW"
                  fill
                  priority
                  style={{
                    objectFit: "contain",
                  }}
                />
              </div>

              <p className="text-arabic text-white">
                بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
              </p>

              <h1
                style={{
                  color: "white",
                  marginTop: "12px",
                }}
              >
                Absensi Madrasah
              </h1>

              <p
                style={{
                  color: "rgba(255,255,255,.85)",
                  marginTop: "8px",
                }}
              >
                Ponpes Tarbiyatunnasyi'in NW
              </p>
            </div>
          </div>

          <div className="card-body">

            <div className="text-center mb-6">
              <h2>Selamat Datang</h2>

              <p>
                Silakan masuk menggunakan akun Google
                untuk mengakses sistem absensi,
                penilaian, jurnal guru, dan rekap data.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="btn btn-primary btn-lg w-full"
            >
              <FcGoogle size={22} />
              Masuk dengan Google
            </button>

            <div className="divider-label mt-6">
              Sistem Terintegrasi
            </div>

            <div className="mt-5 space-y-3">
              <p>✅ Login Aman dengan Google</p>
              <p>📚 Kelola Data Siswa dan Kelas</p>
              <p>📝 Absensi dan Penilaian Harian</p>
              <p>📊 Rekap Otomatis</p>
            </div>
          </div>

          <div className="card-footer text-center">
            <small className="text-muted">
              © {new Date().getFullYear()} Madrasah NW | Lalu Joni Iskandar
            </small>
          </div>

        </div>
      </div>
    </main>
  );
}